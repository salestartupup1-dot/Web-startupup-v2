import test from 'node:test';
import assert from 'node:assert/strict';
import { createPropertyCanonicalLinks, PROPERTY_SLUGS } from '../lib/propertyCanonicalLinks.js';
import { propertySlugLabel, propertyShareLabel, propertyPath, propertySharePath, canonicalPropertyPath } from '../lib/propertyRoutes.js';
import { loadSitePage } from '../lib/serverPageData.js';
import { buildPageSeo, buildPropertyJsonLd } from '../lib/seo.js';
import { getShortShareUrl } from '../lib/propertyShareClient.js';

const house = { id:'houseA',project_name:'เจษฎา 4',house_number:'38/59',price:4290000 };
const encoded = '/'+encodeURIComponent('เจษฎา-4-38-59');
function fixture() {
  const rows=new Map(), cache=new Map();let writes=0,reads=0,queue=Promise.resolve();
  const snap=key=>({exists:rows.has(key),data:()=>rows.get(key)});
  const ref=key=>({key,get:async()=>{reads++;return snap(key);}});
  const db={doc:ref,collection:name=>({doc:id=>ref(name+'/'+id),get:async()=>{
    reads++;return {docs:[...rows].filter(([k])=>k.startsWith(name+'/')).map(([,v])=>({data:()=>v}))};
  }}),runTransaction:fn=>{
    const result=queue.then(async()=>{
      const staged=[];
      const result=await fn({get:async r=>{reads++;return snap(r.key);},create:(r,v)=>staged.push([r.key,v])});
      for(const [k,v] of staged){assert.ok(!rows.has(k));rows.set(k,v);writes++;}return result;
    });queue=result.catch(()=>{});return result;
  }};
  const add=id=>rows.set(`artifacts/startup-up-realestate/public/data/properties/${id}`,{});
  const remove=id=>rows.delete(`artifacts/startup-up-realestate/public/data/properties/${id}`);
  const options={database:async()=>db,sharedCache:{get:async k=>cache.get(k),set:async(k,v)=>cache.set(k,v)},shortCode:async id=>id==='houseA'?'/a123bc':'/b456de'};
  return {rows,add,remove,options,links:createPropertyCanonicalLinks(options),writes:()=>writes,reads:()=>reads};
}

test('readable project/house paths normalize Thai, spaces and slashes without accepting external URLs',()=>{
  assert.equal(propertySlugLabel(house),'เจษฎา-4-38-59');
  assert.equal(propertySlugLabel({...house,project_name:'  เจษฎา   4 '}),'เจษฎา-4-38-59');
  assert.equal(canonicalPropertyPath('/เจษฎา-4-38-59'),encoded);
  assert.equal(propertyPath({...house,canonicalPath:encoded}),encoded);
  for(const invalid of ['https://evil.com/a-b','//evil.com','/a%2Fb-c','/a-b?x=1','/%bad','/../a-b']) assert.equal(canonicalPropertyPath(invalid),null);
});

test('concurrent reservations are stable, collisions are disambiguated and deleted names never change owner',async()=>{
  const f=fixture();f.add('houseA');f.add('houseB');
  const [a,b]=await Promise.all([f.links.create(house),f.links.create(house)]);
  assert.equal(a,encoded);assert.equal(a,b);assert.equal(f.writes(),1);
  const other=await createPropertyCanonicalLinks(f.options).create({...house,id:'houseB'});
  assert.equal(decodeURIComponent(other),'/เจษฎา-4-38-59-b456de');
  f.remove('houseA');
  assert.equal(await f.links.create({...house,id:'houseB'}),other);
  assert.equal(await f.links.resolve('เจษฎา-4-38-59'),'houseA');
  await assert.rejects(f.links.create({...house,id:'missing',project_name:'Missing'}),{status:404});
  assert.equal(await f.links.resolve('no-such-house'),null);
});

