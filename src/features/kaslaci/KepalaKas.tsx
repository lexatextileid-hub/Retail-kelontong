import { Link } from 'react-router-dom';
import { laciTerbuka, ringkasLaci, useToko } from '../../data/toko';
import { rupiah } from '../../lib/format';

const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

/** Bilah status laci yang sama di semua sub-menu Kas Laci. */
export function KepalaKas({ tanpaAksi = false }: { tanpaAksi?: boolean }) {
  const toko = useToko();
  const sesi = laciTerbuka(undefined, toko);
  if (!sesi) {
    return (
      <div className="kk-bilah kk-bilah--tutup">
        <span><strong>Laci belum dibuka</strong> · transaksi tunai dicatat setelah buka kasir</span>
        {!tanpaAksi && <Link to="/kasir/kas-laci/laci" className="tombol tombol--kecil tombol--utama">Buka kasir</Link>}
      </div>
    );
  }
  const r = ringkasLaci(sesi.id, toko);
  return (
    <div className="kk-bilah">
      <span className="kk-bilah__info">
        <span className="chip-status chip-status--hijau">Laci buka</span>
        <span><strong>{sesi.nomor}</strong> · {sesi.akun} · sejak {jam(sesi.dibukaIso)}</span>
      </span>
      <span className="kk-bilah__angka">
        <span>Tunai di laci <strong>{rupiah(r.seharusnya)}</strong></span>
        <span>Transfer <strong>{rupiah(r.totalTransfer)}</strong></span>
      </span>
    </div>
  );
}
