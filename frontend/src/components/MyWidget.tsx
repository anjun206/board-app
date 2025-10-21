import React, { useMemo, useState } from "react";

// ------------------------------------------------------------
// Cassette Futurism Bulletin Board – Beige Concept
// Tailwind-only, single-file React component (preview-ready)
// ------------------------------------------------------------
// Aesthetic notes
// - Beige as the primary accent on a deep-space backdrop
// - Cassette deck header with reels (SVG), screw heads, label textures
// - LED marquee (mono style) with soft neon-ish glow
// - Post cards styled like tape cartridges / ship logs
// - Micro-interactions: hover, focus, active
// ------------------------------------------------------------

// Demo seed data
const SEED_POSTS = [
  {
    id: "PX-2309",
    title: "[항해로그] 오리온 회랑 초공간 도약 성공",
    body:
      "연료 소모율 0.92. 점프 후 센서에 미세한 노이즈. 캐패시터 재보정 필요. 승무원 사기 양호.",
    author: "NAV-OPS",
    likes: 17,
    tag: "log",
  },
  {
    id: "PX-2310",
    title: "[정비] 카세트 데크 모듈 – 캡스턴 교체",
    body:
      "재생 중 wow&flutter 증가. 캡스턴 마모로 확인. 베어링 윤활 후 안정화. 예비 부품 주문.",
    author: "ENG-ROOM",
    likes: 9,
    tag: "maint",
  },
  {
    id: "PX-2312",
    title: "[공지] 보드 스킨 업데이트(베이지)",
    body:
      "포인터 컬러는 블랙/옐로우 포인트 유지, 기본 포인트는 따뜻한 베이지로 일괄 조정.",
    author: "SYS-ADM",
    likes: 5,
    tag: "notice",
  },
];

