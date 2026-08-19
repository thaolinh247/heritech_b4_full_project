// ─── BLE Commands ────────────────────────────

// Robot → App commands
export type RobotToAppCommand =
  | "NODE_START:<id>"
  | "NODE_COMPLETE:<id>"
  | "ALL_DONE"
  | "ALARM"
  | "SWITCH_PRESS"
  | "VOICE_STOP"
  | "GESTURE:SWIPE_RIGHT"
  | "GESTURE:SWIPE_LEFT"
  | "GESTURE:SWIPE_UP"
  | "WARN:<type>"
  | "STATUS:<state>";

// App → Robot commands
export type AppToRobotCommand =
  | "START"
  | "STOP"
  | "RESUME"
  | "NODE_DONE:<id>"
  | "NEXT_NODE"
  | "VOICE_NEXT"
  | "VOICE_STOP"
  | "SOS";

// ─── Warning / Status Types ──────────────────

export type WarnType = "person" | "turn_l" | "turn_r";

export type RobotStatusType =
  | "resumed"
  | "auto_resumed"
  | "sos"
  | "idle"
  | "unknown";

// ─── BLE Connection ──────────────────────────

export type BLEConnectionStatus =
  | "disconnected"
  | "scanning"
  | "connecting"
  | "connected";

// ─── Gesture Types ───────────────────────────

export type GestureType =
  | "swipe_right"
  | "swipe_left"
  | "swipe_up"
  | null;

// ─── Robot Telemetry ─────────────────────────

export interface RobotTelemetry {
  currentStop: number;
  batteryVoltage: number | null;
  isMoving: boolean;
  gesture: GestureType;
  pirDetected: boolean;
  lineError: number | null;
  pirState: "HIGH" | "LOW" | null;
  robotState: string | null;
}

// ─── Legacy Types (for backward compatibility) ──

export type GestureCommand = GestureType;

export interface RobotMessage {
  type: "telemetry" | "gesture" | "command" | "heartbeat" | "pong";
  payload: Partial<RobotTelemetry>;
}

export interface RobotCommand {
  type: "command";
  action: "continue" | "stop" | "next_node" | "set_speed";
  value?: number;
}
