import SwiftUI
import ARKit
import RealityKit

// MARK: - App Entry Point

@main
struct HoloGestureApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

// MARK: - Content View

struct ContentView: View {

    @StateObject private var streamer = GestureStreamer()

    @State private var ipAddress: String = "192.168.1."
    @State private var port: String = "9001"
    @State private var isStreaming: Bool = false
    @State private var showAlert: Bool = false
    @State private var alertMessage: String = ""

    var body: some View {
        ZStack {
            // Camera preview (ARKit)
            ARViewContainer(session: streamer.arSession)
                .ignoresSafeArea()

            // Overlay UI
            VStack(spacing: 0) {
                // Top controls
                VStack(spacing: 16) {
                    // IP + Port fields
                    HStack(spacing: 8) {
                        TextField("Receiver IP", text: $ipAddress)
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.decimalPad)
                            .autocorrectionDisabled()

                        TextField("Port", text: $port)
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.numberPad)
                            .frame(width: 80)
                    }
                    .padding(.horizontal, 20)

                    // Start/Stop button
                    Button(action: toggleStreaming) {
                        Text(isStreaming ? "Stop" : "Start")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(isStreaming ? Color.red : Color.green)
                            .cornerRadius(10)
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.top, 16)
                .background(
                    LinearGradient(
                        colors: [Color.black.opacity(0.8), Color.black.opacity(0.0)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

                Spacer()

                // Bottom status
                VStack(spacing: 8) {
                    // Gesture display
                    HStack {
                        Text(gestureEmoji)
                            .font(.system(size: 48))

                        VStack(alignment: .leading, spacing: 4) {
                            Text(gestureDisplayName)
                                .font(.title2.bold())
                                .foregroundColor(.white)

                            Text(String(format: "Confidence: %.0f%%", streamer.gestureConfidence * 100))
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.black.opacity(0.6))
                    .cornerRadius(12)
                    .padding(.horizontal, 20)

                    // Status bar
                    HStack {
                        Circle()
                            .fill(statusColor)
                            .frame(width: 10, height: 10)

                        Text(statusText)
                            .font(.caption)
                            .foregroundColor(.white)

                        Spacer()

                        Text(String(format: "%.1f Hz", streamer.fps))
                            .font(.caption.monospacedDigit())
                            .foregroundColor(.white.opacity(0.7))
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 8)
                    .background(Color.black.opacity(0.6))
                    .cornerRadius(8)
                    .padding(.horizontal, 20)
                }
                .padding(.bottom, 30)
                .background(
                    LinearGradient(
                        colors: [Color.black.opacity(0.0), Color.black.opacity(0.8)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            }
        }
        .onAppear {
            streamer.startBrowsing()
        }
        .onChange(of: streamer.discoveredHost) { _, newHost in
            if !newHost.isEmpty {
                ipAddress = newHost
            }
        }
        .onChange(of: streamer.discoveredPort) { _, newPort in
            if newPort > 0 {
                port = "\(newPort)"
            }
        }
        .alert("Error", isPresented: $showAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage)
        }
    }

    // MARK: - Actions

    private func toggleStreaming() {
        if isStreaming {
            streamer.stop()
            streamer.stopBrowsing()
            isStreaming = false
            UIApplication.shared.isIdleTimerDisabled = false
        } else {
            guard streamer.checkLiDAR() else {
                alertMessage = "This device does not have a LiDAR sensor."
                showAlert = true
                return
            }
            guard !ipAddress.isEmpty, let portNum = UInt16(port) else {
                alertMessage = "Please enter a valid IP address and port."
                showAlert = true
                return
            }

            UIApplication.shared.isIdleTimerDisabled = true
            streamer.start(host: ipAddress, port: portNum)
            isStreaming = true
        }
    }

    // MARK: - Display Helpers

    private var gestureDisplayName: String {
        switch streamer.currentGesture {
        case .point: return "Point"
        case .pinch: return "Pinch"
        case .openPalm: return "Open Palm"
        case .fist: return "Fist"
        case .swipeLeft: return "Swipe Left"
        case .swipeRight: return "Swipe Right"
        case .swipeUp: return "Swipe Up"
        case .swipeDown: return "Swipe Down"
        case .none: return "No Gesture"
        }
    }

    private var gestureEmoji: String {
        switch streamer.currentGesture {
        case .point: return "\u{261D}\u{FE0F}"
        case .pinch: return "\u{1F90F}"
        case .openPalm: return "\u{1F590}\u{FE0F}"
        case .fist: return "\u{270A}"
        case .swipeLeft: return "\u{2B05}\u{FE0F}"
        case .swipeRight: return "\u{27A1}\u{FE0F}"
        case .swipeUp: return "\u{2B06}\u{FE0F}"
        case .swipeDown: return "\u{2B07}\u{FE0F}"
        case .none: return "\u{1F44B}"
        }
    }

    private var statusColor: Color {
        switch streamer.state {
        case .idle: return .gray
        case .streaming: return .green
        case .error: return .red
        }
    }

    private var statusText: String {
        switch streamer.state {
        case .idle: return "Idle"
        case .streaming: return "Streaming to \(ipAddress):\(port)"
        case .error(let msg): return msg
        }
    }
}

// MARK: - ARKit Camera Preview

struct ARViewContainer: UIViewRepresentable {
    let session: ARSession

    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero)
        arView.session = session
        arView.renderOptions = [.disablePersonOcclusion, .disableDepthOfField, .disableMotionBlur]
        arView.environment.background = .cameraFeed()
        return arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {
        // Session is managed externally by GestureStreamer
    }
}
