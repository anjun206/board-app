import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useReallySequenceConfirm } from "./components/useReallySequenceConfirm";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

type Post = {
  id: string;
  title: string;
  body: string;
  author_id: string;
  comments_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
};

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  author_username: string;
  body: string;
  created_at: string;
};

type User = { id: string; email: string; username: string };

export default function PostDetail() {
  // 1) URL의 :id 읽기 (예: /posts/652f...)
  const { id = "" } = useParams();

  // 2) 화면 상태들 -----------------------------
  const [post, setPost] = useState<Post | null>(null); // 현재 글
  const [comments, setComments] = useState<Comment[]>([]); // 댓글 리스트
  const [commentBody, setCommentBody] = useState(""); // 댓글 입력값
  const [token] = useState<string | null>(() => localStorage.getItem("token")); // 로컬스토리지 JWT
  const [liked, setLiked] = useState(false);
  const [me, setMe] = useState<User | null>(null);
  const navigate = useNavigate();

  // 글 상세 로드 -----------------------------
  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch(`${API}/posts/${id}`);
      if (res.ok) setPost(await res.json());
    })();
  }, [id]);

  // 댓글 목록 로드 ------------------------------
  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch(`${API}/posts/${id}/comments?skip=0&limit=100`);
      if (res.ok) setComments(await res.json());
    })();
  }, [id]);

  // 좋아요 상태 로드 -----------------------------
  useEffect(() => {
    if (!id || !token) return;
    (async () => {
      const res = await fetch(`${API}/posts/${id}/liked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(!!data.liked);
      } else {
        setLiked(false);
      }
    })();
  }, [id, token]);

  // 내 정보 로드 --------------------------------
  useEffect(() => {
    if (!token) { setMe(null); return; }
    (async () => {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMe(res.ok ? await res.json() : null);
    })();
  }, [token]);

  // 댓글 등록 -------------------------------
  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return alert("로그인이 필요합니다.");
    if (!commentBody.trim()) return;

    const res = await fetch(`${API}/posts/${id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // JWT 전달 (백엔드에서 인증)
      },
      body: JSON.stringify({ body: commentBody }),
    });

    if (!res.ok) {
      return alert("댓글 등록 실패");
    }

    // 입력 초기화 + 댓글 목록 새로고침
    setCommentBody("");
    const [cRes, pRes] = await Promise.all([
      fetch(`${API}/posts/${id}/comments?skip=0&limit=100`),
      fetch(`${API}/posts/${id}`)
    ]);
    if (cRes.ok) setComments(await cRes.json());
    if (pRes.ok) setPost(await pRes.json());

    // 글의 댓글 수 갱신을 위해 글도 다시 로드
    const postRes = await fetch(`${API}/posts/${id}`);
    if (postRes.ok) setPost(await postRes.json());
  }

  // 좋아요 토글 ----------------------------------
  async function toggleLike() {
    if (!token) return alert("로그인이 필요합니다");
    const method = liked  ? "DELETE" : "POST";
    const res = await fetch(`${API}/posts/${id}/likes`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return alert("좋아요 처리 실패");
    }
    setLiked(!liked);
    const postRes = await fetch(`${API}/posts/${id}`);
    if (postRes.ok) setPost(await postRes.json());
  }

  if (!post) {
    return <div className="max-w-3xl mx-auto p-6">로딩중…</div>;
  }

  // 삭제 ----------------------------------
  const reallySeqConfirm = useReallySequenceConfirm(0.4, 6, 120); // (p, max, delayMs)

  async function removePost() {
    if (!token) return alert("로그인이 필요합니다.");
    if (!post) return;
    if (!me || me.id !== post.author_id) {
      return alert("본인 글만 삭제할 수 있어요.");
    }

    const ok = await reallySeqConfirm("이 글을 삭제할까요?", {
      title: "삭제 확인",
      danger: true,
      confirmText: "삭제",  // 라벨 커스텀 예시
      cancelText: "취소",
      // clickOutsideToCancel: false, // 필요하면 바깥클릭 방지
    });
    if (!ok) return;

    const res = await fetch(`${API}/posts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const msg = await res.text();
      return alert(`삭제 실패: ${res.status} ${msg}`);
    }

    // 목록으로 돌아가기(히스토리 있으면 뒤로, 없으면 홈)
    if (window.history.length > 2) navigate(-1);
    else navigate("/");
  }

  // 화면 ------------------------------------
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* 상단: 목록으로 */}
      <div>
        <Link to="/" className="text-sm text-gray-600 hover:underline">← 목록</Link>
      </div>

      {/* 글 본문 */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{post.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {/* 댓글/좋아요 수 요약 */}
          <span>💬 {post.comments_count} · 👍 {post.likes_count}</span>
          <button
            onClick={toggleLike}
            disabled={!token}
            className="px-2 py-1 border rounded disabled:opacity-40"
            title={token ? "" : "로그인 필요"}
          >
            {liked ? "좋아요 취소" : "좋아요"}
          </button>
          {me?.id === post.author_id && (
            <button
              onClick={removePost}
              className="px-2 py-1 border rounded text-red-600 hover:bg-red-50"
              title="글 삭제"
              >
                삭제
              </button>
          )}
        </div>
        <div className="whitespace-pre-wrap">{post.body}</div>
      </div>

      {/* 댓글 입력 (로그인 필요) */}
      <div className="border rounded p-4 space-y-3">
        <div className="font-semibold">댓글</div>
        <form onSubmit={addComment} className="flex gap-2">
          <input
            className="flex-1 border rounded p-2"
            placeholder={token ? "댓글을 입력하세요…" : "로그인 후 댓글 작성 가능"}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            disabled={!token}
          />
          <button
            className="px-3 py-1 border rounded"
            disabled={!token || !commentBody.trim()}
          >
            등록
          </button>
        </form>

        {/* 댓글 목록 */}
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="border rounded p-2">
              <div className="text-sm text-gray-600 mb-1">
                {c.author_username}
              </div>
              <div className="whitespace-pre-wrap">{c.body}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
