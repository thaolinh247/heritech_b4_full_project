// File chính của robot HeritageBuddy
// Điều khiển robot chạy theo tuyến bảo tàng, giao tiếp với app qua BLE

#include <MatrixMiniR4.h>   // Thư viện điều khiển phần cứng MATRIX Mini R4 (động cơ, LED, còi...)
#include "config.h"         // Các hằng số: tốc độ, chân cảm biến, UUID BLE...
#include "ble_handler.h"    // Xử lý kết nối BLE với app điện thoại
#include "sensor_manager.h" // Đọc cảm biến: dò line, màu sắc, cử chỉ, PIR, công tắc
#include "motor_control.h"  // Điều khiển 2 động cơ DC (tiến/lùi/rẽ)
#include "state_machine.h"  // Máy trạng thái: IDLE → FOLLOW_LINE → AT_NODE → END
#include "node_manager.h"   // Quản lý 13 điểm dừng trên tuyến
// ─── Biến toàn cục ─────────────────────────
BLEHandler ble;        // Đối tượng BLE - gửi/nhận lệnh với app
SensorManager sensors; // Đối tượng cảm biến - đọc line, màu, gesture...
MotorControl motors;   // Đối tượng động cơ - điều khiển 2 bánh xe
StateMachine state;    // Máy trạng thái - xác định robot đang ở bước nào
NodeManager nodes;     // Quản lý node - theo dõi điểm dừng hiện tại

unsigned long lastPIRAlarm = 0; // Lần cuối còi báo động PIR (chống báo lại liên tục)
int redStableCount = 0;         // Đếm số lần đọc được màu đỏ liên tiếp (xác nhận tới node)
bool nodeNotified = false;      // Đã gửi NODE_START cho app chưa? (tránh gửi trùng)

// ─── Khai báo forward các hàm ──────────────
void checkButton();      // Kiểm tra nút nhấn trên robot
void checkBLECommands(); // Xử lý lệnh nhận từ app qua BLE
void checkPIR();         // Kiểm tra cảm biến chuyển động PIR
void checkSwitch();      // Kiểm tra công tắc vật lý
void checkGesture();     // Kiểm tra cảm biến cử chỉ
void handleIdle();       // Xử lý trạng thái IDLE (dừng robot)
void handleFollowLine(); // Xử lý trạng thái FOLLOW_LINE (đang chạy)
void handleAtNode();     // Xử lý trạng thái AT_NODE (đã tới điểm dừng)
void handleEnd();        // Xử lý trạng thái END (kết thúc tour)

unsigned long beepUntil = 0; // Thời điểm tắt còi (cho phép còi kêu trong 2s)

// ─── Non-blocking sound state machine ────────
// Tránh delay() blocking làm BLE.poll() không chạy → ATT discovery timeout
static int _soundStep = 0;          // 0=idle, 1=C5, 2=E5, 3=G5
static unsigned long _soundAt = 0;  // Thời điểm chuyển nốt tiếp theo

void playConnectSound()
{
    MiniR4.Buzzer.NoTone();
    MiniR4.Buzzer.Tone(523, 150);   // C5 bắt đầu (non-blocking, timer-based)
    _soundStep = 1;
    _soundAt = millis() + 150;      // E5 sau 150ms
}

void playDisconnectSound()
{
    MiniR4.Buzzer.NoTone();
    MiniR4.Buzzer.Tone(784, 150);   // G5 bắt đầu
    _soundStep = -1;                 // -1 = disconnect sequence
    _soundAt = millis() + 150;      // E5 sau 150ms
}

