import test from 'node:test';
import assert from 'node:assert/strict';
import { SEO_LANDINGS, matchesLandingCriteria } from '../lib/seoLandings.js';
import { SEO_LOCATIONS, findSeoLocation, locationPath, seoLocationFromSearch, matchesSeoLocation } from '../lib/seoLocations.js';
import { availableInLocation, indexableSeoLandings } from '../lib/websiteInventory.js';
import { buildPageSeo, buildStructuredData } from '../lib/seo.js';
import { locationFaq } from '../lib/locationFaq.js';
import { loadSitePage } from '../lib/serverPageData.js';
import { selectListingProperties, listingPage, listingHref, emptyListing } from '../lib/listingPagination.js';
import { seoCatalogue } from '../lib/seoCatalogue.js';

const house = { id:'one', project_name:'พฤกษา 13', house_number:'1/1', category:'ทาวน์เฮาส์', price:2000000,
  province:'ปทุมธานี', district:'คลองหลวง', property_owner:'Startup Up', inventoryState:'available' };
const landing = kind => SEO_LANDINGS.find(item => item.kind === kind);
const context = (area, query = {}) => ({ query, resolvedUrl: locationPath(area) + (query.page ? `?page=${query.page}` : ''), res: {setHeader(){}} });
const seed = (area, properties) => ({ activeTab:'search_result', searchParams:{type:'location_group',value:area.name}, properties, listing:emptyListing() });

test('seven unique Thai paths reuse location routing and 150–300 words of distinct editorial copy', () => {
  assert.equal(SEO_LANDINGS.length,7);
  assert.equal(new Set(SEO_LANDINGS.map(item=>item.slug)).size,7);
  const paragraphs=new Set();
  const segmenter=new Intl.Segmenter('th',{granularity:'word'});
  for (const area of SEO_LANDINGS) {
    assert.equal(findSeoLocation(area.slug),area);
    assert.equal(seoLocationFromSearch({type:'location_group',value:area.name}),area);
    assert.ok(!locationPath(area).includes('?'));
    const words=[...segmenter.segment([area.intro,...area.sections.flat()].join(' '))].filter(item=>item.isWordLike).length;
    assert.ok(words>=150 && words<=300,`${area.slug}: ${words} words`);
    for (const text of [area.intro,...area.sections.map(item=>item[1])]) {
      assert.ok(!paragraphs.has(text)); paragraphs.add(text);
    }
    const schema=buildStructuredData({location:area}).find(item=>item['@type']==='CollectionPage');
    assert.equal(new URL(schema.url).pathname,locationPath(area));
    assert.equal(schema.breadcrumb.itemListElement.at(-1).name,area.name);
    assert.ok(locationFaq(area,[house]).length>=3);
  }
  assert.equal(SEO_LOCATIONS.length,5); // Existing collection identities stay separate.
});

test('new category collections use recorded type, district and available stock only', () => {
  const town=landing('townhouse'), corner=landing('corner-townhouse'), detached=landing('detached');
  assert.ok(matchesSeoLocation(house,town));
  assert.ok(matchesSeoLocation({...house,category:'ทาวน์เฮาส์หลังริม'},town));
  assert.ok(!matchesSeoLocation({...house,category:'บ้านแฝด'},town));
  assert.ok(!matchesSeoLocation({...house,district:'วังน้อย',province:'อยุธยา'},town));
  assert.ok(!matchesSeoLocation({...house,district:'',main_location:'ปทุมธานี'},town));
  assert.ok(matchesSeoLocation({...house,category:'ทาวน์เฮาส์หลังริม',district:'วังน้อย',province:'อยุธยา'},corner));
  assert.ok(!matchesSeoLocation({...house,category:'ทาวน์เฮาส์',highlights:'หลังริม'},corner));
  assert.ok(matchesSeoLocation({...house,category:'บ้านเดี่ยว'},detached));
  assert.ok(!matchesSeoLocation({...house,category:'บ้านแฝด'},detached));
  for (const inventoryState of ['sold','reserved','unknown','renovating','backup',undefined]) {
    assert.ok(!matchesSeoLocation({...house,inventoryState},town));
  }
  assert.ok(!matchesSeoLocation({...house,badge:'Sold Out'},town));
  assert.ok(!matchesSeoLocation({...house,property_owner:'Naphat'},town));
});

