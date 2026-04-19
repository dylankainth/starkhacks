#include "input/GestureInput.hpp"
#include "core/Logger.hpp"

#include <nlohmann/json.hpp>

#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <cstring>
#include <chrono>

namespace astrocore {

GestureInput::GestureInput(int port) : m_port(port) {}

GestureInput::~GestureInput() {
    stop();
}

void GestureInput::start() {
    if (m_running.load()) return;

    // Create UDP socket
    m_fd = socket(AF_INET, SOCK_DGRAM, 0);
    if (m_fd < 0) {
        LOG_ERROR("GestureInput: failed to create UDP socket: {}", strerror(errno));
        return;
    }

    // Allow address reuse
    int opt = 1;
    setsockopt(m_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    // Set receive timeout (500ms) for clean shutdown
    struct timeval tv;
    tv.tv_sec = 0;
    tv.tv_usec = 500000;
    setsockopt(m_fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

    // Bind to 0.0.0.0:port
    struct sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(static_cast<uint16_t>(m_port));
    addr.sin_addr.s_addr = INADDR_ANY;

    if (bind(m_fd, reinterpret_cast<struct sockaddr*>(&addr), sizeof(addr)) < 0) {
        LOG_ERROR("GestureInput: failed to bind to port {}: {}", m_port, strerror(errno));
        close(m_fd);
        m_fd = -1;
        return;
    }

    m_running.store(true);
    m_thread = std::thread(&GestureInput::listenerLoop, this);

    LOG_INFO("GestureInput: listening on UDP port {}", m_port);
}

void GestureInput::stop() {
    m_running.store(false);

    if (m_thread.joinable()) {
        m_thread.join();
    }

    if (m_fd >= 0) {
        ::close(m_fd);
        m_fd = -1;
    }

    LOG_INFO("GestureInput: stopped");
}

GestureState GestureInput::getState() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_state;
}

bool GestureInput::isConnected() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    if (!m_state.connected) return false;

    // Check if we received a heartbeat within the last 3 seconds
    auto now = std::chrono::duration<double>(
        std::chrono::steady_clock::now().time_since_epoch()).count();
    return (now - m_state.lastHeartbeat) < 3.0;
}

void GestureInput::listenerLoop() {
    char buffer[1024];
    struct sockaddr_in senderAddr{};
    socklen_t senderLen = sizeof(senderAddr);

    while (m_running.load()) {
        ssize_t received = recvfrom(m_fd, buffer, sizeof(buffer) - 1, 0,
                                     reinterpret_cast<struct sockaddr*>(&senderAddr),
                                     &senderLen);
        if (received > 0) {
            buffer[received] = '\0';
            parsePacket(buffer, static_cast<int>(received));
        }
        // On timeout (received < 0 with EAGAIN/EWOULDBLOCK), just loop again
    }
}

void GestureInput::parsePacket(const char* data, int len) {
    try {
        auto j = nlohmann::json::parse(data, data + len);

        std::string packetType = j.value("type", "");
        auto now = std::chrono::duration<double>(
            std::chrono::steady_clock::now().time_since_epoch()).count();

        std::lock_guard<std::mutex> lock(m_mutex);

        if (packetType == "gesture") {
            m_state.gesture = j.value("gesture", "none");
            m_state.hand = j.value("hand", "right");
            m_state.confidence = j.value("confidence", 0.0f);
            m_state.fingersExtended = j.value("fingers_extended", 0);
            m_state.lastGestureTime = now;

            // Parse palm position
            if (j.contains("palm") && j["palm"].is_object()) {
                m_state.palmX = j["palm"].value("x", 0.5f);
                m_state.palmY = j["palm"].value("y", 0.5f);
                m_state.palmZ = j["palm"].value("z", 1.0f);
            }

            m_state.connected = true;

        } else if (packetType == "velocity") {
            m_state.vx = j.value("vx", 0.0f);
            m_state.vy = j.value("vy", 0.0f);
            m_state.vz = j.value("vz", 0.0f);
            m_state.hand = j.value("hand", "right");
            m_state.connected = true;

        } else if (packetType == "heartbeat") {
            m_state.lastHeartbeat = now;
            m_state.connected = true;
            LOG_DEBUG("GestureInput: heartbeat from {}",
                      j.value("device", "unknown"));
        }

    } catch (const nlohmann::json::exception& e) {
        LOG_WARN("GestureInput: failed to parse packet: {}", e.what());
    }
}

}  // namespace astrocore
