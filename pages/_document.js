import { Html, Head, Main, NextScript } from 'next/document'

const GOOGLE_TAG_MANAGER_ID = 'GTM-N27PQGL2'

export default function Document(props) {
  const privateRoute = /^\/(admin|line)(\/|$)/.test(props.__NEXT_DATA__?.page || '')
  return (
    <Html lang="th">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@200;300;400;500;600;700&display=swap" rel="stylesheet" />

        {/*
          ประกาศไอคอนไว้ที่นี่ให้ครบทุกหน้า ไม่ใช่เฉพาะหน้าแรก
          Google จะเลือกไอคอนจากหน้าที่มันเก็บได้ ถ้าบางหน้าไม่ประกาศ
          มันอาจไปหยิบของที่เดาเอาเองหรือไม่เจอเลย
        */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/icon-192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
      </Head>
      <body>
        {!privateRoute && <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GOOGLE_TAG_MANAGER_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>}
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
