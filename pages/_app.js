import { Component as ReactComponent, useEffect } from 'react'
import { useRouter } from 'next/router'
import { captureAttribution } from '../lib/lineAttribution'
import { gtagSendEvent, trackContactClick } from '../lib/googleAdsConversion'
import 'leaflet/dist/leaflet.css'
import '../styles/globals.css'
import Script from 'next/script'
import Head from 'next/head'

const GOOGLE_TAG_MANAGER_ID = 'GTM-N27PQGL2'
const TIKTOK_PIXEL_ID = 'D929G0BC77U133LMGG50'

// Capture incoming campaign parameters before the site's SPA rewrites its URL.
if (typeof window !== 'undefined') captureAttribution()

/**
 * ถ้าส่วนใดของหน้าพังตอน render React จะถอดทั้งหน้าออก ผู้ใช้เห็นเป็นจอขาวเปล่าๆ แจ้งปัญหาไม่ได้
 * ตัวนี้รับ error ไว้ แสดงข้อความพร้อมปุ่มโหลดใหม่ และพิมพ์ error ลง console ไว้ให้ตามต่อ
 */
class ErrorBoundary extends ReactComponent {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center', fontFamily: "'Prompt', sans-serif", color: '#0b3d1b' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>ขออภัย หน้านี้แสดงผลไม่สำเร็จ</h1>
        <p style={{ color: '#6b7280', fontSize: 14, maxWidth: 420 }}>
          กดโหลดหน้าใหม่อีกครั้ง ถ้ายังไม่หายรบกวนแจ้งทีมงานพร้อมบอกว่ากดจากหน้าไหน
        </p>
        <code style={{ color: '#9ca3af', fontSize: 12, maxWidth: 480, wordBreak: 'break-word' }}>
          {String(this.state.error?.message || this.state.error)}
        </code>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ background: '#0b3d1b', color: '#fff', border: 0, borderRadius: 999, padding: '10px 24px', fontSize: 14, cursor: 'pointer' }}
        >
          โหลดหน้าใหม่
        </button>
      </div>
    )
  }
}

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const privateRoute = /^\/(admin|line)(\/|$)/.test(router.pathname)
  useEffect(() => {
    if (privateRoute) return
    window.gtagSendEvent = gtagSendEvent
    document.addEventListener('click', trackContactClick)
    return () => {
      document.removeEventListener('click', trackContactClick)
      if (window.gtagSendEvent === gtagSendEvent) delete window.gtagSendEvent
    }
  }, [privateRoute])
  useEffect(() => {
    const capture = () => captureAttribution()
    router.events.on('routeChangeComplete', capture)
    return () => router.events.off('routeChangeComplete', capture)
  }, [router.events])
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" key="viewport" />
      </Head>
      {!privateRoute && <><Script id="google-tag-manager" strategy="afterInteractive">
        {`
          // Keep custom event calls queued while GTM loads the Google tag.
          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');
        `}
      </Script>
      <Script id="tiktok-pixel" strategy="afterInteractive">
        {`
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
          var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
          ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

            ttq.load('${TIKTOK_PIXEL_ID}');
            ttq.page();
          }(window, document, 'ttq');
        `}
      </Script>
      </>}
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  )
}
