import Foundation
import Network
import ARKit
import Vision
import UIKit

// MARK: - Data Types

enum GestureType: String {
    case point
    case pinch
    case openPalm = "open_palm"
    case fist
    case swipeLeft = "swipe_left"
    case swipeRight = "swipe_right"
    case swipeUp = "swipe_up"
    case swipeDown = "swipe_down"
    case none
}

struct Palm3D {
    var x: Double
    var y: Double
    var z: Double
}

struct GestureResult {
    var gesture: GestureType
    var hand: String
    var confidence: Double
    var palm: Palm3D
    var fingersExtended: Int
}

enum StreamerState: Equatable {
    case idle
    case streaming
    case error(String)
}

// MARK: - GestureStreamer

final class GestureStreamer: NSObject, ObservableObject {

    // Published state for SwiftUI
    @Published var state: StreamerState = .idle
    @Published var currentGesture: GestureType = .none
    @Published var gestureConfidence: Double = 0.0
    @Published var discoveredHost: String = ""
    @Published var discoveredPort: UInt16 = 0
    @Published var fps: Double = 0.0

    // MARK: - Networking

    private var fd: Int32 = -1
    private var dest = sockaddr_in()

    // MARK: - Bonjour

    private var browser: NWBrowser?

    // MARK: - ARKit

    let arSession = ARSession()
    private var frameCount = 0
    private let frameSkip = 4 // Process every 4th frame (~15Hz from 60fps)
    private var bootTimeOffset: TimeInterval = 0

    // MARK: - Vision

    private let handPoseRequest: VNDetectHumanHandPoseRequest = {
        let request = VNDetectHumanHandPoseRequest()
        request.maximumHandCount = 2
        return request
    }()

    private let visionQueue = DispatchQueue(label: "com.holoGesture.vision", qos: .userInitiated)

    // MARK: - Gesture Tracking

    private var previousPalmPositions: [(time: TimeInterval, x: Double, y: Double)] = []
    private let swipeVelocityThreshold: Double = 0.4
    private let swipeHistoryWindow: TimeInterval = 0.2

    // MARK: - FPS Tracking

    private var sendTimestamps: [CFTimeInterval] = []

    // MARK: - Heartbeat

    private var heartbeatTimer: Timer?

    // MARK: - Lifecycle

    deinit {
        stop()
        stopBrowsing()
    }

    // MARK: - Network Start/Stop

    func start(host: String, port: UInt16) {
        stop()

        fd = socket(AF_INET, SOCK_DGRAM, 0)
        guard fd >= 0 else {
            setState(.error("socket() failed: \(errno)"))
            return
        }

        dest = sockaddr_in()
        dest.sin_family = sa_family_t(AF_INET)
        dest.sin_port = port.bigEndian
        guard host.withCString({ inet_pton(AF_INET, $0, &dest.sin_addr) }) == 1 else {
            setState(.error("Invalid IP: \(host)"))
            Darwin.close(fd)
            fd = -1
            return
        }

        bootTimeOffset = Date().timeIntervalSince1970 - ProcessInfo.processInfo.systemUptime

        let config = ARWorldTrackingConfiguration()
        config.frameSemantics = .sceneDepth
        arSession.delegate = self
        arSession.run(config)

        frameCount = 0
        sendTimestamps.removeAll()
        previousPalmPositions.removeAll()

        startHeartbeat()
        setState(.streaming)
    }

    func stop() {
        arSession.pause()
        stopHeartbeat()

        if fd >= 0 {
            Darwin.close(fd)
            fd = -1
        }

        DispatchQueue.main.async { [weak self] in
            self?.currentGesture = .none
            self?.gestureConfidence = 0.0
            self?.fps = 0.0
        }

        setState(.idle)
    }

    func checkLiDAR() -> Bool {
        ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
    }

    // MARK: - Bonjour Discovery

    func startBrowsing() {
        let descriptor = NWBrowser.Descriptor.bonjour(type: "_hologesture._udp.", domain: nil)
        let browser = NWBrowser(for: descriptor, using: .udp)

        browser.stateUpdateHandler = { state in
            if case .failed(let err) = state {
                print("[Bonjour] browse failed: \(err)")
            }
        }

        browser.browseResultsChangedHandler = { [weak self] results, _ in
            guard let result = results.first else { return }
            if case .service(let name, let type, let domain, _) = result.endpoint {
                self?.resolveService(name: name, type: type, domain: domain)
            }
        }

        browser.start(queue: .main)
        self.browser = browser
    }

    func stopBrowsing() {
        browser?.cancel()
        browser = nil
    }

