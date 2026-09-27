import { NavLink, Route, Routes } from 'react-router';
import Calculator from './pages/Calculator';
import Exercises from './pages/Exercises';
import Formulas from './pages/Formulas';
import History from './pages/History';
import Home from './pages/Home';
import Methods from './pages/Methods';
import SharedLink from './pages/SharedLink';

const LINKS = [
  ['/exercices', 'Exercices'],
  ['/methodes', 'Méthodes'],
  ['/calcul', 'Calculateurs'],
  ['/formulaire', 'Formulaire'],
  ['/historique', 'Historique'],
] as const;

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-rule bg-paper/90 backdrop-blur-[2px] print:hidden">
        <nav className="mx-auto flex max-w-4xl flex-wrap items-baseline gap-x-6 gap-y-1 px-4 py-3">
          <NavLink to="/" className="mr-auto font-serif text-xl font-semibold tracking-tight">
            Math-Exo<span className="text-pen">.</span>
          </NavLink>
          {LINKS.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `font-sans text-sm underline-offset-[6px] ${isActive ? 'text-ink underline decoration-pen decoration-2' : 'text-ink-soft hover:text-ink'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 print:max-w-none">
        {/* À l'impression : bandes haute et basse répétées sur chaque page (marges) */}
        <table className="print-frame" role="presentation">
          <thead>
            <tr>
              <td>
                <div className="spacer-top" />
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exercices" element={<Exercises />} />
          <Route path="/methodes" element={<Methods />} />
          <Route path="/calcul" element={<Calculator />} />
          <Route path="/formulaire" element={<Formulas />} />
          <Route path="/historique" element={<History />} />
          <Route path="/f" element={<SharedLink kind="sheet" />} />
          <Route path="/g" element={<SharedLink kind="config" />} />
          <Route path="*" element={<Home />} />
        </Routes>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>
                <div className="spacer-bottom" />
              </td>
            </tr>
          </tfoot>
        </table>
      </main>
      <footer className="mx-auto max-w-4xl px-4 pb-8 pt-4 font-sans text-xs text-ink-faint print:hidden">
        Les exercices sont générés dans ton navigateur ; rien n’est envoyé sur Internet.
      </footer>
    </div>
  );
}
