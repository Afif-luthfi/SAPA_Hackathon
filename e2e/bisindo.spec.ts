import { expect,test,type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { sequenceFeatures } from '../src/bisindo/baseline.mjs';
import { buildDemoPatternFrames } from '../src/intent/demoPattern';
import { mockCamera } from './support/mockCamera';
async function fixture(page:Page,tampered=false){
 const features=sequenceFeatures(buildDemoPatternFrames())!;
 const model=JSON.stringify({schemaVersion:1,modelId:'test-only-synthetic',region:'Banten',validated:false,labels:{6:'Maaf',10:'Terima kasih',15:'Di mana'},templates:[{label:6,features},{label:10,features:features.map(f=>f.map((n,i)=>i%3===2?n:n+2))}],threshold:{maxDistance:10,minMargin:0}});
 await page.route('**/research/wl-bisindo-model.json',route=>route.fulfill({body:model,contentType:'application/json'}));
 const metrics={knownCount:3,closedSetAccuracy:0,macroF1:0,acceptedAccuracy:0,coverage:0,unknownCount:1,unknownRejected:0};
 await page.route('**/research/wl-bisindo-evaluation.json',route=>route.fulfill({json:{modelSha256:tampered?'bad':createHash('sha256').update(model).digest('hex'),trainingCount:2,test:metrics,validation:metrics,rejectedForQuality:0}}));
 await mockCamera(page,'granted','ready',buildDemoPatternFrames());
 await page.goto('/#bisindo');
}
test('research model checks its file hash and starts without camera permission',async({page})=>{
 await fixture(page);await expect(page.getByText('Model riset siap.',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>Reflect.get(window,'__cameraProbe').requests.length)).toBe(0);
 await expect(page.getByText('CC BY-NC 4.0',{exact:true})).toBeVisible();
 await expect(page.getByText(/bukan verifikasi BOT Chain/)).toBeVisible();
});
test('research refuses mismatched model and preserves route to manual communication',async({page})=>{
 await fixture(page,true);await expect(page.getByText(/Model riset belum tersedia atau file tidak cocok/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Aktifkan kamera',exact:true})).toBeDisabled();
 await page.getByRole('link',{name:'Kembali ke SAPA'}).click();await expect(page.getByRole('button',{name:'Mulai sesi komunikasi'})).toBeVisible();
});
test('real baseline worker produces a candidate requiring confirmation, then clears on exit',async({page})=>{
 await fixture(page);await page.getByRole('button',{name:'Aktifkan kamera',exact:true}).click();
 await page.getByRole('button',{name:'Mulai isyarat',exact:true}).click();
 await expect.poll(async()=>Number((await page.getByRole('button',{name:/Selesai isyarat/}).textContent())?.match(/\d+/)?.[0]??0)).toBeGreaterThanOrEqual(13);
 await page.getByRole('button',{name:/Selesai isyarat/}).click();
 await expect(page.getByTestId('bisindo-result')).toBeVisible();
 await expect(page.getByRole('button',{name:'Benar, tampilkan kata'})).toBeVisible();
 await expect(page.getByText('Pesan dikonfirmasi',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Benar, tampilkan kata'}).click();
 await expect(page.getByText('Pesan dikonfirmasi',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>Reflect.get(window,'__cameraProbe').stopped)).toBe(1);
 await page.getByRole('link',{name:'Kembali ke SAPA'}).click();
 await page.getByRole('link',{name:'Demo riset BISINDO ↗'}).click();
 await expect(page.getByText('Pesan dikonfirmasi',{exact:true})).toHaveCount(0);
});
test('cancel capture discards frames and narrow research layout does not overflow',async({page})=>{
 await fixture(page);await page.setViewportSize({width:360,height:800});
 await page.getByRole('button',{name:'Aktifkan kamera',exact:true}).click();
 await page.getByRole('button',{name:'Mulai isyarat',exact:true}).click();
 await page.getByRole('button',{name:'Batalkan isyarat',exact:true}).click();
 await expect(page.getByTestId('bisindo-result')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect(await page.evaluate(()=>Reflect.get(window,'__cameraProbe').stopped)).toBe(1);
});
