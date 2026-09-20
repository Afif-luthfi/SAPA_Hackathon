import type { LandmarkFrame } from '../vision/protocol';
export const LABELS: Record<number, string>;
export interface ResearchModel { schemaVersion: number; modelId: string; region: string; validated: false; license: string; source: string; authors: string[]; labels: Record<number,string>; threshold: {maxDistance:number;minMargin:number}; templates: {label:number;signer:number;file:string;features:number[][]}[]; }
export interface Decision { accepted:boolean; margin:number; candidates:{label:number;distance:number}[]; }
export function sequenceFeatures(frames: LandmarkFrame[]): number[][] | null;
export function rank(features:number[][],templates:ResearchModel['templates']): Omit<Decision,'accepted'>;
export function distance(a:number[][],b:number[][]):number;
export function decide(features:number[][]|null,model:ResearchModel):Decision;