void updateSound()
{
    if (_soundStep == 0) return;
    unsigned long now = millis();
    if (now < _soundAt) return;     // Chưa tới lúc chuyển nốt

    if (_soundStep > 0) {
        // Connect sequence: C5 → E5 → G5
        switch (_soundStep) {
            case 1:  // C5 done → start E5
                MiniR4.Buzzer.Tone(659, 150);
                _soundStep = 2;
                _soundAt = now + 150;
                break;
            case 2:  // E5 done → start G5
                MiniR4.Buzzer.Tone(784, 2000);
                _soundStep = 3;
                _soundAt = now + 2000;
                beepUntil = now + 2000;   // backup turn-off
                break;
            case 3:  // G5 done → stop
                MiniR4.Buzzer.NoTone();
                _soundStep = 0;
                beepUntil = 0;
                break;
        }
    } else {
        // Disconnect sequence: G5 → E5 → C5
        switch (_soundStep) {
            case -1:  // G5 done → start E5
                MiniR4.Buzzer.Tone(659, 150);
                _soundStep = -2;
                _soundAt = now + 150;
                break;
            case -2:  // E5 done → start C5
                MiniR4.Buzzer.Tone(523, 2000);
                _soundStep = -3;
                _soundAt = now + 2000;
                beepUntil = now + 2000;
                break;
            case -3:  // C5 done → stop
                MiniR4.Buzzer.NoTone();
                _soundStep = 0;
                beepUntil = 0;
                break;
        }
    }
}

// ─── Khởi tạo (chạy 1 lần khi bật nguồn) ────
void setup()
{
    /*Serial.begin(115200);             // Mở cổng Serial ở tốc độ 115200
    while (!Serial);                  // Đợi Serial sẵn sàng

    MiniR4.begin();                   // Khởi tạo bo mạch MATRIX Mini R4
    MiniR4.LED.setColor(1, 0, 0, 255); // LED xanh dương (chờ kết nối)

    ble.begin();                      // Bắt đầu quảng bá BLE
    sensors.begin();                  // Khởi tạo các cảm biến
    motors.begin();                   // Khởi tạo động cơ
    state.setState(RobotState::IDLE); // Đặt trạng thái ban đầu: IDLE

    Serial.println("[System] HeritageBuddy ready");*/
    Serial.begin(9600);
    MiniR4.begin();
    MiniR4.LED.setColor(1, 0, 0, 255); // LED xanh dương (chờ kết nối BLE)
    ble.begin();
    MiniR4.PWR.setBattCell(2);
    motors.begin();

    // Cấu hình motor M1 (trái) – M2 (phải)
    MiniR4.M1.setPPR_RPM(545, 200);
    MiniR4.M2.setPPR_RPM(545, 200);
    MiniR4.M1.setReverse(false);
    MiniR4.M2.setReverse(true);
    MiniR4.DriveDC.begin(1, 2, false, true);
    MiniR4.DriveDC.setMoveSyncPID(0.02, 0.00, 0.04);

}

// ─── Vòng lặp chính (chạy liên tục) ─────────
void loop()
{

    ble.update(); // Cập nhật trạng thái BLE (kết nối/ngắt)
    updateSound(); // Non-blocking sound sequence (ko delay, ko block BLE)

    // ─── Phát âm thanh khi kết nối/ngắt BLE ──
    if (ble.wasConnected())
    { // Vừa có thay đổi trạng thái kết nối?
        if (ble.isConnected())
        {                                      // Đã kết nối?
            MiniR4.LED.setColor(1, 0, 255, 0); // LED xanh lá
            playConnectSound();                // Non-blocking, trả về ngay
            Serial.println("[BLE] Connected");
        }
        else
        {                                      // Mất kết nối?
            MiniR4.LED.setColor(1, 255, 0, 0); // LED đỏ
            playDisconnectSound();             // Non-blocking, trả về ngay
            Serial.println("[BLE] Disconnected");
        }
    }

    // ─── Tắt còi backup ─────────────────────
    if (beepUntil > 0 && millis() >= beepUntil)
    {
        MiniR4.Buzzer.NoTone();
        _soundStep = 0; // Hủy sound sequence nếu đang chạy
        beepUntil = 0;
    }

    checkButton(); // Kiểm tra nút nhấn trên robot

    // ─── Nếu mất kết nối BLE ────────────────
    if (!ble.isConnected())
    {
        static unsigned long lastBlink = 0; // Lần chớp LED gần nhất
        unsigned long now = millis();
        if (now - lastBlink >= 500)
        { // Cứ 500ms thì chớp LED một lần
            lastBlink = now;
            static bool ledOn = false;
            ledOn = !ledOn; // Đảo trạng thái LED
            MiniR4.LED.setColor(1, 0, 0, ledOn ? 255 : 0);
        }
        delay(LOOP_DELAY_MS); // Chờ 20ms rồi thoát (không xử lý tiếp)
        return;
    }

    // ─── Nếu đã kết nối BLE ─────────────────
    checkBLECommands(); // Xử lý lệnh từ app
    checkPIR();         // Đọc cảm biến chuyển động
    checkSwitch();      // Đọc công tắc vật lý
    checkGesture();     // Đọc cảm biến cử chỉ

    // ─── Máy trạng thái: xử lý theo trạng thái ──
    switch (state.getState())
    {
    case RobotState::IDLE: // Robot đang dừng, chờ lệnh
        handleIdle();
        break;
    case RobotState::FOLLOW_LINE: // Robot đang chạy giữa các node
        handleFollowLine();
        break;
    case RobotState::AT_NODE: // Robot đã tới điểm dừng
        handleAtNode();
        break;
    case RobotState::END: // Kết thúc tour
        handleEnd();
        break;
    }

    delay(LOOP_DELAY_MS);
    // Đợi 20ms trước vòng lặp tiếp theo
}

