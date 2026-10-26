/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element -- Static links and locally optimized editorial photos. */
import Head from 'next/head';
import ArticleLayout from './ArticleLayout';
import { ARTICLE_CATALOGUE, ARTICLES_PATH, articlePath, isArticlePublishable } from '../../lib/articleCatalogue';
import { toAbsoluteUrl, safeJsonLd } from '../../lib/seo';
import styles from './Articles.module.css';
const CATEGORIES=[
 {name:'สินเชื่อ',id:'mortgage',intro:'เตรียมรายได้ เอกสาร และงบผ่อนให้พร้อมก่อนยื่นกู้'},
 {name:'ขั้นตอนซื้อบ้าน',id:'buying',intro:'ค่อย ๆ เข้าใจตั้งแต่วันจอง ค่าใช้จ่าย ไปจนถึงรับกุญแจ'},
 {name:'ตรวจบ้านและรีโนเวท',id:'renovation',intro:'ดูให้ลึกกว่าความสวย เลือกบ้านที่ใช้งานได้ตรงใจ'},
 {name:'ทำเลและการอยู่อาศัย',id:'locations',intro:'เลือกบ้านจากการเดินทางและชีวิตประจำวันของคุณ'},
];
const date=value=>new Intl.DateTimeFormat('th-TH',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Bangkok'}).format(new Date(value));
function Cover({article,featured=false}) {return <div className={styles.coverWrap}><img src={article.cover} alt={article.coverAlt} width="960" height="640" loading={featured?'eager':'lazy'} fetchPriority={featured?'high':undefined}/><span className={styles.categoryBadge}>{article.category}</span>{article.coverCredit?.attributionRequired&&<span className={styles.coverAttribution}>ภาพ: {article.coverCredit.name} · {article.coverCredit.license}</span>}</div>;}
export default function ArticlesIndex(){
 const canonical=toAbsoluteUrl(ARTICLES_PATH),published=ARTICLE_CATALOGUE.filter(isArticlePublishable),featured=published[0];
 return <ArticleLayout>
 <Head><title>บทความบ้านมือสองและการซื้อบ้านหลังแรก | Startup Up</title><meta name="description" content="ความรู้ก่อนซื้อบ้านมือสอง รวมเรื่องสินเชื่อ ค่าโอน ตรวจบ้าน รีโนเวท และเลือกทำเลรังสิต คลองหลวง ธัญบุรี ลำลูกกา ปทุมธานี โดยทีมงาน Startup Up" key="description"/><link rel="canonical" href={canonical} key="canonical"/><meta name="robots" content={published.length?'index,follow':'noindex,follow'} key="robots"/>
 <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd({'@context':'https://schema.org','@type':'CollectionPage',name:'บทความบ้านมือสอง',url:canonical,mainEntity:{'@type':'ItemList',itemListElement:published.map((article,i)=>({'@type':'ListItem',position:i+1,name:article.title,url:toAbsoluteUrl(articlePath(article))}))}})}}/></Head>
 <nav className={styles.breadcrumb} aria-label="เส้นทางหน้าปัจจุบัน"><a href="/">หน้าหลัก</a><span aria-hidden="true">/</span><span aria-current="page">บทความ</span></nav>
 <div className={styles.indexTitle}><div><p className={styles.eyebrow}>STARTUP UP · เรื่องน่ารู้ก่อนมีบ้าน</p><h1 className={styles.indexHeading}>ค่อย ๆ รู้ ก่อนเลือกบ้านที่ใช่</h1></div><p>บทความสำหรับคนซื้อบ้านมือสองหลังแรก<br/>จากเรื่องเงิน ไปจนถึงวันที่ได้กลับบ้าน</p></div>
 {featured&&<section className={styles.featuredSection} aria-labelledby="featured-title"><h2 id="featured-title" className={styles.sectionLabel}>บทความเด่น</h2><article className={styles.featured}>
 <a href={articlePath(featured)} className={styles.featuredCover} aria-label={`อ่าน ${featured.title}`}><Cover article={featured} featured/></a><div className={styles.featuredText}><p className={styles.featuredCategory}>{featured.category}</p><h3><a href={articlePath(featured)}>{featured.title}</a></h3><time dateTime={featured.dateModified}>{date(featured.dateModified)}</time><p>{featured.excerpt}</p><a className={styles.primary} href={articlePath(featured)}>อ่านบทความ <span aria-hidden="true">→</span></a></div></article></section>}
 <nav className={styles.categoryNav} aria-label="หมวดหมู่บทความ">{CATEGORIES.map(category=><a key={category.id} href={`#${category.id}`}>{category.name}</a>)}</nav>
 {CATEGORIES.map(category=><section key={category.id} id={category.id} className={styles.categorySection} aria-labelledby={`${category.id}-title`}><div className={styles.categoryHeading}><div><h2 id={`${category.id}-title`}>{category.name}</h2><p>{category.intro}</p></div><span>{published.filter(article=>article.category===category.name).length} บทความ</span></div>
 <ul className={styles.cardGrid}>{published.filter(article=>article.category===category.name).map(article=><li key={article.slug}><article className={styles.editorialCard}><a href={articlePath(article)}><Cover article={article}/><div className={styles.cardText}><h3>{article.title}</h3><p>{article.excerpt}</p><div className={styles.cardFoot}><time dateTime={article.dateModified}>{date(article.dateModified)}</time><span>อ่านต่อ <span aria-hidden="true">→</span></span></div></div></a></article></li>)}</ul></section>)}
 </ArticleLayout>;
}
