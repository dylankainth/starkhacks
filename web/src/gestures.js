"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.initGestures = void 0;
var tasks_vision_1 = require("@mediapipe/tasks-vision");
var game_1 = require("./game");
var PINCH_ENTER = 0.05; // fraction of frame diagonal; thumb-index distance
var PINCH_EXIT = 0.09; // hysteresis — must separate past this to re-arm
var PINCH_COOLDOWN_MS = 280;
var PALM_HOLD_MS = 2000;
var PALM_RETRIGGER_MS = 3000; // block re-reset for this long after fire
// Only the middle 70% of the frame width controls column — edges are dead zone
// so the user doesn't have to fully extend their arm.
var ACTIVE_MIN = 0.15;
var ACTIVE_MAX = 0.85;
function initGestures(events) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        function detect() {
            if (video.readyState >= 2) {
                var ts = performance.now();
                if (ts !== lastDetectTs) {
                    lastDetectTs = ts;
                    var r = hl.detectForVideo(video, ts);
                    process(r, ts);
                }
            }
            requestAnimationFrame(detect);
        }
        function process(r, now) {
            var _a, _b;
            if (!r.landmarks || r.landmarks.length === 0) {
                palmStart = 0;
                holdFill.style.width = '0%';
                return;
            }
            var lms = r.landmarks[0];
            var indexTip = lms[8];
            var thumbTip = lms[4];
            // Column: mirror x (user's right == cursor's right) and map through the active range.
            var xMirror = 1 - indexTip.x;
            var t = Math.max(0, Math.min(1, (xMirror - ACTIVE_MIN) / (ACTIVE_MAX - ACTIVE_MIN)));
            var col = Math.max(0, Math.min(game_1.COLS - 1, Math.round(t * (game_1.COLS - 1))));
            if (col !== lastCol) {
                lastCol = col;
                events.onColumnChange(col);
            }
            // Pinch: thumb tip ↔ index tip distance, with hysteresis + cooldown so one
            // physical pinch = one drop even if landmarks jitter across the threshold.
            var dx = indexTip.x - thumbTip.x;
            var dy = indexTip.y - thumbTip.y;
            var dz = ((_a = indexTip.z) !== null && _a !== void 0 ? _a : 0) - ((_b = thumbTip.z) !== null && _b !== void 0 ? _b : 0);
            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (pinchArmed && dist < PINCH_ENTER && now - lastPinchTs > PINCH_COOLDOWN_MS) {
                pinchArmed = false;
                lastPinchTs = now;
                events.onDrop();
            }
            else if (!pinchArmed && dist > PINCH_EXIT) {
                pinchArmed = true;
            }
            // Open palm: all four non-thumb fingers extended AND thumb-index separated.
            var isPalm = isOpenPalm(lms) && dist > PINCH_EXIT;
            if (isPalm && now >= palmBlockUntil) {
                if (palmStart === 0)
                    palmStart = now;
                var held = now - palmStart;
                var frac = Math.min(1, held / PALM_HOLD_MS);
                holdFill.style.width = "".concat(frac * 100, "%");
                if (held >= PALM_HOLD_MS) {
                    palmStart = 0;
                    palmBlockUntil = now + PALM_RETRIGGER_MS;
                    holdFill.style.width = '0%';
                    events.onReset();
                }
            }
            else {
                palmStart = 0;
                holdFill.style.width = '0%';
            }
        }
        var stream, e_1, hl, vision, e_2, _b, video, holdFill, lastCol, pinchArmed, lastPinchTs, palmStart, palmBlockUntil, lastDetectTs;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.getUserMedia)) {
                        console.warn('[gestures] getUserMedia unavailable — keyboard only.');
                        return [2 /*return*/, false];
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, navigator.mediaDevices.getUserMedia({
                            video: { width: 640, height: 480 },
                            audio: false
                        })];
                case 2:
                    stream = _c.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _c.sent();
                    console.warn('[gestures] Camera permission denied — keyboard only.', e_1);
                    return [2 /*return*/, false];
                case 4:
                    _c.trys.push([4, 7, , 8]);
                    return [4 /*yield*/, tasks_vision_1.FilesetResolver.forVisionTasks('/mediapipe/wasm')];
                case 5:
                    vision = _c.sent();
                    return [4 /*yield*/, tasks_vision_1.HandLandmarker.createFromOptions(vision, {
                            baseOptions: {
                                modelAssetPath: '/models/hand_landmarker.task',
                                delegate: 'GPU'
                            },
                            runningMode: 'VIDEO',
                            numHands: 1
                        })];
                case 6:
                    hl = _c.sent();
                    return [3 /*break*/, 8];
                case 7:
                    e_2 = _c.sent();
                    console.warn('[gestures] HandLandmarker failed to load — keyboard only.', e_2);
                    stream.getTracks().forEach(function (t) { return t.stop(); });
                    return [2 /*return*/, false];
                case 8:
                    _b = mountPreview(stream), video = _b.video, holdFill = _b.holdFill;
                    return [4 /*yield*/, waitForVideo(video)];
                case 9:
                    _c.sent();
                    lastCol = -1;
                    pinchArmed = true;
                    lastPinchTs = 0;
                    palmStart = 0;
                    palmBlockUntil = 0;
                    lastDetectTs = -1;
                    detect();
                    console.log('[gestures] MediaPipe ready.');
                    return [2 /*return*/, true];
            }
        });
    });
}
exports.initGestures = initGestures;
function isOpenPalm(lms) {
    var wrist = lms[0];
    var d = function (a, b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    };
    // Index, middle, ring, pinky: tip should be significantly farther from wrist than MCP knuckle.
    var tips = [8, 12, 16, 20];
    var mcps = [5, 9, 13, 17];
    var extended = 0;
    for (var i = 0; i < 4; i++) {
        if (d(lms[tips[i]], wrist) > d(lms[mcps[i]], wrist) * 1.5)
            extended++;
    }
    return extended >= 4;
}
function mountPreview(stream) {
    var wrap = document.createElement('div');
    wrap.style.cssText =
        'position:fixed;bottom:16px;right:16px;width:200px;z-index:10;pointer-events:none;font-family:sans-serif;';
    var holdBar = document.createElement('div');
    holdBar.style.cssText =
        'height:4px;background:#00ffff22;margin-bottom:4px;border-radius:2px;overflow:hidden;';
    var holdFill = document.createElement('div');
    holdFill.style.cssText = 'height:100%;width:0%;background:#00ffff;transition:width 60ms linear;';
    holdBar.appendChild(holdFill);
    wrap.appendChild(holdBar);
    var video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    video.style.cssText =
        'width:200px;height:150px;object-fit:cover;transform:scaleX(-1);border:1px solid #00ffff66;border-radius:6px;background:#000;';
    wrap.appendChild(video);
    document.body.appendChild(wrap);
    return { video: video, holdFill: holdFill };
}
function waitForVideo(video) {
    return new Promise(function (resolve) {
        if (video.readyState >= 2) {
            video.play()["catch"](function () { });
            resolve();
            return;
        }
        video.onloadedmetadata = function () {
            video.play()["catch"](function () { });
            resolve();
        };
    });
}
