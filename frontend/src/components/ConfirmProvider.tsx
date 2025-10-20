import React, { createContext, useCallback, useContext, useState } from "react"; // React 훅/컨텍스트

// 모달에 넘길 옵션(필요하면 더 추가 가능)
export type ConfirmOptions = {                       // 모달 한 번을 구성하는 옵션 타입
  title?: string;                                    // 모달 제목(선택)
  message: string;                                   // 본문 메시지(필수)
  confirmText?: string;                              // 확인 버튼 라벨(기본: "확인")
  cancelText?: string;                               // 취소 버튼 라벨(기본: "취소")
  danger?: boolean;                                  // 빨간 버튼 스타일 여부
  clickOutsideToCancel?: boolean;                    // 오버레이 클릭으로 닫을지(기본 true)
};

type ConfirmContextValue = {                         // 컨텍스트에 넣을 함수 타입
  confirm: (opts: ConfirmOptions) => Promise<boolean>; // 열고(true/false)로 resolve
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null); // 컨텍스트 생성

export function useConfirm() {                       // 어디서든 confirm() 쓸 수 있게 훅 제공
  const ctx = useContext(ConfirmContext);            // 컨텍스트 접근
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>"); // 안전장치
  return ctx.confirm;                                // confirm 함수 반환
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);           // 모달 열림 여부
  const [opts, setOpts] = useState<ConfirmOptions | null>(null); // 현재 모달 옵션
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null); // Promise resolver 저장

  const confirm = useCallback((o: ConfirmOptions) => { // 모달 띄우기
    setOpts({ clickOutsideToCancel: true, ...o });      // 기본값 병합
    setOpen(true);                                      // 열기
    return new Promise<boolean>((resolve) => {          // Promise 생성
      setResolver(() => resolve);                       // resolve 저장해두기
    });
  }, []);

  const close = (v: boolean) => {                    // 닫기(확인:true / 취소:false)
    setOpen(false);                                   // 닫힘
    resolver?.(v);                                    // 대기 중이던 Promise resolve
    setResolver(null);                                // 정리
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>     {/* 하위에서 useConfirm 사용 가능 */}
      {children}

      {open && opts && (                              // 모달이 열려있으면 렌더링
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          {/* 오버레이 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => (opts.clickOutsideToCancel ?? true) && close(false)} // 바깥 클릭 → 취소
          />
          {/* 카드 */}
          <div className="relative w-[92%] max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {opts.title && <div className="text-lg font-semibold mb-2">{opts.title}</div>} {/* 제목(선택) */}
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{opts.message}</div> {/* 본문 */}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => close(false)} className="px-3 py-1 border rounded">
                {opts.cancelText ?? "취소"}            {/* 취소 버튼 */}
              </button>
              <button
                onClick={() => close(true)}
                className={`px-3 py-1 rounded text-white ${opts.danger ? "bg-red-600 hover:bg-red-700" : "bg-black hover:bg-gray-800"}`}
              >
                {opts.confirmText ?? "확인"}           {/* 확인 버튼 */}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
