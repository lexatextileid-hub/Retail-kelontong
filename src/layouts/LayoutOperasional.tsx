import { Link, NavLink, Outlet } from 'react-router-dom';
import { Merek } from '../components/Merek';
import type { Menu } from '../navigasi';

/** Tampilan Operasional (Kasir atau Gudang): menu di atas, ringkas, tanpa data modal/laba. */
export function LayoutOperasional({ mode, menu }: { mode: 'Kasir' | 'Gudang'; menu: Menu[] }) {
  return (
    <div className="ops">
      <header className="ops__atas">
        <Merek sub={`Mode ${mode}`} />
        <nav className="ops__menu" aria-label={`Menu ${mode}`}>
          {menu.map((m) => (
            <NavLink key={m.path} to={m.path}>{m.judul}</NavLink>
          ))}
        </nav>
        <div className="ops__aksi">
          <span className="teks-pudar" style={{ fontSize: 13 }}>Pindah mode:</span>
          {mode !== 'Kasir' && <Link to="/kasir" className="tombol tombol--kecil">Kasir</Link>}
          {mode !== 'Gudang' && <Link to="/gudang" className="tombol tombol--kecil">Gudang</Link>}
          <Link to="/admin" className="tombol tombol--kecil">Back Office</Link>
        </div>
      </header>
      <main className="ops__isi">
        <Outlet />
      </main>
    </div>
  );
}
