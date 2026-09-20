// Supervised nearest-neighbour temporal baseline; distances are not probabilities.
export const LABELS = {6:'Maaf',10:'Terima kasih',15:'Di mana'};
const POSE = [11,12,13,14,15,16];
export function sequenceFeatures(frames) {
  const result=[];
  for(const frame of frames) {
    const left=frame.pose?.[11],right=frame.pose?.[12];
    if(!left||!right || (left.visibility??1)<.4 || (right.visibility??1)<.4)continue;
    const width=Math.hypot(left.x-right.x,left.y-right.y);
    if(width<.04)continue;
    const cx=(left.x+right.x)/2,cy=(left.y+right.y)/2;
    const points=[...POSE.map(i=>frame.pose[i]),...Array.from({length:21},(_,i)=>frame.leftHand?.[i]),...Array.from({length:21},(_,i)=>frame.rightHand?.[i])];
    // Hand landmark presence is indicated by its array; visibility is not populated like pose visibility.
    result.push(points.flatMap((p,index)=>p && (index>=POSE.length || (p.visibility??1)>=.3) ? [Math.max(-4,Math.min(4,(p.x-cx)/width)),Math.max(-4,Math.min(4,(p.y-cy)/width)),1] : [0,0,0]));
  }
  if(result.length<8 || result.filter(f=>f.slice(18).some((x,i)=>i%3===2&&x===1)).length<result.length*.5)return null;
  // Same fixed temporal sampling on file and camera inputs.
  return Array.from({length:24},(_,i)=>result[Math.round(i*(result.length-1)/23)]);
}
function frameDistance(a,b) {
 let sum=0,weight=0;
 for(let i=0;i<a.length;i+=3){
  const w=i<18?.35:1;
  if(a[i+2]&&b[i+2]){sum+=w*Math.min(9,(a[i]-b[i])**2+(a[i+1]-b[i+1])**2);weight+=w;}
  else if(a[i+2]!==b[i+2]){sum+=w*.8;weight+=w;}
 }
 return weight?sum/weight:2;
}
export function distance(a,b){
 let previous=new Float64Array(b.length+1).fill(Infinity);previous[0]=0;
 for(let i=1;i<=a.length;i++){
  const current=new Float64Array(b.length+1).fill(Infinity);
  for(let j=Math.max(1,i-6);j<=Math.min(b.length,i+6);j++)current[j]=frameDistance(a[i-1],b[j-1])+Math.min(previous[j],current[j-1],previous[j-1]);
  previous=current;
 }
 return previous[b.length]/(a.length+b.length);
}
export function rank(features,templates){
 const byLabel={};
 for(const t of templates)(byLabel[t.label]??=[]).push(distance(features,t.features));
 const candidates=Object.entries(byLabel).map(([label,values])=>({label:Number(label),distance:values.sort((a,b)=>a-b).slice(0,3).reduce((a,b)=>a+b,0)/Math.min(3,values.length)})).sort((a,b)=>a.distance-b.distance);
 const margin=candidates.length>1?(candidates[1].distance-candidates[0].distance)/Math.max(candidates[1].distance,1e-9):0;
 return {candidates,margin};
}
export function decide(features,model){
 if(!features)return {accepted:false,candidates:[],margin:0};
 const ranked=rank(features,model.templates);
 return {...ranked,accepted:ranked.candidates[0].distance<=model.threshold.maxDistance&&ranked.margin>=model.threshold.minMargin};
}
