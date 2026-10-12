# Scan the published math: RTP/max/hit per mode from lookUpTable, book/LUT consistency, event types; writes books_<mode>.json
# (weighted sample + every event type + max-win books) and scan.json for mock_rgs.py / qa_stage9.js.
# usage: python3 tools/scan_books.py PUBLISH_DIR OUT_DIR   (needs: pip install zstandard)
import sys,json,csv,random,io,zstandard,collections
PUB,OUT=sys.argv[1],sys.argv[2]
idx=json.load(open(f'{PUB}/index.json'))
rep={}
random.seed(9)
for m in idx['modes']:
  name,cost=m['name'],m['cost']
  ids=[];w=[];p=[]
  for r in csv.reader(open(f"{PUB}/{m['weights']}")):
    ids.append(int(r[0]));w.append(int(r[1]));p.append(int(r[2]))
  W=sum(w); rtp=sum(a*b for a,b in zip(w,p))/100/W/cost; mx=max(p)/100
  hit=sum(a for a,b in zip(w,p) if b>0)/W
  pick=set(random.choices(ids,weights=w,k=1500))
  MP=max(p); maxids=set(i for i,b in zip(ids,p) if b==MP)
  pay=dict(zip(ids,p))
  types=collections.Counter(); keys={}; firsts=collections.defaultdict(list)
  mism=0;n=0;sel=[]
  with open(f"{PUB}/{m['events']}",'rb') as fh:
    rd=io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(fh),encoding='utf-8')
    for line in rd:
      b=json.loads(line); n+=1
      if pay.get(b['id'])!=b['payoutMultiplier']: mism+=1
      ts=set()
      for e in b['events']:
        t=e['type']; ts.add(t); types[t]+=1
        keys.setdefault(t,set()).update(e.keys())
      tags=[]
      for t in ts:
        if len(firsts[t])<15: firsts[t].append(b['id']); tags.append(t)
      if b['id'] in pick or b['id'] in maxids or tags:
        b['drawn']=b['id'] in pick
        b['tags']=tags+(['cap'] if b['id'] in maxids else [])+(['zero'] if b['payoutMultiplier']==0 else ['win'])
        sel.append(b)
  json.dump(sel,open(f'{OUT}/books_{name}.json','w'))
  rep[name]=dict(cost=cost,rtp=round(rtp*100,4),max=mx,hit=round(hit,4),books=n,lut=len(ids),mismatch=mism,maxBooks=len(maxids),types=dict(types),keys={k:sorted(v) for k,v in keys.items()},sampled=len(sel))
  print(name,json.dumps({k:rep[name][k] for k in ('cost','rtp','max','hit','books','lut','mismatch','maxBooks','sampled')}),flush=True)
json.dump(rep,open(f'{OUT}/scan.json','w'),indent=1)
