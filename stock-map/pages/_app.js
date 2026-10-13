import 'leaflet/dist/leaflet.css'
import '../styles/globals.css'
import { HighlightAuthProvider } from '../components/HighlightAuth';

export default function App({ Component, pageProps }) {
  return <HighlightAuthProvider><Component {...pageProps} /></HighlightAuthProvider>
}
