import { Link, NavLink, Outlet } from 'react-router-dom';
import { Merek } from '../components/Merek';
import { menuOperasional } from '../navigasi';

/** Tampilan untuk kasir: menu di atas, ringkas, tanpa data sensitif (modal, laba). */
export function LayoutOperasional() {
  return (
    <div className="ops">
      <header className="ops__atas">
        <Merek sub="Operasional" />
        <nav className="ops__menu" aria-label="Menu operasional">
          {menuOperasional.map((m) => (
            <NavLink key={m.path} to={m.path}>{m.judul}</NavLink>
          ))}
        </nav>
        <div className="ops__aksi">
          <button type="button" className="tombol">Kas masuk/keluar</button>
          <button type="button" className="tombol">Tutup kasir</button>
          <Link to="/admin" className="tombol tombol--hantu">Back Office</Link>
        </div>
      </header>
      <main className="ops__isi">
        <Outlet />
      </main>
    </div>
  );
}
