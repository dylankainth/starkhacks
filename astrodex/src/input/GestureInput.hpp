#pragma once

#include <string>
#include <thread>
#include <mutex>
#include <atomic>

namespace astrocore {

struct GestureState {
    std::string gesture = "none";
    std::string hand = "right";
    float confidence = 0.0f;
    float palmX = 0.5f, palmY = 0.5f, palmZ = 1.0f;
    int fingersExtended = 0;
    float vx = 0.0f, vy = 0.0f, vz = 0.0f;
    bool connected = false;
    double lastHeartbeat = 0.0;
    double lastGestureTime = 0.0;
};

class GestureInput {
public:
    explicit GestureInput(int port = 9001);
    ~GestureInput();

    GestureInput(const GestureInput&) = delete;
    GestureInput& operator=(const GestureInput&) = delete;

    void start();
    void stop();

    GestureState getState() const;  // Thread-safe
    bool isConnected() const;

private:
    void listenerLoop();
    void parsePacket(const char* data, int len);

    int m_port;
    int m_fd = -1;
    std::atomic<bool> m_running{false};
    std::thread m_thread;
    mutable std::mutex m_mutex;
    GestureState m_state;
};

}  // namespace astrocore
