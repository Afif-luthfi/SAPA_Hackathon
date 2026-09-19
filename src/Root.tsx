import { lazy, Suspense, useEffect, useState } from 'react';
import App from './App';
const DatasetStudio = lazy(() => import('./dataset/DatasetStudio'));

export default function Root() {
  const [studio, setStudio] = useState(window.location.hash === '#dataset');
  useEffect(() => {
    const changed = () => setStudio(window.location.hash === '#dataset');
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  return studio
    ? <Suspense fallback={<main style={{ padding: 32 }}>Menyiapkan Studio Dataset…</main>}><DatasetStudio /></Suspense>
    : <App />;
}