test('Pruksa matches the three named families, not unrelated substrings', () => {
  for (const project_name of ['พฤกษา 13','พฤกษาB','พฤกษาวิลล์ 46/1','พฤกษาวิลเลจ 24','ม. พฤกษา 12','หมู่บ้านพฤกษา 119']) {
    assert.ok(matchesLandingCriteria({...house,project_name},landing('pruksa')),project_name);
  }
  for (const project_name of ['ราชพฤกษ์ 2','สวนพฤกษา','พฤกษาวิลล่า','ใกล้พฤกษา 13','']) {
    assert.ok(!matchesLandingCriteria({...house,project_name},landing('pruksa')),project_name);
  }
});

test('budget boundaries are inclusive; missing and malformed prices never become cheap houses', () => {
  for (const area of SEO_LANDINGS.filter(item=>item.kind==='budget')) {
    for (const price of [1,area.maxPrice,String(area.maxPrice),area.maxPrice.toLocaleString('en-US')]) assert.ok(matchesLandingCriteria({...house,price},area));
    for (const price of [area.maxPrice+1,0,-1,'',null,undefined,'สอบถาม','2.5 ล้าน',Infinity,'NaN']) assert.ok(!matchesLandingCriteria({...house,price},area),String(price));
  }
});

test('SSR cards, FAQ, noindex and sitemap eligibility move together at 4→5→4 houses', () => {
  for (const area of SEO_LANDINGS) {
    const category=area.kind==='detached'?'บ้านเดี่ยว':area.kind==='corner-townhouse'?'ทาวน์เฮาส์หลังริม':'ทาวน์เฮาส์';
    const five=Array.from({length:5},(_,i)=>({...house,id:`house${i}`,category}));
    for (const [properties,count,indexable] of [[five.slice(0,4),4,false],[five,5,true],[five.map((p,i)=>i===4?{...p,inventoryState:'reserved'}:p),4,false]]) {
      assert.equal(selectListingProperties(properties,{},emptyListing(),area).length,count);
      assert.equal(availableInLocation(properties,area).length,count);
      assert.equal(buildPageSeo(seed(area,properties)).robots,indexable?'index,follow':'noindex,follow');
      assert.equal(indexableSeoLandings(properties).includes(area),indexable);
      assert.ok(locationFaq(area,properties)[0][1].includes(`${count} หลัง`));
    }
    const duplicate=[...five.slice(0,4),five[0],{...five[4],property_owner:'Notting'}];
    assert.equal(availableInLocation(duplicate,area).length,4);
    assert.equal(indexableSeoLandings(duplicate).includes(area),false);
    assert.equal(buildPageSeo(seed(area,[])).robots,'noindex,follow');
  }
});

test('new slugs including decimal budget resolve as SSR collections, with crawlable page two', async () => {
  for (const area of SEO_LANDINGS) {
    const category=area.kind==='detached'?'บ้านเดี่ยว':area.kind==='corner-townhouse'?'ทาวน์เฮาส์หลังริม':'ทาวน์เฮาส์';
    const properties=Array.from({length:23},(_,i)=>({...house,id:`h${i}`,category,canonicalPath:`/test-${i}`}));
    const dependencies={readCatalogue:async()=>({properties,company:{}}),resolveSlug:()=>{throw new Error('A landing must not resolve as a house');}};
    const data=(await loadSitePage(context(area,{page:'2'}),dependencies)).props.initialData;
    assert.equal(data.searchParams.value,area.name);
    const cards=listingPage(selectListingProperties(seoCatalogue(data.properties),data.searchParams,data.listing,area),2);
    assert.equal(cards.length,3); assert.equal(cards[0].id,'h20');
    assert.equal(listingHref({activeTab:'search_result',searchParams:data.searchParams,listing:data.listing}),locationPath(area)+'?page=2');
    assert.equal(new URL(buildPageSeo(data).canonicalUrl).pathname,locationPath(area));
    assert.equal(buildPageSeo(data).robots,'index,follow');
    assert.equal((await loadSitePage(context(area,{page:'3'}),dependencies)).notFound,true);
  }
});
