import { lazy, Suspense, useEffect, useState } from 'react';
import App from './App';
const DatasetStudio = lazy(() => import('./dataset/DatasetStudio'));
const ResearchDemo = lazy(() => import('./bisindo/ResearchDemo'));

export default function Root() {
  const [route, setRoute] = useState(window.location.hash);
  useEffect(() => {
    const changed = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  if(route === '#bisindo') return <Suspense fallback={<main style={{padding:32}}>Memuat demo riset…</main>}><ResearchDemo /></Suspense>;
  return route === '#dataset'
    ? <Suspense fallback={<main style={{ padding: 32 }}>Menyiapkan Studio Dataset…</main>}><DatasetStudio /></Suspense>
    : <App />;
}
