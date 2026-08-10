// ─── Báo cáo cho Dashboard bảo tàng ───────────
// App tự gửi lên server khi có sự kiện:
// - Robot tới node (NODE_START) → POST /api/robot-status
// - Khách bấm SOS (STATUS:sos) → POST /api/sos (active)
// - Khách bấm "Tiếp tục hành trình" sau SOS → POST /api/sos (resolved)
// Best-effort: nếu server không kết nối được (mất mạng bảo tàng) thì bỏ qua
// lặng lẽ — robot/app vẫn hoạt động bình thường.

import { fetchWithFallback } from "./backend";

export type SosStatus = "active" | "resolved";

const REPORT_TIMEOUT = 3000;

async function post(path: string, body: Record<string, unknown>): Promise<void> {
  try {
    const response = await fetchWithFallback(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      REPORT_TIMEOUT,
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch {
    // Dashboard là nâng cấp phụ — mất server không được làm hỏng app.
  }
}

export function reportSos(status: SosStatus, node?: number): void {
  void post("/api/sos", { node: typeof node === "number" ? node : null, status });
}

export function reportRobotStatus(node: number): void {
  void post("/api/robot-status", { node });
}
