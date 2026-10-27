import json,math,base64,io,statistics as st
from PIL import Image
d=json.load(open('flights.json'));agg=json.load(open('agg.json'));maps=json.load(open('maps.json'))
def img(name,w=560):
    im=Image.open(f'shots/{name}.png').convert('RGB');im=im.resize((w,int(im.height*w/im.width)),Image.LANCZOS)
    b=io.BytesIO();im.save(b,'JPEG',quality=72);return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode()
STY={'low-keep':'Low hop (~30°)','mid-keep':'Mid (~55°)','high-keep':'High (~80°)','mid-turn':'Mid, turn round'}
# 1. cycle chart
rows=[a for a in agg if a['style']!='mid-turn']
order={'low-keep':0,'mid-keep':1,'high-keep':2};rows.sort(key=lambda a:(order[a['style']],a['band']))
W=640;L=170;scale=(W-L-60)/11;bh=20;gap=10;H=len(rows)*(bh+gap)+40
o=[f'<svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="Seconds underwater and in the air per flight">']
for t in range(0,12,2):
    x=L+t*scale;o.append(f'<line class="grid" x1="{x:.1f}" y1="0" x2="{x:.1f}" y2="{H-28}"/><text class="tick" x="{x:.1f}" y="{H-12}" text-anchor="middle">{t}s</text>')
for i,a in enumerate(rows):
    y=i*(bh+gap)+4;wx=a['water']*scale;ax=a['air']*scale
    o.append(f'<text class="rowlbl" x="{L-8}" y="{y+bh*.7:.1f}" text-anchor="end">{STY[a["style"]]} · waves {a["band"]}</text>')
    o.append(f'<g class="hov"><title>{STY[a["style"]]}, waves {a["band"]}: {a["water"]} s underwater, {a["air"]} s in the air (median of {a["n"]} flights)</title><rect class="water" x="{L}" y="{y}" width="{wx-1:.1f}" height="{bh}" rx="3"/><rect class="air" x="{L+wx+1:.1f}" y="{y}" width="{ax-1:.1f}" height="{bh}" rx="3"/></g>')
    o.append(f'<text class="val" x="{L+wx+ax+6:.1f}" y="{y+bh*.7:.1f}">{a["water"]} + {a["air"]} s</text>')