    private func resolveService(name: String, type: String, domain: String) {
        let endpoint = NWEndpoint.service(name: name, type: type, domain: domain, interface: nil)
        let params = NWParameters.udp
        let connection = NWConnection(to: endpoint, using: params)

        connection.stateUpdateHandler = { [weak self] state in
            if case .ready = state {
                if let innerEndpoint = connection.currentPath?.remoteEndpoint,
                   case .hostPort(let host, let port) = innerEndpoint {
                    let hostStr: String
                    switch host {
                    case .ipv4(let addr):
                        hostStr = "\(addr)"
                    case .ipv6(let addr):
                        hostStr = "\(addr)"
                    case .name(let name, _):
                        hostStr = name
                    @unknown default:
                        hostStr = "\(host)"
                    }
                    let portNum = port.rawValue
                    DispatchQueue.main.async {
                        self?.discoveredHost = hostStr
                        self?.discoveredPort = portNum
                    }
                }
                connection.cancel()
            }
        }

        connection.start(queue: .global(qos: .utility))
    }

    // MARK: - Heartbeat

    private func startHeartbeat() {
        stopHeartbeat()
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.sendHeartbeat()
        }
    }

    private func stopHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
    }

    private func sendHeartbeat() {
        guard fd >= 0 else { return }

        let batteryLevel: Int
        if UIDevice.current.isBatteryMonitoringEnabled {
            batteryLevel = Int(UIDevice.current.batteryLevel * 100)
        } else {
            UIDevice.current.isBatteryMonitoringEnabled = true
            batteryLevel = Int(UIDevice.current.batteryLevel * 100)
        }

        let packet: [String: Any] = [
            "type": "heartbeat",
            "device": UIDevice.current.name,
            "battery": max(batteryLevel, 0)
        ]

        sendJSON(packet)
    }

    // MARK: - Send

    private func sendJSON(_ dict: [String: Any]) {
        guard fd >= 0 else { return }
        guard let data = try? JSONSerialization.data(withJSONObject: dict, options: []) else { return }

        data.withUnsafeBytes { buf in
            withUnsafePointer(to: dest) { addr in
                addr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sa in
                    _ = sendto(fd, buf.baseAddress, data.count, 0, sa, socklen_t(MemoryLayout<sockaddr_in>.size))
                }
            }
        }
    }

    private func sendGestureEvent(_ result: GestureResult, timestamp: TimeInterval) {
        let packet: [String: Any] = [
            "type": "gesture",
            "gesture": result.gesture.rawValue,
            "hand": result.hand,
            "confidence": round(result.confidence * 1000) / 1000,
            "palm": [
                "x": round(result.palm.x * 1000) / 1000,
                "y": round(result.palm.y * 1000) / 1000,
                "z": round(result.palm.z * 1000) / 1000
            ],
            "fingers_extended": result.fingersExtended,
            "timestamp": timestamp
        ]
        sendJSON(packet)
    }

    private func sendVelocityEvent(hand: String, vx: Double, vy: Double, timestamp: TimeInterval) {
        let packet: [String: Any] = [
            "type": "velocity",
            "hand": hand,
            "vx": round(vx * 1000) / 1000,
            "vy": round(vy * 1000) / 1000,
            "vz": 0.0,
            "timestamp": timestamp
        ]
        sendJSON(packet)
    }

    // MARK: - FPS Tracking

    private func recordSendAndUpdateFPS() {
        let now = CACurrentMediaTime()
        sendTimestamps.append(now)
        if sendTimestamps.count > 30 {
            sendTimestamps.removeFirst()
        }
        guard sendTimestamps.count >= 2,
              let first = sendTimestamps.first, let last = sendTimestamps.last else { return }
        let elapsed = last - first
        guard elapsed > 0 else { return }
        let currentFps = Double(sendTimestamps.count - 1) / elapsed
        DispatchQueue.main.async { [weak self] in
            self?.fps = currentFps
        }
    }

    // MARK: - State

    private func setState(_ newState: StreamerState) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard self.state != newState else { return }
            self.state = newState
        }
    }

    // MARK: - Gesture Classification

    private func classifyGesture(
        observation: VNHumanHandPoseObservation,
        depthMap: CVPixelBuffer?
    ) -> GestureResult? {

        guard let allPoints = try? observation.recognizedPoints(.all) else { return nil }

        guard let wrist = allPoints[.wrist], wrist.confidence > 0.3,
              let thumbTip = allPoints[.thumbTip], thumbTip.confidence > 0.3,
              let thumbCMC = allPoints[.thumbCMC],
              let indexTip = allPoints[.indexTip], indexTip.confidence > 0.3,
              let indexMCP = allPoints[.indexMCP], indexMCP.confidence > 0.3,
              let middleTip = allPoints[.middleTip], middleTip.confidence > 0.3,
              let middleMCP = allPoints[.middleMCP], middleMCP.confidence > 0.3,
              let ringTip = allPoints[.ringTip], ringTip.confidence > 0.3,
              let ringMCP = allPoints[.ringMCP], ringMCP.confidence > 0.3,
              let littleTip = allPoints[.littleTip], littleTip.confidence > 0.3,
              let littleMCP = allPoints[.littleMCP], littleMCP.confidence > 0.3
        else { return nil }

        let wristLoc = wrist.location

        // Helper: distance between two CGPoints
        func dist(_ a: CGPoint, _ b: CGPoint) -> Double {
            hypot(a.x - b.x, a.y - b.y)
        }

        // Check if each finger is extended
        func isFingerExtended(tip: CGPoint, mcp: CGPoint, isThumb: Bool) -> Bool {
            let distTipToWrist = dist(tip, wristLoc)
            let distTipToMcp = dist(tip, mcp)
            if isThumb {
                return distTipToWrist > 0.20 && distTipToMcp > 0.12
            } else {
                return distTipToWrist > 0.16 && distTipToMcp > 0.08
            }
        }

        let thumbExtended = isFingerExtended(tip: thumbTip.location, mcp: thumbCMC.location, isThumb: true)
        let indexExtended = isFingerExtended(tip: indexTip.location, mcp: indexMCP.location, isThumb: false)
        let middleExtended = isFingerExtended(tip: middleTip.location, mcp: middleMCP.location, isThumb: false)
        let ringExtended = isFingerExtended(tip: ringTip.location, mcp: ringMCP.location, isThumb: false)
        let littleExtended = isFingerExtended(tip: littleTip.location, mcp: littleMCP.location, isThumb: false)

        let extendedFingers = [thumbExtended, indexExtended, middleExtended, ringExtended, littleExtended]
        let fingersExtendedCount = extendedFingers.filter { $0 }.count

        // Palm center = average of MCP joints
        let palmX = (indexMCP.location.x + middleMCP.location.x + ringMCP.location.x + littleMCP.location.x) / 4.0
        let palmY = (indexMCP.location.y + middleMCP.location.y + ringMCP.location.y + littleMCP.location.y) / 4.0

        // Look up depth from LiDAR depthMap
        var palmZ: Double = 0.0
        if let depthMap = depthMap {
            let depthW = CVPixelBufferGetWidth(depthMap)
            let depthH = CVPixelBufferGetHeight(depthMap)
            // Vision coords: origin bottom-left, normalized 0-1
            // DepthMap: origin top-left, pixel coords
            let px = Int(palmX * Double(depthW))
            let py = Int((1.0 - palmY) * Double(depthH))
            let clampedX = max(0, min(depthW - 1, px))
            let clampedY = max(0, min(depthH - 1, py))

            CVPixelBufferLockBaseAddress(depthMap, .readOnly)
            if let base = CVPixelBufferGetBaseAddress(depthMap) {
                let rowBytes = CVPixelBufferGetBytesPerRow(depthMap)
                let ptr = base.advanced(by: clampedY * rowBytes)
                    .assumingMemoryBound(to: Float32.self)
                palmZ = Double(ptr[clampedX])
            }
            CVPixelBufferUnlockBaseAddress(depthMap, .readOnly)
        }

        let palm = Palm3D(x: palmX, y: palmY, z: palmZ)

        // Determine hand (left/right) based on chirality (available since iOS 15, deployment target is 17+)
        let hand = observation.chirality == .left ? "left" : "right"

        // Average confidence
        let avgConfidence = Double(
            wrist.confidence + thumbTip.confidence + indexTip.confidence +
            middleTip.confidence + ringTip.confidence + littleTip.confidence
        ) / 6.0

        // Gesture classification priority:
        // 1. Pinch
        let pinchDist = dist(thumbTip.location, indexTip.location)
        if pinchDist < 0.03 {
            return GestureResult(
                gesture: .pinch,
                hand: hand,
                confidence: avgConfidence,
                palm: palm,
                fingersExtended: fingersExtendedCount
            )
        }

        // 2. Fist: all fingertip-to-wrist distances below threshold
        let allTipsCloseToWrist =
            dist(thumbTip.location, wristLoc) < 0.15 &&
            dist(indexTip.location, wristLoc) < 0.15 &&
            dist(middleTip.location, wristLoc) < 0.15 &&
            dist(ringTip.location, wristLoc) < 0.15 &&
            dist(littleTip.location, wristLoc) < 0.15

        if allTipsCloseToWrist && fingersExtendedCount == 0 {
            return GestureResult(
                gesture: .fist,
                hand: hand,
                confidence: avgConfidence,
                palm: palm,
                fingersExtended: 0
            )
        }

        // 3. Point: only index extended
        if indexExtended && !middleExtended && !ringExtended && !littleExtended {
            return GestureResult(
                gesture: .point,
                hand: hand,
                confidence: avgConfidence,
                palm: palm,
                fingersExtended: fingersExtendedCount
            )
        }

        // 4. Open palm: 3+ fingers extended AND average spread > 0.08
        if fingersExtendedCount >= 3 {
            let tips = [indexTip.location, middleTip.location, ringTip.location, littleTip.location]
            var totalSpread: Double = 0
            var pairCount = 0
            for i in 0..<tips.count {
                for j in (i + 1)..<tips.count {
                    totalSpread += dist(tips[i], tips[j])
                    pairCount += 1
                }
            }
            let avgSpread = pairCount > 0 ? totalSpread / Double(pairCount) : 0

            if avgSpread > 0.08 {
                return GestureResult(
                    gesture: .openPalm,
                    hand: hand,
                    confidence: avgConfidence,
                    palm: palm,
                    fingersExtended: fingersExtendedCount
                )
            }
        }

        // 5. Swipe detection via palm velocity
        let now = CACurrentMediaTime()
        let swipeGesture = detectSwipe(palmX: palmX, palmY: palmY, time: now)
        if let swipe = swipeGesture {
            return GestureResult(
                gesture: swipe,
                hand: hand,
                confidence: avgConfidence,
                palm: palm,
                fingersExtended: fingersExtendedCount
            )
        }

        // No recognized gesture
        return GestureResult(
            gesture: .none,
            hand: hand,
            confidence: avgConfidence,
            palm: palm,
            fingersExtended: fingersExtendedCount
        )
    }

    // MARK: - Swipe Detection

    private func detectSwipe(palmX: Double, palmY: Double, time: TimeInterval) -> GestureType? {
        previousPalmPositions.append((time: time, x: palmX, y: palmY))

        // Keep only recent history
        previousPalmPositions = previousPalmPositions.filter { time - $0.time < swipeHistoryWindow }

        guard previousPalmPositions.count >= 3 else { return nil }

        guard let oldest = previousPalmPositions.first,
              let newest = previousPalmPositions.last else { return nil }

        let dt = newest.time - oldest.time
        guard dt > 0.05 else { return nil }

        let vx = (newest.x - oldest.x) / dt
        let vy = (newest.y - oldest.y) / dt

        if abs(vx) > swipeVelocityThreshold || abs(vy) > swipeVelocityThreshold {
            // Send velocity event
            let timestamp = Date().timeIntervalSince1970
            sendVelocityEvent(hand: "right", vx: vx, vy: vy, timestamp: timestamp)

            // Clear history after detecting swipe to avoid repeated triggers
            previousPalmPositions.removeAll()

            if abs(vx) > abs(vy) {
                return vx > 0 ? .swipeRight : .swipeLeft
            } else {
                return vy > 0 ? .swipeUp : .swipeDown
            }
        }

        return nil
    }
}

