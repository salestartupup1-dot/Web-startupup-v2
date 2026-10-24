import fs from 'node:fs';
import path from 'node:path';
import { ARTICLE_CATALOGUE, articlePath } from '../lib/articleCatalogue.js';
import { getArticle, feeExample, articleWordCount } from '../lib/articles.js';
const all=process.argv.includes('--all');
for(const metadata of all ? ARTICLE_CATALOGUE : [ARTICLE_CATALOGUE[0]]) {
const article=getArticle(metadata.slug);
const lines=[`Title tag: ${article.seoTitle}`,`Meta description: ${article.description}`,`Slug: ${article.slug}`,`URL: https://www.startupup-real-estate.com${decodeURIComponent(articlePath(article))}`,`ความยาว: ${articleWordCount(article)} คำ (ตัดคำภาษาไทยด้วย Intl.Segmenter)`,
  ...(article.author?[`ผู้เขียน: ${article.author.displayName}`]:[]),'',article.title,'',...article.introduction.flatMap(p=>[p,''])];
for (const section of article.sections) {
  lines.push(section.heading,'',...section.paragraphs.flatMap(p=>[p,'']));
  if(section.bullets) lines.push(...section.bullets.map(p=>'- '+p),'');
  if(section.table) lines.push('ตัวอย่างฐานคำนวณรายการละ 2,000,000 บาท — หน่วย: บาท','รายการ | อัตราปกติ | อัตรา 0.01% | ส่วนต่าง',...feeExample.map(row=>[row.label,row.normal,row.reduced,row.normal-row.reduced].join(' | ')),'รวม | 60000 | 400 | 59600','');
  if(section.dataTable) lines.push(section.dataTable.caption,section.dataTable.headers.join(' | '),...section.dataTable.rows.map(row=>row.join(' | ')),'');
  if(section.after) lines.push(...section.after.flatMap(p=>[p,'']));
  if(section.links) lines.push(...section.links.map(link=>`${link.label}: https://www.startupup-real-estate.com${link.href}`),'');
  if(section.sources) lines.push(...section.sources.map(id=>{const s=article.sources.find(source=>source.id===id);return `${s.label}: ${s.href}`;}),'');
}
lines.push('คำถามที่พบบ่อย','',...article.faq.flatMap(item=>[item.question,item.answer,'']),article.closing,'LINE: https://www.startupup-real-estate.com/line/go?via=website','โทร: 062-478-2426','','รูปที่ควรใส่','');
for(const image of article.imageSuggestions)lines.push(`ตำแหน่ง: ${image.position}`,image.description,`Alt: ${image.alt}`,'');
const directory=path.join(process.env.TEMP,'startupup-article-reviews');
if(all)fs.mkdirSync(directory,{recursive:true});
const target=all ? path.join(directory,article.slug+'.txt') : process.argv[2]||path.join(process.env.TEMP,'startupup-article-fees-review.txt');
fs.writeFileSync(target,lines.join('\n'),'utf8'); console.log(target);

}
