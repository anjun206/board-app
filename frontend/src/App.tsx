import React, { useEffect, useRef, useState } from "react";   // React 훅 임포트
import { Link, useSearchParams } from "react-router-dom";

// lib/api 래퍼/도우미 사용
import {
  API_BASE,
  listPosts,
  createPost as apiCreatePost,
  signup as apiSignup,
  login as apiLogin,
  me as apiMe,
  getToken as getStoredToken,
  setToken as saveToken,   // ← 저장용(로컬스토리지) 별칭
  countPosts
} from "./lib/api";

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
    const run = async () => setMe(token ? await apiMe() : null);
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
    } catch {
      alert("로그인 실패");
    }
  }

  // 로그아웃
  function logout() {
    saveToken(null);
    setTokenState(null);
    setMe(null);
  }

  // ---------------------------
  // 렌더링(UI)
  // ---------------------------
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* 상단 바: 제목 + 사용자 정보/로그아웃 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">게시판</h1>
          <Link
            to="/demo/cassette"
            className="text-sm text-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          >
            Cassette 데모
          </Link>
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

      <div className="flex gap-3 items-center">
        <label>페이지당 표시 글</label>
        <select
          value={String(pageSize)}
          onChange={e => setSearchParams({ page: "1", perPage: e.target.value, pages: String(displayPageNum) })}
          className="border rounded px-2 py-1"
        >
          <option value="10">10</option>
          <option value="15">15</option>
          <option value="30">30</option>
        </select>
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
  );
}