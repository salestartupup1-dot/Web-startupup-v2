/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element -- Static links and local editorial photos without property prefetches. */
import Head from 'next/head';
import { articlePath, ARTICLES_PATH, isArticlePublishable, resolveArticleAuthor } from '../../lib/articleCatalogue';
import { articleStructuredData, formatArticleDate, feeExample } from '../../lib/articlePresentation';
import { safeJsonLd, toAbsoluteUrl } from '../../lib/seo';
import ArticleLayout from './ArticleLayout';
import styles from './Articles.module.css';

const baht = value => value.toLocaleString('th-TH');
function ContentTable({ data }) {
  return <div className={`${styles.tableWrap} ${styles.contentTable}`} role="region" aria-label={data.caption} tabIndex={0}>
    <table><caption>{data.caption}</caption><thead><tr>{data.headers.map(text=><th key={text} scope="col">{text}</th>)}</tr></thead>
      <tbody>{data.rows.map((row,i)=><tr key={i}>{row.map((text,j)=>j===0?<th scope="row" key={j}>{text}</th>:<td key={j}>{text}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
function FeeTable() {
  const normal = feeExample.reduce((sum,row)=>sum+row.normal,0);
  const reduced = feeExample.reduce((sum,row)=>sum+row.reduced,0);
  return <div className={styles.tableWrap} role="region" aria-label="ตารางตัวอย่างค่าธรรมเนียม" tabIndex={0}>
    <table><caption>ตัวอย่างฐานคำนวณรายการละ 2,000,000 บาท · หน่วย: บาท</caption>
      <thead><tr><th scope="col">รายการ</th><th scope="col">อัตราปกติ</th><th scope="col">อัตรา 0.01%</th><th scope="col">ส่วนต่าง</th></tr></thead>
      <tbody>{feeExample.map(row=><tr key={row.label}><th scope="row">{row.label}</th><td>{baht(row.normal)}</td><td>{baht(row.reduced)}</td><td>{baht(row.normal-row.reduced)}</td></tr>)}</tbody>
      <tfoot><tr><th scope="row">รวม</th><td>{baht(normal)}</td><td>{baht(reduced)}</td><td>{baht(normal-reduced)}</td></tr></tfoot>
    </table>
  </div>;
}
export default function ArticlePage({ article }) {
  const author = resolveArticleAuthor(article);
  const canonical = toAbsoluteUrl(articlePath(article));
  return <ArticleLayout>
    <Head>
      <title>{article.seoTitle}</title><meta name="description" content={article.description} key="description" />
      <link rel="canonical" href={canonical} key="canonical" />
      <meta name="robots" content={isArticlePublishable(article)?'index,follow':'noindex,follow'} key="robots" />
      <meta property="og:type" content="article" /><meta property="og:locale" content="th_TH" />
      <meta property="og:title" content={article.seoTitle} /><meta property="og:description" content={article.description} /><meta property="og:url" content={canonical} />
      {article.cover && <meta property="og:image" content={toAbsoluteUrl(article.coverSocial || article.cover.replace(/\.svg$/,'.png'))} />}
      <meta property="article:published_time" content={article.datePublished} /><meta property="article:modified_time" content={article.dateModified} />
      <script key="article-schema" type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(articleStructuredData(article))}} />
    </Head>
    <nav className={styles.breadcrumb} aria-label="เส้นทางหน้าปัจจุบัน"><a href="/">หน้าหลัก</a><span aria-hidden="true">/</span><a href={ARTICLES_PATH}>บทความ</a><span aria-hidden="true">/</span><span aria-current="page">{article.keyword || 'ลดค่าโอน บ้านมือสอง'}</span></nav>
    <article>
      <header className={styles.articleHeader}>
        <p className={styles.eyebrow}>{article.category} · บ้านหลังแรก</p>
        <h1>{article.title}</h1>
        <div className={styles.byline}>{author && <span>โดย {author.displayName}</span>}<span>อัปเดต <time dateTime={article.dateModified}>{formatArticleDate(article.dateModified)}</time></span></div>
      </header>
      <div className={styles.articleGrid}>
        <aside className={styles.contents}>
          <nav aria-label="สารบัญบทความ"><details><summary>สารบัญบทความ</summary><ul>{article.sections.map(section=><li key={section.id}><a href={`#${section.id}`}>{section.heading}</a></li>)}<li><a href="#questions">คำถามที่พบบ่อย</a></li></ul></details></nav>
        </aside>
        <div className={styles.prose}>
          {article.cover && <figure className={styles.coverFigure}>
            <img className={styles.articleCover} src={article.cover} alt={article.coverAlt} width="960" height="640" fetchPriority="high" />
            {article.coverCredit && <figcaption className={styles.photoCredit}>
              {article.coverCredit.illustrative ? 'ภาพประกอบ: ' : 'ภาพ: '}<a href={article.coverCredit.url}>{article.coverCredit.name}</a>
              {article.coverCredit.licenseUrl && <> · <a href={article.coverCredit.licenseUrl}>{article.coverCredit.license}</a></>}
              {article.coverCredit.attributionRequired && ' · ปรับขนาดและครอปภาพ'}
            </figcaption>}
          </figure>}
          <div className={styles.intro}>{article.introduction.map((p,i)=><p key={i}>{p}</p>)}</div>
          {article.sections.map(section=><section id={section.id} key={section.id}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((p,i)=><p key={i}>{p}</p>)}
            {section.bullets && <ul>{section.bullets.map(p=><li key={p}>{p}</li>)}</ul>}
            {section.table && <FeeTable />}
            {section.dataTable && <ContentTable data={section.dataTable} />}
            {section.after?.map((p,i)=><p key={i}>{p}</p>)}
            {section.links && <div className={styles.related}>{section.links.map(link=><a key={link.href} href={link.href}>{link.label}</a>)}</div>}
            {section.sources && <p className={styles.citation}>อ้างอิง: {section.sources.map((id,i)=>{
              const source=article.sources.find(s=>s.id===id);
              return <span key={id}>{i>0?' · ':''}<a href={source.href}>{source.label}</a></span>;
            })}</p>}
          </section>)}
          {article.sources.length>0 && <section className={styles.sources} aria-labelledby="sources-heading"><h2 id="sources-heading">แหล่งอ้างอิง</h2><ul>{article.sources.map(source=><li key={source.id}><a href={source.href}>{source.label}</a></li>)}</ul></section>}
          <section id="questions" aria-labelledby="questions-heading"><h2 id="questions-heading">คำถามที่พบบ่อย</h2>{article.faq.map(item=><details className={styles.faq} key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
          <section className={styles.contact} aria-label="ติดต่อ Startup Up"><p>{article.closing}</p><div><a className={styles.primary} href="/line/go?via=website">คุยกับเราทาง LINE</a><a href="tel:0624782426">โทร 062-478-2426</a></div></section>
        </div>
      </div>
    </article>
  </ArticleLayout>;
}