// ─── NÚT NHẤN ─────────────────────────────
// Nút DOWN trên robot: nhấn = dừng, nhả = xuất phát

void checkButton()
{
    static bool lastState = false;             // Trạng thái nút ở lần đọc trước
    bool current = MiniR4.BTN_DOWN.getState(); // Đọc trạng thái nút hiện tại

    // Nhấn nút → dừng robot ngay lập tức
    if (current && !lastState)
    {
        motors.stop();                     // Tắt động cơ
        state.setState(RobotState::IDLE);  // Về trạng thái IDLE
        MiniR4.LED.setColor(1, 255, 0, 0); // LED đỏ
        MiniR4.Buzzer.Tone(200, 100);      // Còi "bíp" ngắn
        Serial.println("[BTN] DOWN -> STOP");
    }
    // Nhả nút → nếu đang IDLE thì bắt đầu chạy
    if (!current && lastState)
    {
        if (state.getState() == RobotState::IDLE)
        {
            nodes.reset();                           // Đặt lại node về 0
            redStableCount = 0;                      // Reset đếm màu đỏ
            nodeNotified = false;                    // Cho phép gửi NODE_START
            state.setState(RobotState::FOLLOW_LINE); // Sang trạng thái chạy
            motors.setSpeed(BASE_SPEED);             // Đặt tốc độ cơ bản
            MiniR4.LED.setColor(1, 0, 255, 0);       // LED xanh lá
            MiniR4.Buzzer.Tone(400, 100);            // Còi báo bắt đầu
            delay(50);
            MiniR4.Buzzer.NoTone();
            Serial.println("[BTN] UP -> START");
        }
    }

    lastState = current; // Lưu trạng thái cho lần đọc sau
}

// ─── LỆNH BLE TỪ APP ─────────────────────────
// Nhận và xử lý các lệnh điều khiển từ app điện thoại

