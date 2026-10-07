import type { Menu } from '../navigasi';

/** Tampilan sementara untuk modul yang belum dibangun: menunjukkan apa yang akan ada di sini. */
export function RencanaModul({ menu }: { menu: Menu }) {
  return (
    <section className="rencana">
      <div>
        <span className="lencana lencana--peringatan">Belum dibangun</span>
      </div>
      <h1>{menu.judul}</h1>
      <p className="teks-pudar" style={{ margin: 0 }}>{menu.ringkasan}</p>
      <div className="kartu">
        <h2 style={{ marginBottom: 12 }}>Yang akan ada di modul ini</h2>
        <ul>
          {menu.rencana.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
