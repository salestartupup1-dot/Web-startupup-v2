import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_H1, getPropertyHeading, buildPageSeo, buildPropertyJsonLd } from '../lib/seo.js';
import { SOLD_HOMES_PATH, PORTFOLIO_PATH, isSoldHomesPath, selectSoldHomes } from '../lib/soldHomes.js';
import { loadSitePage } from '../lib/serverPageData.js';
import { selectListingProperties, listingPage, listingHref } from '../lib/listingPagination.js';
import { includePropertyInSitemap } from '../lib/seoStock.js';

const house={id:'h1',project_name:'พฤกษา 119',category:'ทาวน์เฮาส์',district:'คลองหลวง',main_location:'รังสิต',house_number:'1/1',
  inventoryState:'sold',price:2090000,canonicalPath:'/test-1',images:['https://example.com/original.jpg']};
const res=()=>({setHeader(){}});

test('H1 uses type, project and explicit district, with no price/area/marketing location',()=>{
  assert.equal(HOME_H1,'จุดเริ่มต้นของคนอยากมีบ้าน');
  assert.equal(getPropertyHeading({...house,area_wah:28.4}),'ทาวน์เฮาส์ พฤกษา 119 คลองหลวง');
  assert.equal(getPropertyHeading({...house,district:'อำเภอ คลองหลวง'}),'ทาวน์เฮาส์ พฤกษา 119 คลองหลวง');
  assert.equal(getPropertyHeading({...house,district:''}),'ทาวน์เฮาส์ พฤกษา 119');
  assert.equal(getPropertyHeading({}),'รายละเอียดบ้าน');
});

test('sold count excludes private owners, reservations and unknown records and deduplicates IDs',()=>{
  const properties=[house,house,{...house,id:'badge',inventoryState:'unknown',badge:'Sold Out'},
    {...house,id:'private',property_owner:'Naphat'},
    ...['available','reserved','unknown','renovating','backup'].map(inventoryState=>({...house,id:inventoryState,inventoryState}))];
  assert.deepEqual(selectSoldHomes(properties).map(p=>p.id),['h1','badge']);
  assert.deepEqual(selectListingProperties(properties,{type:'sold'},{}).map(p=>p.id),['h1','badge']);
  assert.deepEqual(selectSoldHomes([]),[]);
});

test('sold collection serves page two from SSR with a self canonical and original image',async()=>{
  const properties=Array.from({length:41},(_,i)=>({...house,id:`h${i}`}));
  let reads=0;
  const dependencies={readCatalogue:async()=>{reads++;return {properties};},resolveSlug:()=>{throw new Error('Sold page must not resolve a property');}};
  const data=(await loadSitePage({query:{tab:'portfolio',page:'2'},resolvedUrl:PORTFOLIO_PATH+'&page=2',res:res()},dependencies)).props.initialData;
  assert.equal(reads,1); assert.equal(data.activeTab,'portfolio');
  const cards=listingPage(selectListingProperties(data.properties,{type:'sold'},data.listing),2);
  assert.equal(cards.length,20); assert.equal(cards[0].id,'h20');
  assert.deepEqual(cards[0].images,house.images);
  assert.equal(listingHref({activeTab:'portfolio',listing:data.listing}),PORTFOLIO_PATH+'&page=2');
  const meta=buildPageSeo(data);
  assert.equal(meta.robots,'index,follow');
  assert.equal(new URL(meta.canonicalUrl).pathname,'/');
  assert.equal(new URL(meta.canonicalUrl).search,'?tab=portfolio&page=2');
  assert.equal((await loadSitePage({query:{tab:'portfolio',page:'4'},resolvedUrl:PORTFOLIO_PATH+'&page=4',res:res()},dependencies)).notFound,true);
  const empty=(await loadSitePage({query:{tab:'portfolio'},resolvedUrl:PORTFOLIO_PATH,res:res()},{readCatalogue:async()=>({properties:[]})})).props.initialData;
  assert.equal(buildPageSeo(empty).robots,'index,follow');
  assert.ok(isSoldHomesPath('/บ้านที่ขายแล้ว/'));
  assert.ok(!isSoldHomesPath('/บ้านที่ขายแล้ว-1'));
});

test('indexable sold collection never changes house canonical, noindex, RealEstateListing or sitemap rules',()=>{
  for(const inventoryState of ['sold','reserved']) {
    const property={...house,inventoryState};
    const meta=buildPageSeo({selectedProperty:property,activeTab:'sold',listing:{page:2}});
    assert.equal(new URL(meta.canonicalUrl).pathname,house.canonicalPath);
    assert.equal(meta.robots,'noindex,follow');
    const schema=buildPropertyJsonLd(property);
    assert.equal(schema['@type'],'RealEstateListing');
    assert.equal(new URL(schema.url).pathname,house.canonicalPath);
    const stock={coveredOwners:['Startup Up'],rows:[{owner:'Startup Up',key:'1/1',project:house.project_name,
      status:inventoryState==='sold'?'ขายแล้ว':'ติดจอง',sold:inventoryState==='sold'}]};
    assert.equal(includePropertyInSitemap(property,stock),false);
  }
});

test('old sold page redirects permanently to portfolio without reading stock', async()=>{
  const result=await loadSitePage({query:{page:'2'},resolvedUrl:SOLD_HOMES_PATH+'?page=2',res:res()},
    {readCatalogue:()=>{throw new Error('Redirect must not read stock');}});
  assert.equal(result.redirect.statusCode,301);
  const target=new URL(result.redirect.destination,'https://example.com');
  assert.equal(target.pathname,'/'); assert.equal(target.searchParams.get('tab'),'portfolio');
  assert.equal(target.searchParams.get('page'),'2');
});
