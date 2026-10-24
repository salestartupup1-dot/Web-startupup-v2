import { ARTICLE_CATALOGUE, resolveArticleAuthor } from './articleCatalogue.js';
import transferFees from '../content/articles/transferFees.js';
import { loanDocuments, salaryLoan, loanRejected, freelanceLoan } from '../content/articles/loans.js';
import { closingCosts, buyingSteps, purchaseContract, transferDay, buyingChoices } from '../content/articles/buying.js';
import { inspection, renovationValue, townhouseRenovation, cornerHouse, houseDirection } from '../content/articles/renovation.js';
import { rangsitLocations, pruksaProjects, universityHomes, navanakornHomes, floodRisk } from '../content/articles/locations.js';

const CONTENT = { 'ลดค่าโอน-บ้านมือสอง': transferFees,
  'เอกสารกู้บ้านมือสอง':loanDocuments,'เงินเดือน-กู้บ้าน':salaryLoan,'กู้บ้านไม่ผ่าน':loanRejected,'อาชีพอิสระ-กู้บ้าน':freelanceLoan,
  'ค่าใช้จ่ายวันโอน':closingCosts,'ขั้นตอนซื้อบ้านมือสอง':buyingSteps,'สัญญาซื้อบ้านมือสอง':purchaseContract,'เอกสารวันโอนบ้าน':transferDay,'เลือกซื้อบ้านมือสอง':buyingChoices,
  'เช็คบ้านมือสอง':inspection,'บ้านรีโนเวท-คุ้มไหม':renovationValue,'รีโนเวททาวน์เฮาส์':townhouseRenovation,'ทาวน์เฮาส์หลังริม':cornerHouse,'บ้านหันทิศไหนดี':houseDirection,
  'บ้านรังสิต-ทำเลไหนดี':rangsitLocations,'พฤกษา-คลองหลวง':pruksaProjects,'บ้านใกล้ธรรมศาสตร์':universityHomes,'บ้านใกล้นวนคร':navanakornHomes,'เช็คน้ำท่วม-ปทุมธานี':floodRisk,
};
export const getArticle = slug => {
  const metadata = ARTICLE_CATALOGUE.find(article => article.slug === slug);
  return metadata && CONTENT[slug] ? { ...metadata, ...CONTENT[slug], author: resolveArticleAuthor(metadata) } : null;
};
export { formatArticleDate, articleStructuredData, feeExample } from './articlePresentation.js';

export const articleText = article => [article.title,...article.introduction,
  ...article.sections.flatMap(section=>[section.heading,...section.paragraphs,...section.bullets||[],...section.after||[],...(section.dataTable?[section.dataTable.caption,...section.dataTable.headers,...section.dataTable.rows.flat()]:[]),...(section.links||[]).map(link=>link.label)]),
  ...article.faq.flatMap(item=>[item.question,item.answer]),article.closing].join(' ');
export const articleWordCount = article => [...new Intl.Segmenter('th',{granularity:'word'}).segment(articleText(article))].filter(word=>word.isWordLike).length;
