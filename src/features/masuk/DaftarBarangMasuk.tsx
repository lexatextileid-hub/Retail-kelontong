import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KartuRingkas, KotakFilter, PilihanChip, Sel, TabelDaftar } from '../../components/Daftar';
import { PilihPeriode, periodeDari, teksPeriode, type Periode } from '../../components/PilihPeriode';
import { distributorContoh } from '../../data/contoh';
import { daftarBarangMasuk, useToko, type FakturHutang } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { tanggalPendek } from '../kasbon/bersama';
import { DialogDetailFaktur } from '../kaslaci/HalamanKas';
import { FormFakturTunai } from '../kaslaci/FormFakturTunai';
import { ambilDistributor } from '../pesanan/bersama';
import '../../styles/masuk.css';

type FJenis = 'semua' | 'sp' | 'tanpa-sp' | 'tunai';
type FCara = 'semua' | 'cash' | 'tempo';
const namaJenis: Record<Exclude<FJenis, 'semua'>, string> = { sp: 'Dari Pesanan Toko', 'tanpa-sp': 'Tanpa SP', tunai: 'Faktur tunai' };

/** Gudang → Barang Masuk → Daftar: semua faktur yang masuk (dari Pesanan Toko, tanpa SP, faktur tunai). */
export function DaftarBarangMasuk() {
  const toko = useToko();
  const navigasi = useNavigate();
  const [params, setParams] = useSearchParams();
  const info = params.get('info');
  const [periode, setPeriode] = useState<Periode>(() => periodeDari('bulan-ini', '', { dari: '', sampai: '' }));
  const [fJenis, setFJenis] = useState<FJenis>('semua');
  const [fCara, setFCara] = useState<FCara>('semua');
  const [fDist, setFDist] = useState('');
  const [fCek, setFCek] = useState(false);
  const [cari, setCari] = useState('');
  const [detail, setDetail] = useState<FakturHutang | null>(null);
  const semua = daftarBarangMasuk(toko).filter((x) => x.tanggal >= periode.dari && x.tanggal <= periode.sampai);
  const q = cari.trim().toLowerCase();
  const tampil = semua
    .filter((x) => fJenis === 'semua' || x.jenis === fJenis)
    .filter((x) => fCara === 'semua' || x.cara === fCara)
    .filter((x) => !fDist || x.distributorId === fDist)
    .filter((x) => !fCek || x.cek.length > 0)
    .filter((x) => !q || x.nomor.toLowerCase().includes(q) || x.nomorDistributor.toLowerCase().includes(q) || ambilDistributor(x.distributorId).nama.toLowerCase().includes(q));
  const jumlah = (xs: typeof semua) => xs.reduce((t, x) => t + x.total, 0);
  const tempo = semua.filter((x) => (x.faktur?.sisa ?? 0) > 0);
  const cek = semua.filter((x) => x.cek.length > 0);
  const spTerbuka = toko.sp.filter((x) => (x.status === 'dikirim' || x.status === 'sebagian'));
  const banyak = (k: FJenis) => semua.filter((x) => k === 'semua' || x.jenis === k).length;

  return (
    <div className="ps-halaman">
      {info && <p className="catatan catatan--info" style={{ margin: 0 }}>{info} <button type="button" className="tautan" onClick={() => setParams({})}>Tutup</button></p>}
      <KartuRingkas item={[
        { judul: `Barang masuk · ${teksPeriode(periode)}`, nilai: rupiah(jumlah(semua)), catatan: `${semua.length} faktur`, aktif: fJenis === 'semua' && !fCek, onKlik: () => { setFJenis('semua'); setFCek(false); } },
        { judul: 'Tempo belum lunas', nilai: rupiah(tempo.reduce((t, x) => t + (x.faktur?.sisa ?? 0), 0)), catatan: `${tempo.length} faktur · lihat Hutang`, aktif: fCara === 'tempo', onKlik: () => setFCara(fCara === 'tempo' ? 'semua' : 'tempo') },
        { judul: 'Perlu dicek pemilik', nilai: cek.length, warna: cek.length ? 'merah' : undefined, catatan: 'selisih total / harga naik', aktif: fCek, onKlik: () => setFCek(!fCek) },
        { judul: 'Menunggu barang (SP)', nilai: spTerbuka.length, catatan: 'Surat Pesanan terkirim', onKlik: () => navigasi('../dari-sp') },
      ]} />
      <KotakFilter
        cari={{ nilai: cari, onUbah: setCari, placeholder: 'Cari no. PB, no. faktur, distributor' }}
        aksi={<div className="baris-tombol">
          <Link to="../tanpa-nota" className="tombol">Faktur tunai (tanpa nota)</Link>
          <Link to="../dari-sp" className="tombol">Dari Pesanan Toko</Link>
          <Link to="../baru" className="tombol tombol--utama">+ Barang masuk (tanpa SP)</Link>
        </div>}
        ringkas={[teksPeriode(periode), fJenis !== 'semua' && namaJenis[fJenis], fCara !== 'semua' && fCara, fDist && ambilDistributor(fDist).nama, fCek && 'perlu dicek', q && `"${cari}"`].filter(Boolean).join(' · ')}>
        <PilihPeriode awal="bulan-ini" onUbah={setPeriode} />
        <div className="rt-filter">
          <label className="isian">
            Distributor
            <select className="isian__kontrol" value={fDist} onChange={(e) => setFDist(e.target.value)}>
              <option value="">Semua distributor</option>
              {distributorContoh.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </select>
          </label>
        </div>
        <PilihanChip label="Jenis" nilai={fJenis} onUbah={setFJenis} pilihan={[
          { k: 'semua', judul: 'Semua', jumlah: banyak('semua') }, { k: 'sp', judul: 'Dari Pesanan Toko', jumlah: banyak('sp') },
          { k: 'tanpa-sp', judul: 'Tanpa SP', jumlah: banyak('tanpa-sp') }, { k: 'tunai', judul: 'Faktur tunai', jumlah: banyak('tunai') },
        ]} />
        <PilihanChip label="Pembayaran" nilai={fCara} onUbah={setFCara} pilihan={[{ k: 'semua', judul: 'Cash & tempo' }, { k: 'cash', judul: 'Cash' }, { k: 'tempo', judul: 'Tempo' }]} />
      </KotakFilter>
      <TabelDaftar
        data={tampil}
        kunci={(x) => x.id}
        onKlik={(x) => x.faktur && setDetail(x.faktur)}
        kosong={<><h2>Belum ada barang masuk</h2><p className="teks-pudar">Catat faktur saat barang datang: dari Pesanan Toko, tanpa SP (sales datang langsung), atau faktur tunai.</p></>}
        kolom={[
          { judul: 'Tanggal', isi: (x) => <Sel utama={tanggalPendek(x.tanggal)} bawah={x.oleh} /> },
          { judul: 'No.', isi: (x) => <Sel utama={<strong>{x.nomor}</strong>} bawah={`faktur ${x.nomorDistributor}`} /> },
          { judul: 'Distributor', bungkus: true, isi: (x) => ambilDistributor(x.distributorId).nama },
          { judul: 'Jenis', isi: (x) => <Sel utama={namaJenis[x.jenis]} bawah={x.jenis === 'sp' ? x.sumber : `${x.barang} barang`} /> },
          { judul: 'Bayar', isi: (x) => <span className={`chip-status ${x.cara === 'cash' ? 'chip-status--abu' : 'chip-status--biru'}`}>{x.cara === 'cash' ? 'Cash' : 'Tempo'}</span> },
          { judul: 'Total', kanan: true, isi: (x) => <strong>{rupiah(x.total)}</strong>, total: rupiah(jumlah(tampil)) },
          {
            judul: 'Status', isi: (x) => (
              <Sel utama={!x.faktur ? '-' : x.faktur.sisa === 0 ? <span className="chip-status chip-status--hijau">Lunas</span>
                : <span className="chip-status chip-status--kuning">Sisa {rupiah(x.faktur.sisa)}</span>}
                bawah={x.cek.length ? <span className="teks-bahaya">⚠ {x.cek[0]}</span> : undefined} />
            ),
          },
        ]}
      />
      {detail && <DialogDetailFaktur f={detail} onTutup={() => setDetail(null)} />}
    </div>
  );
}

/** Halaman faktur tunai di Gudang (data sama dengan Kas Laci → Belanja tanpa nota). */
export function HalamanFakturTunai() {
  const navigasi = useNavigate();
  return <FormFakturTunai onBatal={() => navigasi('../daftar')} onSelesai={(a) => navigasi(`../daftar?info=${encodeURIComponent(`Faktur tunai tersimpan, dibayar ${a.nomor}. Stok bertambah.`)}`)} />;
}