o.append('</svg>');cycle=''.join(o)
# 2. arena density
CW=2;nx=38;ny=22;grid=[[0]*nx for _ in range(ny)];dol=[[0]*nx for _ in range(ny)]
for R in d:
  for f in R['flights']:
    for s in f['samples']:
      for e in s['en']:
        i=int((e[1]+38)//CW);j=int((e[2]+21.6)//CW)
        if 0<=i<nx and 0<=j<ny:grid[j][i]+=1
      i=int((s['lx']+38)//CW);j=int((s['ly']+21.6)//CW)
      if 0<=i<nx and 0<=j<ny:dol[j][i]+=1
def dens(g,cls,label):
    mx=max(max(r) for r in g);SX=10;SY=10;Wd=nx*SX;Hd=ny*SY
    cid='c'+cls;o=[f'<svg viewBox="-4 -4 {Wd+8} {Hd+30}" class="chart arena" role="img" aria-label="{label}"><defs><clipPath id="{cid}"><rect x="0" y="0" width="{Wd}" height="{Hd}"/></clipPath></defs><rect class="frame" x="0" y="0" width="{Wd}" height="{Hd}"/>']
    for j in range(ny):
      for i in range(nx):
        v=g[j][i]
        if v: o.append(f'<rect class="{cls}" x="{i*SX}" y="{Hd-(j+1)*SY}" width="{SX-1}" height="{SY-1}" style="opacity:{0.12+0.88*math.sqrt(v/mx):.2f}"/>')
    vx0=(38-38.4)/CW*SX;vx1=(38+38.4)/CW*SX  # the view is 76.8 m wide (whole arena, letterboxed 16:9)
    o.append(f'<rect class="view" x="{vx0:.1f}" y="0" width="{vx1-vx0:.1f}" height="{Hd}"/>')
    cx=38/CW*SX;cy=Hd-21.6/CW*SY
    o.append(f'<circle class="range" clip-path="url(#{cid})" cx="{cx}" cy="{cy}" r="{30/CW*SX}"/><circle class="me" cx="{cx}" cy="{cy}" r="4"/>')
    o.append(f'<text class="tick" x="0" y="{Hd+14}">−38 m</text><text class="tick" x="{Wd/2}" y="{Hd+14}" text-anchor="middle">view ±38.4 m (dashed)</text><text class="tick" x="{Wd}" y="{Hd+14}" text-anchor="end">+38 m</text>')
    o.append('</svg>');return ''.join(o)
arenaE=dens(grid,'cellE','Where enemies are inside the arena, all flights');arenaD=dens(dol,'cellD','Where the bot dolphin is inside the arena, all flights')
# 3. kill phase vs time share
ph={'ascent':0,'apex':0,'descent':0}
for R in d:
  for f in R['flights']:
    for k in f['kills']:ph[k['phase']]+=1
tot=sum(ph.values());share={k:round(100*v/tot) for k,v in ph.items()};tshare={'ascent':40,'apex':20,'descent':40}
W2=520;o=[f'<svg viewBox="0 0 {W2} 150" class="chart" role="img" aria-label="Share of kills by phase compared with share of flight time">']
for i,p in enumerate(['ascent','apex','descent']):
    y=i*46+6;o.append(f'<text class="rowlbl" x="80" y="{y+14}" text-anchor="end">{p.capitalize()}</text>')
    o.append(f'<g class="hov"><title>{p}: {share[p]}% of kills, about {tshare[p]}% of flight time</title><rect class="kills" x="90" y="{y}" width="{share[p]*3.6:.1f}" height="16" rx="3"/><rect class="time" x="90" y="{y+19}" width="{tshare[p]*3.6:.1f}" height="10" rx="3"/></g>')
    o.append(f'<text class="val" x="{96+share[p]*3.6:.1f}" y="{y+13}">{share[p]}% of kills</text><text class="val muted" x="{96+tshare[p]*3.6:.1f}" y="{y+28}">~{tshare[p]}% of time</text>')
o.append('</svg>');phases=''.join(o)
# 4. table
def fmt(v): return '–' if v is None else (f'{v:g}' if isinstance(v,(int,float)) else v)
trs=''.join(f"<tr><td>{STY[a['style']]}</td><td>{a['band']}</td><td>{a['n']}</td><td>{fmt(a['angle'])}°</td><td>{fmt(a['tier'])}</td><td>{fmt(a['water'])}</td><td>{fmt(a['air'])}</td><td>{fmt(a['peak'])}</td><td>{fmt(a['kills'])}</td><td>{fmt(a['hits'])}</td><td>{fmt(a['nearest'])}</td><td>{a['near30']}%</td><td>{fmt(a['firstKill'])}</td><td>{fmt(a['pAtEntry'])}</td><td>{fmt(a['wet'])}</td></tr>" for a in sorted(agg,key=lambda a:(a['style'],a['band'])))
# 5. filmstrips
def strip(prefix,names,caption):
    cells=''.join(f'<figure><img src="{img(prefix+"-"+n)}" alt="{caption}: {n}" loading="lazy"><figcaption>{n}</figcaption></figure>' for n in names)
    return f'<div class="strip">{cells}</div>'
s_low=strip('w5-low-keep-f0',['dive','breach','climb','apex','fall','entry','splash'],'Wave 5 low hop')
s_high=strip('w5-high-keep-f0',['dive','breach','climb','apex','fall','entry','splash'],'Wave 5 high launch')
s_w1=strip('w1-mid-keep-f0',['dive','breach','climb','apex','fall','splash'],'Wave 1 mid launch')
mp=''.join(f'<figure class="mapfig"><figcaption><b>{k}</b> · {v["stats"]["angle"]:.0f}° · {v["stats"]["air"]} s air · peak {v["stats"]["peak"]} m · {v["stats"]["kills"]} kills · {v["stats"]["hits"]} hits</figcaption><div class="two">{v["world"]}{v["arena"]}</div></figure>' for k,v in maps.items())
import os
html=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'template.html')).read()
for k,v in {'CYCLE':cycle,'ARENA_E':arenaE,'ARENA_D':arenaD,'PHASES':phases,'TABLE':trs,'S_LOW':s_low,'S_HIGH':s_high,'S_W1':s_w1,'MAPS':mp}.items():
    assert '{{'+k+'}}' in html,k;html=html.replace('{{'+k+'}}',v)
open('icarus-flow-study.html','w').write(html);print(len(html)//1024,'KB',share)
