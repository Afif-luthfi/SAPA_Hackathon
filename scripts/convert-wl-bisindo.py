from pathlib import Path
import subprocess, concurrent.futures, json
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1]/'datasets/private/wl-bisindo'
DEST=ROOT/'browser-videos';DEST.mkdir(exist_ok=True)
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
def convert(source):
    target=DEST/source.name
    if target.exists(): return source.name
    proc=subprocess.run([FFMPEG,'-v','error','-nostdin','-i',str(source),'-an','-vf','scale=640:-2','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-threads','2','-n',str(target)],capture_output=True,text=True)
    if proc.returncode: raise RuntimeError(source.name+': '+proc.stderr[:250])
    return source.name
if __name__=='__main__':
    files=sorted((ROOT/'videos').glob('*.mp4'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for i,name in enumerate(pool.map(convert,files),1):
            if i%20==0: print(f'Converted {i}/{len(files)}',flush=True)
    print('Converted',len(files),'videos; originals retained.')
