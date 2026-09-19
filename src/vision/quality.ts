import type { LandmarkFrame, Point } from './protocol';

export interface FrameQuality {
  handCount: number;
  upperBodyVisible: boolean;
  faceVisible: boolean;
  pointCount: number;
  guidance: string;
  tone: 'waiting' | 'adjust' | 'ready';
}

function usable(point: Point | undefined): point is Point {
  return !!point && [point.x, point.y, point.z].every(Number.isFinite)
    && (point.visibility === undefined || point.visibility >= 0.5);
}

export function assessFrame(frame: LandmarkFrame): FrameQuality {
  const hands = [frame.leftHand, frame.rightHand].filter(points => points.length === 21 && points.every(usable));
  const shoulders = [frame.pose[11], frame.pose[12]];
  const upperBodyVisible = shoulders.every(point => usable(point) && point.x > 0 && point.x < 1 && point.y > 0 && point.y < 1);
  const closeToEdge = hands.some(points => points.some(p => p.x < 0.035 || p.x > 0.965 || p.y < 0.035 || p.y > 0.965));
  const common = {
    handCount: hands.length,
    upperBodyVisible,
    faceVisible: frame.face.length > 0,
    pointCount: [...frame.pose, ...frame.leftHand, ...frame.rightHand, ...frame.face].filter(usable).length,
  };
  if (!upperBodyVisible) return { ...common, tone: 'waiting', guidance: 'Posisikan bahu dan tubuh bagian atas di dalam bingkai.' };
  if (hands.length === 0) return { ...common, tone: 'adjust', guidance: 'Angkat tangan di depan tubuh agar terlihat kamera.' };
  if (closeToEdge) return { ...common, tone: 'adjust', guidance: 'Geser tangan sedikit ke tengah agar tidak keluar dari bingkai.' };
  if (hands.length === 1) return { ...common, tone: 'ready', guidance: 'Satu tangan terlihat. Tampilkan tangan lainnya untuk mencoba gerakan dua tangan.' };
  return { ...common, tone: 'ready', guidance: 'Kedua tangan terlihat. Coba gerakkan perlahan di depan tubuh.' };
}

const HAND_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15],
  [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];
const POSE_EDGES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]];

export function drawLandmarks(canvas: HTMLCanvasElement, frame: LandmarkFrame, width: number, height: number) {
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, width, height);
  function draw(points: Point[], edges: number[][], color: string) {
    if (!context) return;
    context.lineWidth = Math.max(2, width / 240);
    context.strokeStyle = color;
    context.fillStyle = '#ffffff';
    const indices = new Set<number>();
    for (const [from, to] of edges) {
      const a = points[from];
      const b = points[to];
      if (!usable(a) || !usable(b)) continue;
      context.beginPath();
      context.moveTo(a.x * width, a.y * height);
      context.lineTo(b.x * width, b.y * height);
      context.stroke();
      indices.add(from);
      indices.add(to);
    }
    for (const index of indices) {
      const point = points[index];
      context.beginPath();
      context.arc(point.x * width, point.y * height, Math.max(2.5, width / 180), 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }
  draw(frame.pose, POSE_EDGES, '#c4e8f6');
  draw(frame.leftHand, HAND_EDGES, '#8ee8bd');
  draw(frame.rightHand, HAND_EDGES, '#ffd28f');
}
