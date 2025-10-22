import React, { useEffect, useRef, useMemo, useState } from "react";
import neodgmTTF from "../../public/fonts/neodgm.ttf"
import neodgmCodeTTF from "../../public/fonts/neodgm_code.ttf"

export type TagKey = "log" | "maint" | "notice";
type FilterKey = "all" | TagKey;

type Post = {
  id: string;
  title: string;
//   body: string;
  author: string;
  likes: number;
  comments?: number;
  tag: TagKey;
};

type ExternalPost = {
  id: string;
  title: string;
  body: string;
  author?: string | null;
  likes?: number | null;
  comments?: number | null;
  tag?: TagKey | null;
};

interface MyWidgetProps {
  posts?: ExternalPost[];
  readOnly?: boolean;
  onLike?: (id: string) => void;
  onSelectPost?: (id: string) => void;
}

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "log", label: "Logs" },
  { key: "maint", label: "Maintenance" },
  { key: "notice", label: "Notice" },
] as const;

const FONT_STACKS = {
  neo: '"NeoDunggeunmo", ui-sans-serif, system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  code: '"NeoDunggeunmoCode", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};


const SEED_POSTS: Post[] = [
  {
    id: "PX-2309",
    title: "[항해로그] 오리온 회랑 초공간 도약 성공",
    // body:
    //   "연료 소모율 0.92. 점프 후 센서에 미세한 노이즈. 캐패시터 재보정 필요. 승무원 사기 양호.",
    author: "NAV-OPS",
    likes: 17,
    comments: 4,
    tag: "log",
  },
  {
    id: "PX-2310",
    title: "[정비] 카세트 데크 모듈 – 캡스턴 교체",
    // body:
    //   "재생 중 wow&flutter 증가. 캡스턴 마모로 확인. 베어링 윤활 후 안정화. 예비 부품 주문.",
    author: "ENG-ROOM",
    likes: 9,
    comments: 2,
    tag: "maint",
  },
  {
    id: "PX-2312",
    title: "[공지] 보드 스킨 업데이트(베이지)",
    // body:
    //   "포인터 컬러는 블랙/옐로우 포인트 유지, 기본 포인트는 따뜻한 베이지로 일괄 조정.",
    author: "SYS-ADM",
    likes: 5,
    comments: 1,
    tag: "notice",
  },
];

function normalizePost(input: ExternalPost): Post {
  const authorSource = input.author ?? "USER";
  const author =
    typeof authorSource === "string" && authorSource.trim().length > 0
      ? authorSource.trim()
      : "USER";
  const likes =
    typeof input.likes === "number" && Number.isFinite(input.likes)
      ? input.likes
      : 0;
  const comments =
    typeof input.comments === "number" && Number.isFinite(input.comments)
      ? input.comments
      : 0;

  return {
    id: input.id,
    title: input.title,
    // body: input.body,
    author,
    likes,
    comments,
    tag: input.tag ?? "log",
  };
}

