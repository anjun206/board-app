import React, { useEffect, useState } from "react";   // React 훅 임포트
import { Link, useSearchParams } from "react-router-dom";

/**
 * API 서버 주소
 * - Vite에서는 .env 혹은 docker-compose의 환경변수를 통해 VITE_* 값을 주입할 수 있음
 * - 설정이 없으면 http://localhost:8000 으로 기본값
 */
const API = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

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

const PAGE_SIZE = 10;

export default function App() {
  // ---------------------------
  // 상태 정의(React state)
  // ---------------------------
  const [posts, setPosts] = useState<Post[]>([]); // 글 목록
  const [title, setTitle] = useState("");         // 입력폼: 제목
  const [body, setBody] = useState("");           // 입력폼: 내용

  // ---- 인증 상태 ----
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token")); // LocalStorage에서 복구
  const [me, setMe] = useState<User | null>(null);           // 현재 로그인 사용자

  // ---- 로그인/회원가입 폼 ----
  const [mode, setMode] = useState<"login" | "signup">("login"); // 폼 탭 전환
  const [email, setEmail] = useState("");                    // 로그인/가입 공용 이메일
  const [username, setUsername] = useState("");              // 가입 전용 사용자명
  const [password, setPassword] = useState("");              // 로그인/가입 공용 비밀번호

  const authed = Boolean(token);                             // 토큰 존재 여부로 로그인판단

  const [hasMore, setHasMore] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const pageFromQS = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageFromQS) && pageFromQS > 0 ? pageFromQS : 1;

  /**
   * 글 목록 로드
   * - GET /posts 호출 → JSON으로 파싱 → posts 상태에 반영
   */
  async function loadPosts(pg = 1) {
    const skip = (pg - 1) * PAGE_SIZE;
    const res = await fetch(`${API}/posts?skip=${skip}&limit=${PAGE_SIZE}`);
    const data = await res.json();
    setPosts(data);
    setHasMore(data.length === PAGE_SIZE); // 꽉 차면 다음 페이지가 있을 가능성
  }

  async function fetchMe(tok: string) {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (res.ok) setMe(await res.json());
    else setMe(null);
  }

  useEffect(() => {
    loadPosts(page);
  }, [page]);

  useEffect(() => {                                          // 마운트/토큰변경 시 실행
    if (token) fetchMe(token);
    else setMe(null);
  }, [token]);

  // 글 등록(로그인 필요)
  async function create(e: React.FormEvent) {
    e.preventDefault();                                      // 폼 기본 제출 막기
    if (!authed) return;                                     // 미로그인 가드
    await fetch(`${API}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,                    // ★ 토큰 첨부
      },
      body: JSON.stringify({ title, body }),
    });
    setTitle(""); setBody("");                               // 입력 초기화
    setSearchParams({ page: "1" });                          // 1페이지로 이동 (URL 쿼리 갱신)
    await loadPosts(1);
  }

  // 회원가입
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),   // 가입 정보
    });
    if (res.ok) {
      alert("회원가입 완료 로그인 해주세요");
      setMode("login");                                      // 로그인 탭으로 전환
    } else {
      alert("회원가입 실패");
    }
  }

  // 로그인(JSON)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),             // 이메일/비밀번호
    });
    if (!res.ok) return alert("로그인 실패");
    const data: TokenResp = await res.json();                // 토큰 + 유저 정보
    localStorage.setItem("token", data.access_token);        // 브라우저에 저장
    setToken(data.access_token);                             // 상태 반영
    setMe(data.user);                                        // 사용자 표시
    setEmail(""); setPassword("");                           // 폼 초기화
  }

  // 로그아웃
  function logout() {
    localStorage.removeItem("token");                        // 토큰 제거
    setToken(null);
    setMe(null);
  }

  // ---------------------------
  // 렌더링(UI)
  // ---------------------------
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* 상단 바: 제목 + 사용자 정보/로그아웃 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">게시판</h1>
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

      {/* 인증 영역(비로그인 시에만 노출) */}
      {!authed && (
        <div className="border rounded p-4 space-y-3">
          {/* 탭 전환 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("login")}
              className={`px-3 py-1 border rounded ${mode==="login" ? "bg-black text-white" : ""}`}
            >로그인</button>
            <button
              onClick={() => setMode("signup")}
              className={`px-3 py-1 border rounded ${mode==="signup" ? "bg-black text-white" : ""}`}
            >회원가입</button>
          </div>

          {/* 로그인 폼 */}
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-2">
              <input className="w-full border rounded p-2" placeholder="이메일"
                     value={email} onChange={e=>setEmail(e.target.value)} />
              <input className="w-full border rounded p-2" placeholder="비밀번호" type="password"
                     value={password} onChange={e=>setPassword(e.target.value)} />
              <button className="px-4 py-2 rounded bg-black text-white">로그인</button>
            </form>
          ) : (
          /* 회원가입 폼 */
            <form onSubmit={handleSignup} className="space-y-2">
              <input className="w-full border rounded p-2" placeholder="이메일"
                     value={email} onChange={e=>setEmail(e.target.value)} />
              <input className="w-full border rounded p-2" placeholder="아이디"
                     value={username} onChange={e=>setUsername(e.target.value)} />
              <input className="w-full border rounded p-2" placeholder="비밀번호" type="password"
                     value={password} onChange={e=>setPassword(e.target.value)} />
              <button className="px-4 py-2 rounded bg-black text-white">회원가입</button>
            </form>
          )}
        </div>
      )}

      {/* 글 작성 폼(로그인해야 활성화) */}
      <form onSubmit={create} className="space-y-3">
        <input className="w-full border rounded p-2"
               value={title} onChange={e=>setTitle(e.target.value)}
               placeholder={authed ? "제목" : "로그인 후 작성 가능"} disabled={!authed} />
        <textarea className="w-full border rounded p-2"
                  value={body} onChange={e=>setBody(e.target.value)}
                  placeholder={authed ? "내용" : "로그인 후 작성 가능"} disabled={!authed} />
        <button disabled={!authed}
                className="px-4 py-2 rounded bg-black text-white disabled:opacity-40">
          등록
        </button>
      </form>

      {/* 글 목록 */}
      <ul className="space-y-3">
        {posts.map(p => (
          <li key={p.id} className="border rounded p-3">
            <Link
              to={`/posts/${p.id}`}
              className="font-semibold hover:underline"
            >
              {p.title}{" "}
              <span className="text-sm text-gray-500">
                (💬 {p.comments_count ?? 0} · 👍 {p.likes_count ?? 0})
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 justify-center items-center mt-4">
        <button
          className="px-3 py-1 border rounded disabled:opacity-40"
          onClick={() => setSearchParams({ page: String(Math.max(1, page - 1)) })}
          disabled={page === 1}
        >
          이전
        </button>
        <span className="px-2 py-1">Page {page}</span>
        <button
          className="px-3 py-1 border rounded disabled:opacity-40"
          onClick={() => setSearchParams({ page: String(page + 1) })}
          disabled={!hasMore}
        >
          다음
        </button>
      </div>
    </div>
  );
}