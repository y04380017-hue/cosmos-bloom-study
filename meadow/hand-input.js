/* MediaPipe inference runs on the device. No camera pixels or landmarks leave this page. */
(function (root) {
  'use strict';
  const workerContext = typeof importScripts === 'function' && !root.document;
  const scriptURL = workerContext ? root.location.href : root.document?.currentScript?.src;
  const vendorURL = scriptURL ? new URL('./vendor/hand/', scriptURL).href : '';
  const cameraFPS = 15;

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
  }

  function openPalm(points) {
    if (!points || points.length !== 21) return false;
    // Arc / chord ratio recognizes an extended finger at any wrist rotation.
    // Wrist-to-tip length rejects straight but folded-back fingers.
    let extended = 0;
    for (const knuckle of [5, 9, 13, 17]) {
      const [mcp, pip, dip, tip] = points.slice(knuckle, knuckle + 4);
      const arc = distance(mcp, pip) + distance(pip, dip) + distance(dip, tip);
      if (arc && distance(mcp, tip) >= .83 * arc &&
          distance(points[0], tip) >= distance(points[0], pip) + arc * .12) extended++;
    }
    return extended >= 3;
  }

  function palmPoint(landmarks, worldLandmarks) {
    if (!landmarks || landmarks.length !== 21 || !openPalm(worldLandmarks || landmarks)) return null;
    const middle = [0, 5, 9, 13, 17];
    const sum = middle.reduce((out, i) => [out[0] + landmarks[i].x, out[1] + landmarks[i].y], [0, 0]);
    const clamp = v => Math.min(1, Math.max(0, v));
    return {x: clamp(1 - sum[0] / middle.length), y: clamp(sum[1] / middle.length)};
  }

  async function loadDetector() {
    const {FilesetResolver, HandLandmarker} = await import(vendorURL + 'vision_bundle.mjs');
    const wasm = await FilesetResolver.forVisionTasks(vendorURL + 'wasm');
    return HandLandmarker.createFromOptions(wasm, {
      baseOptions: {modelAssetPath: vendorURL + 'hand_landmarker.task', delegate: 'CPU'},
      runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .55,
      minHandPresenceConfidence: .55, minTrackingConfidence: .55
    });
  }

  function describeHands(result, aspect = 4 / 3) {
    const categories = result.handedness || result.handednesses || [];
    const hands = [];
    for (const [i, points] of result.landmarks.entries()) {
      const label = categories[i]?.[0];
      if (!label || !['Left', 'Right'].includes(label.categoryName) || label.score < .62 || points.length !== 21) continue;
      const world = result.worldLandmarks?.[i] || points;
      const palm = [0,5,9,13,17].map(k => points[k]);
      const span = (a,b) => Math.hypot((a.x-b.x)*aspect, a.y-b.y);
      // Palm bones remain nearly the same length as the fingers curl. Use their
      // projected lengths to estimate distance independently of finger spread.
      const size = (span(points[0],points[9]) + span(points[5],points[17]) + span(points[0],points[5])) / 3;
      if (size < .012) continue;
      let extension = 0;
      for (const k of [5,9,13,17]) {
        const arc = distance(world[k],world[k+1])+distance(world[k+1],world[k+2])+distance(world[k+2],world[k+3]);
        const reach = (distance(world[0],world[k+3])-distance(world[0],world[k])) / Math.max(.0001,arc);
        extension += Math.max(0,Math.min(1,(reach-.04)/.77)) / 4;
      }
      hands.push({side:label.categoryName, x:1-palm.reduce((n,p)=>n+p.x,0)/5,
        y:palm.reduce((n,p)=>n+p.y,0)/5, size, extension, open:openPalm(world),
        points:points.map(p=>[1-p.x,p.y])});
    }
    return hands.filter(h => hands.filter(other=>other.side===h.side).length === 1);
  }
  function detect(detector, image, now) {
    const result = detector.detectForVideo(image, now);
    const aspect = (image.videoWidth || image.width) / (image.videoHeight || image.height);
    const hands = describeHands(result, aspect || 4/3);
    const first = result.landmarks[0];
    return {hands, present:!!first, point:palmPoint(first,result.worldLandmarks?.[0])};
  }

  if (workerContext) {
    // A classic worker permits the WASM loader's importScripts(). Pass at most
    // one transferable camera frame at once and release it after inference.
    let detector;
    root.onmessage = async ({data}) => {
      try {
        if (data.type === 'init') {
          detector = await loadDetector();
          root.postMessage({type: 'ready'});
        } else if (data.type === 'frame') {
          root.postMessage({type: 'result', ...detect(detector, data.image, data.time)});
        }
      } catch (error) {
        root.postMessage({type: 'error', message: error.message});
      } finally { data.image?.close(); }
    };
    return;
  }

  const cameraErrors = {
    NotAllowedError: '摄像头权限未开启，可在浏览器允许后重试，或拖动花海唤醒花朵。',
    SecurityError: '此页面无法使用摄像头，可直接打开花海网址，或使用拖动花浪。',
    NotFoundError: '未找到摄像头，仍可拖动唤醒花朵。',
    NotReadableError: '摄像头正被其他应用占用，请关闭占用后重试。',
    AbortError: '摄像头启动中断，可以重试。'
  };

  function create({onHands, onVideo, onPoint = () => {}, onStatus = () => {}, onActive = () => {}, onLost = () => {}} = {}) {
    let current, disposed = false, status;
    function say(text) { if (status !== text) { status = text; onStatus(text); } }

    function end(s, message) {
      if (current !== s || !s) return;
      current = null;
      cancelAnimationFrame(s.raf);
      s.cancelInit?.();
      s.worker?.terminate();
      try { s.detector?.close(); } catch (_) { /* context may already be lost */ }
      for (const t of s.stream?.getTracks() || []) { t.onended = null; t.stop(); }
      if (s.video) { s.video.pause(); s.video.srcObject = null; }
      onHands?.([]); onLost(); onActive(false); say(message);
    }
    function stop() { end(current, '摄像头已关闭'); }
    function handleResult(s, {present, point, hands}) {
      if (s !== current) return;
      if (onHands && hands) { onHands(hands); return; }
      if (!point) {
        if (s.last) onLost();
        s.last = null; s.openFrames = 0;
        say(present ? '已找到手掌，张开四指即可唤醒花朵。' : '请将一只张开的手掌放在摄像头前。');
        return;
      }
      if (++s.openFrames < 2) return;
      // Recover immediately after reacquisition; don't connect across a fist or loss.
      const mix = .60;
      s.last = s.last ? {x: s.last.x + (point.x - s.last.x) * mix, y: s.last.y + (point.y - s.last.y) * mix} : point;
      say('已识别张开的手掌，缓缓划过花带。');
      onPoint(s.last.x, s.last.y);
    }

    async function setupWorker(s) {
      const worker = new Worker(scriptURL);
      s.worker = worker;
      await new Promise((resolve, reject) => {
        // Time out initialization if a browser silently blocks WASM in workers.
        const timer = setTimeout(() => finish(new Error('worker initialization timed out')), 30000);
        function finish(error) {
          clearTimeout(timer); s.cancelInit = null;
          error ? reject(error) : resolve();
        }
        s.cancelInit = () => finish(new Error('cancelled'));
        worker.onerror = () => finish(new Error('worker unavailable'));
        worker.onmessage = ({data}) => {
          if (data.type === 'ready') finish();
          else if (data.type === 'error') finish(new Error(data.message));
        };
        worker.postMessage({type: 'init'});
      });
      worker.onerror = () => end(s, '手势识别已中断，点击摄像头按钮可以重试。');
      worker.onmessage = ({data}) => {
        if (s !== current) return;
        if (data.type === 'error') { end(s, '设备暂时无法处理手势，可重试或拖动花海。'); return; }
        if (data.type === 'result') { s.inflight = false; handleResult(s, data); }
      };
    }

    async function frame(s, time) {
      if (s !== current) return;
      s.raf = requestAnimationFrame(t => frame(s, t));
      if (s.inflight || s.video.readyState < 2 || s.frameTime === s.video.currentTime ||
          time - s.lastTime < 1000 / cameraFPS) return;
      s.lastTime = time; s.frameTime = s.video.currentTime; s.inflight = true;
      try {
        if (s.worker) {
          const image = await createImageBitmap(s.video);
          if (s !== current) { image.close(); return; }
          try { s.worker.postMessage({type: 'frame', image, time}, [image]); }
          catch (error) { image.close(); throw error; }
        } else {
          handleResult(s, detect(s.detector, s.video, time)); s.inflight = false;
        }
      } catch (_) { end(s, '设备暂时无法处理手势，可重试或拖动花海。'); }
    }

    async function start() {
      if (disposed) return false;
      if (current) return current.running;
      if (!root.navigator?.mediaDevices?.getUserMedia) {
        say('浏览器无法使用摄像头，可直接打开 HTTPS 花海网址，或拖动唤醒花朵。'); return false;
      }
      const s = {openFrames: 0, last: null, lastTime: -Infinity, frameTime: -1, running: false, raf: 0};
      current = s; onActive(true); say('等待摄像头授权…');
      try {
        const stream = await root.navigator.mediaDevices.getUserMedia({
          audio: false, video: {facingMode: {ideal: 'user'}, width: {ideal: 640}, height: {ideal: 480}, frameRate: {ideal: 20, max: 30}}
        });
        if (s !== current) { stream.getTracks().forEach(t => t.stop()); return false; }
        s.stream = stream;
        for (const t of stream.getVideoTracks()) t.onended = () => end(s, '摄像头连接已结束，可重新开启。');
        const video = s.video = root.document.createElement('video');
        video.muted = true; video.playsInline = true; video.autoplay = true; video.srcObject = stream;
        await video.play();
        if (s !== current) return false;
        onVideo?.(video);
        say('正在准备本机手势识别，首次使用需要加载模型…');
        if (root.Worker && root.createImageBitmap && root.OffscreenCanvas) {
          try { await setupWorker(s); }
          catch (_) { s.worker?.terminate(); s.worker = null; }
        }
        if (s !== current) return false;
        if (!s.worker) {
          const detector = await loadDetector();
          if (s !== current) { detector.close(); return false; }
          s.detector = detector;
        }
        s.running = true;
        say('请将一只张开的手掌放在摄像头前。');
        s.raf = requestAnimationFrame(t => frame(s, t)); return true;
      } catch (error) { end(s, cameraErrors[error.name] || '手势识别未能启动，可重试或拖动花海。'); return false; }
    }

    function visibility() { if (root.document.hidden) stop(); }
    root.addEventListener('pagehide', stop);
    root.document.addEventListener('visibilitychange', visibility);
    return {start, stop, dispose() {
      disposed = true; stop();
      root.removeEventListener('pagehide', stop);
      root.document.removeEventListener('visibilitychange', visibility);
    }};
  }
  const api = {create, openPalm, palmPoint, describeHands};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MeadowHandInput = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