// Tailwind 클래스 문자열을 가볍게 합성하는 헬퍼입니다.
function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
// 메인 데모 컴포넌트: 분리된 UI 조각을 조합하고 더미 데이터를 관리합니다.
export default function MyWidget({
  posts: externalPosts,
  readOnly = false,
  onLike,
  onSelectPost,
}: MyWidgetProps = {}) {
  const [posts, setPosts] = useState<Post[]>(() =>
    externalPosts ? externalPosts.map(normalizePost) : SEED_POSTS
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("USER-01");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  type TransportMode = "stop" | "play" | "double";

  const BASE_RPS_CONST = 0.25; // your original base motor speed
  const [transport, setTransport] = useState<TransportMode>("play");
  const [isRec, setIsRec] = useState(false);

  const filtered = useMemo(() => {
    const scoped =
      filter === "all" ? posts : posts.filter((p) => p.tag === filter);
    return scoped.filter((p) =>
      (p.title + p.author)
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [posts, filter, query]);

  useEffect(() => {
    if (!externalPosts) return;
    setPosts(externalPosts.map(normalizePost));
  }, [externalPosts]);

  const handleCreate: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (readOnly) return;
    if (!title.trim() || !body.trim()) return;

    setPosts((prev) => [
      {
        id: `PX-${Math.floor(Math.random() * 9000 + 1000)}`,
        title: title.trim(),
        body: body.trim(),
        author: author.trim() || "USER",
        likes: 0,
        comments: 0,
        tag: "log",
      },
      ...prev,
    ]);
    setTitle("");
    setBody("");
  };

  function handleLike(id: string) {
    if (onLike) {
      onLike(id);
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p))
    );
  }

  return (
    <CassetteLayout>
      <CassetteHeader
        filter={filter}
        onFilterChange={setFilter}
        query={query}
        onQueryChange={setQuery}
      />

      {!readOnly && (
        <ComposerSection
          title={title}
          body={body}
          author={author}
          onTitleChange={setTitle}
          onBodyChange={setBody}
          onAuthorChange={setAuthor}
          onSubmit={handleCreate}
        />
      )}

      <PostsSection posts={filtered} onLike={handleLike} onSelect={onSelectPost} />
      <CassetteFooter />
    </CassetteLayout>
  );
}
// 화면 전체 배경과 공용 스타일을 감싸는 레이아웃 래퍼입니다.
export function CassetteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-[#0e1214] text-[#E6DFD3] antialiased"
      style={{ fontFamily: FONT_STACKS.neo }}
    >
      <NeoFontStyles />

      <div className="pointer-events-none fixed inset-0 opacity-[0.06]" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#ffffff_1px,transparent_1px)] bg-[length:28px_28px]" />
      </div>
      <div className="relative mx-auto max-w-6xl p-4 md:p-8">{children}</div>
      <GlobalCassetteStyles />
    </div>
  );
}

interface CassetteHeaderProps {
  filter: FilterKey;
  onFilterChange: (value: FilterKey) => void;
  query: string;
  onQueryChange: (value: string) => void;
}
// 상단 카세트 헤더: LED 마퀴, 필터 UI, 릴 패널을 묶습니다.
export function CassetteHeader({
  filter,
  onFilterChange,
  query,
  onQueryChange,
}: CassetteHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-[#2a2f35] bg-[#151a1f] shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-[#2a2f35] px-5 py-3">
        <div className="flex items-center gap-3">
          <Screw />
          <span className="tracking-[.2em] text-sm text-[#B9B1A3] uppercase">
            Cassette Futurism
          </span>
        </div>
        <div className="flex items-center gap-2 text-[#0B0B0D]">
          <span className="inline-block h-3 w-3 rounded-sm bg-yellow-400" />
          <span className="inline-block h-3 w-3 rounded-sm bg-[#E6DFD3]" />
          <span className="inline-block h-3 w-3 rounded-sm bg-[#B9B1A3]" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-6">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[#343a40] bg-[#0c1014] p-3 shadow-inner">
            <div className="relative overflow-hidden rounded-lg border border-[#242a30] bg-[#0b0f13]">
              <div className="absolute inset-0 opacity-25 mix-blend-screen bg-[radial-gradient(circle_at_50%_-30%,#FFEFD0,transparent_60%)]" />
              <Marquee>
                <span className="mx-8">
                  웰컴 어보드 - 카세트 퓨처리즘 게시판
                </span>
                <span className="mx-8">
                  아-날로그 물성 - 레트로 스페이스 오페라
                </span>
                <span className="mx-8">
                  로그인 없이 미리보기 • 글 확인 가능
                </span>
              </Marquee>
            </div>
            <p className="mt-2 text-[10px] text-[#B9B1A3]">
              ※ LED 스타일 텍스트 - 소프트 네온 글로우
            </p>
          </div>

          <FilterBar
            filter={filter}
            onFilterChange={onFilterChange}
            query={query}
            onQueryChange={onQueryChange}
          />
        </div>

        <CassettePanel />
      </div>
    </header>
  );
}