// MARK: - ARSessionDelegate

extension GestureStreamer: ARSessionDelegate {

    func session(_ session: ARSession, didUpdate frame: ARFrame) {
        frameCount += 1
        guard frameCount % frameSkip == 0 else { return }
        guard state == .streaming else { return }

        let pixelBuffer = frame.capturedImage
        let depthMap = frame.sceneDepth?.depthMap
        let timestamp = frame.timestamp + bootTimeOffset

        visionQueue.async { [weak self] in
            guard let self = self else { return }

            let handler = VNImageRequestHandler(
                cvPixelBuffer: pixelBuffer,
                orientation: .right,
                options: [:]
            )

            do {
                try handler.perform([self.handPoseRequest])
            } catch {
                return
            }

            guard let observations = self.handPoseRequest.results, !observations.isEmpty else {
                // No hand detected - send "none" gesture
                let noneResult = GestureResult(
                    gesture: .none,
                    hand: "right",
                    confidence: 0.0,
                    palm: Palm3D(x: 0, y: 0, z: 0),
                    fingersExtended: 0
                )
                self.sendGestureEvent(noneResult, timestamp: timestamp)
                DispatchQueue.main.async { [weak self] in
                    self?.currentGesture = .none
                    self?.gestureConfidence = 0.0
                }
                self.recordSendAndUpdateFPS()
                return
            }

            // Process the first (highest confidence) observation
            if let result = self.classifyGesture(observation: observations[0], depthMap: depthMap) {
                self.sendGestureEvent(result, timestamp: timestamp)

                DispatchQueue.main.async { [weak self] in
                    self?.currentGesture = result.gesture
                    self?.gestureConfidence = result.confidence
                }
            }

            self.recordSendAndUpdateFPS()
        }
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        DispatchQueue.main.async { [weak self] in
            self?.stop()
            self?.state = .error("AR Error: \(error.localizedDescription)")
        }
    }
}
