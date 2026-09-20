import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, Hand, ShieldCheck, Square } from 'lucide-react';
import { useCameraPreview } from '../vision/useCameraPreview';
import type { LandmarkFrame, WorkerReply } from '../vision/protocol';
import type { Decision, ResearchModel } from './baseline.mjs';
import './research.css';
interface Metrics { inputKnownCount:number;inputUnknownCount:number;qualityRejectedKnown:number;qualityRejectedUnknown:number;endToEndCorrectRate:number;knownCount:number;closedSetAccuracy:number;macroF1:number;acceptedAccuracy:number|null;coverage:number;unknownCount:number;unknownRejected:number; }
interface Evaluation {modelSha256:string;trainingCount:number;test:Metrics;validation:Metrics;rejectedForQuality:number;}
export default function ResearchDemo(){
 const [model,setModel]=useState<ResearchModel|null>(null);
 const [evaluation,setEvaluation]=useState<Evaluation|null>(null);
 const [status,setStatus]=useState('Memuat model riset…');
 const [recording,setRecording]=useState(false);
 const [busy,setBusy]=useState(false);
 const [count,setCount]=useState(0);
 const [result,setResult]=useState<Decision|null>(null);
 const [inferenceMs,setInferenceMs]=useState(0);
 const [message,setMessage]=useState('');
 const [source,setSource]=useState('Kamera langsung');
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const clip=useRef<HTMLVideoElement>(null);
 const frames=useRef<LandmarkFrame[]>([]),capturing=useRef(false);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const worker=useRef<Worker|null>(null),clipWorker=useRef<Worker|null>(null);
 const operation=useRef(0),clipUrl=useRef('');
 const inferenceTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const [file,setFile]=useState<File|null>(null);
 const [fileUrl,setFileUrl]=useState('');
 const camera=useCameraPreview(video,canvas,{
  onFrame:frame=>{
    if(!capturing.current)return;
    frames.current.push({...frame,face:[]});setCount(frames.current.length);
    if(frames.current.length>=80)finishCapture();
  },
  onRelease:()=>{if(capturing.current)cancelCapture('Pengambilan dibatalkan karena kamera berhenti.');},
 });
 function cancelCapture(notice='Pengambilan dibatalkan.'){
  capturing.current=false;frames.current=[];clearTimeout(timer.current);setRecording(false);setCount(0);setStatus(notice);
 }
 function stopWork(){
  operation.current++;clipWorker.current?.terminate();clipWorker.current=null;
  cancelCapture('Pemrosesan dihentikan. Mulai lagi bila diperlukan.');
  clearTimeout(inferenceTimer.current);worker.current?.terminate();worker.current=null;setBusy(false);setResult(null);
 }
 useEffect(()=>{
  let active=true;
  const controller=new AbortController();
  Promise.all(['/research/wl-bisindo-model.json','/research/wl-bisindo-evaluation.json'].map(async path=>{
    const response=await fetch(path,{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw Error('Model belum disiapkan');return response.text();
  })).then(async ([modelText,reportText])=>{
    const report=JSON.parse(reportText) as Evaluation;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(modelText));
    const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==report.modelSha256)throw Error('Hash model tidak cocok');
    const loaded=JSON.parse(modelText) as ResearchModel;
    if(loaded.schemaVersion!==1||!loaded.templates.length)throw Error('Format model tidak valid');
    if(active){setModel(loaded);setEvaluation(report);setStatus('Model riset siap. Pilih kamera atau video uji lokal.');}
  }).catch(()=>{if(active)setStatus('Model riset belum tersedia atau file tidak cocok. Jalankan pipeline dataset terlebih dahulu.');});
  const hide=()=>{if(document.visibilityState==='hidden')stopWork();};
  const leave=()=>stopWork();
  document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave);
  return ()=>{active=false;controller.abort();operation.current++;capturing.current=false;frames.current=[];clearTimeout(timer.current);clearTimeout(inferenceTimer.current);worker.current?.terminate();worker.current=null;clipWorker.current?.terminate();if(clipUrl.current)URL.revokeObjectURL(clipUrl.current);document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);};
 },[]);
 function predict(sequence:LandmarkFrame[]){
  if(!model)return;
  setBusy(true);setResult(null);setMessage('');setStatus('Membandingkan urutan gerakan dengan model…');
  worker.current?.terminate();
  const current=new Worker(new URL('./recognition-worker.ts',import.meta.url),{type:'module'});worker.current=current;
  const timeout=setTimeout(()=>{if(worker.current===current){current.terminate();worker.current=null;setBusy(false);setStatus('Pemrosesan terlalu lama. Coba lagi.');}},15000);inferenceTimer.current=timeout;
  current.onmessage=event=>{
   if(worker.current!==current)return;
   if(event.data.type==='ready'){current.postMessage({frames:sequence});return;}
   clearTimeout(timeout);current.terminate();worker.current=null;setBusy(false);
   if(event.data.type==='result'){setResult(event.data.result);setInferenceMs(event.data.inferenceMs);setStatus(event.data.result.accepted?'Hasil siap diperiksa. Belum menjadi pesan.':'Gerakan belum cukup meyakinkan. Tidak ada pesan yang dibuat.');}
   else setStatus('Gerakan belum dapat diproses. Coba lagi.');
  };
  current.onerror=()=>{clearTimeout(timeout);current.terminate();if(worker.current===current){worker.current=null;setBusy(false);setStatus('Pemrosesan gagal. Coba lagi.');}};
  current.postMessage({model});
 }
 function finishCapture(){
  if(!capturing.current)return;
  const sequence=frames.current;capturing.current=false;frames.current=[];clearTimeout(timer.current);setRecording(false);camera.stop('Kamera dihentikan setelah sampel.');predict(sequence);
 }
 function startCapture(){
  if(camera.phase!=='active'||!model)return;
  setSource('Kamera langsung');setMessage('');setResult(null);frames.current=[];capturing.current=true;setCount(0);setRecording(true);setStatus('Lakukan satu isyarat. Selesai otomatis setelah 6 detik.');timer.current=setTimeout(finishCapture,6000);
 }
 async function processFile(){
  if(!file||!clip.current||!model)return;
  camera.stop('Kamera dihentikan untuk video uji.');setBusy(true);setResult(null);setMessage('');setSource('Video lokal: '+file.name);
  const token=++operation.current;const video=clip.current;const extractor=new Worker('/vision/landmark-worker.js');clipWorker.current=extractor;
  const request=(payload:unknown,transfer:Transferable[]=[])=>new Promise<WorkerReply>((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Waktu pemrosesan habis')),30000);
   extractor.onmessage=event=>{clearTimeout(timeout);event.data.type==='error'?reject(Error('Ekstraksi gagal')):resolve(event.data);};
   extractor.onerror=()=>{clearTimeout(timeout);reject(Error('Worker gagal'));};extractor.postMessage(payload,transfer);
  });
  try{
   if(!Number.isFinite(video.duration)||video.duration<=.1||video.duration>30)throw Error('Gunakan video singkat 0,1–30 detik yang dapat diputar browser.');
   await request({type:'init'});const sequence:LandmarkFrame[]=[];
   for(let index=0;index<32;index++){
    if(operation.current!==token)return;
    setStatus(`Memproses video uji: ${index+1}/32 frame…`);
    await new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Video belum dapat dibaca')),5000);video.onseeked=()=>{clearTimeout(timeout);resolve();};video.currentTime=.02+index/31*Math.max(0,video.duration-.06);});
    const bitmap=await createImageBitmap(video,{resizeWidth:640,resizeHeight:Math.round(video.videoHeight*640/video.videoWidth)});
    const reply=await request({type:'frame',bitmap,timestampMs:index*video.duration*1000/31},[bitmap]);
    if(reply.type==='result')sequence.push({...reply.frame,face:[]});
   }
   if(operation.current===token)predict(sequence);
  }catch(error){if(operation.current===token){setBusy(false);setStatus(error instanceof Error?error.message:'Video gagal diproses');}}
  finally{extractor.terminate();if(clipWorker.current===extractor)clipWorker.current=null;}
 }
 return <main className="research-page">
  <a className="text-button" href="#"><ArrowLeft size={17}/>Kembali ke SAPA</a>
  <header><span className="pill">Eksperimen nonkomersial · BISINDO Banten</span><h1>Tiga isyarat, data nyata.</h1><p>Maaf · Terima kasih · Di mana</p></header>
  <div className="research-notice"><ShieldCheck size={22}/><p>Model ini belajar dari WL-BISINDO dan hanya membandingkan tiga kata. Penolakan isyarat di luar daftar belum andal. Hasil masih eksperimen, belum ditinjau komunitas untuk SAPA dan bukan penerjemah kalimat atau kebutuhan medis. Kamera diproses di perangkat; video lokal tidak diunggah. Pemeriksaan file di halaman ini bukan verifikasi BOT Chain.</p></div>
  {evaluation&&<section className="research-metrics" aria-label="Evaluasi model"><div><strong>{evaluation.trainingCount}</strong><span>video pelatihan</span></div><div><strong>{evaluation.test.inputKnownCount ?? evaluation.test.knownCount}</strong><span>video target · penutur uji terpisah</span></div><div><strong>{((evaluation.test.endToEndCorrectRate ?? 0)*100).toFixed(1)}%</strong><span>video target berhasil dikenali dan diterima</span></div><div><strong>{evaluation.test.qualityRejectedKnown ?? 0}</strong><span>video target ditolak kualitas landmark</span></div><p>Angka di atas berasal dari satu penutur uji dataset, bukan akurasi kamera langsung. Uji kata di luar cakupan (“Makan”): {evaluation.test.unknownCount-evaluation.test.unknownRejected} dari {evaluation.test.unknownCount} video yang lolos kualitas salah diterima; {evaluation.test.qualityRejectedUnknown ?? 0} video lain ditolak kualitas. Model belum andal menolak isyarat asing.</p></section>}
  <div className="research-grid"><section className="research-card"><h2><Camera size={21}/>Coba satu isyarat</h2><p>Pelajari contoh dari sumber berizin. Hadapkan bahu ke kamera, mulai dari posisi netral, lalu lakukan satu isyarat. Tekan selesai setelah gerakan berakhir.</p>
   <div className="research-camera"><video ref={video} muted playsInline autoPlay/><canvas ref={canvas}/></div>
   <p role="status">{camera.error ?? camera.note}</p>
   <div className="research-actions">{camera.phase!=='active'?<button className="button primary" disabled={!model||busy||camera.phase==='requesting'||camera.phase==='loading'} onClick={camera.start}>Aktifkan kamera</button>:<button className="button secondary" onClick={()=>camera.stop('Kamera dimatikan.')}>Matikan kamera</button>}
   {!recording?<button className="button primary" disabled={!model||busy||camera.phase!=='active'} onClick={startCapture}><Hand size={17}/>Mulai isyarat</button>:<><button className="button primary" onClick={finishCapture}><Square size={17}/>Selesai isyarat ({count})</button><button className="button secondary" onClick={()=>{cancelCapture();camera.stop('Dibatalkan.');}}>Batalkan isyarat</button></>}</div>
   <details><summary>Atau gunakan video uji lokal</summary><p>Ini pengenalan dari rekaman, bukan kamera langsung. Gunakan video yang tidak dipakai melatih model untuk demonstrasi evaluasi.</p><input aria-label="Video isyarat lokal" type="file" accept="video/mp4,video/webm" disabled={busy||recording} onChange={e=>{const selected=e.target.files?.[0]??null;setFile(selected);setResult(null);setMessage('');if(clipUrl.current)URL.revokeObjectURL(clipUrl.current);clipUrl.current=selected?URL.createObjectURL(selected):'';setFileUrl(clipUrl.current);}}/>{fileUrl&&<video className="research-clip" ref={clip} src={fileUrl} controls muted preload="auto"/>}<button className="button secondary" disabled={!file||!model||busy||recording} onClick={processFile}>Proses video pilihan</button></details>
  </section><section className="research-card"><h2>Periksa hasilnya</h2><p className="research-status" role="status">{status}</p>{busy&&<button className="button secondary" onClick={stopWork}>Batalkan pemrosesan</button>}
   {result&&<div data-testid="bisindo-result"><p className="research-source">Sumber: {source}</p><h3>{result.accepted?model?.labels[result.candidates[0].label]:'Belum dikenali'}</h3><p>{result.accepted?'Kandidat dari tiga kata yang tersedia. Isyarat di luar daftar dapat salah dikenali. Periksa artinya sebelum mengonfirmasi.':'Di luar cakupan atau terlalu ragu. Gunakan komunikasi manual pada SAPA.'}</p><small>Waktu klasifikasi: {inferenceMs} ms. Jarak model bukan persentase keyakinan.</small>{result.accepted&&<button className="button primary" onClick={()=>{setMessage(model!.labels[result.candidates[0].label]);setResult(null);}}><Check size={17}/>Benar, tampilkan kata</button>}</div>}
   {message&&<div className="research-confirmed" role="status"><strong>Pesan dikonfirmasi</strong><p>{message}</p><button className="text-button" onClick={()=>setMessage('')}>Hapus pesan</button></div>}
   <p>Demo ini hanya menampilkan kata yang dikenali. “Di mana” tidak diubah menjadi “Di mana loket pendaftaran?”. Gunakan <a href="#">SAPA</a> untuk frasa layanan dan pengetikan.</p>
  </section></div>
  <footer>Dataset: <a href="https://www.kaggle.com/datasets/glennleonali/wl-bisindo">WL-BISINDO</a> — Grace Oktaviani Kindy, Glenn Leonali, Henry Lucky. <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a>. Fitur diturunkan dari video untuk model riset SAPA. Tidak ada klaim persetujuan atau dukungan dari pembuat dataset.</footer>
 </main>;
}
