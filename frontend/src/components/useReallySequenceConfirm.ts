import { useConfirm, ConfirmOptions } from "./ConfirmProvider"; // confirm 훅/옵션 타입
import { sampleTotalSteps } from "../utils/really";             // 몇 번 묻을지 샘플링

// p: 한 번 더 물어볼 확률, max: 최대 단계 수, delayMs: 단계 간 텀(ms)
export function useReallySequenceConfirm(p = 0.9, max = 6, delayMs = 120) {
  const confirm = useConfirm();                                 // 모달 띄우기 함수

  return async (baseMessage: string, opts?: Omit<ConfirmOptions, "message">) => {
    const total = sampleTotalSteps(p, max);                     // 1..max (min 없음)
    for (let i = 0; i < total; i++) {                           // 단계 반복
      const prefix = i > 0 ? "정말 ".repeat(i) : "";            // "정말 "이 1개씩 늘어남
      const ok = await confirm({
        ...opts,                                                // 호출 시 전달 옵션
        message: `${prefix}${baseMessage}`,                     // 메시지 구성
      });
      if (!ok) return false;                                    // 한 번이라도 취소 → 중단
      if (delayMs > 0 && i < total - 1)                         // 마지막 단계 전까지만 텀
        await new Promise((r) => setTimeout(r, delayMs));
    }
    return true;                                                // 모두 통과
  };
}
