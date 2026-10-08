import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ringkasPesanan, useToko, type StatusPesanan } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { ChipStatus, namaPelanggan, tanggalPanjang } from './bersama';
import '../../styles/pesanan.css';

const filter: { kode: string; judul: string; status: StatusPesanan[] }[] = [
  { kode: 'semua', judul: 'Semua', status: [] },
  { kode: 'tindakan', judul: 'Perlu tindakan', status: ['Perlu diorder', 'Perlu persetujuan', 'Barang siap', 'Disiapkan', 'Diserahkan sebagian'] },
  { kode: 'menunggu', judul: 'Menunggu barang', status: ['Menunggu barang'] },
  { kode: 'tempo', judul: 'Tempo', status: ['Tempo'] },
  { kode: 'selesai', judul: 'Selesai', status: ['Lunas', 'Dibatalkan'] },
];

export function DaftarPesanan() {
  const { pesanan } = useToko();
  const [f, setF] = useState('semua');
  const data = pesanan.map((p) => ({ p, r: ringkasPesanan(p) }));
  const pilih = filter.find((x) => x.kode === f)!;
  const tampil = data.filter(({ r }) => !pilih.status.length || pilih.status.includes(r.status));

  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <div className="pj__kategori" role="group" aria-label="Filter status">
          {filter.map((x) => {
            const n = x.status.length ? data.filter(({ r }) => x.status.includes(r.status)).length : data.length;
            return (
              <button key={x.kode} type="button" aria-pressed={f === x.kode} onClick={() => setF(x.kode)}>
                {x.judul} <span className="ps-hitung">{n}</span>
              </button>
            );
          })}
        </div>
        <Link to="../baru" className="tombol tombol--utama">+ Buat pesanan</Link>
      </div>

      {tampil.length === 0 ? (
        <div className="kartu ps-kosong-besar">
          <h2>Belum ada pesanan di sini</h2>
          <p className="teks-pudar">Pesanan dipakai untuk barang yang perlu diorder ke distributor dulu. Pesanan kecil yang barangnya ada cukup lewat Penjualan → Tahan.</p>
          <Link to="../baru" className="tombol tombol--utama" style={{ alignSelf: 'flex-start' }}>Buat pesanan</Link>
        </div>
      ) : (
        <div className="ps-grid">
          {tampil.map(({ p, r }) => (
            <Link key={p.id} to={`../detail/${p.id}`} className="ps-kartu">
              <span className="ps-kartu__atas">
                <span className="ps-kartu__nomor">{p.nomor}</span>
                <ChipStatus status={r.status} />
              </span>
              <strong className="ps-kartu__nama">{namaPelanggan(p.pelangganId)}</strong>
              <span className="teks-pudar">
                {p.cara === 'antar' ? 'Diantar' : 'Diambil'} · {tanggalPanjang(p.tanggalJanji)} · {p.baris.length} barang
              </span>
              <span className="ps-kartu__bawah">
                <span>{rupiah(r.total)}</span>
                {r.sisa > 0 && !p.dibatalkan && <span className="teks-pudar">sisa {rupiah(r.sisa)}</span>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
