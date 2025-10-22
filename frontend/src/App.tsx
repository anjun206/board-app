import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";   // React import
import { Link, useNavigate, useSearchParams } from "react-router-dom";

// lib/api 래퍼/도우미 사용
import {
  API_BASE,
  ApiError,
  listPosts,
  createPost as apiCreatePost,
  signup as apiSignup,
  login as apiLogin,
  me as apiMe,
  getToken as getStoredToken,
  setToken as saveToken,
  countPosts,
  refreshToken,
  logout as apiLogout
} from "./lib/api";
import {
  CassetteHeader,
  ComposerSection,
  PostsSection,
  CassetteFooter,
  CassetteLayout,
  CassettePostsSection,
  type CassettePost,
  type TagKey 
} from "./components";

import {
  useElementWidth
} from "./utils/useElementWidth"

/**
 * 백엔드가 반환하는 글의 타입(간단 버전)
 * - backend의 PostOut에 맞춤
 */
type Post = {
  id: string;
  title: string;
  body: string
  author_id: string;            // ← 추가 (내 글 판단용)
  author_username?: string;     // (선택) 목록/상세에서 표시용
  comments_count: number;       // (선택) 댓글 수
  likes_count: number;          // (선택) 좋아요 수
  created_at: string;
  updated_at: string;
};

// 서버가 주는 사용자/토큰 타입
type User = { id: string; email: string; username: string };
type TokenResp = { access_token: string; token_type: string; user: User };

// css용
type TransportMode = "stop" | "play" | "double";

