export interface Point { x: number; y: number; z: number; visibility?: number; }
export interface LandmarkFrame {
  timestampMs: number;
  pose: Point[];
  leftHand: Point[];
  rightHand: Point[];
  face: Point[];
}
export type WorkerRequest = { type: 'init' } | { type: 'frame'; bitmap: ImageBitmap; timestampMs: number };
export type WorkerReply = { type: 'ready' }
  | { type: 'result'; frame: LandmarkFrame; inferenceMs: number }
  | { type: 'error'; code: 'init' | 'inference' };
