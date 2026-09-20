import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:5173/')||route.request().url().startsWith('blob:')?route.continue():route.abort());
const rows=[];
try{
 await page.goto('http://127.0.0.1:5173/#bisindo');
 await page.getByText('Model riset siap.',{exact:false}).waitFor({timeout:30000});
 await page.locator('summary').click();
 for(const label of [6,10,15,7]){
  const file=`signer4_label${label}_sample1.mp4`;
  await page.getByLabel('Video isyarat lokal').setInputFiles(resolve('datasets/private/wl-bisindo/browser-videos',file));
  await page.waitForFunction(()=>document.querySelector('.research-clip')?.readyState>=2);
  await page.getByRole('button',{name:'Proses video pilihan'}).click();
  await page.getByTestId('bisindo-result').waitFor({timeout:60000});
  const result=await page.getByTestId('bisindo-result').innerText();
  if(await page.getByText('Pesan dikonfirmasi',{exact:true}).count())throw Error('Result published without confirmation');
  rows.push({file,sourceLabel:label,result});console.log(JSON.stringify(rows.at(-1)));
 }
 await page.screenshot({path:'docs/previews/05-bisindo-research-desktop.png',fullPage:true});
 await page.setViewportSize({width:360,height:800});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth))throw Error('Research mobile overflows');
 await page.screenshot({path:'docs/previews/06-bisindo-research-mobile.png',fullPage:true});
}finally{await browser.close();}
await writeFile('datasets/wl-bisindo/browser-verification.json',JSON.stringify({at:new Date().toISOString(),rows,errors,note:'Four fixed held-out source videos; real local extraction and inference; not physical camera.'},null,2));
if(errors.length)throw Error(errors.join('\n'));
