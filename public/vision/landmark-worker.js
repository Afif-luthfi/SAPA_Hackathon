/* SAPA stage 2: classic worker, same-origin assets, no network uploads or frame logs. */
let detector = null;
let initializing = false;
const base = new URL('./', self.location.href);
function first(result) {
  return (result?.[0] ?? []).map(point => {
    const value = { x: point.x, y: point.y, z: point.z };
    if (Number.isFinite(point.visibility)) value.visibility = point.visibility;
    return value;
  });
}

self.onmessage = async event => {
  const request = event.data;
  if (request.type === 'init') {
    if (detector) { self.postMessage({ type: 'ready' }); return; }
    if (initializing) return;
    initializing = true;
    try {
      self.importScripts(new URL('vendor/vision_bundle.js', base).href);
      const vision = await self.Vision.FilesetResolver.forVisionTasks(new URL('wasm', base).href);
      detector = await self.Vision.HolisticLandmarker.createFromOptions(vision, {
        canvas: new OffscreenCanvas(640, 480),
        baseOptions: {
          modelAssetPath: new URL('models/holistic_landmarker.task', base).href,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        minFaceDetectionConfidence: 0.5,
        minPoseDetectionConfidence: 0.5,
        minHandLandmarksConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputPoseSegmentationMasks: false,
      });
      self.postMessage({ type: 'ready' });
    } catch {
      detector?.close();
      detector = null;
      self.postMessage({ type: 'error', code: 'init' });
    } finally {
      initializing = false;
    }
    return;
  }
  if (request.type === 'frame') {
    const { bitmap, timestampMs } = request;
    try {
      if (!detector || !bitmap || !Number.isFinite(timestampMs)) throw new Error('Unavailable frame processor');
      const started = performance.now();
      const result = detector.detectForVideo(bitmap, timestampMs);
      self.postMessage({
        type: 'result',
        frame: {
          timestampMs,
          pose: first(result.poseLandmarks),
          leftHand: first(result.leftHandLandmarks),
          rightHand: first(result.rightHandLandmarks),
          face: first(result.faceLandmarks),
        },
        inferenceMs: Math.round(performance.now() - started),
      });
    } catch {
      self.postMessage({ type: 'error', code: 'inference' });
    } finally {
      bitmap?.close();
    }
  }
};
