# 표준 라이브러리
import os                                           # 환경변수 읽기용 표준모듈
from datetime import datetime, timedelta, timezone  # 토큰 만료 등 시간 계산
from typing import Optional, List                   # 타입힌트

# FastAPI 본체와 에러 응답 도우미
from fastapi import FastAPI, HTTPException, Depends, status, Response, Request

# 브라우저(프론트엔드)에서 오는 요청을 허용하기 위한 CORS 미들웨어
from fastapi.middleware.cors import CORSMiddleware

from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm  # OAuth2 폼/스킴

# MongoDB 비동기 클라이언트(Motor). FastAPI는 async이므로 비동기가 잘 맞는다.
from motor.motor_asyncio import AsyncIOMotorClient

# 요청/응답 바디(스키마) 정의 및 유효성 검사에 쓰는 Pydantic
from pydantic import BaseModel, Field, EmailStr

# MongoDB의 기본 키 타입(ObjectId)
from bson import ObjectId

from passlib.context import CryptContext              # 비밀번호 해시/검증
from jose import jwt, JWTError                        # JWT 인코딩/디코딩

from pymongo.errors import DuplicateKeyError

import uuid

# -----------------------------
# 환경 변수 / 기본 설정
# -----------------------------

# Docker-compose에서 backend에 넣어준 환경변수(MONGO_URL, MONGO_DB)를 우선 사용.
# 없으면 로컬 기본값으로 동작.
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")  # DB 접속 URL
MONGO_DB = os.getenv("MONGO_DB", "board")                        # DB 이름

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")     # JWT 서명키(개발용 기본값)
ALGORITHM = "HS256"                                              # JWT 서명 알고리즘
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))  # 토큰 만료

# JWT 토큰을 Authorization: Bearer <token> 에서 꺼내는 의존성
# Swagger의 Authorize 버튼이 토큰을 가져오는 주소를 지정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# 비밀번호 해싱 설정(bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# FastAPI 애플리케이션 인스턴스 생성
app = FastAPI()

# CORS 설정: 개발 중 Vite dev 서버(5173)에서 오는 요청만 허용
# (개발 편의상 "*"로 열 수도 있지만, 보안상 필요한 출처만 허용하는 습관이 좋다)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],   # GET/POST/PUT/DELETE 등 전부 허용
    allow_headers=["*"],   # 모든 헤더 허용(예: Content-Type)
    allow_credentials=True,
)


# -----------------------------
# MongoDB 연결/컬렉션
# -----------------------------
client = AsyncIOMotorClient(MONGO_URL)       # 클라이언트 생성(비동기)
db = client[MONGO_DB]                        # DB 선택
posts = db["posts"]                          # 게시글 컬렉션
users = db["users"]                          # 사용자 컬렉션
comments = db["comments"]                    # 콜렉션 핸들


# =========================
# 유틸 (비밀번호/JWT)
# =========================
def hash_password(plain: str) -> str:        # 평문 비밀번호 → 해시
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:  # 평문과 해시 비교
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()                                  # 페이로드 복사
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})                        # 만료시간 포함
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)  # 서명하여 토큰 발급

def create_refresh_token(data: dict, expires_days: int = REFRESH_TOKEN_EXPIRE_DAYS) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=expires_days)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# -----------------------------
# Pydantic 모델(스키마)
# -----------------------------
class PostIn(BaseModel):
    """
    클라이언트가 글을 새로 만들거나 수정할 때 보내는 입력 바디 형식.
    - title: 최소 1자, 최대 100자
    - body: 본문(제한 없음)
    """
    title: str = Field(min_length=1, max_length=100)
    body: str

class PostOut(PostIn):
    """
    API가 응답으로 돌려줄 글 형식.
    - 입력과 동일하되, DB의 ObjectId를 문자열로 변환한 id 필드가 추가됨.
    """
    id: str
    author_id: str
    author_username: Optional[str] = None
    comments_count: int = 0
    likes_count: int = 0

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=1, max_length=30)
    password: str = Field(min_length=1)

