// File chính của robot HeritageBuddy
// Điều khiển robot chạy theo tuyến bảo tàng, giao tiếp với app qua BLE

#include <MatrixMiniR4.h>   // Thư viện điều khiển phần cứng MATRIX Mini R4 (động cơ, LED, còi...)
#include "config.h"         // Các hằng số: tốc độ, chân cảm biến, UUID BLE...
#include "ble_handler.h"    // Xử lý kết nối BLE với app điện thoại
#include "sensor_manager.h" // Đọc cảm biến: dò line, màu sắc, cử chỉ, PIR, công tắc
#include "motor_control.h"  // Điều khiển 2 động cơ DC (tiến/lùi/rẽ)
#include "state_machine.h"  // Máy trạng thái: IDLE → FOLLOW_LINE → AT_NODE → END
#include "route_config.h"   // Bảng 5 node của tour + NodeManager (vị trí hiện tại)
#include "maneuver_nav.h"   // LegExecutor — chạy 5 chặng thao tác rời rạc (rẽ 90° tại ngã ba)
// ─── Biến toàn cục ─────────────────────────
BLEHandler ble;        // Đối tượng BLE - gửi/nhận lệnh với app
SensorManager sensors; // Đối tượng cảm biến - đọc line, màu, gesture...
MotorControl motors;   // Đối tượng động cơ - điều khiển 2 bánh xe
StateMachine state;    // Máy trạng thái - xác định robot đang ở bước nào
NodeManager nodes;     // Quản lý node - theo dõi điểm dừng hiện tại (5 node)
LegExecutor legExec;   // Điều phối di chuyển theo chặng (rẽ 90° tại ngã ba)

unsigned long lastPIRWarn = 0;        // Lần cuối gửi WARN:person (chống gửi liên tục)
unsigned long warnClearDeadline = 0; // Hạn chót chờ đường thoáng sau WARN:person (state WAIT_CLEAR)
unsigned long pirGraceUntil = 0;      // Đến thời điểm này PIR bị bỏ qua (sau khi robot rời node)
unsigned long pirClearSince = 0;      // Thời điểm PIR bắt đầu im lặng liên tục (xác nhận đường thoáng)
unsigned long pirHighSince = 0;       // Thời điểm PIR bắt đầu HIGH liên tục (debounce trước khi WARN)
bool nodeNotified = false;      // Đã gửi NODE_START cho app chưa? (tránh gửi trùng)
int junctionPendingType = 0;    // Type ngã ba đang chờ xác nhận (1=trái, 2=phải)
int junctionPendingFrames = 0;  // Số lần đọc liên tiếp cùng type ngã ba
bool junctionLatched = false;   // Đã gửi WARN:turn_* cho ngã ba này — chờ rearm
unsigned long junctionLatchUntil = 0; // Chặn gửi lại cho tới thời điểm này (rearm)

// ─── Khai báo forward các hàm ──────────────
void checkButton();      // Kiểm tra nút nhấn trên robot
void checkBLECommands(); // Xử lý lệnh nhận từ app qua BLE
void checkPIR();         // Kiểm tra cảm biến chuyển động PIR
void checkSwitch();      // Kiểm tra công tắc vật lý
void checkGesture();     // Kiểm tra cảm biến cử chỉ
void retryGestureInit(); // Thử khởi tạo lại cảm biến cử chỉ (chạy định kỳ, cả khi chưa kết nối BLE)
void checkJunction();    // Phát hiện ngã ba → gửi WARN:turn_l/r (chỉ báo, không dừng)
void handleIdle();       // Xử lý trạng thái IDLE (dừng robot)
void handleFollowLine(); // Xử lý trạng thái FOLLOW_LINE (đang chạy)
void handleWaitClear();   // Xử lý trạng thái WAIT_CLEAR (đang chờ đường thoáng)
void resumeAfterWarn();  // Tự động đi tiếp sau WARN:person (đường thoáng hoặc quá hạn)
void handleAtNode();     // Xử lý trạng thái AT_NODE (đã tới điểm dừng)
void handleEnd();        // Xử lý trạng thái END (kết thúc tour)