void checkBLECommands()
{
    if (!ble.hasReceivedMessage())
        return; // Không có lệnh mới → thoát

    String cmd = ble.getReceivedMessage(); // Đọc lệnh từ bộ đệm BLE
    cmd.trim();                            // Xóa khoảng trắng thừa
    Serial.print("[BLE RX] ");
    Serial.println(cmd);

    // ── LỆNH: START ──────────────────────────
    // App gửi khi người dùng nhấn "Xuất phát"
    if (cmd == "START")
    {
        nodes.reset(); // Đặt lại node đầu tiên
        redStableCount = 0;
        nodeNotified = false;
        state.setState(RobotState::FOLLOW_LINE);
        motors.setSpeed(BASE_SPEED);
        Serial.println("[CMD] START -> FOLLOW_LINE");
    }
    // ── LỆNH: STOP ───────────────────────────
    // App gửi khi người dùng nhấn dừng
    else if (cmd == "STOP")
    {
        motors.stop();
        state.setState(RobotState::IDLE);
        Serial.println("[CMD] STOP -> IDLE");
    }
    // ── LỆNH: NODE_DONE:<id> ─────────────────
    // App gửi khi người dùng xem xong video ở node hiện tại
    else if (cmd.startsWith("NODE_DONE:"))
    {
        int nodeId = cmd.substring(10).toInt(); // Lấy số thứ tự node từ lệnh
        nodes.completeCurrentNode();            // Đánh dấu node hiện tại đã xong
        if (nodes.isLastNode() || nodes.allNodesCompleted())
        {
            // Đã hết node → kết thúc tour
            state.setState(RobotState::END);
            ble.sendMessage("ALL_DONE"); // Báo cho app biết tour kết thúc
            Serial.println("[CMD] NODE_DONE -> ALL_DONE -> END");
        }
        else
        {
            nodes.nextNode(); // Sang node tiếp theo
            ble.sendMessage("NODE_COMPLETE:" + String(nodeId));
            motors.setSpeed(BASE_SPEED);
            state.setState(RobotState::FOLLOW_LINE); // Tiếp tục chạy đến node kế
            Serial.println("[CMD] NODE_DONE -> FOLLOW_LINE");
        }
    }
    // ── LỆNH: NEXT_NODE ─────────────────────
    // App gửi để chuyển ngay sang node tiếp theo
    else if (cmd == "NEXT_NODE")
    {
        nodes.nextNode();
        motors.setSpeed(BASE_SPEED);
        state.setState(RobotState::FOLLOW_LINE);
        Serial.println("[CMD] NEXT_NODE -> FOLLOW_LINE");
    }
    // ── LỆNH: VOICE_NEXT ────────────────────
    // Giọng nói "đi tiếp" từ người dùng (qua app) hoặc cử chỉ
    else if (cmd == "VOICE_NEXT")
    {
        if (state.getState() == RobotState::AT_NODE)
        {
            nodes.completeCurrentNode();
            if (nodes.isLastNode() || nodes.allNodesCompleted())
            {
                state.setState(RobotState::END);
                ble.sendMessage("ALL_DONE");
            }
            else
            {
                nodes.nextNode();
                motors.setSpeed(BASE_SPEED);
                state.setState(RobotState::FOLLOW_LINE);
                ble.sendMessage("NODE_COMPLETE:" + String(nodes.getCurrentNode()));
            }
        }
        Serial.println("[CMD] VOICE_NEXT");
    }
    // ── LỆNH: VOICE_STOP ────────────────────
    // Giọng nói "dừng lại" từ người dùng
    else if (cmd == "VOICE_STOP")
    {
        motors.stop();
        state.setState(RobotState::IDLE);
        Serial.println("[CMD] VOICE_STOP -> IDLE");
    }
    // ── LỆNH: ACK ────────────────────────────
    // Khách đã bấm "Đã hiểu / Tiếp tục" sau cảnh báo WARN → robot xác nhận
    else if (cmd == "ACK")
    {
        ble.sendMessage("STATUS:resumed");
        Serial.println("[CMD] ACK -> STATUS:resumed");
    }
    // ── LỆNH: SOS ────────────────────────────
    // Khách bấm SOS trên app → robot dừng khẩn cấp + đèn đỏ + còi trấn an
    else if (cmd == "SOS")
    {
        motors.stop();
        state.setState(RobotState::IDLE);
        MiniR4.LED.setColor(1, 255, 0, 0);
        MiniR4.Buzzer.Tone(600, 1000);
        ble.sendMessage("STATUS:sos");
        Serial.println("[CMD] SOS -> STOP + STATUS:sos");
    }
}

// ─── CẢM BIẾN PIR (CHUYỂN ĐỘNG) ──────────────
// Phát hiện người đến gần robot → báo động

