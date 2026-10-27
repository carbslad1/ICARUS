import json,math,sys
runs={R['style']:R for R in json.load(open('flights.json'))}
def pick(style,wave,i=1):
    fs=[f for f in runs[style]['flights'] if f['wave']==wave and f.get('dur')]
    if not fs: return None
    m=sorted(f['dur'] for f in fs)[len(fs)//2]
    return min(fs,key=lambda f:abs(f['dur']-m))  # the flight nearest the median air time
def world_svg(f,title,W=560,H=300):
    pts=[(s['wx'],s['wy']) for s in f['samples']]
    ens=[(s['ox']+e[1],s['oy']+e[2]) for s in f['samples'][::3] for e in s['en']]
    xs=[p[0] for p in pts+ens];ys=[p[1] for p in pts+ens]+[0,-2]
    x0,x1=min(xs)-5,max(xs)+5;y0,y1=min(ys)-3,max(ys)+5
    sc=min(W/(x1-x0),(H-20)/(y1-y0))
    X=lambda x:(x-x0)*sc;Y=lambda y:H-(y-y0)*sc
    o=[f'<svg viewBox="0 0 {W} {H}" class="map" role="img" aria-label="{title}"><rect class="sky" x="0" y="0" width="{W}" height="{Y(0)}"/><rect class="sea" x="0" y="{Y(0)}" width="{W}" height="{H-Y(0)}"/>']
    for x,y in ens:o.append(f'<circle class="en" cx="{X(x):.1f}" cy="{Y(y):.1f}" r="1.6"/>')
    o.append('<polyline class="path" points="'+' '.join(f'{X(x):.1f},{Y(y):.1f}' for x,y in pts)+'"/>')
    for k in f['kills']:o.append(f'<path class="kill" d="M{X(k["x"])-3:.1f},{Y(k["y"])-3:.1f}l6,6m0,-6l-6,6"/>')
    for h in f['hits']:
        s=min(f['samples'],key=lambda s:abs(s['t']-h['t']));o.append(f'<circle class="hit" cx="{X(s["wx"]):.1f}" cy="{Y(s["wy"]):.1f}" r="5"/>')
    # 10 m scale bar
    o.append(f'<line class="scale" x1="8" y1="14" x2="{8+10*sc:.1f}" y2="14"/><text x="8" y="11" class="lbl">10 m</text>')
    o.append('</svg>');return ''.join(o)
def arena_svg(f,title,W=380,H=216):
    sx=W/76;sy=H/43.2;X=lambda x:(x+38)*sx;Y=lambda y:H-(y+21.6)*sy
    o=[f'<svg viewBox="0 0 {W} {H}" class="map arena" role="img" aria-label="{title}"><rect class="frame" x="0" y="0" width="{W}" height="{H}"/><rect class="view" x="{X(-38.4):.1f}" y="0" width="{76.8*sx:.1f}" height="{H}"/>']
    for s in f['samples'][::2]:
        for e in s['en']:o.append(f'<circle class="en" cx="{X(e[1]):.1f}" cy="{Y(e[2]):.1f}" r="1.5"/>')
    o.append('<polyline class="path" points="'+' '.join(f'{X(s["lx"]):.1f},{Y(s["ly"]):.1f}' for s in f['samples'])+'"/>')
    o.append('</svg>');return ''.join(o)
out={}
for key,(style,wave) in {'w1-low':('low-keep',1),'w1-high':('high-keep',1),'w5-low':('low-keep',5),'w5-mid':('mid-keep',5),'w5-high':('high-keep',5),'w9-low':('low-keep',9)}.items():
    f=pick(style,wave)
    if not f: continue
    out[key]={'world':world_svg(f,key),'arena':arena_svg(f,key),'stats':{'water':f['water']['dur'] if f['water'] else None,'air':f.get('dur'),'angle':f['launch']['angle'],'speed':f['launch']['speed'],'peak':f.get('peak'),'tier':f['tier'],'kills':len(f['kills']),'hits':len(f['hits']),'enemiesAtBreach':f['enemiesAtBreach'],'pursuersAtEntry':f.get('pursuersAtEntry'),'wet':f.get('wetPursuers'),'bank':f.get('bank')}}
json.dump(out,open('maps.json','w'))
print({k:v['stats'] for k,v in out.items()})
