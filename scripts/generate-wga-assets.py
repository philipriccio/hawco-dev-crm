import fitz,hashlib,json,urllib.request
from pathlib import Path
root=Path('private/wgc')
items=[('wga-mba','mba23.pdf','WGA 2023 MBA · base text','2023 base text — read together with 2026 MOA; amended provisions are not current alone'),('wga-moa','2026_mba_moa.pdf','WGA 2026 Memorandum of Agreement','May 2, 2026–May 1, 2030 · amendments to the 2023 base; individual effective dates vary'),('wga-rates','2026_schedule_of_minimums.pdf','WGA 2026 Schedule of Minimums','2026 schedule · USD · select effective-date column')]
for id,name,title,version in items:
 url='https://www.wga.org/uploadedfiles/contracts/'+name
 data=urllib.request.urlopen(url).read(); assert data[:4]==b'%PDF'
 folder=root/id;folder.mkdir(exist_ok=True);(folder/'original.pdf').write_bytes(data)
 pdf=fitz.open(stream=data,filetype='pdf');pages=[]
 for i,p in enumerate(pdf):
  p.get_pixmap(matrix=fitz.Matrix(1.4,1.4),alpha=False).pil_save(str(folder/f'{i+1}.webp'),format='WEBP',quality=80)
  pages.append(dict(page=i+1,printedPage=None,text=p.get_text(sort=True)))
 doc=dict(id=id,title=title,version=version,filename=name,sha256=hashlib.sha256(data).hexdigest(),pageCount=len(pdf),source='Official WGA download, November 19, 2026',officialUrl=url,pages=pages)
 (folder/'index.json').write_text(json.dumps(doc,ensure_ascii=False));print(id,len(pdf),flush=True)