unsigned long beepUntil = 0; // Thời điểm tắt còi (cho phép còi kêu trong 2s)
unsigned long motorTestUntil = 0; // Hết thời điểm này thì dừng MOTOR_TEST (0 = không test)

// Dừng TOÀN BỘ 4 cổng motor (kể cả cặp đang test) — không cổng nào còn xung PWM
// treo sau MOTOR_TEST (motors.stop() chỉ chạm M1/M2).
void stopAllMotors()
{
    motors.stop();
    MiniR4.M1.setPower(0);
    MiniR4.M2.setPower(0);
    MiniR4.M3.setSpeed(0);
    MiniR4.M4.setSpeed(0);
}

// Chạy MOTOR_TEST trên 1 cặp cổng (pair: 1 = M1/M2 bằng setPower, 3 = M3/M4
// bằng setSpeed theo quy ước team B3, 0 = cả 2 cặp) trong 2 giây rồi dừng.
// Dùng để xác định cặp cổng robot đấu dây thật và chiều quay chuẩn.
void startMotorTest(uint8_t pair, const String& args)
{
    int sep = args.indexOf(':');
    int16_t l, r;
    if (sep > 0)
    {
        l = (int16_t)args.substring(0, sep).toInt();
        r = (int16_t)args.substring(sep + 1).toInt();
    }
    else
    {
        ble.sendMessage("STATUS:motor_test:bad_format");
        Serial.println("[MOTOR] TEST format: MOTOR_TEST(L/1/3):<L>:<R>");
        return;
    }

    stopAllMotors();
    if (pair == 0 || pair == 1)
    {
        MiniR4.M1.setPower(l);
        MiniR4.M2.setPower(r);
    }
    if (pair == 0 || pair == 3)
    {
        MiniR4.M3.setSpeed(l);
        MiniR4.M4.setSpeed(-r); // team B3: INVERT_RIGHT=true → nghịch dấu
    }
    motorTestUntil = millis() + 2000;
    state.setState(RobotState::IDLE);
    Serial.print("[MOTOR] TEST");
    if (pair == 1) Serial.print("1");
    else if (pair == 3) Serial.print("3");
    Serial.print(" L=");
    Serial.print(l);
    Serial.print(" R=");
    Serial.print(r);
    Serial.print(" batt=");
    Serial.print(MiniR4.PWR.getBattVoltage(), 2);
    Serial.println("V");
    ble.sendMessage(pair == 0 ? "STATUS:motor_test:ok"
                              : (pair == 1 ? "STATUS:motor_test1:ok" : "STATUS:motor_test3:ok"));
}