// Tiny utility
function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function BeigeCassetteBoard() {
  const [posts, setPosts] = useState(SEED_POSTS);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("USER-01");
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return posts
      .filter((p) => (filter === "all" ? true : p.tag === filter))
      .filter((p) =>
        (p.title + p.body + p.author).toLowerCase().includes(query.toLowerCase())
      );
  }, [posts, filter, query]);

  function addPost(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setPosts((prev) => [
      {
        id: `PX-${Math.floor(Math.random() * 9000 + 1000)}`,
        title: title.trim(),
        body: body.trim(),
        author: author.trim() || "USER",
        likes: 0,
        tag: "log",
      },
      ...prev,
    ]);
    setTitle("");
    setBody("");
  }

  function like(id: string) {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p))
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1214] text-[#E6DFD3] antialiased">
      {/* Background star specks */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.06]" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#ffffff_1px,transparent_1px)] bg-[length:28px_28px]"></div>
      </div>

      {/* Page container */}
      <div className="relative mx-auto max-w-6xl p-4 md:p-8">
        {/* Cassette Header */}
        <header className="relative overflow-hidden rounded-2xl border border-[#2a2f35] bg-[#151a1f] shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
          {/* Top chrome with screws */}
          <div className="flex items-center justify-between border-b border-[#2a2f35] px-5 py-3">
            <div className="flex items-center gap-3">
              <Screw />
              <span className="tracking-[.2em] text-sm text-[#B9B1A3] uppercase">Cassette Futurism</span>
            </div>
            <div className="flex items-center gap-2 text-[#0B0B0D]">
              <span className="inline-block h-3 w-3 rounded-sm bg-yellow-400" />
              <span className="inline-block h-3 w-3 rounded-sm bg-[#E6DFD3]" />
              <span className="inline-block h-3 w-3 rounded-sm bg-[#B9B1A3]" />
            </div>
          </div>

          {/* Deck face */}
          <div className="grid grid-cols-1 gap-6 p-6">
            {/* Left: marquee + controls */}
            <div className="flex flex-col gap-4">
              {/* LED Marquee */}
              <div className="rounded-xl border border-[#343a40] bg-[#0c1014] p-3 shadow-inner">
                <div className="relative overflow-hidden rounded-lg border border-[#242a30] bg-[#0b0f13]">
                  <div className="absolute inset-0 opacity-25 mix-blend-screen bg-[radial-gradient(circle_at_50%_-30%,#FFEFD0,transparent_60%)]" />
                  <Marquee>
                    <span className="mx-8">WELCOME ABOARD — CASSETTE FUTURISM BOARD</span>
                    <span className="mx-8">BEIGE ACCENT • ANALOG DREAMS • RETRO SPACE OPERA</span>
                    <span className="mx-8">로그인 없이 미리보기 • 글쓰기 가능(로컬)</span>
                  </Marquee>
                </div>
                <p className="mt-2 text-[10px] text-[#B9B1A3]">※ LED 스타일 텍스트 – 소프트 네온 글로우</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { k: "all", label: "All" },
                  { k: "log", label: "Logs" },
                  { k: "maint", label: "Maintenance" },
                  { k: "notice", label: "Notice" },
                ].map(({ k, label }) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={clsx(
                      "rounded-md border px-3 py-1.5 text-sm transition",
                      filter === k
                        ? "border-[#E6DFD3]/60 bg-[#E6DFD3] text-[#0e1214] shadow"
                        : "border-[#3a3f45] text-[#E6DFD3]/80 hover:border-[#E6DFD3]/40"
                    )}
                  >
                    {label}
                  </button>
                ))}
                <div className="ml-auto">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="검색…"
                    className="w-44 rounded-md border border-[#3a3f45] bg-[#11161b] px-3 py-1.5 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
                  />
                </div>
              </div>
            </div>

            {/* Right: cassette reels */}
            <div className="relative rounded-xl border border-[#343a40] bg-[#11161b] p-4">
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.06),transparent)]" />
              <div className="grid grid-cols-2 items-center gap-4">
                <Reel />
                <Reel reverse />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-[#B9B1A3]">
                <span>REEL A</span>
                <span>MECHANISM</span>
                <span>REEL B</span>
              </div>
              <div className="mt-3 rounded-md bg-[#E6DFD3] p-2 text-center text-xs font-semibold text-[#0e1214]">
                CASSETTE LABEL: BEIGE / TYPE-II CHROME
              </div>
            </div>
          </div>
        </header>

        {/* Composer */}
        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[1.1fr,1fr]">
          <form onSubmit={addPost} className="rounded-2xl border border-[#2a2f35] bg-[#151a1f] p-5">
            <h2 className="mb-3 text-sm tracking-widest text-[#B9B1A3]">NEW ENTRY</h2>
            <div className="grid gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목"
                className="rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="내용"
                rows={4}
                className="resize-none rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
              />
              <div className="flex items-center gap-2">
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="작성자"
                  className="w-40 rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
                />
                <button
                  type="submit"
                  className="ml-auto rounded-lg border border-[#E6DFD3]/60 bg-[#E6DFD3] px-4 py-2 text-sm font-semibold text-[#0e1214] shadow hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0 transition"
                >
                  게시
                </button>
              </div>
            </div>
          </form>

          {/* About / concept panel */}
          <aside className="rounded-2xl border border-[#2a2f35] bg-[#151a1f] p-5">
            <h3 className="mb-2 text-sm tracking-widest text-[#B9B1A3]">CONCEPT</h3>
            <p className="text-sm text-[#E6DFD3]/90">
              베이지 포인트의 카세트 퓨처리즘 보드. CRT 감성과 카세트 데크의 물성을 살린 아날로그-레트로 UI. 전광판(LED) 스타일 마퀴와 테이프 릴 애니메이션으로 분위기 구현.
            </p>
            <ul className="mt-3 list-disc pl-5 text-xs text-[#B9B1A3]">
              <li>Primary accent: <span className="font-semibold text-[#E6DFD3]">Beige</span></li>
              <li>Pointer highlights: Black & Yellow micro-accents</li>
              <li>Surfaces: gunmetal / midnight navy tiers</li>
            </ul>
          </aside>
        </section>

        {/* Posts */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm tracking-widest text-[#B9B1A3]">POSTS</h2>
            <span className="text-xs text-[#B9B1A3]">{filtered.length} 결과</span>
          </div>
          <div className="grid gap-4">
            {filtered.map((p) => (
              <article
                key={p.id}
                className="group relative overflow-hidden rounded-2xl border border-[#2a2f35] bg-[#14191e] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition hover:border-[#E6DFD3]/40"
              >
                {/* Tape top bar */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-[#B9B1A3]">
                    <Screw small />
                    <span className="uppercase tracking-[0.3em]">{p.id}</span>
                  </div>
                  <span className={clsx(
                    "rounded px-2 py-0.5 text-[10px] uppercase tracking-wider",
                    p.tag === "notice" && "bg-yellow-400 text-[#0e1214]",
                    p.tag === "maint" && "bg-[#E6DFD3]/20 text-[#E6DFD3] border border-[#E6DFD3]/40",
                    p.tag === "log" && "bg-[#0f1419] text-[#B9B1A3] border border-[#2a2f35]"
                  )}>
                    {p.tag}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-[#F3EBDD]">{p.title}</h3>
                <p className="mt-1 text-sm text-[#DAD3C6]">{p.body}</p>

                <div className="mt-3 flex items-center justify-between text-xs text-[#B9B1A3]">
                  <span>by {p.author}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => like(p.id)}
                      className="rounded-md border border-[#3a3f45] bg-[#10151a] px-2 py-1 text-[#E6DFD3] transition hover:border-[#E6DFD3]/50"
                    >
                      👍 {p.likes}
                    </button>
                    <button className="rounded-md border border-[#3a3f45] bg-[#10151a] px-2 py-1 transition hover:border-yellow-400/60 hover:text-yellow-400">
                      💬 댓글
                    </button>
                  </div>
                </div>

                {/* Tape window shine */}
                <div className="pointer-events-none absolute -right-6 -top-10 h-40 w-40 rotate-45 rounded-full bg-[radial-gradient(circle,#FFEFD0_0%,transparent_60%)] opacity-10" />
              </article>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 pb-8 text-center text-[11px] text-[#7f878f]">
          <p>© 2025 Cassette Futurism Board — Beige Concept</p>
        </footer>
      </div>

      {/* Local styles for marquee & reels */}
      <style>{`
        .marquee {
          display: inline-block;
          padding-left: 100%;
          white-space: nowrap;
          animation: marquee 18s linear infinite;
          text-shadow: 0 0 6px rgba(255, 239, 208, 0.55), 0 0 18px rgba(255, 221, 156, 0.35);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          letter-spacing: 0.08em;
        }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
        .reel-spin { animation: reel 9s linear infinite; transform-origin: 50% 50%; }
        .reel-spin.reverse { animation-direction: reverse; }
        @keyframes reel { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
      `}</style>
    </div>
  );
}

function Marquee({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-10 overflow-hidden bg-[#0b0f13]">
      <div className="absolute inset-0 bg-[linear-gradient(#0b0f13_60%,rgba(255,255,255,0.03)_61%,#0b0f13_62%)] opacity-40" />
      <div className="marquee text-[12px] leading-10 text-[#FFEFD0]">{children}</div>
    </div>
  );
}

function Reel({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className="relative mx-auto aspect-square w-36 rounded-full border border-[#2e343a] bg-[#0f1419] p-3 shadow-inner">
      <svg viewBox="0 0 100 100" className={clsx("reel-spin", reverse && "reverse")}> 
        <circle cx="50" cy="50" r="45" fill="#0f1419" stroke="#3a3f45" strokeWidth="2" />
        {/* spokes */}
        {[...Array(6)].map((_, i) => {
          const a = (i * Math.PI) / 3;
          const x = 50 + 35 * Math.cos(a);
          const y = 50 + 35 * Math.sin(a);
          return <line key={i} x1="50" y1="50" x2={x} y2={y} stroke="#E6DFD3" strokeWidth="2" strokeLinecap="round" />;
        })}
        {/* hub */}
        <circle cx="50" cy="50" r="6" fill="#E6DFD3" />
        {/* outer ticks */}
        {[...Array(24)].map((_, i) => {
          const a = (i * Math.PI) / 12;
          const x1 = 50 + 42 * Math.cos(a);
          const y1 = 50 + 42 * Math.sin(a);
          const x2 = 50 + 45 * Math.cos(a);
          const y2 = 50 + 45 * Math.sin(a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#B9B1A3" strokeWidth="1" />;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.12),transparent_50%)]" />
    </div>
  );
}

function Screw({ small = false }: { small?: boolean }) {
  return (
    <div
      className={clsx(
        "relative inline-block rounded-full bg-[#0d1116] shadow-inner",
        small ? "h-3 w-3 border border-[#2a2f35]" : "h-4 w-4 border-2 border-[#2a2f35]"
      )}
      aria-hidden
    >
      <div className="absolute left-1/2 top-1/2 h-[1px] w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#B9B1A3]" />
      <div className="absolute left-1/2 top-1/2 h-[1px] w-3 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-[#B9B1A3]" />
    </div>
  );
}
