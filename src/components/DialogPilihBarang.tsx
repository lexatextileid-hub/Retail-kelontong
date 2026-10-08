import { useState } from 'react';
import { Dialog } from './Dialog';
import { produkContoh } from '../data/contoh';
import { stokBebas } from '../data/toko';
import type { Produk } from '../domain/tipe';
import { labelDasar } from '../features/pesanan/bersama';

/** Cari dan pilih satu barang (lalu biasanya dilanjutkan ke DialogAturBarang). */
export function DialogPilihBarang({ onPilih, onTutup, judul = 'Tambah barang' }: { onPilih: (p: Produk) => void; onTutup: () => void; judul?: string }) {
  const [cari, setCari] = useState('');
  const q = cari.trim().toLowerCase();
  const hasil = (q
    ? produkContoh.filter((p) => p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.kode ?? '').toLowerCase().includes(q))
    : produkContoh
  ).slice(0, 30);
  return (
    <Dialog judul={judul} onTutup={onTutup} lebar={520}>
      <label className="pj__cari-kotak">
        <span className="sr">Cari barang</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama, SKU, kode" autoComplete="off" autoFocus />
      </label>
      <ul className="ps-hasil">
        {hasil.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPilih(p)}>
              <span>{p.nama}</span>
              <span className="teks-pudar">{p.sku} · stok bebas {labelDasar(p.id, Math.max(0, stokBebas(p.id)))}</span>
            </button>
          </li>
        ))}
      </ul>
      {hasil.length === 0 && <p className="teks-pudar" style={{ margin: 0 }}>Barang tidak ditemukan.</p>}
    </Dialog>
  );
}

