// Offline extraction using the same local MediaPipe worker as SAPA.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const privateRoot = join(root, 'datasets/private/wl-bisindo');
const output = join(privateRoot, 'landmarks-h264');
await mkdir(output, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') { res.setHeader('Content-Type','text/html'); res.end('<!doctype html><html><body><video muted playsinline></video></body></html>'); return; }
    let path;
    if (/^\/video\/signer[0-4]_label[0-9]+_sample[0-9]+\.mp4$/.test(url.pathname)) path = join(privateRoot, 'browser-videos', url.pathname.split('/').at(-1));
    else if (/^\/vision\/[a-zA-Z0-9_./-]+$/.test(url.pathname) && !url.pathname.includes('..')) path = join(root, 'public', url.pathname);
    else { res.writeHead(404).end(); return; }
    const data = await readFile(path);
    res.setHeader('Content-Type', ({'.mp4':'video/mp4','.js':'text/javascript','.wasm':'application/wasm'})[extname(path)] ?? 'application/octet-stream');
    res.setHeader('Accept-Ranges','bytes');
    const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
    if (match) {
      const start = Number(match[1]), end = match[2] ? Math.min(Number(match[2]), data.length-1) : data.length-1;
      if (start > end) { res.writeHead(416).end(); return; }
      res.writeHead(206, {'Content-Range':`bytes ${start}-${end}/${data.length}`, 'Content-Length':end-start+1}); res.end(data.subarray(start,end+1));
    } else { res.setHeader('Content-Length',data.length); res.end(data); }
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({channel:'msedge',headless:true});
const page = await browser.newPage();
await page.route('**/*', route => route.request().url().startsWith(origin+'/') ? route.continue() : route.abort());
await page.goto(origin);
const all = (await readdir(join(privateRoot,'browser-videos'))).filter(name => name.endsWith('.mp4')).sort();
const limitArg = process.argv.indexOf('--limit');
const selected = limitArg >= 0 ? all.slice(0, Number(process.argv[limitArg+1])) : all;
const shardArg=process.argv.indexOf('--shard');
const shard=shardArg>=0?Number(process.argv[shardArg+1]):0;
const shards=shardArg>=0?Number(process.argv[shardArg+2]):1;
const files=selected.filter((_,i)=>i%shards===shard);
let completed=0, cached=0;
const failures=[];
try {
 for (const name of files) {
  const out = join(output, name.replace('.mp4','.json'));
  try { await readFile(out); cached++; continue; } catch {}
  try {
    await page.goto(origin);
    const sample = await page.evaluate(async name => {
      const video = document.querySelector('video');
      video.src = '/video/'+name;
      await new Promise((resolve,reject) => { video.onloadeddata=resolve; video.onerror=()=>reject(Error('Video decode failed')); video.load(); });
      if (!Number.isFinite(video.duration) || !video.duration) throw Error('Invalid duration');
      const duration=video.duration;
      if(!video.videoWidth||!video.videoHeight)throw Error('No decodable video dimensions: '+video.videoWidth+'x'+video.videoHeight);
      const worker = new Worker('/vision/landmark-worker.js');
      function request(message, transfer=[]) {
        return new Promise((resolve,reject)=> {
          const timeout=setTimeout(()=>reject(Error('Worker timeout')),30000);
          worker.onmessage=event=>{ clearTimeout(timeout); event.data.type==='error' ? reject(Error(event.data.code)) : resolve(event.data); };
          worker.onerror=()=>{clearTimeout(timeout);reject(Error('Worker error'));};
          worker.postMessage(message,transfer);
        });
      }
      const frames=[];
      try {
        await request({type:'init'});
        const count=32;
        for(let index=0;index<count;index++) {
          const seconds=0.02 + index/(count-1)*Math.max(0,duration-0.06);
          await new Promise((resolve,reject)=>{ const timer=setTimeout(()=>reject(Error('Seek timeout')),10000); video.onseeked=()=>{clearTimeout(timer);resolve();};video.currentTime=seconds; });
          const bitmap=await createImageBitmap(video,{resizeWidth:640,resizeHeight:Math.round(video.videoHeight*640/video.videoWidth)});
          const result=await request({type:'frame',bitmap,timestampMs:index*duration*1000/(count-1)},[bitmap]);
          const {face,...frame}=result.frame;
          frames.push({...frame,face:[]});
        }
      } finally {worker.terminate();video.removeAttribute('src');video.load();}
      return {durationMs:duration*1000,frames};
    },name);
    const match=/signer(\d+)_label(\d+)_sample(\d+)/.exec(name);
    await writeFile(out,JSON.stringify({file:name,signer:Number(match[1]),label:Number(match[2]),sample:Number(match[3]),extractor:'SAPA MediaPipe Holistic 1.0.1 / H.264 working copy / 32 frames / 640px / no face stored',...sample}));
    completed++;
  } catch(error) {failures.push({file:name,error:String(error)});}
  if ((completed+failures.length)%10===0) console.log(JSON.stringify({completed,cached,failed:failures.length,total:files.length}));
 }
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
await writeFile(join(privateRoot,`extraction-report-${shard}.json`),JSON.stringify({completed,cached,failures,total:files.length},null,2));
console.log(JSON.stringify({completed,cached,failed:failures.length,firstFailure:failures[0],total:files.length}));
if(failures.length)process.exitCode=1;
