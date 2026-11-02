"""Offline reproducible source import. Requires PyMuPDF/Pillow; not a runtime dependency."""
import fitz, hashlib, json, shutil, sys
from pathlib import Path
source=Path(sys.argv[1]); root=Path(__file__).resolve().parents[1]/'private/wgc'; root.mkdir(parents=True,exist_ok=True)
items=[('ipa','2024 IPA Final WGC_CMPA.pdf','WGC / CMPA Independent Production Agreement','2024–2027 · May 22, 2024 to January 31, 2027'),('rates','IPA Rate Sheet 2024-2027_FINAL_2025.02.24.pdf','WGC minimum rate sheet','2024–2027 · Final February 24, 2025')]
manifest=[]
for id,filename,title,version in items:
 data=(source/filename).read_bytes(); folder=root/id; folder.mkdir(exist_ok=True); (folder/'original.pdf').write_bytes(data)
 pdf=fitz.open(stream=data,filetype='pdf'); pages=[]
 for i,page in enumerate(pdf):
  pix=page.get_pixmap(matrix=fitz.Matrix(1.65,1.65),alpha=False); pix.pil_save(str(folder/f'{i+1}.webp'),format='WEBP',quality=85)
  pages.append({'page':i+1,'printedPage':str(i-4) if id=='ipa' and i>=5 else None,'text':page.get_text(sort=True)})
 doc={'id':id,'title':title,'version':version,'filename':filename,'sha256':hashlib.sha256(data).hexdigest(),'pageCount':len(pdf),'source':'Suzanne Williams email attachment, October 28, 2026','officialUrl':'https://www.wgc.ca/wgc-cmpa-ipa-2024-2027-0','pages':pages}
 (folder/'index.json').write_text(json.dumps(doc,ensure_ascii=False)); manifest.append({k:v for k,v in doc.items() if k!='pages'})
(root/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print('Generated',sum(x['pageCount'] for x in manifest),'source pages')
