import { useConfirm } from "./ConfirmProvider";
import { buildReallyMessage } from "../utils/really";

export function useReallyConfirm(p = 0.9, max = 6) {
  const confirm = useConfirm();
  return (baseMessage: string, opts?: { title?: string; danger?: boolean }) =>
    confirm({
      title: opts?.title,
      message: buildReallyMessage(baseMessage, p, max),
      danger: opts?.danger,
      confirmText: "예",
      cancelText: "아니오",
    });
}