interface FilterBarProps {
  filter: FilterKey;
  onFilterChange: (value: FilterKey) => void;
  query: string;
  onQueryChange: (value: string) => void;
}
// 필터 버튼과 검색 입력 필드를 담당하는 서브 컴포넌트입니다.
function FilterBar({
  filter,
  onFilterChange,
  query,
  onQueryChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTER_OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onFilterChange(key)}
          className={clsx(
            "rounded-md border px-3 py-1.5 text-sm transition",
            filter === key
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
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="...검색"
          className="w-44 rounded-md border border-[#3a3f45] bg-[#11161b] px-3 py-1.5 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
        />
      </div>
    </div>
  );
}
// 순수 시각적 요소인 카세트 릴 장식입니다.
function CassettePanel() {
    return <ReelsInteractive />;
}

/** Interactive cassette reels with motor + drag + inertia + sync */
function ReelsInteractive() {
  // physics params (tweak freely)
  const BASE_RPS = 0.25;            // base rotation per second (revolutions)
  const BASE_OMEGA = BASE_RPS * 2 * Math.PI; // rad/s (left reel +, right reel -)
  const RETURN_RATE = 2.0;          // how fast we blend back to base speed (1/s)
  const FRICTION = 0.15;            // passive damping when not dragging (1/s)
  const MAX_OMEGA = 8 * Math.PI;    // clamp spin madness (rad/s)

  // master angle/velocity (left reel). right reel mirrors it.
  const [angle, setAngle] = useState(0);      // radians
  const angleRef = useRef(angle);
  const [omega, setOmega] = useState(BASE_OMEGA);
  const omegaRef = useRef(omega);

  // dragging state
  const draggingRef = useRef<null | {
    reel: "left" | "right";
    centerX: number;
    centerY: number;
    prevPointerAngle: number; // screen angle last frame
  }>(null);

  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  // keep refs hot
  useEffect(() => { angleRef.current = angle; }, [angle]);
  useEffect(() => { omegaRef.current = omega; }, [omega]);

  // rAF loop
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();

    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - prev) / 1000)); // clamp dt
      prev = now;

      const dragging = draggingRef.current;

      let nextAngle = angleRef.current;
      let nextOmega = omegaRef.current;

      if (dragging) {
        // while grabbing: follow pointer angle, compute instantaneous omega
        // (we keep the master angle in left-reel space; right reel is mirrored)
        const { centerX, centerY, reel, prevPointerAngle } = dragging;
        const screenAngle = getPointerScreenAngle(latestPointerPos.x, latestPointerPos.y, centerX, centerY);

        // unwrap delta to (-PI..PI)
        let d = screenAngle - prevPointerAngle;
        d = unwrapDelta(d);

        dragging.prevPointerAngle = screenAngle; // update

        // map to master space (right reel is mirrored)
        const mapped = reel === "left" ? d : -d;

        // integrate: angle follows pointer, omega from pointer velocity
        nextAngle = nextAngle + mapped;
        nextOmega = mapped / Math.max(1e-6, dt); // rad/s from last delta
      } else {
        // free run: apply damping + return-to-base-speed
        const target = BASE_OMEGA; // base for left reel
        const blend = 1 - Math.exp(-RETURN_RATE * dt); // exponential approach
        nextOmega = nextOmega + (target - nextOmega) * blend;

        // light friction so wild flicks decay
        nextOmega *= Math.exp(-FRICTION * dt);

        // integrate
        nextAngle = nextAngle + nextOmega * dt;
      }

      // clamp absurd speeds
      if (nextOmega >  MAX_OMEGA) nextOmega =  MAX_OMEGA;
      if (nextOmega < -MAX_OMEGA) nextOmega = -MAX_OMEGA;

      // commit
      setAngle(nextAngle);
      setOmega(nextOmega);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // pointer tracking (we keep last pos globally to avoid extra listeners on window)
  const latestPointerPos = useRef({ x: 0, y: 0 }).current;

  // shared handlers
  const onPointerDown = (reel: "left" | "right", ref: React.RefObject<HTMLDivElement>) =>
    (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const rect = ref.current!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      latestPointerPos.x = e.clientX;
      latestPointerPos.y = e.clientY;
      const startAngle = getPointerScreenAngle(e.clientX, e.clientY, cx, cy);

      draggingRef.current = {
        reel,
        centerX: cx,
        centerY: cy,
        prevPointerAngle: startAngle,
      };
    };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    latestPointerPos.x = e.clientX;
    latestPointerPos.y = e.clientY;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    // release: keep whatever omega the user imparted; rAF will ease to base
    draggingRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  // render: right reel mirrors the left (angle/omega opposite)
  const leftAngle = angle;
  const rightAngle = -angle; // perfect sync, opposite direction

  return (
    <div
      className="relative rounded-xl border border-[#343a40] bg-[#11161b] p-4"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.06),transparent)]" />
      <div className="grid grid-cols-2 items-center gap-4">
        <div ref={leftRef}>
          <ReelVisual
            angleRad={leftAngle}
            ariaLabel="Left reel"
            onPointerDown={onPointerDown("left", leftRef)}
          />
        </div>
        <div ref={rightRef}>
          <ReelVisual
            angleRad={rightAngle}
            ariaLabel="Right reel"
            onPointerDown={onPointerDown("right", rightRef)}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-[#B9B1A3]">
        <span>REEL A</span>
        <span>CASSETTE-Ver.AJ</span>
        <span>REEL B</span>
      </div>
      <div className="mt-3 rounded-md bg-[#E6DFD3] p-2 text-center text-xs font-semibold text-[#0e1214]">
        카세트 라벨: 베이-지 / 타입-II 크롬
      </div>
    </div>
  );

  // --- helpers ---
  function getPointerScreenAngle(px: number, py: number, cx: number, cy: number) {
    return Math.atan2(py - cy, px - cx);
  }
  function unwrapDelta(d: number) {
    // map to (-PI..PI) so fast drag across 180° doesn't jump
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    return d;
  }
}

