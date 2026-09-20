import { readFile,readdir,mkdir,writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { createHash } from 'node:crypto';
import { sequenceFeatures,rank,LABELS } from '../src/bisindo/baseline.mjs';
const root=resolve('datasets/private/wl-bisindo');
const downloads=JSON.parse(await readFile(join(root,'downloads.json'),'utf8'));
if(downloads.failures.length||downloads.files.length!==200)throw Error('Expected the complete 200-video subset');
const hashOwners=new Map();
for(const file of downloads.files){const signer=Number(/signer(\d+)/.exec(file.file)[1]);const split=signer<3?'train':signer===3?'validation':'test';if(hashOwners.has(file.sha256)&&hashOwners.get(file.sha256)!==split)throw Error('Duplicate video across splits');hashOwners.set(file.sha256,split);}
const extracted=await readdir(join(root,'landmarks-h264'));
if(downloads.files.some(x=>!extracted.includes(x.file.replace('.mp4','.json'))))throw Error('Extraction incomplete');
const samples=[];const rejected=[];
for(const file of (await readdir(join(root,'landmarks-h264'))).filter(f=>f.endsWith('.json')).sort()){
 const sample=JSON.parse(await readFile(join(root,'landmarks-h264',file),'utf8'));
 const extractedFeatures=sequenceFeatures(sample.frames);
 const features=extractedFeatures?.map(f=>f.map(n=>Math.round(n*1e6)/1e6));
 if(features)samples.push({...sample,features});else rejected.push(sample.file);
}
const templates=samples.filter(s=>s.signer<3&&LABELS[s.label]).map(s=>({file:s.file,label:s.label,signer:s.signer,features:s.features}));
for(const label of Object.keys(LABELS))if(templates.filter(s=>s.label===Number(label)).length<15)throw Error('Insufficient training samples for '+label);
const validation=samples.filter(s=>s.signer===3).map(s=>({...rank(s.features,templates),label:s.label,file:s.file}));
if(!validation.some(s=>s.label===7)||Object.keys(LABELS).some(l=>!validation.some(s=>s.label===Number(l))))throw Error('Missing validation labels/rejection probe');
function summarize(rows,threshold){
 const known=rows.filter(s=>LABELS[s.label]),unknown=rows.filter(s=>!LABELS[s.label]);
 const accepts=s=>s.candidates[0].distance<=threshold.maxDistance&&s.margin>=threshold.minMargin;
 const correct=s=>s.candidates[0].label===s.label;
 const accepted=known.filter(accepts);
 const signer=Number(/signer(\d+)/.exec(rows[0].file)[1]);
 const inputFiles=downloads.files.filter(f=>f.file.startsWith(`signer${signer}_`));
 const inputKnownCount=inputFiles.filter(f=>LABELS[Number(/label(\d+)/.exec(f.file)[1])]).length;
 const inputUnknownCount=inputFiles.length-inputKnownCount;
 const confusion=Object.fromEntries(Object.keys(LABELS).map(l=>[l,Object.fromEntries(Object.keys(LABELS).map(x=>[x,0]))]));
 for(const s of known)confusion[s.label][s.candidates[0].label]++;
 const perClass=Object.keys(LABELS).map(label=>{
   const tp=known.filter(s=>s.label===Number(label)&&correct(s)).length;
   const fp=known.filter(s=>s.label!==Number(label)&&s.candidates[0].label===Number(label)).length;
   const fn=known.filter(s=>s.label===Number(label)&&!correct(s)).length;
   return {label:Number(label),f1:2*tp/(2*tp+fp+fn||1)};
 });
 return {inputKnownCount,inputUnknownCount,qualityRejectedKnown:inputKnownCount-known.length,qualityRejectedUnknown:inputUnknownCount-unknown.length,endToEndCorrectRate:accepted.filter(correct).length/(inputKnownCount||1),knownCount:known.length,closedSetAccuracy:known.filter(correct).length/(known.length||1),macroF1:perClass.reduce((n,x)=>n+x.f1,0)/perClass.length,accepted:accepted.length,acceptedCorrect:accepted.filter(correct).length,acceptedAccuracy:accepted.length?accepted.filter(correct).length/accepted.length:null,coverage:accepted.length/(known.length||1),unknownCount:unknown.length,unknownRejected:unknown.filter(s=>!accepts(s)).length,confusion,perClass};
}
let best=null;
for(const maxDistance of [...new Set(validation.map(s=>s.candidates[0].distance))].sort((a,b)=>a-b))for(const minMargin of [0,.05,.1,.15,.2,.25,.3,.4,.5,.6,.7]){
 const threshold={maxDistance,minMargin};const stats=summarize(validation,threshold);
 if(stats.accepted<1 || stats.acceptedAccuracy<.9 || stats.unknownRejected/stats.unknownCount<.8)continue;
 const score=stats.acceptedCorrect-3*(stats.accepted-stats.acceptedCorrect)-3*(stats.unknownCount-stats.unknownRejected);
 if(!best||score>best.score)best={threshold,stats,score};
}
const threshold=best?.threshold??{maxDistance:0,minMargin:1};
// Freeze choices before opening the held-out test set.
const model={schemaVersion:1,modelId:'sapa-wl-bisindo-dtw-v1',method:'3-neighbour per-class mean DTW distance',labels:LABELS,region:'Banten',validated:false,license:'CC BY-NC 4.0',source:'https://www.kaggle.com/datasets/glennleonali/wl-bisindo',authors:['Grace Oktaviani Kindy','Glenn Leonali','Henry Lucky'],split:{train:[0,1,2],validation:[3],test:[4]},threshold,templates};
const test=samples.filter(s=>s.signer===4).map(s=>({...rank(s.features,templates),label:s.label,file:s.file}));
if(!test.some(s=>s.label===7)||Object.keys(LABELS).some(l=>!test.some(s=>s.label===Number(l))))throw Error('Missing held-out test labels');
const report={generatedAt:new Date().toISOString(),modelId:model.modelId,trainingCount:templates.length,downloadedCount:downloads.files.length,qualityCounts:{train:samples.filter(s=>s.signer<3).length,validation:samples.filter(s=>s.signer===3).length,test:samples.filter(s=>s.signer===4).length},rejectedForQuality:rejected,threshold,thresholdSelection:'Only signer 3: accepted accuracy >=90%, rejection of Makan >=80%; maximize correct accepts minus 3x errors. No test tuning.',validation:summarize(validation,threshold),test:summarize(test,threshold),limits:['Only 3 isolated signs; no clinical intents or sentence translation.','Single held-out test signer; not community validation.','Unknown rejection FAILED on held-out Makan videos; use only as a constrained-vocabulary research experiment, not open-world recognition.','Physical webcam and novice demonstration not evaluated.'],testPredictions:test.map(s=>({file:s.file,label:s.label,prediction:s.candidates[0].label,distance:s.candidates[0].distance,margin:s.margin,accepted:s.candidates[0].distance<=threshold.maxDistance&&s.margin>=threshold.minMargin}))};
await mkdir('public/research',{recursive:true});
const payload=JSON.stringify(model);
await writeFile('public/research/wl-bisindo-model.json',payload);
report.modelSha256=createHash('sha256').update(payload).digest('hex');
await writeFile('datasets/wl-bisindo/evaluation.json',JSON.stringify(report,null,2));
await writeFile('public/research/wl-bisindo-evaluation.json',JSON.stringify({...report,testPredictions:undefined,rejectedForQuality:report.rejectedForQuality.length},null,2));
console.log(JSON.stringify({...report,testPredictions:undefined},null,2));
