import json,math,statistics as st
d=json.load(open('flights.json'))
def band(w): return '1-3' if w<=3 else '4-6' if w<=6 else '7+'
rows={}
for R in d:
  for f in R['flights']:
    k=(R['style'],band(f['wave']));rows.setdefault(k,[]).append(f)
out=[]
def med(a): return round(st.median(a),2) if a else None
for (style,b),fs in sorted(rows.items()):
  near=[];dist=[];onscreen=[];spawnx=[]
  for f in fs:
    for s in f['samples']:
      ds=[math.hypot(e[1]-s['lx'],e[2]-s['ly']) for e in s['en']]
      if ds: dist.append(min(ds)); near.append(1 if min(ds)<=30 else 0)
      onscreen.append(sum(1 for e in s['en'] if abs(e[1])<=38.4))
  ph={}
  for f in fs:
    for k in f['kills']: ph[k['phase']]=ph.get(k['phase'],0)+1
  tot=sum(ph.values()) or 1
  fk=[f['kills'][0]['t'] for f in fs if f['kills']]
  out.append(dict(style=style,band=b,n=len(fs),
    water=med([f['water']['dur'] for f in fs if f['water']]),air=med([f['dur'] for f in fs]),
    angle=med([f['launch']['angle'] for f in fs]),peak=med([f['peak'] for f in fs]),tier=med([f['tier'] for f in fs]),
    kills=med([len(f['kills']) for f in fs]),hits=round(sum(len(f['hits']) for f in fs)/len(fs),2),
    nearest=med(dist),near30=round(100*sum(near)/max(1,len(near))),onscreen=med(onscreen),
    firstKill=med(fk),pAtEntry=med([f.get('pursuersAtEntry') or 0 for f in fs]),wet=med([f.get('wetPursuers') or 0 for f in fs]),
    phase={p:round(100*c/tot) for p,c in ph.items()}))
json.dump(out,open('agg.json','w'),indent=0)
for o in out: print(o)
# enemy spawn x distribution when first seen
xs=[];ys=[]
for R in d:
  for f in R['flights']:
    seen=set()
    for s in f['samples']:
      for i,e in enumerate(s['en']):
        pass
ks={}
for R in d:
  for f in R['flights']:
    for k in f['kills']: ks[k['enemy']]=ks.get(k['enemy'],0)+1
print(ks)