test('share links use the ASCII house number; duplicates get the short-code suffix and keep their owner',async()=>{
  assert.equal(propertyShareLabel({house_number:' 16/10413 '}),'16-10413');
  assert.equal(propertyShareLabel({house_number:'12/3A'}),'12-3a');
  for(const house_number of ['99','12 ม.3','','/']) assert.equal(propertyShareLabel({house_number}),null);
  const f=fixture();f.add('houseA');f.add('houseB');
  assert.equal(await f.links.share(house),'/38-59');
  assert.equal(await f.links.create(house),encoded);
  const twin=await f.links.share({...house,id:'houseB',project_name:'อีกโครงการ'});
  assert.equal(twin,'/38-59-b456de');
  f.remove('houseA');
  assert.equal(await f.links.share({...house,id:'houseB'}),twin);
  assert.equal(await f.links.resolve('38-59'),'houseA');
  assert.equal(await f.links.share({...house,house_number:'99'}),'/a123bc');
});

test('renaming keeps the old alias and resolves both names to the same house',async()=>{
  const f=fixture();f.add('houseA');
  await f.links.create(house);
  const renamed={...house,project_name:'ชื่อใหม่'};
  const current=await f.links.create(renamed);
  assert.equal(decodeURIComponent(current),'/ชื่อใหม่-38-59');
  assert.equal(await f.links.resolve('เจษฎา-4-38-59'),'houseA');
  assert.equal(await f.links.resolve('ชื่อใหม่-38-59'),'houseA');
});

test('missing house numbers use a stable disambiguator and shared index prevents repeated database scans',async()=>{
  const f=fixture();f.add('houseA');
  await f.links.prepare();
  const p={...house,house_number:''};
  assert.equal(decodeURIComponent(await f.links.create(p)),'/เจษฎา-4-a123bc');
  await f.links.publishIndex();const reads=f.reads();
  const next=createPropertyCanonicalLinks(f.options);await next.prepare();
  assert.equal(await next.create(p),await f.links.create(p));assert.equal(f.reads(),reads);
  assert.equal([...f.rows.keys()].filter(k=>k.startsWith(PROPERTY_SLUGS+'/')).length,1);
});

test('short codes and previous names redirect once; readable canonical serves fresh price with matching copy/schema',async t=>{
  const f=fixture();f.add('houseA');await f.links.create(house);
  const res=()=>({setHeader(){}});
  let current=house;
  const deps={readProperty:(id,options)=>{assert.equal(options.documentId,'houseA');return {promise:Promise.resolve(current)};},
    canonicalize:async p=>({...p,canonicalPath:await f.links.create(p),sharePath:await f.links.share(p)}),resolveShort:async()=>house.id,
    resolveSlug:slug=>f.links.resolve(slug),readCatalogue:async()=>({properties:[]}),enrichProperty:async p=>p};
  for(const old of ['/a123bc','/38-59','/h/houseA',propertyPath(house)]) {
    const result=await loadSitePage({query:{},resolvedUrl:old+'?utm_source=line',res:res()},deps);
    assert.deepEqual(result.redirect,{permanent:true,destination:encoded+'?utm_source=line'});
  }
  const context={query:{},resolvedUrl:encoded,res:res()};
  const first=await loadSitePage(context,deps);assert.equal(first.props.initialData.selectedProperty.price,4290000);
  current={...house,price:3990000};
  const data=(await loadSitePage(context,deps)).props.initialData;
  assert.equal(data.selectedProperty.price,3990000);
  t.mock.method(globalThis,'fetch',()=>{throw new Error('Seeded copy must not fetch');});
  const copied=await getShortShareUrl(data.selectedProperty);
  assert.equal(copied,'https://www.startupup-real-estate.com/38-59');
  assert.equal(propertySharePath(data.selectedProperty),'/38-59');
  const readable='https://www.startupup-real-estate.com'+encoded;
  assert.equal(buildPageSeo(data).canonicalUrl,readable);assert.equal(buildPropertyJsonLd(data.selectedProperty).url,readable);
  current={...current,project_name:'ชื่อใหม่'};
  const renamed=await loadSitePage(context,deps);assert.equal(renamed.redirect.destination,'/'+encodeURIComponent('ชื่อใหม่-38-59'));
  assert.deepEqual(await loadSitePage({...context,resolvedUrl:'/missing-house'},deps),{notFound:true});
});
