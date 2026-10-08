import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KartuRingkas, KotakFilter, Sel, TabelDaftar } from '../../components/Daftar';
import { produkContoh } from '../../data/contoh';
import { hariIni, infoBarang, useToko } from '../../data/toko';
import { selisihHari } from '../../domain/kasbon';
import { warnaUmur, type WarnaUmur } from '../../domain/stok';
import { rupiah } from '../../lib/format';
import { tanggalPendek } from '../kasbon/bersama';
import { ChipGerak, ChipUmur, labelDasarSaja, labelStok, namaKategori, namaUmur } from './bersama';

type F = 'semua' | Exclude<WarnaUmur, 'normal'>;

const saran: Record<Exclude<WarnaUmur, 'normal'>, string> = {
  kuning: 'Segera keluarkan: taruh depan, tawarkan, harga khusus',
  oranye: 'Mendesak: saatnya retur ke distributor',
  merah: 'Kerugian tahunan: buang lewat Barang Rusak, atau jual → pendapatan lain-lain',
};

/** Umur stok per kedatangan (FIFO): kuning 3 bln, oranye 6 bln, merah 12 bln. Hanya stok yang berumur ≥ 3 bulan. */
export function UmurStok() {
  const toko = useToko();
  const navigasi = useNavigate();
  const [f, setF] = useState<F>('semua');
  const [cari, setCari] = useState('');
  const hari = hariIni();
  // Satu baris per barang; nilai dihitung hanya dari kedatangan yang sudah berumur ≥ 3 bulan.
  const data = produkContoh.filter((p) => p.aktif).flatMap((p) => {
    const i = infoBarang(p.id, toko);
    const tua = i.lapisan.filter((l) => warnaUmur(selisihHari(l.tanggal, hari)) !== 'normal');
    if (!tua.length || !i.umur) return [];
    return [{
      p, i, warna: i.umur.warna as Exclude<WarnaUmur, 'normal'>,
      jumlah: tua.reduce((t, l) => t + l.sisa, 0), nilai: Math.round(tua.reduce((t, l) => t + l.sisa * l.modal, 0)),
    }];
  }).sort((a, b) => b.i.umur!.hari - a.i.umur!.hari);
  const q = cari.trim().toLowerCase();
  const tampil = data.filter((x) => f === 'semua' || x.warna === f).filter((x) => !q || x.p.nama.toLowerCase().includes(q) || x.p.sku.toLowerCase().includes(q));
  const per = (w: F) => data.filter((x) => w === 'semua' || x.warna === w);
  const nilai = (xs: typeof data) => xs.reduce((t, x) => t + x.nilai, 0);
  return (
    <div className="ps-halaman">
      <KartuRingkas item={(['kuning', 'oranye', 'merah'] as const).map((w) => ({
        judul: `${namaUmur[w]} · ${w}`, nilai: rupiah(nilai(per(w))), catatan: `${per(w).length} barang`, warna: w === 'merah' ? 'merah' as const : undefined,
        aktif: f === w, onKlik: () => setF(f === w ? 'semua' : w),
      })).concat([{ judul: 'Total stok berumur', nilai: rupiah(nilai(data)), catatan: `${data.length} barang`, warna: undefined, aktif: f === 'semua', onKlik: () => setF('semua') }])} />
      <KotakFilter cari={{ nilai: cari, onUbah: setCari, placeholder: 'Cari barang' }} ringkas={f === 'semua' ? 'semua umur' : namaUmur[f]} />
      <TabelDaftar
        data={tampil}
        kunci={(x) => x.p.id}
        onKlik={(x) => navigasi(`../detail/${x.p.id}`)}
        kosong={<><h2>Tidak ada stok berumur</h2><p className="teks-pudar">Semua stok masuk kurang dari 3 bulan lalu.</p></>}
        kolom={[
          { judul: 'Barang', bungkus: true, isi: (x) => <Sel utama={<strong>{x.p.nama}</strong>} bawah={`${x.p.sku} · ${namaKategori(x.p.kategoriId)}`} /> },
          { judul: 'Umur', isi: (x) => <Sel utama={<ChipUmur warna={x.warna} hari={x.i.umur!.hari} />} bawah={`masuk ${tanggalPendek(x.i.umur!.tanggal)}`} /> },
          { judul: 'Stok berumur', kanan: true, isi: (x) => <Sel utama={labelDasarSaja(x.p, x.jumlah)} bawah={`dari ${labelStok(x.p, x.i.stok)}`} /> },
          { judul: 'Gerak', isi: (x) => <ChipGerak status={x.i.status} /> },
          { judul: 'Saran', bungkus: true, isi: (x) => saran[x.warna] },
          { judul: 'Nilai', kanan: true, isi: (x) => rupiah(x.nilai), total: rupiah(nilai(tampil)) },
        ]}
      />
    </div>
  );
}
