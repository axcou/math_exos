import { NavLink, Route, Routes } from 'react-router';
import Exercises from './pages/Exercises';
import Formulas from './pages/Formulas';
import History from './pages/History';
import Home from './pages/Home';
import SharedLink from './pages/SharedLink';

const LINKS = [
  ['/', 'Accueil'],
  ['/exercices', 'Exercices'],
  ['/formulaire', 'Formulaire'],
  ['/historique', 'Historique'],
] as const;

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 print:hidden">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-2">
          <NavLink to="/" className="mr-4 flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-serif italic text-white">f'</span>
            Math-Exo
          </NavLink>
          {LINKS.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exercices" element={<Exercises />} />
          <Route path="/formulaire" element={<Formulas />} />
          <Route path="/historique" element={<History />} />
          <Route path="/f" element={<SharedLink kind="sheet" />} />
          <Route path="/g" element={<SharedLink kind="config" />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer className="py-6 text-center text-xs text-slate-400 print:hidden">Math-Exo — exercices générés dans ton navigateur, rien n’est envoyé sur Internet.</footer>
    </div>
  );
}
