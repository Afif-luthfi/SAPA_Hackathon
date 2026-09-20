import { decide, sequenceFeatures, type ResearchModel } from './baseline.mjs';
import type { LandmarkFrame } from '../vision/protocol';
let model: ResearchModel | null = null;
self.onmessage = (event: MessageEvent<{model?:ResearchModel;frames?:LandmarkFrame[]}>) => {
  try {
    if(event.data.model) { model=event.data.model; self.postMessage({type:'ready'}); return; }
    if(!model || !event.data.frames) throw new Error('Model belum tersedia');
    const started=performance.now();
    const result=decide(sequenceFeatures(event.data.frames),model);
    self.postMessage({type:'result',result,inferenceMs:Math.round(performance.now()-started)});
  } catch { self.postMessage({type:'error'}); }
};
