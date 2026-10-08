import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KartuRingkas, KotakFilter, PilihanChip, Sel, TabelDaftar } from '../../components/Daftar';
import { produkContoh } from '../../data/contoh';
import { infoBarang, useToko, type InfoBarang } from '../../data/toko';
import type { StatusGerak, WarnaUmur } from '../../domain/stok';
import type { Produk } from '../../domain/tipe';
import { rupiah } from '../../lib/format';
import { ChipGerak, ChipUmur, hargaJualTingkat, labelDasarSaja, labelStok, namaKategori, satuanBeli, teksPersen } from './bersama';

type FGerak = 'semua' | StatusGerak;
type FKondisi = 'semua' | 'menipis' | 'habis' | 'minus';
type FUmur = 'semua' | 'kuning' | 'oranye' | 'merah';
type Urut = 'nama' | 'cukup' | 'nilai' | 'umur';

const urutanUmur: Record<WarnaUmur, number> = { normal: 0, kuning: 1, oranye: 2, merah: 3 };
const kondisiDari = (p: Produk, i: InfoBarang): FKondisi =>
  i.stok < 0 ? 'minus' : i.stok === 0 ? 'habis' : i.stok <= p.stokMinimum ? 'menipis' : 'semua';

/** Gudang → Stok Barang → Daftar Barang. Pemilik & admin melihat semua kolom (termasuk modal dan untung). */
export function DaftarBarang() {
  const toko = useToko();
  const navigasi = useNavigate();
  const [cari, setCari] = useState('');
  const [fKat, setFKat] = useState('');
  const [fGerak, setFGerak] = useState<FGerak>('semua');
  const [fKondisi, setFKondisi] = useState<FKondisi>('semua');
  const [fUmur, setFUmur] = useState<FUmur>('semua');
  const [urut, setUrut] = useState<Urut>('nama');
  const [nonaktif, setNonaktif] = useState(false);
  void toko.versiProduk;

  const semua = produkContoh.filter((p) => p.aktif !== nonaktif).map((p) => ({ p, i: infoBarang(p.id, toko) }));
  const q = cari.trim().toLowerCase();
  const tampil = semua
    .filter(({ p }) => !q || p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.kode ?? '').toLowerCase().includes(q))
    .filter(({ p }) => !fKat || p.kategoriId === fKat)
    .filter(({ i }) => fGerak === 'semua' || i.status === fGerak)
    .filter(({ p, i }) => {
      const k = kondisiDari(p, i);
      return fKondisi === 'semua' || (fKondisi === 'menipis' ? k !== 'semua' : fKondisi === 'habis' ? k === 'habis' || k === 'minus' : k === fKondisi);
    })
    .filter(({ i }) => fUmur === 'semua' || (i.umur && urutanUmur[i.umur.warna] >= urutanUmur[fUmur]))
    .sort((a, b) =>
      urut === 'cukup' ? (a.i.cukupHari ?? 9999) - (b.i.cukupHari ?? 9999)
      : urut === 'nilai' ? b.i.nilai - a.i.nilai
      : urut === 'umur' ? (b.i.umur?.hari ?? -1) - (a.i.umur?.hari ?? -1)
      : a.p.nama.localeCompare(b.p.nama));

  const menipis = semua.filter(({ p, i }) => kondisiDari(p, i) === 'menipis');
  const habis = semua.filter(({ p, i }) => kondisiDari(p, i) === 'habis' || kondisiDari(p, i) === 'minus');
  const berhenti = semua.filter(({ i }) => i.status === 'berhenti');
  const total = (xs: typeof semua) => xs.reduce((t, x) => t + x.i.nilai, 0);
  const kategoriAda = [...new Set(semua.map(({ p }) => p.kategoriId))];
  const banyakGerak = (k: FGerak) => semua.filter(({ i }) => k === 'semua' || i.status === k).length;

  return (
    <div className="ps-halaman">
      <KartuRingkas item={[
        { judul: 'Barang aktif', nilai: semua.length, catatan: `nilai stok ${rupiah(total(semua))}`, aktif: fKondisi === 'semua' && fGerak === 'semua', onKlik: () => { setFKondisi('semua'); setFGerak('semua'); } },
        { judul: 'Stok menipis', nilai: menipis.length, catatan: 'di bawah stok minimum', aktif: fKondisi === 'menipis', onKlik: () => setFKondisi(fKondisi === 'menipis' ? 'semua' : 'menipis') },
        { judul: 'Habis / minus', nilai: habis.length, warna: habis.length ? 'merah' : undefined, catatan: 'minus = perlu diselidiki', aktif: fKondisi === 'habis', onKlik: () => setFKondisi(fKondisi === 'habis' ? 'semua' : 'habis') },
        { judul: 'Barang berhenti', nilai: berhenti.length, catatan: `stok mengendap ${rupiah(total(berhenti))}`, aktif: fGerak === 'berhenti', onKlik: () => setFGerak(fGerak === 'berhenti' ? 'semua' : 'berhenti') },
      ]} />
      <KotakFilter
        cari={{ nilai: cari, onUbah: setCari, placeholder: 'Cari nama, SKU, kode' }}
        aksi={<Link to="../tambah" className="tombol tombol--utama">+ Tambah barang</Link>}
        ringkas={[nonaktif && 'nonaktif', fKat ? namaKategori(fKat) : 'semua kategori', fGerak !== 'semua' && fGerak, fKondisi !== 'semua' && fKondisi, fUmur !== 'semua' && `umur ${fUmur}+`, q && `"${cari}"`].filter(Boolean).join(' · ')}>
        <div className="rt-filter">
          <label className="isian">
            Kategori
            <select className="isian__kontrol" value={fKat} onChange={(e) => setFKat(e.target.value)}>
              <option value="">Semua kategori</option>
              {kategoriAda.map((k) => <option key={k} value={k}>{namaKategori(k)}</option>)}
            </select>
          </label>
          <label className="isian">
            Urutkan
            <select className="isian__kontrol" value={urut} onChange={(e) => setUrut(e.target.value as Urut)}>
              <option value="nama">Nama A–Z</option>
              <option value="cukup">Stok paling cepat habis</option>
              <option value="nilai">Nilai stok terbesar</option>
              <option value="umur">Umur stok tertua</option>
            </select>
          </label>
          <label className="isian sb-cek" style={{ justifyContent: 'flex-end' }}>
            <span><input type="checkbox" checked={nonaktif} onChange={(e) => setNonaktif(e.target.checked)} /> Tampilkan barang nonaktif</span>
          </label>
        </div>
        <PilihanChip label="Status gerak" nilai={fGerak} onUbah={setFGerak} pilihan={[
          { k: 'semua', judul: 'Semua gerak', jumlah: banyakGerak('semua') }, { k: 'laku', judul: 'Laku', jumlah: banyakGerak('laku') },
          { k: 'lambat', judul: 'Lambat', jumlah: banyakGerak('lambat') }, { k: 'berhenti', judul: 'Berhenti', jumlah: banyakGerak('berhenti') },
          { k: 'baru', judul: 'Baru', jumlah: banyakGerak('baru') }, { k: 'musiman', judul: 'Musiman', jumlah: banyakGerak('musiman') },
        ]} />
        <PilihanChip label="Kondisi stok" nilai={fKondisi} onUbah={setFKondisi} pilihan={[
          { k: 'semua', judul: 'Semua stok' }, { k: 'menipis', judul: 'Menipis & habis', jumlah: menipis.length + habis.length },
          { k: 'habis', judul: 'Habis' }, { k: 'minus', judul: 'Minus' },
        ]} />
        <PilihanChip label="Umur stok" nilai={fUmur} onUbah={setFUmur} pilihan={[
          { k: 'semua', judul: 'Semua umur' }, { k: 'kuning', judul: '≥ 3 bulan' }, { k: 'oranye', judul: '≥ 6 bulan' }, { k: 'merah', judul: '≥ 12 bulan' },
        ]} />
      </KotakFilter>
      <TabelDaftar
        data={tampil}
        kunci={({ p }) => p.id}
        onKlik={({ p }) => navigasi(`../detail/${p.id}`)}
        kosong={<><h2>Tidak ada barang</h2><p className="teks-pudar">Ubah pencarian atau filter.</p></>}
        labelTotal={`Total · ${tampil.length} barang`}
        kolom={[
          { judul: 'Barang', bungkus: true, isi: ({ p }) => <Sel utama={<strong>{p.nama}</strong>} bawah={`${p.sku} · ${namaKategori(p.kategoriId)}`} /> },
          {
            judul: 'Stok', isi: ({ p, i }) => (
              <Sel utama={<strong className={i.stok < 0 ? 'teks-bahaya' : i.stok <= p.stokMinimum ? 'sb-tipis' : undefined}>{labelStok(p, i.stok)}</strong>}
                bawah={`${labelDasarSaja(p, i.stok)}${i.terkunci ? ` · ${labelDasarSaja(p, i.terkunci)} dipesan` : ''}`} />
            ),
          },
          { judul: 'Cukup untuk', isi: ({ i }) => <Sel utama={i.cukupHari === undefined ? '-' : `± ${i.cukupHari} hari`} bawah={i.rataHarian ? `${(Math.round(i.rataHarian * 10) / 10).toLocaleString('id-ID')}/hari` : 'tidak terjual 30 hr'} /> },
          { judul: 'Gerak · umur', isi: ({ i }) => (
            <div className="sb-gerak">
              <span><ChipGerak status={i.status} /> <span className="teks-pudar" style={{ fontSize: 12 }}>{i.mingguTerjual}/13 mgg</span></span>
              {i.umur && <ChipUmur warna={i.umur.warna} hari={i.umur.hari} />}
            </div>
          ) },
          {
            judul: 'Harga jual · untung*', isi: ({ p, i }) => {
              const h = hargaJualTingkat(p, i.beliAcuan, i.beliPerSatuan);
              return (
                <div className="sb-harga">
                  {h.slice(0, 3).map((x) => (
                    <div key={x.judul}><span className="teks-pudar">{x.judul}</span> <strong>{rupiah(x.harga)}</strong> <span className={x.untungPersen !== undefined && x.untungPersen < 5 ? 'teks-bahaya' : 'sb-untung'}>{teksPersen(x.untungPersen)}</span></div>
                  ))}
                  {h.length > 3 && <span className="chip-status chip-status--abu">+{h.length - 3}</span>}
                </div>
              );
            },
          },
          {
            judul: 'Nilai · beli terakhir', kanan: true, isi: ({ p, i }) => {
              const sb = satuanBeli(p);
              return (
                <Sel utama={<strong>{rupiah(i.nilai)}</strong>}
                  bawah={i.beliTerakhir ? <>beli {rupiah(i.beliTerakhir.modal * sb.isi)}<br />per {sb.label}</> : i.modal ? `modal ${rupiah(i.modal)}` : undefined} />
              );
            },
            total: rupiah(total(tampil)),
          },
        ]}
      />
      <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>* Untung dihitung dari harga beli terakhir. Laporan laba memakai modal FIFO.</p>
    </div>
  );
}
