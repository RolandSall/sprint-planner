import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { PiList } from '../features/pi-setup/PiList';
import { PiSetup } from '../features/pi-setup/PiSetup';
import { PiBoard } from '../features/pi-board/PiBoard';
import { ImportCsv } from '../features/import/ImportCsv';
import { FeatureDetail } from '../features/feature-detail/FeatureDetail';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export function App() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <nav className="bg-surface border-b border-border px-6 py-3 flex items-center gap-4 shadow-sm">
        <Link to="/" className="font-bold text-accent text-lg">PI Planner</Link>
        <div className="flex-1" />
        <ThemeToggle />
      </nav>
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<PiList />} />
          <Route path="/new" element={<PiSetup />} />
          <Route path="/pi/:piId" element={<PiBoard />} />
          <Route path="/pi/:piId/import" element={<ImportCsv />} />
          <Route path="/pi/:piId/features/:featureId" element={<FeatureDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
