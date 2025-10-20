/**
 * API 서버 주소
 * - Vite에서는 .env 혹은 docker-compose의 환경변수를 통해 VITE_* 값을 주입할 수 있음
 * - 설정이 없으면 http://localhost:8000 으로 기본값
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

/** 서버 타입 (필요한 것만 노출) */
export type User = { id: string; email: string; username: string };
export type TokenResp = { access_token: string; token_type: string; user: User };

const LS_TOKEN = "token";
// --- 토큰 유틸 ---
export function getToken() {
  return localStorage.getItem("token");
}
export const setToken = (t: string | null) => {
  if (t) localStorage.setItem(LS_TOKEN, t);
  else localStorage.removeItem(LS_TOKEN);
};

// 401이 떨어지면 전역 이벤트를 쏴서 화면이 알아서 반응하도록
function notifyLoggedOut() {
  window.dispatchEvent(new CustomEvent("auth:logout"));
}

/** 공통 요청 함수
 * - auth=true면 자동으로 Authorization 헤더 첨부
 * - 401이면 토큰 비우고 'auth:logout' 이벤트 발생
 */
async function request(
  path: string,
  init: RequestInit = {},
  opts: { auth?: boolean } = {}
): Promise<Response> {
  // 항상 Headers 인스턴스로 통일
  const headers = new Headers(init.headers);

  // JSON 바디면 Content-Type 기본 지정
  const isFormData = init.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // 인증 필요 시 토큰 첨부
  if (opts.auth) {
    const tok = getToken();
    if (tok) headers.set("Authorization", `Bearer ${tok}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    setToken(null);
    notifyLoggedOut();
  }
  return res;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const t = getToken();

  // body가 있을 때만 Content-Type 기본값 세팅
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (t && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${t}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, mode: "cors" });

  // 토큰 만료 시 전역 이벤트
  if (res.status === 401) {
    window.dispatchEvent(new Event("auth:logout"));
  }
  return res;
}

export async function countPosts(): Promise<number> {
  const res = await apiFetch("/posts/count", { headers: new Headers() });
  if (!res.ok) return 0;
  const data = await res.json();
  return Number(data.total ?? 0);
}

// ---------- 개별 API등 ------------
export async function signup(email: string, username: string, password: string) {
    return request("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, username, password }),
    });
}

export async function login(email: string, password: string) {
    const res = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
        const data: TokenResp = await res.json();
        setToken(data.access_token);
        return data;
    }
    throw new Error("login failed");
}

export async function me(): Promise<User | null> {
  const res = await request("/auth/me", {}, { auth: true });
  return res.ok ? await res.json() : null;
}

export async function listPosts(skip: number, limit: number) {
  const res = await request(`/posts?skip=${skip}&limit=${limit}`);
  if (!res.ok) throw new Error(`listPosts failed: ${res.status}`);
  return res.json();
}

export async function createPost(title: string, body: string) {
  const res = await request(
    "/posts",
    { method: "POST", body: JSON.stringify({ title, body }) },
    { auth: true }
  );
  if (!res.ok) throw new Error(`createPost failed: ${res.status}`);
  return res.json();
}

export async function getPost(id: string) {
  const res = await request(`/posts/${id}`);
  if (!res.ok) throw new Error("getPost failed");
  return res.json();
}

export async function deletePost(id: string) {
  const res = await request(`/posts/${id}`, { method: "DELETE" }, { auth: true });
  if (!res.ok) throw new Error("deletePost failed");
}

export async function listComments(postId: string, skip = 0, limit = 100) {
  const res = await request(`/posts/${postId}/comments?skip=${skip}&limit=${limit}`);
  if (!res.ok) throw new Error("listComments failed");
  return res.json();
}

export async function addComment(postId: string, body: string) {
  const res = await request(
    `/posts/${postId}/comments`,
    { method: "POST", body: JSON.stringify({ body }) },
    { auth: true }
  );
  if (!res.ok) throw new Error("addComment failed");
  return res.json();
}

export async function liked(postId: string): Promise<boolean> {
  const res = await request(`/posts/${postId}/liked`, {}, { auth: true });
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.liked;
}

export async function like(postId: string) {
  const res = await request(`/posts/${postId}/likes`, { method: "POST" }, { auth: true });
  if (!res.ok) throw new Error("like failed");
}

export async function unlike(postId: string) {
  const res = await request(`/posts/${postId}/likes`, { method: "DELETE" }, { auth: true });
  if (!res.ok) throw new Error("unlike failed");
}