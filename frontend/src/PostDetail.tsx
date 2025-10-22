import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CassetteFooter, CassetteLayout } from "./components";
import { useReallySequenceConfirm } from "./components/useReallySequenceConfirm";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

type Post = {
  id: string;
  title: string;
  body: string;
  author_id: string;
  author_username?: string;
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

function formatDateTime(input?: string) {
  if (!input) return "알 수 없음";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(input));
  } catch {
    return input;
  }
}

function ScrewIcon({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`relative inline-flex ${
        small ? "h-3 w-3" : "h-4 w-4"
      } items-center justify-center rounded-full border ${
        small ? "border-[#2a2f35]" : "border-2 border-[#2a2f35]"
      } bg-[#0d1116] shadow-inner`}
      aria-hidden
    >
      <span className="absolute block h-px w-3 -rotate-45 bg-[#B9B1A3]" />
      <span className="absolute block h-px w-3 rotate-45 bg-[#B9B1A3]" />
    </span>
  );
}

export default function PostDetail() {
  const { id = "" } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [token] = useState<string | null>(() => localStorage.getItem("token"));
  const [liked, setLiked] = useState(false);
  const [me, setMe] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch(`${API}/posts/${id}`);
      if (res.ok) setPost(await res.json());
      else setPost(null);
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch(`${API}/posts/${id}/comments?skip=0&limit=100`);
      if (res.ok) setComments(await res.json());
      else setComments([]);
    })();
  }, [id]);

  useEffect(() => {
    if (!id || !token) return;
    (async () => {
      const res = await fetch(`${API}/posts/${id}/liked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(Boolean(data.liked));
      } else {
        setLiked(false);
      }
    })();
  }, [id, token]);

  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }
    (async () => {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMe(res.ok ? await res.json() : null);
    })();
  }, [token]);

  const reallySeqConfirm = useReallySequenceConfirm(0.5, 9, 120);

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return alert("로그인이 필요합니다.");
    if (!commentBody.trim()) return;

    const res = await fetch(`${API}/posts/${id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ body: commentBody }),
    });

    if (!res.ok) {
      return alert("댓글 작성 실패");
    }

    setCommentBody("");
    const [commentsRes, postRes] = await Promise.all([
      fetch(`${API}/posts/${id}/comments?skip=0&limit=100`),
      fetch(`${API}/posts/${id}`),
    ]);
    if (commentsRes.ok) setComments(await commentsRes.json());
    if (postRes.ok) setPost(await postRes.json());
  }

  async function toggleLike() {
    if (!token) return alert("로그인이 필요합니다.");
    const method = liked ? "DELETE" : "POST";
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

  async function removePost() {
    if (!token) return alert("로그인이 필요합니다.");
    if (!post) return;
    if (!me || me.id !== post.author_id) {
      return alert("작성자만 삭제할 수 있습니다.");
    }

    const ok = await reallySeqConfirm("이 글을 삭제할까요?", {
      title: "삭제 확인",
      danger: true,
      confirmText: "삭제",
      cancelText: "취소",
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

    if (window.history.length > 2) navigate(-1);
    else navigate("/");
  }

  const canDelete = useMemo(
    () => (post && me ? me.id === post.author_id : false),
    [me, post]
  );
  const authorDisplay = useMemo(() => {
    if (!post) return "";
    return post.author_username ?? post.author_id ?? "알 수 없음";
  }, [post]);

  return (
    <CassetteLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <nav className="flex items-center justify-between rounded-2xl border border-[#2a2f35] bg-[#151a1f] px-5 py-3 text-xs text-[#B9B1A3] shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
          <Link
            to="/"
            className="inline-flex items-center gap-2 uppercase tracking-[0.3em] text-[#B9B1A3] transition hover:text-[#E6DFD3]"
          >
            <ScrewIcon small />
            목록으로
          </Link>
          <span className="font-mono tracking-[0.3em] text-[#7f878f]">
            DETAIL VIEW
          </span>
        </nav>

        <section className="overflow-hidden rounded-3xl border border-[#2a2f35] bg-[#151a1f] shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2a2f35] bg-[#11161b] px-6 py-4 text-xs text-[#B9B1A3]">
            <div className="flex items-center gap-3">
              <ScrewIcon />
              <span className="uppercase tracking-[0.4em]">
                {post?.id ?? "LOADING"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-1 text-[#E6DFD3]">
                댓글 {post?.comments_count ?? 0}
              </span>
              <span className="rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-1 text-[#E6DFD3]">
                좋아요 {post?.likes_count ?? 0}
              </span>
            </div>
          </header>

          <div className="space-y-6 px-6 py-8">
            {!post ? (
              <div className="rounded-2xl border border-dashed border-[#2a2f35] bg-[#0f1419] px-4 py-12 text-center text-sm text-[#B9B1A3]">
                불러오는 중...
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold text-[#F3EBDD]">
                    {post.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#B9B1A3]">
                    <span className="rounded-md border border-[#2a2f35] bg-[#10151a] px-3 py-1.5 text-[#E6DFD3]">
                      작성자{" "}
                      <span className="font-semibold text-[#F3EBDD]">
                        {authorDisplay || "알 수 없음"}
                      </span>
                    </span>
                    {post.created_at && (
                      <span className="rounded-md border border-[#2a2f35] bg-[#10151a] px-3 py-1.5 text-[#E6DFD3]">
                        작성일{" "}
                        <span className="font-medium text-[#F3EBDD]">
                          {formatDateTime(post.created_at)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <article className="rounded-2xl border border-[#2a2f35] bg-[#0f1419] p-6 text-[15px] leading-relaxed text-[#E6DFD3]/90 shadow-inner">
                  <div className="whitespace-pre-wrap">{post.body}</div>
                </article>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[#B9B1A3]">
                    <span className="rounded-md border border-[#2a2f35] bg-[#10151a] px-3 py-1">
                      댓글 {comments.length}
                    </span>
                    <span className="rounded-md border border-[#2a2f35] bg-[#10151a] px-3 py-1">
                      좋아요 {post.likes_count}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleLike}
                      disabled={!token}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#E6DFD3]/40 bg-[#E6DFD3]/10 px-4 py-2 text-sm font-semibold text-[#E6DFD3] transition hover:border-[#E6DFD3]/70 hover:bg-[#E6DFD3]/15 disabled:cursor-not-allowed disabled:opacity-40"
                      title={token ? "" : "로그인 필요"}
                    >
                      {liked ? "좋아요 취소" : "좋아요"}
                    </button>
                    {canDelete && (
                      <button
                        onClick={removePost}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-500/60 hover:bg-red-500/20"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-[#2a2f35] bg-[#151a1f] shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          <header className="flex items-center justify-between border-b border-[#2a2f35] px-6 py-4 text-xs uppercase tracking-[0.3em] text-[#B9B1A3]">
            <span>댓글 LOG</span>
            <span className="font-mono text-[#7f878f]">
              {String(comments.length).padStart(2, "0")}
            </span>
          </header>
          <div className="space-y-6 px-6 py-8">
            <form
              onSubmit={addComment}
              className="rounded-2xl border border-[#2a2f35] bg-[#0f1419] p-5 shadow-inner"
            >
              <label
                htmlFor="comment-body"
                className="block text-xs uppercase tracking-[0.3em] text-[#7f878f]"
              >
                신규 댓글
              </label>
              <div className="mt-3 flex flex-col gap-3 md:flex-row">
                <textarea
                  id="comment-body"
                  className="min-h-[96px] flex-1 resize-none rounded-lg border border-[#3a3f45] bg-[#0e1214] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/30 disabled:opacity-40"
                  placeholder={
                    token ? "내용을 입력해주세요." : "로그인 후 작성 가능합니다."
                  }
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  disabled={!token}
                />
                <button
                  type="submit"
                  disabled={!token || !commentBody.trim()}
                  className="rounded-lg border border-[#E6DFD3]/40 bg-[#E6DFD3] px-4 py-2 text-sm font-semibold text-[#0e1214] transition hover:-translate-y-[1px] hover:shadow-lg disabled:translate-y-0 disabled:opacity-40"
                >
                  등록
                </button>
              </div>
            </form>

            <ul className="grid gap-4">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-2xl border border-[#2a2f35] bg-[#0f1419] p-5 text-sm text-[#E6DFD3]/90 shadow-inner"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#B9B1A3]">
                    <span className="inline-flex items-center gap-2">
                      <ScrewIcon small />
                      {c.author_username}
                    </span>
                    <time className="font-mono tracking-[0.2em] text-[#7f878f]">
                      {formatDateTime(c.created_at)}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>
                </li>
              ))}
              {comments.length === 0 && (
                <li className="rounded-2xl border border-dashed border-[#2a2f35] bg-[#0f1419] px-4 py-10 text-center text-xs text-[#7f878f]">
                  아직 댓글이 없습니다.
                </li>
              )}
            </ul>
          </div>
        </section>
      </div>

      <CassetteFooter />
    </CassetteLayout>
  );
}
