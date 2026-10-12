import Head from 'next/head';
import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MAIN_LINE_URL } from '../../lib/lineAttribution';
import { needsLineAppTap, resolveLineEntry, createQrIntent } from '../../lib/lineLaunch';
import styles from '../../styles/line-leads.module.css';

export default function LineConnect({ liffId, ready }) {
  const started = useRef(false);
  const [error, setError] = useState(ready ? '' : 'ระบบเชื่อมข้อมูลยังไม่พร้อม คุณสามารถติดต่อทีมงานผ่าน LINE ได้ตามปกติ');
  const [destination, setDestination] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [loginRedirect, setLoginRedirect] = useState('');
  useEffect(() => {
    if (!ready || error || destination || appUrl) return;
    const timeout = window.setTimeout(() => setError('การเชื่อมต่อใช้เวลานานกว่าปกติ กรุณาลองอีกครั้ง หรือเปิดแชท LINE โดยตรง'), 20000);
    return () => window.clearTimeout(timeout);
  }, [ready, error, destination, appUrl]);
  const connect = useCallback(async () => {
    if (started.current || !ready) return;
    started.current = true;
    try {
      const sdk = window.liff;
      await sdk.init({ liffId });
      // Only read LIFF's final URL AFTER init, which performs the secondary redirect.
      const entry = resolveLineEntry(window.location.href, liffId);
      if (!sdk.isLoggedIn()) {
        const redirectUri = entry.redirectUri;
        if (!sdk.isInClient() && needsLineAppTap(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)) {
          setLoginRedirect(redirectUri);
          setAppUrl(entry.appUrl);
          setError('');
          return;
        }
        sdk.login({ redirectUri });
        return;
      }
      const idToken = sdk.getIDToken();
      if (!idToken) throw new Error('กรุณาอนุญาตการเชื่อมบัญชี LINE เพื่อดำเนินการต่อ');
      let token = entry.token;
      if (!token) {
        // Each authenticated scan gets its own expiring intent; the printed QR is reusable.
        token = await createQrIntent(entry.channel, liffId);
        // Keep the same intent if the completion request needs to be retried.
        window.history.replaceState(window.history.state, '', `/line/connect?t=${encodeURIComponent(token)}`);
      }
      const response = await fetch('/api/line/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, idToken }), signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (response.status === 401 && !sdk.isInClient()) {
        // Clear only this LIFF app's cached session; retry obtains fresh LINE credentials.
        sdk.logout();
        throw new Error('กรุณากดลองอีกครั้งเพื่อเข้าสู่ระบบ LINE ใหม่');
      }
      if (!response.ok) throw new Error(data.error);
      setDestination(data.chatUrl);
      // Automatic navigation may be blocked by a browser; keep an explicit button.
      window.location.replace(data.chatUrl);
    } catch (err) { setError(err.message || 'เชื่อมบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง'); }
  }, [liffId, ready]);
  return <main className={styles.gateway}><Head>
    <title>Add LINE friend</title>
    <meta name="robots" content="noindex,nofollow" />
    <meta name="referrer" content="no-referrer" />
    <meta property="og:title" content="Add LINE friend" key="og:title" />
    <meta property="og:image" content="https://www.startupup-real-estate.com/brand/line-add-friend.png" key="og:image" />
    <meta property="og:image:type" content="image/png" key="og:image:type" />
    <meta property="og:image:width" content="1200" key="og:image:width" />
    <meta property="og:image:height" content="630" key="og:image:height" />
    <meta property="og:image:alt" content="เป็นเพื่อนกันเถอะ · StartupUpRealEstate · @995wowyt" key="og:image:alt" />
    <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
    <meta name="twitter:title" content="Add LINE friend" key="twitter:title" />
    <meta name="twitter:image" content="https://www.startupup-real-estate.com/brand/line-add-friend.png" key="twitter:image" />
  </Head>
    {ready && <Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" strategy="afterInteractive" onReady={connect} onError={() => setError('โหลด LINE ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่')} />}
    <section className={styles.gatewayCard}><span className={styles.eyebrow}>STARTUP UP · LINE</span><h1>{destination ? 'พร้อมคุยกับทีมงานแล้ว' : error ? 'เปิด LINE ไม่สำเร็จ' : appUrl ? 'เปิดแอป LINE เพื่อดำเนินการต่อ' : 'กำลังเปิด LINE…'}</h1>
      {error ? <p role="alert" className={styles.error}>{error}</p> : <p role="status">{destination ? 'หาก LINE ยังไม่เปิด กดปุ่มด้านล่าง' : appUrl ? 'แตะปุ่มด้านล่างเพื่อเชื่อมบัญชีและติดต่อ @SURE141' : 'กรุณารอสักครู่ เราจะพาคุณไปที่ @SURE141 อัตโนมัติ'}</p>}
      {appUrl && !destination && <>
        <a className={styles.primary} href={appUrl} rel="noreferrer">เปิดแอป LINE</a>
        <details><summary>หากแอป LINE ไม่เปิด</summary><p>ลองแตะปุ่มค้างแล้วเลือก “เปิดใน LINE” หรือกลับไปสแกน QR ด้วยตัวสแกนภายในแอป LINE</p><button className={styles.secondary} onClick={() => window.liff.login({ redirectUri: loginRedirect })}>เข้าสู่ระบบ LINE ผ่านเบราว์เซอร์</button></details>
      </>}
      {destination && <a className={styles.primary} href={destination} rel="noreferrer">เปิด LINE เพื่อคุยกับทีมงาน</a>}
      {error && ready && <button className={styles.primary} onClick={() => window.location.reload()}>ลองอีกครั้ง</button>}
      {error && !destination && <a className={styles.secondary} href={MAIN_LINE_URL} rel="noreferrer">เปิดแชท LINE โดยตรง</a>}
      <noscript><p>กรุณาเปิด JavaScript เพื่อเปิด LINE อัตโนมัติ</p><a className={styles.secondary} href={MAIN_LINE_URL} rel="noreferrer">เปิดแชท LINE โดยตรง</a></noscript>
      <a className={styles.textLink} href="/line/privacy" target="_blank" rel="noreferrer">อ่านคำชี้แจงการใช้ข้อมูล</a>
    </section></main>;
}

export async function getServerSideProps({ res }) {
  const { getLineConfig } = await import('../../lib/lineServer');
  const cfg = getLineConfig();
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return { props: { liffId: cfg.liffId, ready: cfg.enabled && cfg.ready } };
}
