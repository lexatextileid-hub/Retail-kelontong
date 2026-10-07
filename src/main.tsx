import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';
import './styles/layout.css';

/**
 * HashRouter dipakai bila halaman punya alamat biasa (http/https/file), supaya jalan di hosting statis mana pun.
 * Bila dibuka di penampil tertutup (mis. pratinjau file di aplikasi, about:srcdoc, blob:),
 * alamat tidak bisa dipakai, jadi navigasi disimpan di memori saja.
 */
function Router({ children }: { children: ReactNode }) {
  let bisaPakaiAlamat = false;
  try {
    const p = window.location.protocol;
    bisaPakaiAlamat = (p === 'http:' || p === 'https:' || p === 'file:') && Boolean(new URL('/', window.location.href));
  } catch {
    bisaPakaiAlamat = false;
  }
  return bisaPakaiAlamat ? <HashRouter>{children}</HashRouter> : <MemoryRouter initialEntries={['/kasir']}>{children}</MemoryRouter>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
