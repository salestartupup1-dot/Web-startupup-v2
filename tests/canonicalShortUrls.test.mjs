import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSitePage } from '../lib/serverPageData.js';
import { propertyPath } from '../lib/propertyRoutes.js';
import { getPropertyHeading, buildPageSeo, buildPropertyJsonLd } from '../lib/seo.js';
import { getShortShareUrl } from '../lib/propertyShareClient.js';
import { seoCatalogue } from '../lib/seoCatalogue.js';
import { createPropertyPreview } from '../lib/propertyPreview.js';
import { createPropertyShortLinks, SHORT_IDS } from '../lib/propertyShortLinks.js';

const house = { id: 'houseA', project_name: 'ไทยสมบูรณ์ 3', house_number: '48/195',
  price: 2790000, main_location: 'คลองหลวง', category: 'ทาวน์เฮาส์', inventoryState: 'available' };
const response = () => ({ headers: {}, setHeader(k,v) { this.headers[k]=v; } });
const deps = { canonicalize: async p => ({...p,canonicalPath:'/a123bc'}), resolveShort: async code => code==='a123bc' ? house.id : null,
  readProperty: () => ({promise:Promise.resolve(house)}), enrichProperty: async p=>p,
  readCatalogue: async()=>({properties:[]}) };

test('legacy URLs permanently redirect in one hop; canonical short URL serves fresh HTML', async()=>{
  for(const url of [propertyPath(house),'/h/houseA','/?property=48-195']) {
    const result=await loadSitePage({query:url.includes('?')?{property:'48-195'}:{},resolvedUrl:url+(url.includes('?')?'&':'?')+'utm_source=line',res:response()},deps);
    assert.deepEqual(result.redirect,{permanent:true,destination:'/a123bc?utm_source=line'});
  }
  let price=2790000;
  const injected={...deps,readProperty:(id,options)=>{
    assert.equal(id,house.id);assert.equal(options.documentId,house.id);
    return {promise:Promise.resolve({...house,price})};
  }};
  const context={query:{},resolvedUrl:'/a123bc',res:response()};
  assert.equal((await loadSitePage(context,injected)).props.initialData.selectedProperty.price,price);
  price=2690000;
  const result=await loadSitePage(context,injected);
  assert.equal(result.props.initialData.selectedProperty.price,price);
  assert.equal(result.redirect,undefined);
  assert.equal(context.res.headers['Cache-Control'],'no-store');
  assert.deepEqual(await loadSitePage({...context,resolvedUrl:'/ffffff'},deps),{notFound:true});
  assert.deepEqual(await loadSitePage(context,{...deps,readProperty:()=>({promise:Promise.resolve(null)})}),{notFound:true});
});

test('copy, listing, preview, canonical and schema use the same short identity',async t=>{
  const property=await deps.canonicalize(house);
  t.mock.method(globalThis,'fetch',()=>{throw new Error('Copy should not need a network call');});
  assert.equal(propertyPath(property),'/a123bc');
  assert.equal(propertyPath({...property,project_name:'Renamed'}),'/a123bc');
  assert.equal(propertyPath(seoCatalogue([property])[0]),'/a123bc');
  assert.equal(propertyPath(createPropertyPreview(property)),'/a123bc');
  const url=await getShortShareUrl(property);
  assert.equal(buildPageSeo({selectedProperty:property}).canonicalUrl,url);
  assert.equal(buildPropertyJsonLd(property).url,url);
  assert.equal(getPropertyHeading(property),'ทาวน์เฮาส์ ไทยสมบูรณ์ 3'); // No district is invented when absent.
  const meta=buildPageSeo({selectedProperty:property});
  for(const value of ['ทาวน์เฮาส์','คลองหลวง','2,790,000']) assert.ok(meta.title.includes(value));
});

test('shared immutable registry avoids database reads across server instances',async()=>{
  const memory=new Map([['immutable-property-short-index-v1',[['houseA','a123bc']]]]);
  const sharedCache={get:async key=>memory.get(key),set:async(key,value)=>memory.set(key,value)};
  const database=async()=>{throw new Error('Warm routes must not read Firestore');};
  for(let i=0;i<2;i++){
    const links=createPropertyShortLinks({database,sharedCache});
    await Promise.all([links.prepare(),links.prepare()]);
    assert.equal(await links.create('houseA'),'/a123bc');
    assert.equal(await links.resolve('a123bc'),'houseA');
  }
});

test('cold registry scans once and saves a shared identity-only snapshot',async()=>{
  let reads=0;const memory=new Map();
  const links=createPropertyShortLinks({sharedCache:{get:async k=>memory.get(k),set:async(k,v)=>memory.set(k,v)},database:async()=>({
    collection:name=>{assert.equal(name,SHORT_IDS);return {get:async()=>{reads++;return {docs:[{id:'houseA',data:()=>({code:'a123bc'})}]};}};}
  })});
  await links.prepare();await links.prepare();
  assert.equal(await links.create('houseA'),'/a123bc');assert.equal(reads,1);
  assert.deepEqual(memory.get('immutable-property-short-index-v1'),[['houseA','a123bc']]);
});