export default function App() {
  // ---------------------------
  // 상태 정의(React state)
  // ---------------------------
  const [posts, setPosts] = useState<Post[]>([]); // 글 목록
  const [title, setTitle] = useState("");         // 입력폼: 제목
  const [body, setBody] = useState("");           // 입력폼: 내용

  // ---- 인증 상태 ----
  const [token, setTokenState] = useState<string | null>(() => getStoredToken());
  const [me, setMe] = useState<User | null>(null);           // 현재 로그인 사용자

  // ---- 로그인/회원가입 폼 ----
  const [mode, setMode] = useState<"login" | "signup">("login"); // 폼 탭 전환
  const [email, setEmail] = useState("");                    // 로그인/가입 공용 이메일
  const [username, setUsername] = useState("");              // 가입 전용 사용자명
  const [password, setPassword] = useState("");              // 로그인/가입 공용 비밀번호

  const authed = Boolean(token);                             // 토큰 존재 여부로 로그인판단

  const [hasMore, setHasMore] = useState(false);

  // 페이지/페이지당
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const pageFromQS = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageFromQS) && pageFromQS > 0 ? pageFromQS : 1;

  const perPageFromQS = parseInt(searchParams.get("perPage") ?? "10", 10);
  const pageSize = Number.isFinite(perPageFromQS) && perPageFromQS > 0 ? perPageFromQS : 10;

  const pagesFromQS = parseInt(searchParams.get("pages") ?? "10", 10);
  const displayPageNum = Number.isFinite(pagesFromQS) && pagesFromQS > 0 ? pagesFromQS : 10;

  // 총 개수 & 마지막 페이지
  const [total, setTotal] = useState(0);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  // 페이지 버튼 컨테이너 너비
  const pagerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(pagerRef);

  // 버튼 한 개의 대략 너비(패딩/보더 포함)와 좌우 화살표 여유 폭
  const BUTTON_W = 44;          // 필요하면 조정
  const ARROWS_W = 96;          // "← →" 두 개 + 여백 대략치
  const GAP_W = 8;

  // 보여줄 버튼 개수(최소 3, 최대 15로 클램프)
  const buttonsToShow = Math.max(
    3,
    Math.min(15, Math.floor((width - ARROWS_W) / (BUTTON_W + GAP_W)) || 7)
  );

  // 현재 묶음의 시작/끝 (동적 개수 기반)
  const startPage = Math.floor((page - 1) / buttonsToShow) * buttonsToShow + 1;
  const endPage = Math.min(startPage + buttonsToShow - 1, lastPage);

  const hasPrevWindow = startPage > 1;
  const hasNextWindow = endPage < lastPage;

  // CassetteHeader용 상태
  const [transport, setTransport] = useState<TransportMode>("play");
  const [isRec, setIsRec] = useState(false);

  const toggleRec = useCallback(() => {
  // 정지 상태에서 REC 누르면 1×로 자동 전환
    if (!isRec && transport === "stop") setTransport("play");
    setIsRec(v => !v);
  }, [isRec, transport]);


  const deriveCassetteTag = useCallback(
    (item: Post): TagKey => {
      if ((item.likes_count ?? 0) > 20) return "notice";
      if ((item.comments_count ?? 0) > 3) return "maint";
      return "log";
    },
    []
  );

  const cassettePosts = useMemo<CassettePost[]>(
    () =>
      posts.map((post): CassettePost => ({
        id: post.id,
        title: post.title,
        // body: post.body,
        author: post.author_username ?? post.author_id ?? "Unknown",
        likes: post.likes_count ?? 0,
        comments: post.comments_count ?? 0,
        tag: deriveCassetteTag(post),
      })),
    [posts, deriveCassetteTag]
  );

  const handleSelectPost = useCallback(
    (id: string) => {
      navigate(`/posts/${id}`);
    },
    [navigate]
  );

  /**
   * 글 목록 로드
   * - GET /posts 호출 → JSON으로 파싱 → posts 상태에 반영
   */
  async function loadPosts(pg = 1, ps = pageSize) {
    const skip = (pg - 1) * ps;
    const data = await listPosts(skip, ps);
    setPosts(data);
    // setHasMore(Array.isArray(data) && data.length === ps);
  }

  async function loadTotal() {
    setTotal(await countPosts());
  }

  useEffect(() => {
    loadPosts(page, pageSize);
  }, [page, pageSize]);

  // 최초 진입 & 신규 글 작성 후 총 개수 갱신
  useEffect(() => { loadTotal(); }, []);

  // 현재 page가 lastPage를 넘어가면 lastPage로 밀착
  useEffect(() => {
    if (page > lastPage) {
      setSearchParams({ page: String(lastPage), perPage: String(pageSize) });
    }
  }, [lastPage, page, pageSize, setSearchParams]);

  // 토큰 변동/401 자동 로그아웃
  useEffect(() => {
    const run = async () => {
      if (token) {
        const user = await apiMe();
        if (!user) {
          try {
            const data = await refreshToken();
            setTokenState(data.access_token);
            setMe(data.user);
          } catch {
            setTokenState(null);
            setMe(null);
          }
        } else {
          setMe(user);
        }
      } else {
        setMe(null);
      }
    };
    run();
    const onLogout = () => {
      setTokenState(null);
      setMe(null);
      alert("세션이 만료되어 로그아웃되었습니다. 다시 로그인해 주세요.");
    };
    window.addEventListener("auth:logout", onLogout as EventListener);
    return () => window.removeEventListener("auth:logout", onLogout as EventListener);
  }, [token]);

  // 글 등록(로그인 필요)
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    await apiCreatePost(title, body);
    setTitle(""); setBody("");
    await Promise.all([loadPosts(1, pageSize), loadTotal()]);
    setSearchParams({ page: "1", perPage: String(pageSize) });
  }

  // 회원가입
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiSignup(email, username, password);
    if (res.ok) {
      alert("회원가입 완료! 로그인해 주세요.");
      setMode("login");
    } else {
      alert("회원가입 실패");
    }
  }

  // 로그인(JSON)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = await apiLogin(email, password); // api.ts가 토큰 저장까지 수행
      saveToken(data.access_token);
      setTokenState(data.access_token);             // 상태만 반영
      setMe(data.user);
      setEmail(""); setPassword("");
    } catch (err: any) {
    // ApiError면 status/code로 분기
    if (err instanceof ApiError) {
      // 백엔드가 detail = { code, message } 형태로 내려줄 때를 우선 반영
      const code = err.code;

      // 403: 이메일 미인증 등 접근 거부
      if (err.status === 403) {
        if (code === "EMAIL_NOT_VERIFIED") {
          alert("이메일 미인증 상태입니다. 메일함을 확인해 주세요.\n(인증 메일 재전송: 프로필/로그인 화면에서 가능)");
        } else {
          alert("접근이 거부되었습니다.");
        }
        return;
      }
      
      if (err.status === 401) {
        //EPP가 있을 때 WRONG_PASSWORD, 없으면 INVALID_CREDENTIALS 같은 코드가 오도록 백엔드 수정 권장
        if (code === "WRONG_PASSWORD") {
          alert("비밀번호가 올바르지 않습니다.");
          return;
        }
        alert("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      if (err.status === 400) {
        alert(typeof err.message === "string" ? err.message : "요청이 올바르지 않습니다.");
        return;
      }

      // 기타
      alert(`오류가 발생했습니다. (${err.status})`);
      return;
      }

      // 예상치 못한 에러
      alert("로그인 중 오류가 발생했습니다.");
    }
  }

  // 로그아웃
  async function logout() {
    await apiLogout();
    setTokenState(null);
    setMe(null);
  }

  // ---------------------------
  // 렌더링(UI)
  // ---------------------------
  return (
    <>
      <style>{`
        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            opacity: 1;
            text-shadow: 0 0 10px #ff0;
          }
          20%, 24%, 55% {
            opacity: 0.4;
            text-shadow: none;
          }
        }
      `}</style>
      <CassetteLayout>
        
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* 상단 바: 제목 + 사용자 정보/로그아웃 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl text-yellow-600 animate-[flicker_2s_infinite]">new!</h1>
              <h1 className="text-2xl">  네-오 채신 게시판</h1>
              {/* <Link
                to="/demo/cassette"
                className="text-sm text-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
              >
                Cassette 데모
              </Link> */}
            </div>
            {authed ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {me?.username} ({me?.email})
                </span>
                <button onClick={logout} className="px-3 py-1 border rounded">
                  로그아웃
                </button>
              </div>
            ) : null}
          </div>

        <CassetteHeader
          transport={transport}
          setTransport={setTransport}
          isRec={isRec}
          toggleRec={toggleRec}
        />

          {/* 인증 영역(비로그인 시에만 노출) */}
          {!authed && (
            <div className="rounded-2xl border border-[#2a2f35] bg-[#151a1f] p-5">
              <h2 className="mb-3 text-sm tracking-widest text-[#B9B1A3]">
                AUTHENTICATION
              </h2>
              
              {/* 탭 전환 버튼 */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setMode("login")}
                  className={`rounded-md border px-3 py-1.5 text-sm transition ${
                    mode === "login"
                      ? "border-[#E6DFD3]/60 bg-[#E6DFD3] text-[#0e1214] shadow"
                      : "border-[#3a3f45] text-[#E6DFD3]/80 hover:border-[#E6DFD3]/40"
                  }`}
                >
                  로그인
                </button>
                <button
                  onClick={() => setMode("signup")}
                  className={`rounded-md border px-3 py-1.5 text-sm transition ${
                    mode === "signup"
                      ? "border-[#E6DFD3]/60 bg-[#E6DFD3] text-[#0e1214] shadow"
                      : "border-[#3a3f45] text-[#E6DFD3]/80 hover:border-[#E6DFD3]/40"
                  }`}
                >
                  회원가입
                </button>
              </div>

              {/* 로그인 폼 */}
              {mode === "login" ? (
                <form onSubmit={handleLogin} className="grid gap-3">
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="이메일"
                    className="rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
                  />
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="비밀번호"
                    type="password"
                    className="rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-[#E6DFD3]/60 bg-[#E6DFD3] px-4 py-2 text-sm font-semibold text-[#0e1214] shadow transition hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0"
                  >
                    로그인
                  </button>
                </form>
              ) : (
                /* 회원가입 폼 */
                <form onSubmit={handleSignup} className="grid gap-3">
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="이메일"
                    className="rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
                  />
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="아이디"
                    className="rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
                  />
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="비밀번호"
                    type="password"
                    className="rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-[#E6DFD3]/60 bg-[#E6DFD3] px-4 py-2 text-sm font-semibold text-[#0e1214] shadow transition hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0"
                  >
                    회원가입
                  </button>
                </form>
              )}
            </div>
          )}
        
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.1fr,1fr]">
            <form onSubmit={create} className="rounded-2xl border border-[#2a2f35] bg-[#151a1f] p-5">
              {/* 글 작성 폼(로그인해야 활성화) */}
              <h2 className="mb-3 text-sm tracking-widest text-[#B9B1A3]">
                NEW ENTRY
              </h2>
              <div className="grid gap-3">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={authed ? "제목" : "로그인 후 작성 가능"}
                  disabled={!authed}
                  className="rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40 disabled:opacity-40"
                />
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder={authed ? "내용" : "로그인 후 작성 가능"}
                  disabled={!authed}
                  rows={4}
                  className="resize-none rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40 disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={!authed}
                  className="ml-auto rounded-lg border border-[#E6DFD3]/60 bg-[#E6DFD3] px-4 py-2 text-sm font-semibold text-[#0e1214] shadow transition hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0 disabled:opacity-40"
                >
                  등록
                </button>
              </div>
            </form>
            <aside className="rounded-2xl border border-[#2a2f35] bg-[#151a1f] p-5">
              <h3 className="mb-2 text-sm tracking-widest text-[#B9B1A3]">CONCEPT</h3>
              <p className="text-sm text-[#E6DFD3]/90">
                베이지 포인트의 카세트 퓨처리즘 보드. CRT 감성과 카세트 데크의 물성을 살린 아날로그-레트로 UI. 전광판(LED) 스타일 마퀴와 테이프 릴 애니메이션으로 분위기 구현.
              </p>
              <ul className="mt-3 list-disc pl-5 text-xs text-[#B9B1A3]">
                <li>
                  Primary accent:{" "}
                  <span className="font-semibold text-[#E6DFD3]">Beige</span>
                </li>
                <li>Pointer highlights: Black & Yellow micro-accents</li>
                <li>Surfaces: gunmetal / midnight navy tiers</li>
              </ul>
            </aside>
          </div>

          <div className="flex gap-3 items-center">
            <label className="text-sm text-[#B9B1A3]">페이지당 표시 글</label>
            <select
              value={String(pageSize)}
              onChange={e => setSearchParams({ page: "1", perPage: e.target.value, pages: String(displayPageNum) })}
              className="rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-1.5 text-sm text-[#E6DFD3] focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="30">30</option>
            </select>
          </div>


          {/* Post list (cassette style) */}
          <CassettePostsSection
            posts={cassettePosts}
            onSelect={handleSelectPost}
          />
          <div ref={pagerRef} className="flex flex-wrap gap-2 justify-center items-center mt-4">
            <button
              className="px-3 py-1 border rounded disabled:opacity-40"
              onClick={() => setSearchParams({ page: String(Math.max(1, startPage - 1)), perPage: String(pageSize) })}
              disabled={!hasPrevWindow}
              aria-label="이전 묶음"
            >←</button>

            {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(n => (
              <button
                key={n}
                className={`px-3 py-1 border rounded ${n === page ? "bg-black text-white" : ""}`}
                onClick={() => setSearchParams({ page: String(n), perPage: String(pageSize) })}
              >{n}</button>
            ))}

            <button
              className="px-3 py-1 border rounded disabled:opacity-40"
              onClick={() => setSearchParams({ page: String(endPage + 1), perPage: String(pageSize) })}
              disabled={!hasNextWindow}
              aria-label="다음 묶음"
            >→</button>
          </div>
        </div>
      </CassetteLayout>
    </>
  );
}
