import { Link, NavLink, Outlet } from 'react-router-dom';
import { Merek } from '../components/Merek';
import { menuBackOffice } from '../navigasi';

/** Tampilan untuk pemilik/admin: data induk, pemeriksaan, laporan, pengaturan. */
export function LayoutBackOffice() {
  return (
    <div className="bo">
      <nav className="bo__samping" aria-label="Menu back office">
        <Merek sub="Back Office" />
        {menuBackOffice.map((m) => (
          <NavLink key={m.path} to={m.path}>{m.judul}</NavLink>
        ))}
        <div className="bo__samping-bawah">
          <Link to="/kasir" className="tombol tombol--putus" style={{ width: '100%' }}>Buka kasir</Link>
        </div>
      </nav>
      <main className="bo__isi">
        <Outlet />
      </main>
    </div>
  );
}
