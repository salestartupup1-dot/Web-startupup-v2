export const paragraphs = text => text.trim().split('\n').map(line=>line.trim()).filter(Boolean);
export const section = (id,heading,text,extra={}) => ({id,heading,paragraphs:paragraphs(text),...extra});
export const questions = pairs => pairs.map(([question,answer])=>({question,answer}));
export const link = (label,href)=>({label,href});
export const SOURCES = {
 navanakorn:{id:'navanakorn',label:'นวนคร — ที่ตั้งสำนักงานและเขตอุตสาหกรรมปทุมธานี',href:'https://www.navanakorn.com/contact-us/'},
 pea:{id:'pea',label:'การไฟฟ้าส่วนภูมิภาค — ความปลอดภัยทางไฟฟ้าเมื่อมีน้ำท่วม',href:'https://www.pea.co.th/news/corporate-news/1347'},
 'flood-history':{id:'flood-history',label:'กรมป้องกันและบรรเทาสาธารณภัย — ข้อมูลและบทเรียนภัยพิบัติรวมเหตุการณ์ปี 2554',href:'https://backofficeminisite.disaster.go.th/apiv1/apps/minisite_dpmrc1/202/sitedownload/817/download?TypeMenu=MainMenu&filename=70b04185b1e0a17f468a13593457510b.pdf'},
 sun:{id:'sun',label:'สถาบันวิจัยดาราศาสตร์แห่งชาติ — ตำแหน่งดวงอาทิตย์ในประเทศไทยเปลี่ยนตามฤดูกาล',href:'https://www.narit.or.th/th/PressRelease-20260327-Sun-Overhead-TH-2026'},
 daylight:{id:'daylight',label:'U.S. Department of Energy — หลักการแสงธรรมชาติและช่องเปิด (ต้องปรับตามภูมิอากาศท้องถิ่น)',href:'https://www.energy.gov/articles/energy-101-daylighting'},
 stamp:{id:'stamp',label:'กรมสรรพากร — การคำนวณอากรแสตมป์',href:'https://rd.go.th/63777.html'},
 mortgage:{id:'mortgage',label:'ธนาคารแห่งประเทศไทย — สินเชื่อเพื่อที่อยู่อาศัย',href:'https://www.bot.or.th/th/satang-story/managing-debt/mortgage-loan.html'},
 comparison:{id:'comparison',label:'ธนาคารแห่งประเทศไทย — เปรียบเทียบสินเชื่อเพื่อที่อยู่อาศัย',href:'https://app.bot.or.th/1213/MCPD/ProductApp/HomeLoan'},
 documents:{id:'documents',label:'ธนาคารอาคารสงเคราะห์ — เตรียมขอสินเชื่อบ้าน',href:'https://blog.ghbank.co.th/complete-guide-for-buying-home/'},
 freelance:{id:'freelance',label:'ธนาคารอาคารสงเคราะห์ — กู้บ้านเมื่อไม่มีสลิปเงินเดือน',href:'https://blog.ghbank.co.th/home-loan-without-salary-slip/'},
 land:{id:'land',label:'กรมที่ดิน — เตรียมเอกสารไปสำนักงานที่ดิน',href:'https://www.dol.go.th/trat/f1/ask-question/faqs-1774924162/'},
 sbt:{id:'sbt',label:'กรมสรรพากร — ภาษีธุรกิจเฉพาะจากการขายอสังหาริมทรัพย์',href:'https://www.rd.go.th/63775.html'},
 fees:{id:'fees',label:'รัฐบาลไทย — มาตรการลดค่าธรรมเนียมโอนและจำนอง',href:'https://www.thaigov.go.th/th/news/165829'},
 tu:{id:'tu',label:'มหาวิทยาลัยธรรมศาสตร์ — ที่ตั้งศูนย์รังสิต',href:'https://tu.ac.th/contact/'},
 flood:{id:'flood',label:'กรมป้องกันและบรรเทาสาธารณภัย — แผนที่พื้นที่เสี่ยงภัย',href:'https://riskmap.disaster.go.th/'},
};
export function finish(body,{sources=[],links=[],imageAlt}={}) {
 return {...body,sections:[...body.sections,section('latest-homes','ดูบ้านและวางแผนขั้นตอนต่อไป',`ใช้ข้อมูลในบทความเป็นรายการคำถามสำหรับบ้านที่คุณสนใจ แล้วตรวจราคา สถานะ และรายละเอียดล่าสุดจากหน้าประกาศก่อนนัดชมบ้าน รายการที่เปิดขายเปลี่ยนแปลงได้ จึงควรยืนยันอีกครั้งกับทีมงานก่อนเดินทาง
Startup Up ขายบ้านมือสองรีโนเวทในรังสิต คลองหลวง ธัญบุรี ลำลูกกา และปทุมธานี พร้อมช่วยประสานการยื่นสินเชื่อและดูแลจนถึงวันโอน คุณสามารถส่งลิงก์บ้านที่ชอบและคำถามที่เตรียมไว้ให้ทีมงานช่วยตรวจรายละเอียดรายหลังได้`,{links})],sources:sources.map(id=>SOURCES[id]),closing:'อยากเริ่มจากบ้านที่เหมาะกับงบและการเดินทางของคุณ คุยกับทีมงาน Startup Up ทาง LINE หรือโทร 062-478-2426 เพื่อสอบถามรายละเอียดและนัดชมบ้านได้เลย',imageSuggestions:[{position:'ภาพปกก่อนเนื้อหา',description:'ภาพประกอบสำหรับบทความ ไม่ใช้ภาพแทนการตรวจบ้านจริง',alt:imageAlt},...(body.imageSuggestions||[])]};
}