class UserOut(BaseModel):
    id: str
    email: EmailStr
    username: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=5000)

class CommentOut(BaseModel):
    id: str
    post_id: str
    author_id: str
    author_username: str
    body: str
    created_at: datetime

def comment_to_out(doc) -> CommentOut:
    return CommentOut(
        id=str(doc["_id"]),
        post_id=str(doc["post_id"]),
        author_id=str(doc["author_id"]),
        author_username=doc["author_username"],
        body=doc["body"],
        created_at=doc["created_at"],
    )

# -----------------------------
# DB 문서 → 응답 변환 도우미
# -----------------------------
def post_to_out(doc) -> PostOut:                 # Mongo 문서 → PostOut
    return PostOut(
        id=str(doc["_id"]),
        title=doc["title"],
        body=doc["body"],
        author_id=str(doc.get("author_id", "")),
        author_username=doc.get("author_username"),
        comments_count=int(doc.get("comments_count", 0)),
        likes_count=int(doc.get("likes_count", len(doc.get("likes", [])))),
    )

def user_to_out(doc) -> UserOut:                 # Mongo 문서 → UserOut
    return UserOut(id=str(doc["_id"]), email=doc["email"], username=doc["username"])


# =========================
# 앱 시작 시 1회 실행 훅
# =========================
@app.on_event("startup")
async def on_startup():
    # users: 이메일/아이디는 중복 금지
    await users.create_index("email", unique=True)
    await users.create_index("username", unique=True)
    await comments.create_index([("post_id", 1), ("created_at", -1)])
    # posts: _id 인덱스는 MongoDB가 자동으로 {_id: 1} 생성함. 따로 만들 필요 없음.


