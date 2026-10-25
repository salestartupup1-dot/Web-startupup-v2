import { Component as ReactComponent, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { captureAttribution } from '../lib/lineAttribution'
import { gtagSendEvent, trackContactClick } from '../lib/googleAdsConversion'
import { installPhoneClickTracking } from '../lib/phoneClicks'
import { installMarketingScripts } from '../lib/marketingBootstrap'
import '../styles/fonts.css'
import '../styles/globals.css'
import Head from 'next/head'


// Capture incoming campaign parameters before the site's SPA rewrites its URL.
const phoneDiagnosticsRequested = typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('phone_debug') === '1'
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
  const [phoneDiagnostic, setPhoneDiagnostic] = useState(null)
  const privateRoute = /^\/(admin|line)(\/|$)/.test(router.pathname)
  useEffect(() => {
    if (privateRoute) return
    installMarketingScripts(window, document)
    window.gtagSendEvent = gtagSendEvent
    const diagnostic = phoneDiagnosticsRequested || new URL(window.location.href).searchParams.get('phone_debug') === '1'
    if (diagnostic) setPhoneDiagnostic('ready')
    const stopPhoneTracking = installPhoneClickTracking(window, document, status => {
      if (diagnostic) setPhoneDiagnostic(status)
    })
    document.addEventListener('click', trackContactClick)
    return () => {
      document.removeEventListener('click', trackContactClick)
      stopPhoneTracking()
      if (window.gtagSendEvent === gtagSendEvent) delete window.gtagSendEvent
    }
  }, [privateRoute])
  useEffect(() => {
    const capture = () => captureAttribution()
    const startMarketing = () => window.__siteMarketing?.start()
    router.events.on('beforeHistoryChange', startMarketing)
    router.events.on('routeChangeComplete', capture)
    return () => {
      router.events.off('beforeHistoryChange', startMarketing)
      router.events.off('routeChangeComplete', capture)
    }
  }, [router.events])
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" key="viewport" />
        <meta name="google-site-verification" content="yM2oXyforQdUzBPi710gJZOV8eMPIQQqlAYmuO7b73E" key="google-site-verification" />
      </Head>
      {phoneDiagnostic && !privateRoute && <aside role="status" aria-live="polite" style={{ position: 'fixed', bottom: 12, left: 12, right: 12, zIndex: 2147483647, margin: '0 auto', maxWidth: 420, padding: '12px 16px', borderRadius: 12, background: '#fff', color: '#123d2b', border: '2px solid #06c755', boxShadow: '0 2px 12px #0002', fontSize: 14 }}>
        <strong>ตรวจการกดโทร</strong>{' · '}
        {phoneDiagnostic === 'ready' ? 'พร้อมทดสอบ — กดเบอร์โทรของบ้าน' : phoneDiagnostic === 'sending' ? 'กำลังบันทึก…' : phoneDiagnostic === 'saved' ? 'บันทึกเข้า Lead Source แล้ว' : phoneDiagnostic === 'retry' ? 'ยังส่งไม่สำเร็จ กลับมาหน้านี้เพื่อส่งซ้ำ' : `บันทึกไม่สำเร็จ (${phoneDiagnostic.replace('error:', '')})`}
      </aside>}
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  )
}
