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

unsigned long lastPIRWarn = 0;        // Lần cuối gửi WARN:person (chống gửi liên tục)
unsigned long warnClearDeadline = 0; // Hạn chót chờ đường thoáng sau WARN:person (state WAIT_CLEAR)
unsigned long pirGraceUntil = 0;      // Đến thời điểm này PIR bị bỏ qua (sau khi robot rời node)
unsigned long pirClearSince = 0;      // Thời điểm PIR bắt đầu im lặng liên tục (xác nhận đường thoáng)
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
void handleWaitClear();   // Xử lý trạng thái WAIT_CLEAR (đang chờ đường thoáng)
void resumeAfterWarn();  // Tự động đi tiếp sau WARN:person (đường thoáng hoặc quá hạn)
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
    Serial.begin(9600);
    MiniR4.begin();
    MiniR4.LED.setColor(1, 0, 0, 255); // LED xanh dương (chờ kết nối BLE)
    sensors.begin();                   // IMPORTANT: khởi tạo cảm biến (I2C, dò tia, màu, gesture)
    ble.begin();                       // Bắt đầu quảng bá BLE
    MiniR4.PWR.setBattCell(2);
    motors.begin();                    // Khởi tạo động cơ
    state.setState(RobotState::IDLE);  // Trạng thái ban đầu: IDLE
    Serial.println("[System] HeritageBuddy ready");

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

    unsigned long loopStartMs = millis(); // Mốc đo thời gian vòng lặp (debug BLE)
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
        motors.stop(); // AN TOÀN: không chạy tiếp với lệnh tốc độ cũ khi mất kết nối
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
    case RobotState::WAIT_CLEAR: // Robot dừng chờ đường thoáng sau WARN:person
        handleWaitClear();
        break;
    case RobotState::AT_NODE: // Robot đã tới điểm dừng
        handleAtNode();
        break;
    case RobotState::END: // Kết thúc tour
        handleEnd();
        break;
    }

    // ─── Debug BLE: đo thời gian vòng lặp khi connected (tạm thời) ──
    // Nếu max > ~50ms thường xuyên → có chỗ blocking làm BLE.poll() treo
    static unsigned long maxLoopTime = 0;
    static unsigned long lastLoopLog = 0;
    unsigned long loopTime = millis() - loopStartMs;
    if (loopTime > maxLoopTime) maxLoopTime = loopTime;
    if (millis() - lastLoopLog >= 3000)
    {
        Serial.print("[LOOP] max loop time: ");
        Serial.print(maxLoopTime);
        Serial.println(" ms");
        maxLoopTime = 0;
        lastLoopLog = millis();
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
            pirGraceUntil = millis() + PIR_GRACE_AFTER_LEAVE_MS; // Bỏ qua PIR trong lúc rời node
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
        pirGraceUntil = millis() + PIR_GRACE_AFTER_LEAVE_MS; // Bỏ qua PIR trong lúc rời node
        Serial.println("[CMD] NEXT_NODE -> FOLLOW_LINE");
    }
    // ── LỆNH: VOICE_NEXT ────────────────────
    // Giọng nói "đi tiếp" từ người dùng (qua app) hoặc cử chỉ
    else if (cmd == "VOICE_NEXT")
    {
        if (state.getState() == RobotState::AT_NODE)
        {
            nodes.completeCurrentNode();
            int completedNode = nodes.getCurrentNode(); // Lưu node vừa hoàn thành TRƯỚC khi nextNode()
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
                pirGraceUntil = millis() + PIR_GRACE_AFTER_LEAVE_MS; // Bỏ qua PIR trong lúc rời node
                // Gửi index node VỪA HOÀN THÀNH (không phải node kế tiếp) để app
                // cập nhật đúng trạng thái trên bản đồ — tránh node đích bị đánh dấu ✓
                ble.sendMessage("NODE_COMPLETE:" + String(completedNode));
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
    // ── LỆNH: RESUME ─────────────────────────
    // Tiếp tục chạy sau SOS mà KHÔNG reset tour (khác START — có reset nodes)
    else if (cmd == "RESUME")
    {
        if (state.getState() == RobotState::IDLE)
        {
            state.setState(RobotState::FOLLOW_LINE);
            motors.setSpeed(BASE_SPEED);
            MiniR4.LED.setColor(1, 0, 255, 0);
            ble.sendMessage("STATUS:resumed");
            Serial.println("[CMD] RESUME -> FOLLOW_LINE");
        }
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
// Phát hiện người/vật cản đến gần robot → gửi WARN:person
// Đang chạy (FOLLOW_LINE) → dừng ngay, chờ đường thoáng rồi tự đi tiếp
// (khách khiếm thị không tự biết người cản đã đi chưa — robot tự quyết định)

void checkPIR()
{
    bool pirRaw = sensors.readPIR();

    // Debug: in giá trị thô mỗi 2s để chẩn đoán PIR kẹt HIGH / chân nổi
    // (raw: HIGH ngay cả khi không có người → vấn đề dây/module, không phải logic)
    static unsigned long lastPirDebug = 0;
    if (millis() - lastPirDebug >= 2000)
    {
        lastPirDebug = millis();
        Serial.print("[PIR] raw: ");
        Serial.println(pirRaw ? "HIGH" : "LOW");
    }

    if (!pirRaw)
        return; // Không có chuyển động → thoát

    // Bỏ qua phát hiện người trong cửa sổ "grace" sau khi rời node (xem PIR_GRACE_AFTER_LEAVE_MS)
    if (millis() < pirGraceUntil)
        return;

    unsigned long now = millis();
    // Chống báo liên tục: chỉ gửi lại sau COOLDOWN (3 giây)
    if (now - lastPIRWarn < PIR_ALARM_COOLDOWN_MS)
        return;
    lastPIRWarn = now;

    // Đang chờ đường thoáng thì không báo lại nữa (tránh app lặp cảnh báo)
    if (state.getState() == RobotState::WAIT_CLEAR)
        return;

    MiniR4.Buzzer.Tone(800, BUZZER_ALARM_MS); // Còi báo
    ble.sendMessage("WARN:person");           // Báo app (thay ALARM cũ)
    Serial.println("[PIR] WARN:person");

    // Chỉ dừng chờ đường thoáng khi robot đang chạy; ở AT_NODE/IDLE chỉ thông báo
    if (state.getState() == RobotState::FOLLOW_LINE)
    {
        motors.stop();
        state.setState(RobotState::WAIT_CLEAR);
        warnClearDeadline = now + WARN_CLEAR_TIMEOUT_MS;
        pirClearSince = 0;
        MiniR4.LED.setColor(1, 255, 128, 0); // LED vàng cam: đang chờ đường thoáng
        Serial.println("[STATE] PIR -> WAIT_CLEAR");
    }
}

// ─── CÔNG TẮC VẬT LÝ ─────────────────────────
// Nút bấm ở mặt sau robot (người khiếm thị hoặc khiếm ngôn dùng)
// Nhấn giữ >= SOS_HOLD_MS (10s) → SOS (dừng + đèn đỏ + còi)
// Nhấn ngắn → SWITCH_PRESS như cũ (mở trợ lý)

void checkSwitch() {
    static bool lastState = sensors.readSwitch();   // true = đang nhấn (LOW active)
    static unsigned long lastStableMs = millis();   // Mốc thời gian trạng thái ổn định
    static unsigned long pressStart = 0;
    static bool pressed = false;

    bool raw = sensors.readSwitch(); // true = đang nhấn

    // Debounce: chỉ chấp nhận đổi trạng thái khi ổn định trong SWITCH_DEBOUNCE_MS
    // để nhiễu phím không tạo thêm cạnh giả (gây bấm SOS nhầm hoặc mất SWITCH_PRESS).
    if (raw != lastState) {
        if (millis() - lastStableMs >= SWITCH_DEBOUNCE_MS) {
            lastState = raw;
            lastStableMs = millis();

            // Cạnh xuống: bắt đầu đo thời gian nhấn
            if (lastState) {
                pressed = true;
                pressStart = millis();
            }
            // Cạnh lên: quyết định theo độ dài nhấn
            else if (pressed) {
                pressed = false;
                if (millis() - pressStart >= SOS_HOLD_MS) {
                    motors.stop();
                    state.setState(RobotState::IDLE);
                    MiniR4.LED.setColor(1, 255, 0, 0);
                    MiniR4.Buzzer.Tone(600, 1000);
                    ble.sendMessage("STATUS:sos");
                    Serial.println("[SWITCH] Long press >= 10s -> SOS");
                } else {
                    ble.sendMessage("SWITCH_PRESS");
                    Serial.println("[SWITCH] Pressed");
                }
            }
        }
    } else {
        lastStableMs = millis();
    }
}

// ─── CẢM BIẾN CỬ CHỈ (M-Vision Cam) ─────────
// Nhận diện cử chỉ tay: vuốt trái / vuốt phải = đi tiếp
// Chỉ gửi khi robot ĐANG Ở NODE (AT_NODE) — cử chỉ "đi tiếp" chỉ có nghĩa
// ở điểm dừng; gửi khi đang chạy sẽ tạo gesture cũ mà app màn hình node
// tiếp theo dùng nhầm (app tự bỏ qua khi không ở /node/, nhưng chặn ở
// firmware sạch hơn và tránh spam BLE).

void checkGesture()
{
    // Sensor chưa init thành công (cắm muộn / nguồn chưa ổn định) → thử lại
    // định kỳ thay vì bỏ mặc. Điều chỉnh tần suất để không block loop bằng
    // I2C timeout khi sensor chưa được cắm.
    static unsigned long lastGestureReinit = 0;
    static unsigned long lastGestureInitLog = 0;
    const unsigned long GESTURE_REINIT_INTERVAL_MS = 2000;
    if (!sensors.isGestureReady())
    {
        unsigned long now = millis();
        if (now - lastGestureReinit >= GESTURE_REINIT_INTERVAL_MS)
        {
            lastGestureReinit = now;
            if (sensors.reinitGesture())
            {
                Serial.println("[GESTURE] sensor recovered");
            }
            else if (now - lastGestureInitLog >= 5000)
            {
                lastGestureInitLog = now;
                Serial.println("[GESTURE] sensor not ready - check wiring");
            }
        }
        return;
    }

    int gesture = sensors.readGesture(); // Đọc cử chỉ (0 = không có)
    if (gesture == 0)
        return;

    // Log mọi cử chỉ không phải 0 để dễ debug (kể cả Up/Down không dùng)
    Serial.print("[GESTURE] raw=");
    Serial.println(gesture);

    if (state.getState() != RobotState::AT_NODE)
    {
        Serial.println("[GESTURE] ignored - robot not at node");
        return;
    }

    // MatrixGesture::getGesture() trả về mã số (xem MiniR4_MXGesture.cpp):
    //   1 = Right, 2 = Left, 9 = Wave, 10 = WaveSlowlyLeftRight,
    //   11 = WaveSlowlyUpDown, 12 = WaveSlowlyForwardBackward, 13 = WaveSlowlyDisorder
    // Vẫy tay (9/10/13) và vuốt trái/phải (1/2) đều là "đi tiếp" — khách khiếm
    // ngôn thường vẫy tay tự nhiên hơn là vuốt chính xác.
    if (gesture == 1 || gesture == 9 || gesture == 10 || gesture == 13)
    {
        ble.sendMessage("GESTURE:SWIPE_RIGHT");
        Serial.println("[GESTURE] Right/Wave — app handles navigation");
    }
    else if (gesture == 2)
    {
        ble.sendMessage("GESTURE:SWIPE_LEFT");
        Serial.println("[GESTURE] Swipe Left — app handles navigation");
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

// ─── XỬ LÝ WAIT_CLEAR ─────────────────────────
// Robot dừng sau WARN:person, chờ ĐƯỜNG THOÁNG (PIR hết chuyển động) rồi tự đi tiếp.
// Khách khiếm thị không thể tự biết người cản đã đi chưa → không bắt bấm nút.
// An toàn: hết WARN_CLEAR_TIMEOUT_MS mà PIR vẫn báo liên tục → vẫn tự đi tiếp (log rõ).

void handleWaitClear()
{
    motors.stop(); // Luôn đứng yên khi chờ đường thoáng

    // Đường thoáng = PIR im lặng liên tục trong PIR_CLEAR_CONFIRM_MS
    if (!sensors.readPIR())
    {
        if (pirClearSince == 0)
            pirClearSince = millis();
        if (millis() - pirClearSince >= PIR_CLEAR_CONFIRM_MS)
        {
            resumeAfterWarn();
            Serial.println("[STATE] Path clear -> auto resume");
        }
    }
    else
    {
        pirClearSince = 0; // Vẫn còn chuyển động → đặt lại bộ đếm
    }

    // An toàn: hết hạn tối đa mà PIR vẫn báo liên tục → vẫn tự đi tiếp
    if (millis() >= warnClearDeadline)
    {
        resumeAfterWarn();
        Serial.println("[STATE] WARN timeout -> auto resume");
    }
}

// ─── TỰ ĐI TIẾP SAU WARN ──────────────────────
// Dùng chung cho cả 2 trường hợp: đường thoáng và quá hạn an toàn.

void resumeAfterWarn()
{
    state.setState(RobotState::FOLLOW_LINE);
    motors.setSpeed(BASE_SPEED);
    MiniR4.LED.setColor(1, 0, 255, 0);
    ble.sendMessage("STATUS:auto_resumed");
    // Bỏ qua PIR một lát để robot kịp rời khỏi người đang đứng gần
    // (nếu không, PIR còn cao sẽ khiến robot dừng lại ngay lập tức)
    pirGraceUntil = millis() + PIR_GRACE_AFTER_LEAVE_MS;
    pirClearSince = 0;
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