# =========================
# 인증 도우미
# =========================
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Authorization: Bearer <JWT> 를 파싱해 현재 사용자 문서를 반환.
    """
    credentials_exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # 토큰 검증 및 디코드
        uid: str = payload.get("sub")                                    # subject(사용자 ID) 추출
        if not uid:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    doc = await users.find_one({"_id": ObjectId(uid)})                   # DB에서 사용자 문서 조회
    if not doc:
        raise credentials_exc
    return doc


# =========================
# 헬스체크
# =========================
@app.get("/health")
async def health():
    await posts.estimated_document_count()
    return {"ok": True}


# =========================
# 인증 API
# =========================
@app.post("/auth/signup", response_model=UserOut, status_code=201)
async def signup(u: UserCreate):
    # 중복 검사
    if await users.find_one({"email": u.email}):
        raise HTTPException(400, "email already in use")
    if await users.find_one({"username": u.username}):
        raise HTTPException(400, "username already in use")

    # 사용자 저장(해시 비밀번호)
    doc = {
        "email": u.email,
        "username": u.username,
        "password_hash": hash_password(u.password),
        "created_at": datetime.now(timezone.utc),
    }
    res = await users.insert_one(doc)                              # insert
    saved = await users.find_one({"_id": res.inserted_id})         # 방금 저장한 문서 로드
    return user_to_out(saved)                                      # 민감정보 제거 후 반환

class LoginBody(BaseModel):                                        # JSON 로그인 바디(프론트용)
    email: EmailStr
    password: str

@app.post("/auth/login", response_model=TokenOut)                  # JSON 로그인(프론트에서 사용)
async def login(body: LoginBody):
    user = await users.find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="invalid email or password")
    token = create_access_token({"sub": str(user["_id"])})  # ← 여기!
    return TokenOut(access_token=token, user=user_to_out(user))

@app.post("/auth/token", response_model=TokenOut)                  # Swagger Authorize 전용(폼)
async def issue_token(form: OAuth2PasswordRequestForm = Depends()):
    # username 필드에 이메일 또는 username 둘 다 허용
    user = await users.find_one({"email": form.username}) or await users.find_one({"username": form.username})
    if not user or not verify_password(form.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="invalid email/username or password")
    token = create_access_token({"sub": str(user["_id"])})
    return TokenOut(access_token=token, user=user_to_out(user))

@app.post("/auth/refresh", response_model=TokenOut)
async def refresh_token(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(401, "no refresh token")
    
    try:
        payload = jwt.decode(rt, SECRET_KEY, algorithms=[ALGORITHM])
        uid: str = payload.get("sub")
        ver: int = payload.get("ver", 0)
    except JWTError:
        raise health(401, "invalid refresh token")
    
    user = await users.find_one({"_id": ObjectId(uid)})
    if not user:
        raise HTTPException(401, "user not found")
    
    if user.get("token_version", 0) != ver:
        raise HTTPException(401, "refresh token revoked")
    
    # 필요하면 여기서 리프레시 토큰 회전(jti 새로 발급 & 쿠키 교체)
    access = create_access_token({"sub": str(user["_id"])})
    return TokenOut(access_token=access, user=user_to_out(user))

@app.post("/auth/logout")
async def logout(response: Response, current=Depends(get_current_user)):
    # token_version 증가 -> 이전 refresh 무효화
    await users.update_one({"_id": current["_id"]}, {"$inc": {"token_version": 1}})

    # 쿠키 제거
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@app.get("/auth/me", response_model=UserOut)                       # 내 정보(토큰 필요)
async def me(current=Depends(get_current_user)):
    return user_to_out(current)

# =========================
# 게시글 API (목록/조회는 공개, 작성/수정/삭제는 로그인 필요)
# =========================
@app.get("/posts", response_model=List[PostOut])                   # 목록(공개)
async def list_posts(skip: int = 0, limit: int = 20):
    cursor = posts.find().skip(skip).limit(limit).sort("_id", -1)  # 최신순
    return [post_to_out(d) async for d in cursor]

@app.post("/posts", response_model=PostOut, status_code=201)       # 생성(로그인 필요)
async def create_post(p: PostIn, current=Depends(get_current_user)):
    doc = {
        **p.dict(),
        "author_id": str(current["_id"]),       # ← 필수
        "author_username": current["username"], # (옵션) 목록/상세에 닉 표시용
        "created_at": datetime.now(timezone.utc),
        "comments_count": 0,
        "likes": [],
    }
    res = await posts.insert_one(doc)
    doc = await posts.find_one({"_id": res.inserted_id})
    return post_to_out(doc)

@app.get("/posts/count")
async def posts_cout():
    try:
        total = await posts.count_documents({})
    except Exception:
        total = await posts.estimated_document_count()
    return {"total": int(total)}

@app.get("/posts/{pid}", response_model=PostOut)                   # 단건 조회(공개)
async def get_post(pid: str):
    doc = await posts.find_one({"_id": ObjectId(pid)})
    if not doc:
        raise HTTPException(404, "not found")
    return post_to_out(doc)

@app.put("/posts/{pid}", response_model=PostOut)                   # 수정(로그인 필요)
async def update_post(pid: str, p: PostIn, current=Depends(get_current_user)):
    oid = ObjectId(pid)
    upd = await posts.find_one_and_update({"_id": oid}, {"$set": p.dict()}, return_document=True)
    if not upd:
        raise HTTPException(404, "not found")
    return post_to_out(upd)

@app.delete("/posts/{pid}", status_code=204)                       # 삭제(로그인 필요)
async def delete_post(pid: str, current=Depends(get_current_user)):
    """
    - 경로 파라미터 pid는 문자열로 받지만, Mongo 조회 시 ObjectId로 변환
    - Depends(get_current_user): 요청 헤더의 Bearer 토큰 검증 → 현재 사용자 문서 반환
    - 본인 글인지 검사 후 삭제
    """
    oid = ObjectId(pid)
    doc = await posts.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "not found")
    if str(doc.get("author_id")) != str(current["_id"]):
        raise HTTPException(403, "not owner")
    await comments.delete_many({"post_id": oid})
    await posts.delete_one({"_id": oid})

# --- 좋아요 추가 ---
@app.post("/posts/{pid}/likes", status_code=204)
async def like_post(pid: str, current=Depends(get_current_user)):
    """
    내 사용자 ID를 해당 글의 likes 배열에 추가합니다(중복 없음).
    """
    oid = ObjectId(pid)
    # 문서가 있는지 확인
    post = await posts.find_one({"_id": oid}, {"_id": 1})
    if not post:
        raise HTTPException(404, "post not found")

    # $addToSet: 중복 없이 추가
    await posts.update_one({"_id": oid}, {"$addToSet": {"likes": str(current["_id"])}})

    # 캐시 필드 likes_count를 쓰고 싶다면 함께 유지보수:
    await posts.update_one({"_id": oid}, {"$addToSet": {"likes": str(current["_id"])}, "$inc": {"likes_count": 1}})

# 좋아요 취소
@app.delete("/posts/{pid}/likes", status_code=204)
async def unlike_post(pid: str, current=Depends(get_current_user)):
    """
    내 사용자 ID를 해당 글의 likes 배열에서 제거합니다.
    """
    oid = ObjectId(pid)
    post = await posts.find_one({"_id": oid}, {"_id": 1})
    if not post:
        raise HTTPException(404, "post not found")

    await posts.update_one({"_id": oid}, {"$pull": {"likes": str(current["_id"])}})

    # likes_count 캐시를 쓰는 경우:
    await posts.update_one({"_id": oid}, {"$pull": {"likes": str(current["_id"])}, "$inc": {"likes_count": -1}})

# 현재 내가 좋아요 눌렀는지 여부
@app.get("/posts/{pid}/liked")
async def liked_by_me(pid: str, current=Depends(get_current_user)):
    """
    내가 이 글을 좋아요 했는지 true/false를 반환합니다.
    """
    oid = ObjectId(pid)
    doc = await posts.find_one({"_id": oid}, {"likes": 1})
    if not doc:
        raise HTTPException(404, "post not found")
    liked = str(current["_id"]) in doc.get("likes", [])
    return {"liked": liked}

@app.get("/posts/{pid}/comments", response_model=List[CommentOut]) # 댓글 목록
async def list_comments(pid: str, skip: int = 0, limit: int = 20):
    oid = ObjectId(pid)
    cursor = comments.find({"post_id": oid}).skip(skip).limit(limit).sort("created_at", 1)
    return [comment_to_out(d) async for d in cursor]

@app.post("/posts/{pid}/comments", response_model=CommentOut, status_code=201) # 댓글 생성
async def create_comment(pid: str, c: CommentIn, current=Depends(get_current_user)):
    oid = ObjectId(pid)
    post = await posts.find_one({"_id": oid})
    if not post:
        raise HTTPException(404, "post not found")
    doc = {
        "post_id": oid,
        "author_id": str(current["_id"]),
        "author_username": current["username"],
        "body": c.body,
        "created_at": datetime.now(timezone.utc)(),
    }
    res = await comments.insert_one(doc)
    await posts.update_one({"_id": oid}, {"$inc": {"comments_count": 1}})
    saved = await comments.find_one({"_id": res.inserted_id})
    return comment_to_out(saved)

@app.delete("/posts/{pid}/comments/{cid}", status_code=204)
async def delete_comment(pid: str, cid: str, current=Depends(get_current_user)):
    oid = ObjectId(pid); coid = ObjectId(cid)
    cm = await comments.find_one({"_id": coid, "post_id": oid})
    if not cm: raise HTTPException(404, "comment not found")
    if cm["author_id"] != str(current["_id"]): raise HTTPException(403, "not owner")
    await comments.delete_one({"_id": coid})
    await posts.update_one({"_id": oid}, {"$inc": {"comments_count": -1}})