void checkPIR()
{
    if (!sensors.readPIR())
        return; // Không có chuyển động → thoát

    unsigned long now = millis();
    // Chống báo động liên tục: chỉ báo lại sau COOLDOWN (3 giây)
    if (now - lastPIRAlarm < PIR_ALARM_COOLDOWN_MS)
        return;
    lastPIRAlarm = now;

    MiniR4.Buzzer.Tone(800, BUZZER_ALARM_MS); // Còi báo
    ble.sendMessage("ALARM");                 // Gửi thông báo lên app
    Serial.println("[PIR] Alarm");
}

// ─── CÔNG TẮC VẬT LÝ ─────────────────────────
// Nút bấm ở mặt sau robot (người khiếm thị hoặc khiếm ngôn dùng)

void checkSwitch() {
    static bool lastSwitchState = HIGH;        // Trạng thái công tắc lần trước
    bool current = sensors.readSwitch();       // Đọc trạng thái hiện tại

    // Phát hiện cạnh xuống: HIGH → LOW (nhấn công tắc)
    if (lastSwitchState == HIGH && current == LOW) {
        ble.sendMessage("SWITCH_PRESS");       // Báo cho app
        Serial.println("[SWITCH] Pressed");
    }
    lastSwitchState = current; // Lưu trạng thái cho lần sau
}

// ─── CẢM BIẾN CỬ CHỈ (M-Vision Cam) ─────────
// Nhận diện cử chỉ tay: vuốt lên = đi tiếp

void checkGesture()
{
    int gesture = sensors.readGesture(); // Đọc cử chỉ (0 = không có)
    if (gesture == 0)
        return;

    // Mã 0x04 = Swipe Up (vuốt lên) → báo app xử lý navigation
    // App sẽ nhận GESTURE:SWIPE_UP, tự complete node local,
    // gửi VOICE_NEXT cho robot để robot chuyển state + di chuyển
    if (gesture == 0x04)
    {
        ble.sendMessage("GESTURE:SWIPE_UP");
        Serial.println("[GESTURE] Swipe Up — app handles navigation");
    }
}

// ─── XỬ LÝ IDLE ──────────────────────────────
// Robot đang dừng, chờ lệnh START

void handleIdle()
{
    motors.stop(); // Đảm bảo động cơ tắt
}

// ─── XỬ LÝ FOLLOW_LINE ───────────────────────
// Robot di chuyển giữa các node (không block)

void handleFollowLine()
{
    if (state.isStateChanged())
    {
        Serial.println("[STATE] FOLLOW_LINE");
    }

    float lineError = sensors.readLineError();
    motors.followLine(lineError);

    if (sensors.isRedDetected())
    {
        redStableCount++;
        if (redStableCount >= COLOR_STABLE_COUNT)
        {
            motors.stop();
            nodeNotified = false;
            state.setState(RobotState::AT_NODE);
            Serial.println("[STATE] Red detected -> AT_NODE");
        }
    }
    else
    {
        redStableCount = 0;
    }
}

// ─── XỬ LÝ AT_NODE ───────────────────────────
// Robot đã tới điểm dừng, thông báo cho app

void handleAtNode()
{
    if (state.isStateChanged())
    {
        Serial.println("[STATE] AT_NODE");
    }

    motors.stop(); // Dừng robot

    // Chỉ gửi NODE_START một lần (tránh gửi trùng khi ở cùng node)
    if (!nodeNotified)
    {
        ble.sendMessage("NODE_START:" + String(nodes.getCurrentNode())); // Báo app mở video
        nodeNotified = true;                                             // Đánh dấu đã gửi
        Serial.print("[NODE] Started: ");
        Serial.println(nodes.getCurrentNode());
    }
}

// ─── XỬ LÝ END ───────────────────────────────
// Kết thúc tour: tất cả node đã được tham quan

void handleEnd()
{
    if (state.isStateChanged())
    {                                      // Chỉ chạy một lần khi vào END
        motors.stop();                     // Dừng robot
        ble.sendMessage("ALL_DONE");       // Báo app kết thúc
        MiniR4.LED.setColor(1, 0, 255, 0); // LED xanh
        MiniR4.Buzzer.Tone(1000, 300);     // Còi báo kết thúc
        delay(150);
        MiniR4.Buzzer.Tone(1500, 300);
        Serial.println("[STATE] END - All nodes completed");
    }
}