interface ComposerSectionProps {
  title: string;
  body: string;
  author: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
}
// 글 작성 폼과 콘셉트 설명 카드를 포함한 섹션입니다.
export function ComposerSection({
  title,
  body,
  author,
  onTitleChange,
  onBodyChange,
  onAuthorChange,
  onSubmit,
}: ComposerSectionProps) {
  return (
    <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[1.1fr,1fr]">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-[#2a2f35] bg-[#151a1f] p-5"
      >
        <h2 className="mb-3 text-sm tracking-widest text-[#B9B1A3]">
          NEW ENTRY
        </h2>
        <div className="grid gap-3">
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="제목"
            className="rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
          />
          <textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder="내용"
            rows={4}
            className="resize-none rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
          />
          <div className="flex items-center gap-2">
            <input
              value={author}
              onChange={(event) => onAuthorChange(event.target.value)}
              placeholder="작성자"
              className="w-40 rounded-md border border-[#3a3f45] bg-[#0f1419] px-3 py-2 text-sm text-[#E6DFD3] placeholder:text-[#B9B1A3]/60 focus:outline-none focus:ring-2 focus:ring-[#E6DFD3]/40"
            />
            <button
              type="submit"
              className="ml-auto rounded-lg border border-[#E6DFD3]/60 bg-[#E6DFD3] px-4 py-2 text-sm font-semibold text-[#0e1214] shadow transition hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0"
            >
              게시
            </button>
          </div>
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
    </section>
  );
}

interface PostsSectionProps {
  posts: Post[];
  onLike?: (id: string) => void;
  onSelect?: (id: string) => void;
}
// 게시글 목록 컨테이너로, 개별 포스트 카드를 렌더링합니다.
export function PostsSection({ posts, onLike, onSelect }: PostsSectionProps) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm tracking-widest text-[#B9B1A3]">POSTS</h2>
        <span className="text-xs text-[#B9B1A3]">{posts.length} 결과</span>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onLike={onLike} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}


