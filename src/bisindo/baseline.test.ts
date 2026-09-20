import { describe,expect,it } from 'vitest';
import { decide,distance,sequenceFeatures,type ResearchModel } from './baseline.mjs';
import { buildDemoPatternFrames } from '../intent/demoPattern';
describe('WL-BISINDO temporal baseline',()=>{
 it('rejects blank frames instead of inventing a class',()=>{
  expect(sequenceFeatures([{timestampMs:0,pose:[],leftHand:[],rightHand:[],face:[]}])).toBeNull();
  expect(decide(null,{} as ResearchModel).accepted).toBe(false);
 });
 it('keeps detected hands when their unused visibility field is zero',()=>{
  const frames=buildDemoPatternFrames().map(f=>({...f,leftHand:f.leftHand.map(p=>({...p,visibility:0})),rightHand:f.rightHand.map(p=>({...p,visibility:0}))}));
  expect(sequenceFeatures(frames)).not.toBeNull();
 });
 it('normalizes translation and scale while preserving hand motion',()=>{
  const frames=buildDemoPatternFrames();const original=sequenceFeatures(frames)!;
  const transformed=frames.map(f=>({...f,pose:f.pose.map(p=>({...p,x:p.x*.8+.1,y:p.y*.8+.15})),leftHand:f.leftHand.map(p=>({...p,x:p.x*.8+.1,y:p.y*.8+.15})),rightHand:f.rightHand.map(p=>({...p,x:p.x*.8+.1,y:p.y*.8+.15}))}));
  expect(distance(original,sequenceFeatures(transformed)!)).toBeLessThan(1e-12);
  expect(distance(original,original)).toBe(0);
 });
 it('rejects ambiguous identical classes even when the nearest distance is zero',()=>{
  const features=sequenceFeatures(buildDemoPatternFrames())!;
  const model={threshold:{maxDistance:1,minMargin:.1},templates:[{label:6,features},{label:10,features}]} as ResearchModel;
  const decision=decide(features,model);
  expect(decision.margin).toBe(0);expect(decision.accepted).toBe(false);
 });
});
