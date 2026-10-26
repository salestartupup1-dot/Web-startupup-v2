import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { captureAttribution, contactAttribution, chatUrl, cleanText, cleanBookingText } from '../../lib/lineAttribution';
import { needsLineAppTap } from '../../lib/lineLaunch';
import styles from '../../styles/line-leads.module.css';
import visual from '../../styles/line-connect.module.css';

export default function LineGo({ bookingText, property }) {
  const started = useRef(false);
  const [error, setError] = useState('');
  const [launchUrl, setLaunchUrl] = useState('');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function start() {
      try {
        const res = await fetch('/api/line/start', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attribution: contactAttribution(captureAttribution(), window.location.href), bookingText, property }), signal: AbortSignal.timeout(15000) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setLaunchUrl(data.url);
        if (needsLineAppTap(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)) return;
        window.location.replace(data.url);
      } catch (err) { setError(err.message || 'เปิด LINE ไม่สำเร็จ กรุณาลองใหม่'); }
    }
    start();
  }, [bookingText, property]);
  // Same look as /line/connect, so the iPhone tap reads as one step of the chat handoff.
  return <main className={`${styles.gateway} ${visual.scene}`}><Head><title>ติดต่อ STARTUP UP ผ่าน LINE</title><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Head>
    <div className={visual.photo} aria-hidden="true">
      <Image src="/brand/line-connect-background.png" alt="" fill sizes="(max-width: 700px) 100vw, 60vw" preload className={visual.background} />
    </div>
    <div className={visual.brand}>STARTUP UP<span>REAL ESTATE</span></div>
    <section className={`${styles.gatewayCard} ${visual.card}`} aria-labelledby="line-go-heading">
      <div className={visual.lineIcon}><Image src="/brand/line.png" width={52} height={52} alt="LINE" /></div>
      <span className={styles.eyebrow}>คุยเรื่องบ้านกับ STARTUP UP</span>
      <h1 id="line-go-heading">{error ? 'เปิด LINE ไม่สำเร็จ' : launchUrl ? 'แตะเพื่อเข้าห้องแชท' : 'กำลังเปิด LINE…'}</h1>
      {!error && !launchUrl && <div className={visual.progress} aria-hidden="true"><span /></div>}
      {error ? <>
        <p role="alert" className={styles.error}>{error}</p>
        <button className={styles.primary} onClick={() => window.location.reload()}>ลองอีกครั้ง</button>
        <a className={styles.secondary} href={chatUrl(bookingText)} rel="noreferrer">เปิดแชท LINE โดยตรง</a>
      </> : launchUrl ? <>
        <p role="status">คุยกับทีมงานได้ทันทีในแอป LINE (@SURE141)</p>
        <a className={`${styles.primary} ${visual.lineButton}`} href={launchUrl} rel="noreferrer">
          <Image src="/brand/line.png" width={26} height={26} alt="" />เข้าห้องแชท LINE
        </a>
        <details><summary>หากแอป LINE ไม่เปิด</summary><p>ลองแตะปุ่มค้างแล้วเลือก “เปิดใน LINE” หรือใช้ตัวสแกน QR ภายในแอป LINE หากเปิดจาก Facebook หรือ TikTok ให้เปิดหน้านี้ใน Safari แล้วลองอีกครั้ง</p></details>
      </> : <p role="status">กรุณารอสักครู่ เราจะพาคุณไปที่ @SURE141 อัตโนมัติ</p>}
      <noscript><p>กรุณาเปิด JavaScript เพื่อเปิด LINE อัตโนมัติ</p><a className={styles.secondary} href={chatUrl(bookingText)} rel="noreferrer">เปิดแชท LINE โดยตรง</a></noscript>
      <a className={`${styles.textLink} ${visual.privacy}`} href="/line/privacy" target="_blank" rel="noreferrer">อ่านคำชี้แจงการใช้ข้อมูล <span aria-hidden="true">↗</span></a>
    </section></main>;
}

export async function getServerSideProps({ query, res }) {
  const { getLineConfig } = await import('../../lib/lineServer');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const bookingText = cleanBookingText(query.booking);
  const cfg = getLineConfig();
  if (!cfg.enabled || !cfg.ready) return { redirect: { destination: chatUrl(bookingText), permanent: false } };
  return { props: { bookingText, property: { id: cleanText(query.property, 100), name: cleanText(query.name) } } };
}