interface PostCardProps {
  post: Post;
  onLike?: (id: string) => void;
  onSelect?: (id: string) => void;
}
// 한 개의 게시글을 카세트 카트리지 스타일로 보여줍니다.
function PostCard({ post, onLike, onSelect }: PostCardProps) {
  const handleSelect = onSelect ? () => onSelect(post.id) : undefined;
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#2a2f35] bg-[#14191e] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition hover:border-[#E6DFD3]/40">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-[#B9B1A3]">
          <Screw small />
          <span
            className="uppercase tracking-[0.3em]"
            style={{ fontFamily: FONT_STACKS.code }}
          >{post.id}</span>
        </div>
        <span
          className={clsx(
            "rounded px-2 py-0.5 text-[10px] uppercase tracking-wider",
            post.tag === "notice" &&
              "bg-yellow-500 text-[#0e1214]",
            post.tag === "maint" &&
              "bg-[#E6DFD3]/20 text-[#E6DFD3] border border-[#E6DFD3]/40",
            post.tag === "log" &&
              "bg-[#0f1419] text-[#B9B1A3] border border-[#2a2f35]"
          )}
        >
          {post.tag}
        </span>
      </div>

      {/* <h3 className="text-lg font-semibold text-[#F3EBDD]"> */}
        {handleSelect ? (
          <button
            type="button"
            onClick={handleSelect}
            className="
                group
                w-full flex items-center gap-3
                rounded-md px-4 py-2
                text-[#F3EBDD] 
                bg-transparent hover:bg-zinc-800/70
                hover:text-yellow-500
                border border-transparent hover:border-zinc-600
                cursor-pointer
                transition
                focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/70
            "
          >
        <h3 className="text-lg font-semibold flex-1 text-left">
            {post.title}
        </h3>
          </button>
        ) : (
          post.title
        )}
      {/* </h3> */}
      {/* <p className="mt-1 text-sm text-[#DAD3C6]">{post.body}</p> */}

      <div className="mt-3 flex items-center justify-between text-xs text-[#B9B1A3]">
        <span>작성자 {post.author}</span>
        <div className="flex items-center gap-2">
          {onLike ? (
            <button
              onClick={() => onLike(post.id)}
              className="rounded-md border border-[#3a3f45] bg-[#10151a] px-2 py-1 text-[#E6DFD3] transition hover:border-[#E6DFD3]/50"
            >
              Likes {post.likes}
            </button>
          ) : (
            <span className="rounded-md border border-[#3a3f45] bg-[#10151a] px-2 py-1 text-[#E6DFD3]">
              Likes {post.likes}
            </span>
          )}
          <span className="rounded-md border border-[#3a3f45] bg-[#10151a] px-2 py-1 text-[#E6DFD3]">
            Comments {post.comments ?? 0}
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute -right-6 -top-10 h-40 w-40 rotate-45 rounded-full bg-[radial-gradient(circle,#FFEFD0_0%,transparent_60%)] opacity-10" />
    </article>
  );
}

export { PostsSection as CassettePostsSection };
export type { Post as CassettePost };
// 페이지 하단 저작권 영역입니다.
export function CassetteFooter() {
  return (
    <footer className="mt-12 pb-8 text-center text-[11px] text-[#7f878f]">
      <p>(c) 2025 Cassette Futurism Board - Beige Concept</p>
    </footer>
  );
}
// 마퀴/릴 애니메이션에 필요한 국소 스타일을 주입합니다.
// function GlobalCassetteStyles() {
//   return (
//     <style>{`
//       .marquee {
//         display: inline-block;
//         padding-left: 100%;
//         white-space: nowrap;
//         animation: marquee 18s linear infinite;
//         text-shadow: 0 0 6px rgba(255, 239, 208, 0.55), 0 0 18px rgba(255, 221, 156, 0.35);
//         font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
//         letter-spacing: 0.08em;
//       }
//       @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
//       .reel-spin { animation: reel 9s linear infinite; transform-origin: 50% 50%; }
//       .reel-spin.reverse { animation-direction: reverse; }
//       @keyframes reel { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
//     `}</style>
//   );
// }

function NeoFontStyles() {
  return (
    <style>{`
      @font-face {
        font-family: "NeoDunggeunmo";
        src: url(${neodgmTTF}) format("truetype");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: "NeoDunggeunmoCode";
        src: url(${neodgmCodeTTF}) format("truetype");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
    `}</style>
  );
}

function GlobalCassetteStyles() {
  return (
    <style>{`
      .marquee-seamless {
        display: inline-block;
        padding-left: 2rem;
        padding-right: 2rem;
        white-space: nowrap;
        animation: marquee-seamless 20s linear infinite;
        text-shadow: 
          0 0 8px rgba(255, 140, 0, 0.9),
          0 0 15px rgba(255, 140, 0, 0.6),
          0 0 25px rgba(255, 100, 0, 0.4);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }
      @keyframes marquee-seamless { 
        0% { transform: translateX(0); } 
        100% { transform: translateX(-100%); } 
      }
    `}</style>
  );
}

// 텍스트를 가로로 흘려보내는 LED 마퀴 요소입니다.
function Marquee({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-16 overflow-hidden bg-[#1a1a1a] border-y-2 border-[#2a2a2a]">
      {/* LED 도트 패턴 배경 */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
          backgroundSize: '4px 4px'
        }}
      />
      
      {/* 스캔라인 */}
      <div className="
      absolute inset-0
      bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(0,0,0,0.4)_1px,rgba(0,0,0,0.4)_2px)]
      " />
      
      {/* 끊김없는 마퀴 */}
      <div className="flex leading-[4rem]">
        <div
          className="marquee-seamless text-[21px] font-bold tracking-[0.15em] text-yellow-200"
          style={{ fontFamily: FONT_STACKS.code }}
        >
          {children}
        </div>
        <div
          className="marquee-seamless text-[21px] font-bold tracking-[0.15em] text-yellow-200"
          style={{ fontFamily: FONT_STACKS.code }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
// 카세트 릴을 SVG로 표현한 회전 애니메이션입니다.
// ⬇️ replace your existing Reel with this visual-only version
export function ReelVisual({
  angleRad,
  ariaLabel,
  onPointerDown,
}: {
  angleRad: number;
  ariaLabel?: string;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className="relative mx-auto aspect-square w-36 rounded-full border border-[#2e343a] bg-[#0f1419] p-3 shadow-inner touch-none"
      role="slider"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
    >
      <div
        className="will-change-transform"
        style={{
          transform: `rotate(${angleRad}rad)`,
          transformOrigin: "50% 50%",
        }}
      >
        <svg viewBox="0 0 100 100" className="block w-full h-full">
          <circle cx="50" cy="50" r="45" fill="#0f1419" stroke="#3a3f45" strokeWidth="2" />
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i * Math.PI) / 3;
            const x = 50 + 35 * Math.cos(angle);
            const y = 50 + 35 * Math.sin(angle);
            return (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={x}
                y2={y}
                stroke="#E6DFD3"
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}
          <circle cx="50" cy="50" r="6" fill="#E6DFD3" />
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * Math.PI) / 12;
            const x1 = 50 + 42 * Math.cos(angle);
            const y1 = 50 + 42 * Math.sin(angle);
            const x2 = 50 + 45 * Math.cos(angle);
            const y2 = 50 + 45 * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#B9B1A3"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.12),transparent_50%)]" />
    </div>
  );
}



// 판넬 곳곳에 쓰이는 나사 머리 장식입니다.
function Screw({ small = false }: { small?: boolean }) {
  return (
    <div
      className={clsx(
        "relative inline-block rounded-full bg-[#0d1116] shadow-inner",
        small
          ? "h-3 w-3 border border-[#2a2f35]"
          : "h-4 w-4 border-2 border-[#2a2f35]"
      )}
      aria-hidden
    >
      <div className="absolute left-1/2 top-1/2 h-[1px] w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#B9B1A3]" />
      <div className="absolute left-1/2 top-1/2 h-[1px] w-3 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-[#B9B1A3]" />
    </div>
  );
}
