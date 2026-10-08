import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Ikon } from '../components/Ikon';
import { daftarMode, type Menu, type NamaMode } from '../navigasi';

const KUNCI_CIUT = 'rk-menu-ciut';

function bacaCiut(): boolean {
  try {
    return window.localStorage.getItem(KUNCI_CIUT) === '1';
  } catch {
    return false;
  }
}

function simpanCiut(v: boolean) {
  try {
    window.localStorage.setItem(KUNCI_CIUT, v ? '1' : '0');
  } catch {
    /* penyimpanan tidak tersedia: abaikan */
  }
}

function tanggalHariIni() {
  return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Kerangka semua mode.
 * Tablet/komputer: menu samping (bisa diciutkan dari tombol ☰ di bilah judul).
 * HP: menu utama di bawah, sisanya di "Lainnya"; tombol ☰ membuka semua menu.
 * Bilah judul di atas menampilkan nama halaman yang sedang dibuka.
 */
export function LayoutAplikasi({ mode }: { mode: NamaMode }) {
  const { pathname } = useLocation();
  const [ciut, setCiut] = useState(bacaCiut);
  const [laci, setLaci] = useState(false);
  const aktif = daftarMode.find((m) => m.kode === mode)!;

  useEffect(() => setLaci(false), [pathname]);

  const menuAktif = aktif.menu.find((m) => pathname.startsWith(`/${mode}/${m.path}`));
  const subAktif = menuAktif?.anak?.find((a) => pathname.startsWith(`/${mode}/${menuAktif.path}/${a.path}`));

  const ubahCiut = () => {
    // Di HP, tombol ☰ membuka laci menu; di layar lebar, menciutkan menu samping.
    if (window.matchMedia('(max-width: 860px)').matches) {
      setLaci(true);
      return;
    }
    setCiut((c) => {
      simpanCiut(!c);
      return !c;
    });
  };

  const isiMenu = (paksaLebar: boolean) => {
    const sempit = ciut && !paksaLebar;
    return (
      <>
        <div className="samping__merek">
          <div className="merek__logo" aria-hidden="true">TK</div>
          {!sempit && (
            <div>
              <div className="merek__nama">[Nama Toko]</div>
              <div className="merek__sub">Mode {aktif.judul}</div>
            </div>
          )}
        </div>

        {!sempit ? (
          <div className="samping__mode" role="group" aria-label="Pilih mode">
            {daftarMode.map((m) => (
              <NavLink key={m.kode} to={`/${m.kode}`} className={() => (m.kode === mode ? 'aktif' : '')}>
                {m.judul}
              </NavLink>
            ))}
          </div>
        ) : (
          <div className="samping__mode-ciut" title={`Mode ${aktif.judul}`}>{aktif.judul.slice(0, 1)}</div>
        )}

        <nav className="samping__menu" aria-label={`Menu ${aktif.judul}`}>
          {aktif.menu.map((m) => (
            <ItemMenu key={m.path} mode={mode} menu={m} ciut={sempit} pathname={pathname} />
          ))}
        </nav>
      </>
    );
  };

  const utamaHp = aktif.menu.slice(0, 4);

  return (
    <div className={ciut ? 'app app--ciut' : 'app'}>
      <aside className="samping">{isiMenu(false)}</aside>

      <div className="app__kanan">
        <header className="kepala">
          <button
            type="button"
            className="kepala__tombol"
            onClick={ubahCiut}
            aria-label={ciut ? 'Lebarkan menu' : 'Ciutkan menu'}
            title={ciut ? 'Lebarkan menu' : 'Ciutkan menu'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="kepala__judul">
            {menuAktif && <Ikon nama={menuAktif.ikon} />}
            <h1>{menuAktif?.judul ?? aktif.judul}</h1>
            {subAktif && (
              <>
                <span className="kepala__pemisah" aria-hidden="true">/</span>
                <span className="kepala__sub">{subAktif.judul}</span>
              </>
            )}
          </div>
          <div className="kepala__kanan">
            <span className="kepala__tanggal">{tanggalHariIni()}</span>
            <span className="kepala__pengguna">
              <span className="kepala__avatar" aria-hidden="true">K</span>
              <span>[Nama Kasir]</span>
            </span>
          </div>
        </header>

        <main className="app__isi">
          <Outlet />
        </main>
      </div>

      <nav className="bawah" aria-label="Menu utama">
        {utamaHp.map((m) => (
          <NavLink key={m.path} to={`/${mode}/${m.path}`} className="bawah__item">
            <Ikon nama={m.ikon} />
            <span>{m.judul}</span>
          </NavLink>
        ))}
        <button type="button" className="bawah__item" onClick={() => setLaci(true)}>
          <Ikon nama="lainnya" />
          <span>Lainnya</span>
        </button>
      </nav>

      {laci && (
        <div className="laci-latar" onMouseDown={(e) => e.target === e.currentTarget && setLaci(false)}>
          <aside className="laci" aria-label="Semua menu">{isiMenu(true)}</aside>
        </div>
      )}
    </div>
  );
}

function ItemMenu({ mode, menu, ciut, pathname }: { mode: NamaMode; menu: Menu; ciut: boolean; pathname: string }) {
  const dasar = `/${mode}/${menu.path}`;
  const terbuka = pathname.startsWith(dasar);
  return (
    <div className="samping__grup">
      <NavLink to={dasar} className="samping__item" title={ciut ? menu.judul : undefined}>
        <Ikon nama={menu.ikon} />
        {!ciut && <span>{menu.judul}</span>}
      </NavLink>
      {!ciut && terbuka && menu.anak && (
        <div className="samping__anak">
          {menu.anak.map((a) => (
            <NavLink key={a.path} to={`${dasar}/${a.path}`}>{a.judul}</NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