// ─── MÀU LED THEO TRẠNG THÁI (16/08, theo yêu cầu team) ───
//   - Robot DỪNG (IDLE / AT_NODE / WAIT_CLEAR / END / mất BLE) → xanh dương (0,0,255)
//   - Robot DI CHUYỂN (FOLLOW_LINE) → xanh lá (0,255,0)
//   - Dừng do SOS (nút app / công tắc giữ ≥10s) → đỏ (255,0,0)
void setLedStopped() { MiniR4.LED.setColor(1, 0, 0, 255); }
void setLedMoving()  { MiniR4.LED.setColor(1, 0, 255, 0); }
void setLedSos()     { MiniR4.LED.setColor(1, 255, 0, 0); }

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
    setLedStopped();                     // LED xanh dương: robot dừng, chờ kết nối BLE
    sensors.begin();                   // IMPORTANT: khởi tạo cảm biến (I2C, dò tia, màu, gesture)
    ble.begin();                       // Bắt đầu quảng bá BLE
    MiniR4.PWR.setBattCell(2);
    motors.begin();                    // Khởi tạo động cơ
    nodes.begin();                     // Bắt đầu tour tại Entrance (index 0)
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
            setLedStopped();                   // LED xanh dương: robot đang dừng (chờ lệnh)
            playConnectSound();                // Non-blocking, trả về ngay
            Serial.println("[BLE] Connected");
        }
        else
        {                                      // Mất kết nối?
            setLedStopped();                   // LED xanh dương: robot dừng (an toàn)
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
        retryGestureInit(); // PAJ7620 mất vài giây ổn định sau khi bật nguồn — init sớm
                            // kể cả khi điện thoại chưa kết nối (trước đây chỉ retry khi
                            // đã có BLE → nếu robot bật nguồn lâu trước khi kết nối thì
                            // sensor cử chỉ không bao giờ sẵn sàng)
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
    checkJunction();    // Ngã ba → WARN:turn_l/r (chỉ báo, không dừng)

    // ─── Heartbeat mỗi 2s (chẩn đoán BLE) ────
    // Giúp kiểm tra ngay chiều robot→điện thoại: nếu app nhận được dòng
    // STATUS:heartbeat đều đặn nghĩa là Notify đã bật đúng — lệnh MOTOR_TEST
    // và các echo khác CHẮC CHẮN sẽ hiện được. (Có thể xóa sau khi xong debug.)
    static unsigned long lastHeartbeat = 0;
    if (millis() - lastHeartbeat >= 2000)
    {
        lastHeartbeat = millis();
        ble.sendMessage("STATUS:heartbeat");
    }

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
// Nút UP: giữ >= CALIB_HOLD_MS khi robot IDLE → hiệu chỉnh Line Tracer
// (quét robot qua nền trắng/line đen trong CALIB_SWEEP_MS, sensor tự ghi
// min/max ánh sáng hiện trường — không block loop, BLE vẫn chạy).

void checkButton()
{
    static bool lastState = false;             // Trạng thái nút ở lần đọc trước
    bool current = MiniR4.BTN_DOWN.getState(); // Đọc trạng thái nút hiện tại

    // Nhấn nút → dừng robot ngay lập tức
    if (current && !lastState)
    {
        motors.stop();                     // Tắt động cơ
        state.setState(RobotState::IDLE);  // Về trạng thái IDLE
        setLedStopped();                   // LED xanh dương: robot dừng
        MiniR4.Buzzer.Tone(200, 100);      // Còi "bíp" ngắn
        Serial.println("[BTN] DOWN -> STOP");
    }
    // Nhả nút → nếu đang IDLE thì bắt đầu chạy (leg 1: Entrance -> Node1)
    if (!current && lastState)
    {
        if (state.getState() == RobotState::IDLE)
        {
            nodes.reset();                           // Về Entrance (index 0)
            nodeNotified = false;                    // Cho phép gửi NODE_START
            legExec.start(1);                        // Bắt đầu chặng 1 (Entrance -> Node1)
            state.setState(RobotState::FOLLOW_LINE); // Sang trạng thái chạy
            motors.setSpeed(BASE_SPEED);             // Tốc độ cơ bản (PID bám line)
            setLedMoving();                          // LED xanh lá: robot đang di chuyển
            MiniR4.Buzzer.Tone(400, 100);            // Còi báo bắt đầu
            delay(50);
            MiniR4.Buzzer.NoTone();
            Serial.println("[BTN] UP -> START (leg 1)");
        }
    }

    lastState = current; // Lưu trạng thái cho lần đọc sau

    // ── Hiệu chỉnh Line Tracer qua BTN_UP (non-blocking state machine) ──
    static bool calibHolding = false;  // Đang giữ nút
    static unsigned long calibHoldStart = 0;
    static bool calibActive = false;   // Đang trong cửa sổ quét 2s
    static unsigned long calibUntil = 0;

    bool btnUp = MiniR4.BTN_UP.getState();

    if (btnUp)
    {
        if (!calibHolding)
        {
            calibHolding = true;
            calibHoldStart = millis();
        }
        // Giữ đủ lâu + robot đang IDLE → bắt đầu quét calibration
        if (!calibActive && state.getState() == RobotState::IDLE &&
            millis() - calibHoldStart >= CALIB_HOLD_MS)
        {
            calibActive = true;
            calibUntil = millis() + CALIB_SWEEP_MS;
            MiniR4.Buzzer.Tone(1000, 100); // Bíp báo BẮT ĐẦU
            sensors.calibrateBegin();
            Serial.println("[CALIB] START - sweep robot over line for 2s");
        }
    }
    else
    {
        calibHolding = false;
    }

    // Hết cửa sổ quét → kết thúc calibration (không cần nhả nút)
    if (calibActive && millis() >= calibUntil)
    {
        calibActive = false;
        sensors.calibrateEnd();
        MiniR4.Buzzer.Tone(1500, 150); // Bíp báo XONG
        Serial.println("[CALIB] DONE");
    }
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
    // App gửi khi người dùng nhấn "Xuất phát" — bắt đầu tour từ Entrance
    if (cmd == "START")
    {
        nodes.reset();                     // Về Entrance (index 0)
        nodeNotified = false;
        legExec.start(1);                  // Chặng 1: Entrance -> Node1
        state.setState(RobotState::FOLLOW_LINE);
        motors.setSpeed(BASE_SPEED);
        setLedMoving();                    // LED xanh lá: robot đang di chuyển
        Serial.println("[CMD] START -> FOLLOW_LINE (leg 1)");
    }
    // ── LỆNH: STOP ───────────────────────────
    // App gửi khi người dùng nhấn dừng
    else if (cmd == "STOP")
    {
        motors.stop();
        state.setState(RobotState::IDLE);
        Serial.println("[CMD] STOP -> IDLE");
    }
    // ── LỆNH: TÍN HIỆU "ĐI TIẾP" (NODE_DONE:<id> / NEXT_NODE / VOICE_NEXT) ──
    // App gửi khi người dùng xem xong node / nói "đi tiếp" / cử chỉ đi tiếp.
    // CHỈ có hiệu lực khi robot đang AT_NODE:
    //   - node thường → bắt đầu chặng lùi-ra kế tiếp (leg index+1);
    //   - Finish (= Entrance, đã quay về) → kết thúc tour (ALL_DONE + END).
    else if (cmd.startsWith("NODE_DONE:") || cmd == "NEXT_NODE" || cmd == "VOICE_NEXT")
    {
        if (state.getState() == RobotState::AT_NODE)
        {
            // Đứng tại Finish (= Entrance, đã quay về) → "đi tiếp" = KẾT THÚC tour:
            // không có leg kế tiếp, báo app màn hình chúc mừng.
            if (nodes.current().isFinish)
            {
                motors.stop();
                ble.sendMessage("ALL_DONE");
                state.setState(RobotState::END);
                setLedStopped();           // Robot dừng hẳn → xanh dương
                Serial.println("[CMD] next at Finish -> ALL_DONE");
                return;
            }

            // Node vừa hoàn thành = nodes.current() (chưa advance) — báo app đánh dấu ✓
            ble.sendMessage("NODE_COMPLETE:" + String(nodes.current().nodeId));
            legExec.start(nodes.index() + 1);      // Chặng kế tiếp (bắt đầu bằng lùi-ra)
            state.setState(RobotState::FOLLOW_LINE);
            motors.setSpeed(BASE_SPEED);
            setLedMoving();                        // LED xanh lá: robot di chuyển tiếp
            pirGraceUntil = millis() + PIR_GRACE_AFTER_LEAVE_MS; // Bỏ qua PIR trong lúc rời node
            Serial.print("[CMD] next signal -> start leg ");
            Serial.println(legExec.leg());
        }
        else
        {
            Serial.println("[CMD] next signal ignored - not at node");
        }
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
    // Tiếp tục chạy sau SOS mà KHÔNG reset tour (khác START — có reset nodes).
    // LegExecutor giữ nguyên vị trí bước dở; nếu tour chưa bắt đầu lần nào thì
    // khởi động chặng 1 như một START.
    else if (cmd == "RESUME")
    {
        if (state.getState() == RobotState::IDLE)
        {
            if (!legExec.isStarted())
                legExec.start(1); // Tour chưa chạy (SOS ngay tại Entrance) → bắt đầu leg 1
            state.setState(RobotState::FOLLOW_LINE);
            motors.setSpeed(BASE_SPEED);
            setLedMoving();
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
        setLedSos();
        MiniR4.Buzzer.Tone(600, 1000);
        ble.sendMessage("STATUS:sos");
        Serial.println("[CMD] SOS -> STOP + STATUS:sos");
    }
    // ── LỆNH: MOTOR_TEST:<L>:<R> ─────────────
    // Kiểm tra bánh xe độc lập với tuyến: kê robot lên, gửi "MOTOR_TEST:40:40"
    // → bánh quay 2 giây rồi dừng. CHẠY CẢ 2 CẶP CỔNG cùng lúc (M1/M2 bằng
    // setPower, M3/M4 bằng setSpeed theo quy ước team WRO 2026 B3) — cặp cổng
    // nào có bánh quay chính là cặp robot đấu dây thật. Trả BLE echo
    // "STATUS:motor_test" + log pin để loại trừ nguồn yếu/cắt.
    //
    // Test riêng từng cặp (khỏi đoán):  MOTOR_TEST1:<L>:<R> → chỉ M1/M2
    //                                  MOTOR_TEST3:<L>:<R> → chỉ M3/M4
    else if (cmd.startsWith("MOTOR_TEST1:"))
    {
        startMotorTest(1, cmd.substring(12));
    }
    else if (cmd.startsWith("MOTOR_TEST3:"))
    {
        startMotorTest(3, cmd.substring(12));
    }
    else if (cmd.startsWith("MOTOR_TEST:"))
    {
        startMotorTest(0, cmd.substring(11));
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

    // PIR cần thời gian ổn định sau khi bật nguồn (~30-60s): trong lúc này module
    // tự phát xung HIGH giả dù không có người → bỏ qua để tránh WARN:person lúc
    // khởi động (trước đây: 3 cảnh báo liên tiếp mỗi 3s ngay sau khi bật nguồn).
    static unsigned long bootMs = millis();
    if (millis() - bootMs < PIR_WARMUP_MS)
    {
        pirHighSince = 0;
        return;
    }

    // Debounce: chỉ tin PIR khi HIGH liên tục >= PIR_DEBOUNCE_MS để lọc xung
    // nhiễu ngắn / cạnh giật (người đi thật làm PIR HIGH vài giây nên không
    // bị ảnh hưởng).
    if (pirRaw)
    {
        if (pirHighSince == 0)
            pirHighSince = millis();
        if (millis() - pirHighSince < PIR_DEBOUNCE_MS)
            return;
    }
    else
    {
        pirHighSince = 0;
        return;
    }

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
        setLedStopped();                       // LED xanh dương: robot dừng chờ đường thoáng
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
                    setLedSos();
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
// LƯU Ý (16/08, đang test): bỏ gate "chỉ ở AT_NODE" — robot gửi GESTURE:* bất
// cứ lúc nào để tiện kiểm tra cảm biến; app tự chặn khi không ở màn hình node.

// Thử khởi tạo lại cảm biến cử chỉ (PAJ7620) nếu chưa sẵn sàng. Chạy định kỳ
// mỗi GESTURE_REINIT_INTERVAL_MS, KHÔNG block loop: khi sensor chưa cắm / chưa
// ổn định, begin() thất bại nhanh (I2C không có slave → timeout ngắn). Gọi cả
// khi chưa kết nối BLE để sensor kịp sẵn sàng trước khi tour bắt đầu.
void retryGestureInit()
{
    static unsigned long lastGestureReinit = 0;
    if (sensors.isGestureReady())
        return;

    unsigned long now = millis();
    if (now - lastGestureReinit < GESTURE_REINIT_INTERVAL_MS)
        return;
    lastGestureReinit = now;

    if (sensors.reinitGesture())
    {
        Serial.println("[GESTURE] sensor recovered");
    }
    else
    {
        static unsigned long lastGestureInitLog = 0;
        if (now - lastGestureInitLog >= 5000)
        {
            lastGestureInitLog = now;
            Serial.println("[GESTURE] sensor not ready - check wiring");
        }
    }
}

void checkGesture()
{
    // Sensor chưa init thành công (cắm muộn / nguồn chưa ổn định) → thử lại
    // định kỳ thay vì bỏ mặc. Chạy cả khi chưa kết nối BLE (xem retryGestureInit).
    if (!sensors.isGestureReady())
    {
        retryGestureInit();
        return;
    }

    int gesture = sensors.readGesture(); // Đọc cử chỉ (0 = không có)
    if (gesture == 0)
        return;

    // Log mọi cử chỉ không phải 0 để dễ debug (kể cả Up/Down không dùng)
    Serial.print("[GESTURE] raw=");
    Serial.println(gesture);

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

// ─── CẢNH BÁO RẼ (WARN:turn_*) ─────────────
// Robot bám tuyến đi qua ngã ba trái/phải → gửi WARN:turn_l/r cho app phát
// toast + TTS cho khách. Chỉ THÔNG BÁO, không dừng (protocol plan-ver2 mục 4).
// Chống báo trùng bằng 3 lớp:
//   1. Debounce: type 1/2 phải ổn định >= JUNCTION_CONFIRM_FRAMES lần đọc
//   2. Latch: sau khi gửi, chặn tới khi junctionType về 0/4 (hết ngã ba)
//   3. Rearm tối thiểu JUNCTION_REARM_MS — chặn trường hợp nhấp nháy 1-0-1-0

void checkJunction()
{
    if (state.getState() != RobotState::FOLLOW_LINE)
        return; // Chỉ báo khi robot đang chạy giữa các node

    int juncType = sensors.readJunctionType(); // 0=None, 1=Left, 2=Right, 3=T/Cross, 4=Unknown

    // Không phải ngã ba trái/phải → xóa bộ đếm chờ; về 0/4 (hết ngã ba) → mở khóa latch
    if (juncType != 1 && juncType != 2)
    {
        junctionPendingType = 0;
        junctionPendingFrames = 0;
        if ((juncType == 0 || juncType == 4) && millis() >= junctionLatchUntil)
        {
            junctionLatched = false;
        }
        return;
    }

    if (junctionLatched)
        return; // Đã báo ngã ba này rồi — chờ rearm

    // Xác nhận cùng type qua nhiều lần đọc liên tiếp (chống nhiễu 1 lần đọc)
    if (junctionPendingType == juncType)
    {
        if (junctionPendingFrames < 255)
            junctionPendingFrames++;
    }
    else
    {
        junctionPendingType = juncType;
        junctionPendingFrames = 1;
    }

    if (junctionPendingFrames < JUNCTION_CONFIRM_FRAMES)
        return;

    // Đạt đủ số lần đọc ổn định → gửi đúng 1 lần
    junctionLatched = true;
    junctionPendingType = 0;
    junctionPendingFrames = 0;
    junctionLatchUntil = millis() + JUNCTION_REARM_MS;

    if (juncType == 1)
    {
        ble.sendMessage("WARN:turn_l");
        Serial.println("[JUNC] WARN:turn_l (LEFT)");
    }
    else
    {
        ble.sendMessage("WARN:turn_r");
        Serial.println("[JUNC] WARN:turn_r (RIGHT)");
    }
}

// ─── XỬ LÝ IDLE ──────────────────────────────
// Robot đang dừng, chờ lệnh START

void handleIdle()
{
    // Đang trong cửa sổ MOTOR_TEST: giữ motor quay, hết 2s thì dừng hẳn
    if (motorTestUntil > 0)
    {
        if (millis() >= motorTestUntil)
        {
            stopAllMotors();
            motorTestUntil = 0;
            Serial.println("[MOTOR] TEST done - motors stopped");
        }
        return;
    }
    motors.stop(); // Đảm bảo động cơ tắt
}

// ─── XỬ LÝ FOLLOW_LINE ───────────────────────
// Robot di chuyển giữa các node theo chặng (leg-based): LegExecutor chạy
// từng bước (đi thẳng / rẽ 90° / lùi-ra), non-blocking, không đổi state
// cho từng thao tác rẽ. Khi leg xong: tới node thường → AT_NODE; tới Finish
// → ALL_DONE + END; FAILED (kẹt rẽ) → IDLE để khắc phục.

void handleFollowLine()
{
    if (state.isStateChanged())
    {
        Serial.println("[STATE] FOLLOW_LINE (leg-based)");
    }

    // Debug quan sát mỗi 2s (phục vụ hiệu chỉnh trên tuyến): lỗi bám line,
    // bề rộng line, type ngã ba — KHÔNG đổi hành vi.
    static unsigned long lastLineDebug = 0;
    if (millis() - lastLineDebug >= 2000)
    {
        lastLineDebug = millis();
        Serial.print("[LINE] err=");
        Serial.print(sensors.readLineError(), 2);
        Serial.print(" w=");
        Serial.print(sensors.readLineWidth());
        Serial.print(" junc=");
        Serial.println(sensors.readJunctionType());
    }

    legExec.update(sensors, motors);

    switch (legExec.result())
    {
    case LegResult::RUNNING:
        break;
    case LegResult::DONE:
        nodes.arrivedAtNext();
        if (nodes.current().isFinish)
        {
            // Về tới Finish (= Entrance vật lý) — KHÔNG kết thúc ngay:
            // 1) Mở node Entrance trong app (NODE_START:0) — khách thấy mình
            //    đã quay về cổng bảo tàng.
            // 2) Đánh dấu Entrance hoàn thành (NODE_COMPLETE:0) — lúc xuất
            //    phát KHÔNG tính, CHỈ tính khi quay về (badge 5/5).
            // 3) Chuyển AT_NODE, chờ tín hiệu "đi tiếp" từ app → ALL_DONE + END
            motors.stop();
            ble.sendMessage("NODE_START:0");
            ble.sendMessage("NODE_COMPLETE:0");
            nodeNotified = true;
            state.setState(RobotState::AT_NODE);
            Serial.println("[STATE] Finish (Entrance) reached -> NODE_START:0 + NODE_COMPLETE:0");
        }
        else
        {
            nodeNotified = false;
            state.setState(RobotState::AT_NODE);
            Serial.print("[STATE] Reached -> AT_NODE: ");
            Serial.println(nodes.current().name);
        }
        break;
    case LegResult::FAILED:
        motors.stop();
        state.setState(RobotState::IDLE);
        setLedStopped();                   // Robot dừng (không phải SOS) → xanh dương
        Serial.println("[STATE] Leg FAILED -> IDLE (check turn params / track)");
        break;
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
    setLedMoving();                        // LED xanh lá: robot di chuyển tiếp
    ble.sendMessage("STATUS:auto_resumed");
    // Bỏ qua PIR một lát để robot kịp rời khỏi người đang đứng gần
    // (nếu không, PIR còn cao sẽ khiến robot dừng lại ngay lập tức)
    pirGraceUntil = millis() + PIR_GRACE_AFTER_LEAVE_MS;
    pirClearSince = 0;
}

// ─── XỬ LÝ AT_NODE ───────────────────────────
// Robot đã tới điểm dừng: CHỈ đứng yên + gửi NODE_START một lần.
// KHÔNG có logic tự rời node — chờ checkBLECommands() xử lý tín hiệu "đi tiếp".

void handleAtNode()
{
    if (state.isStateChanged())
    {
        Serial.println("[STATE] AT_NODE");
        setLedStopped();                   // Robot dừng tại node → xanh dương
    }

    motors.stop(); // Dừng robot — đứng yên tuyệt đối cho tới khi app cho phép

    // Chỉ gửi NODE_START một lần (tránh gửi trùng khi ở cùng node)
    if (!nodeNotified)
    {
        const RouteNode& node = nodes.current();
        ble.sendMessage("NODE_START:" + String(node.nodeId)); // Báo app mở nội dung node
        nodeNotified = true;
        Serial.print("[NODE] ");
        Serial.print(node.name);
        Serial.print(" (id=");
        Serial.print(node.nodeId);
        Serial.println(")");
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
        setLedStopped();                   // LED xanh dương: tour xong, robot dừng
        MiniR4.Buzzer.Tone(1000, 300);     // Còi báo kết thúc
        delay(150);
        MiniR4.Buzzer.Tone(1500, 300);
        Serial.println("[STATE] END - All nodes completed");
    }
}
