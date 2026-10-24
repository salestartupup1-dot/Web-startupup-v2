import { locationFaq } from '../lib/locationFaq.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyStockStatus, withWebsiteInventory, isSaleAvailable, relatedAvailableProperties } from '../lib/websiteInventory.js';
import { SEO_LOCATIONS, matchesSeoLocation } from '../lib/seoLocations.js';
import { buildPageSeo, buildPropertyJsonLd } from '../lib/seo.js';
import { includePropertyInSitemap } from '../lib/seoStock.js';
import { monthlyMortgage } from '../lib/mortgage.js';
const property = { id: 'one', house_number: '1/2', project_name: 'ทดสอบ', main_location: 'คลองหลวง', sub_location: 'คลองสาม', property_owner: 'Startup Up', price: 2000000 };
const stock = statuses => ({ coveredOwners: ['Startup Up'], rows: statuses.map(status => ({ key: '1/2', project: 'ทดสอบ', owner: 'Startup Up', status, sold: false })) });
test('the visible status, robots, schema and sitemap agree across all inventory states', () => {
  for (const [status, state, available] of [['ว่าง','available',true],['ยังไม่เสร็จ','renovating',true],['ยื่นกู้ ยื่นซ้อนได้','backup',true],['ประเมิน','reserved',false],['ยื่นกู้','reserved',false],['รอโอน','reserved',false],['ขายแล้ว','sold',false],['','unknown',false]]) {
    assert.equal(classifyStockStatus(status), state);
    const p = withWebsiteInventory(property, stock([status]));
    assert.equal(p.inventoryState, state);
    assert.equal(isSaleAvailable(p), available);
    assert.equal(buildPageSeo({selectedProperty:p}).robots, ['reserved','sold'].includes(state) ? 'noindex,follow' : 'index,follow');
    assert.equal(includePropertyInSitemap(property, stock([status])), available);
    if (!available) assert.notEqual(buildPropertyJsonLd(p).offers.availability, 'https://schema.org/InStock');
  }
});
test('missing, stale, conflicting stock never becomes an available or falsely sold house', () => {
  for (const inventory of [null, {...stock(['ว่าง']), stale:true}, stock(['ว่าง','ประเมิน']), {...stock(['ว่าง']),coveredOwners:[]},stock([])]) {
    const p=withWebsiteInventory(property,inventory);
    assert.equal(p.inventoryState,'unknown'); assert.equal(isSaleAvailable(p),false);
  }
  assert.equal(withWebsiteInventory({...property,badge:'Sold Out'},stock(['ว่าง'])).inventoryState,'sold');
});
test('marketing groups handle canal boundaries, Phayom and Sai Mai without claiming wrong provinces', () => {
  const area=name=>SEO_LOCATIONS.find(x=>x.name===name);
  const matches=(p,name)=>matchesSeoLocation(p,area(name));
  const canal4={...property,sub_location:'คลองสี่'};
  assert.equal(matches(canal4,'ธัญบุรี'),true); assert.equal(matches(canal4,'คลองหลวง'),false);
  assert.equal(matches(canal4,'รังสิต'),true);
  assert.equal(matches({...property,sub_location:'คลอง 12'},'คลองหลวง'),false);
  const phayom={main_location:'พยอม',province:'พระนครศรีอยุธยา'};
  assert.equal(matches(phayom,'คลองหลวง'),true); assert.equal(matches(phayom,'รังสิต'),true);assert.equal(matches(phayom,'ปทุมธานี'),false);
  const saimai={main_location:'สายไหม',province:'กรุงเทพมหานคร'};
  assert.equal(matches(saimai,'ลำลูกกา'),true); assert.equal(matches(saimai,'ปทุมธานี'),false);
});
test('related houses exclude self, other areas, reserved, sold and unverified stock', () => {
  const candidates=['available','reserved','sold','unknown'].map((inventoryState,i)=>({...property,id:String(i),inventoryState}));
  assert.deepEqual(relatedAvailableProperties(property,[...candidates,{...property,id:'far',main_location:'นนทบุรี',inventoryState:'available'}, {...property,inventoryState:'available'}]).map(p=>p.id),['0']);
});
test('mortgage formula supports zero interest and invalid inputs without NaN',()=>{
  assert.equal(monthlyMortgage(360000,0,30),1000);
  assert.equal(Math.round(monthlyMortgage(2000000,3,30)),8432);
  assert.equal(monthlyMortgage(2000000,3,0),0); assert.equal(monthlyMortgage('bad'),0);
});

test('FAQ prices exclude reserved listings and do not invent a minimum for empty stock',()=>{
  const location=SEO_LOCATIONS.find(x=>x.name==='คลองหลวง');
  const faq=locationFaq(location,[{...property,inventoryState:'available'}, {...property,id:'reserved',inventoryState:'reserved',price:1}]);
  assert.equal(faq.length,5); assert.ok(faq[0][1].includes('2,000,000'));
  assert.ok(!locationFaq(location,[])[0][1].includes('เริ่มต้น'));
});
