import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { ARTICLE_CATALOGUE, ARTICLE_AUTHORS, resolveArticleAuthor, articlePath, articleSitemapEntries, isArticlePublishable } from '../lib/articleCatalogue.js';
import { getArticle, articleWordCount, articleStructuredData, feeExample, formatArticleDate, articleText } from '../lib/articles.js';
import { SEO_LOCATIONS } from '../lib/seoLocations.js';
import { SEO_LANDINGS } from '../lib/seoLandings.js';

const article=getArticle(ARTICLE_CATALOGUE[0].slug);
test('all twenty articles are complete, unique, linked and renderable without stock reads',()=>{
  assert.equal(ARTICLE_CATALOGUE.length,20);
  assert.equal(new Set(ARTICLE_CATALOGUE.map(a=>a.slug)).size,20);
  const landingPaths=new Set([...SEO_LOCATIONS,...SEO_LANDINGS].map(a=>'/'+a.slug));
  for(const meta of ARTICLE_CATALOGUE){
    const a=getArticle(meta.slug),count=articleWordCount(a);
    assert.ok(count>=1200&&count<=1800,`${meta.slug}: ${count}`);
    assert.ok(a.seoTitle.length<=60,meta.slug);assert.ok(a.description.length<=155,meta.slug);
    assert.ok(a.faq.length>=3&&a.faq.length<=5,meta.slug);
    assert.ok(fs.existsSync('public'+a.cover),meta.slug);
    assert.ok(a.coverAlt&&a.imageSuggestions.length,meta.slug);
    assert.equal(new Set(a.sections.map(s=>s.id)).size,a.sections.length,meta.slug);
    for(const section of a.sections)for(const id of section.sources||[])assert.ok(a.sources.some(s=>s.id===id),`${meta.slug}: ${id}`);
    const links=a.sections.flatMap(s=>s.links||[]);
    assert.ok(new Set(links.filter(l=>landingPaths.has(l.href)).map(l=>l.href)).size>=2,meta.slug);
    const schema=articleStructuredData(a).find(s=>s['@type']==='Article');
    assert.equal(schema.author['@type'],'Organization');assert.equal(schema.publisher.name,'Startup Up');
    assert.doesNotMatch(articleText(a),/TODO|TBD|\[ใส่|รอยืนยัน|เหลือ\s*\d+\s*หลัง/);
    if(a.keyword){
      const normal=text=>text.replace(/[\s,–—-]/g,'');
      assert.ok(normal(a.description).includes(normal(a.keyword)),meta.slug);
      assert.ok(normal(a.introduction[0]).includes(normal(a.keyword)),meta.slug);
      assert.ok(a.sections.some(s=>normal(s.heading).includes(normal(a.keyword))),meta.slug);
    }
  }
});
test('mortgage illustrations use the stated amortization assumptions',()=>{
  const payment=(principal,rate,years)=>principal*(rate/12)/(1-(1+rate/12)**(-years*12));
  assert.equal(Math.round(payment(2090000,.03,30)),8812);
  assert.equal(Math.round(payment(2090000,.05,30)),11220);
  const incomeArticle=getArticle('เงินเดือน-กู้บ้าน');
  const rows=incomeArticle.sections.find(s=>s.dataTable).dataTable.rows;
  for(const [i,income] of [15000,20000,25000].entries()){
    const principal=Math.floor((income*.3/payment(1,.03,30))/1000)*1000;
    assert.equal(rows[i][2],principal.toLocaleString('en-US')+' บาท');
  }
});
test('article fits the editorial brief, with verified sources and no unfinished copy',()=>{
  assert.ok(articleWordCount(article)>=1200 && articleWordCount(article)<=1800,articleWordCount(article));
  assert.ok(article.seoTitle.length<=60); assert.ok(article.description.length<=155);
  assert.match(article.introduction[0],/ลดค่าโอน บ้านมือสอง/);
  assert.match(article.description,/ลดค่าโอน บ้านมือสอง/);
  assert.ok(article.sections.some(section=>section.heading.includes('ลดค่าโอน บ้านมือสอง')));
  assert.ok(article.faq.length>=3 && article.faq.length<=5);
  assert.doesNotMatch(articleText(article),/\[|\]|TODO|TBD|ใส่ชื่อ|รอยืนยัน/);
  assert.ok(article.sources.some(source=>source.href==='https://ratchakitcha.soc.go.th/documents/120346.pdf'));
  for (const section of article.sections) for(const source of section.sources||[]) assert.ok(article.sources.some(item=>item.id===source));
});
test('every article links to at least two existing landing pages and the mortgage calculator',()=>{
  const landingPaths=new Set([...SEO_LOCATIONS,...SEO_LANDINGS].map(location=>'/'+location.slug));
  const links=article.sections.flatMap(section=>section.links||[]).map(link=>link.href);
  assert.ok(new Set(links.filter(link=>landingPaths.has(link))).size>=2);
  assert.ok(links.includes('/บ้านรีโนเวท-ปทุมธานี')); assert.ok(links.includes('/?tab=calculator'));
  assert.equal(getArticle('missing'),null);
  assert.equal(decodeURIComponent(articlePath(article)),'/articles/ลดค่าโอน-บ้านมือสอง');
});
test('fee comparison calculates 200 + 200 baht, 59,600 reduction, without claiming total buyer costs',()=>{
  assert.deepEqual(feeExample.map(row=>[row.normal,row.reduced]),[[40000,200],[20000,200]]);
  assert.equal(feeExample.reduce((sum,row)=>sum+row.normal-row.reduced,0),59600);
  assert.match(articleText(article),/ไม่ได้หมายความว่าผู้ซื้อทุกคน/);
  assert.match(articleText(article),/ภาษีธุรกิจเฉพาะ/);
});
test('all existing articles inherit the team byline and Organization schema, with ISO dates',()=>{
  assert.ok(isArticlePublishable(article));
  assert.equal(resolveArticleAuthor(article).displayName,'ทีมงาน Startup Up');
  const schema=articleStructuredData(article).find(item=>item['@type']==='Article');
  const organization={'@type':'Organization',name:'Startup Up',url:'https://www.startupup-real-estate.com'};
  assert.deepEqual(schema.author,organization); assert.deepEqual(schema.publisher,organization);
  assert.equal(schema.url,schema.mainEntityOfPage['@id']);
  for (const key of ['datePublished','dateModified']) {
    assert.match(schema[key],/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    assert.ok(Number.isFinite(Date.parse(schema[key])));
  }
  assert.match(formatArticleDate(article.dateModified),/24 ตุลาคม 2569/);
  assert.equal(articleSitemapEntries().length,ARTICLE_CATALOGUE.filter(isArticlePublishable).length);
  assert.equal(articleSitemapEntries().length,ARTICLE_CATALOGUE.length);
});
test('a future Person author uses an ID without changing old article records or the publisher',()=>{
  const before=JSON.stringify(ARTICLE_CATALOGUE);
  const authors={...ARTICLE_AUTHORS, person_test:{type:'Person',name:'ผู้เขียนสำหรับทดสอบ',url:'https://example.com/authors/test'}};
  const schema=articleStructuredData({...article,authorId:'person_test'},{authors}).find(item=>item['@type']==='Article');
  assert.equal(schema.author['@type'],'Person'); assert.equal(schema.author.name,'ผู้เขียนสำหรับทดสอบ');
  assert.equal(schema.publisher['@type'],'Organization');
  assert.equal(resolveArticleAuthor(article,authors).type,'Organization');
  assert.equal(JSON.stringify(ARTICLE_CATALOGUE),before);
  const unknown={...article,authorId:'missing'};
  assert.equal(resolveArticleAuthor(unknown),null);
  assert.equal(isArticlePublishable(unknown),false);
  assert.ok(!articleStructuredData(unknown).some(item=>item['@type']==='Article'));
});
