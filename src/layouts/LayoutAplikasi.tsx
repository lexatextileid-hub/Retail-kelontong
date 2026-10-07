import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Ikon } from '../components/Ikon';
import { daftarMode, type Menu, type NamaMode } from '../navigasi';

/**
 * Kerangka semua mode. Tablet/komputer: menu di samping kiri (bisa diciutkan jadi ikon),
 * sub-menu muncul di bawah menu yang aktif. HP: menu utama di bawah, sisanya di "Lainnya".
 */
export function LayoutAplikasi({ mode }: { mode: NamaMode }) {
  const { pathname } = useLocation();
  const [ciut, setCiut] = useState(false);
  const [laci, setLaci] = useState(false);
  const aktif = daftarMode.find((m) => m.kode === mode)!;

  useEffect(() => setLaci(false), [pathname]);

  const isiMenu = (paksaLebar: boolean) => (
    <>
      <div className="samping__merek">
        <div className="merek__logo" aria-hidden="true">TK</div>
        {(!ciut || paksaLebar) && (
          <div>
            <div className="merek__nama">[Nama Toko]</div>
            <div className="merek__sub">[Nama Kasir] · Mode {aktif.judul}</div>
          </div>
        )}
      </div>

      {(!ciut || paksaLebar) ? (
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
          <ItemMenu key={m.path} mode={mode} menu={m} ciut={ciut && !paksaLebar} pathname={pathname} />
        ))}
      </nav>

      {!paksaLebar && (
        <button type="button" className="samping__ciut" onClick={() => setCiut((c) => !c)} aria-label={ciut ? 'Lebarkan menu' : 'Ciutkan menu'}>
          <Ikon nama={ciut ? 'lebar' : 'ciut'} />
          {!ciut && <span>Ciutkan</span>}
        </button>
      )}
    </>
  );

  const utamaHp = aktif.menu.slice(0, 4);

  return (
    <div className={ciut ? 'app app--ciut' : 'app'}>
      <aside className="samping">{isiMenu(false)}</aside>

      <main className="app__isi">
        <Outlet />
      </main>

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
