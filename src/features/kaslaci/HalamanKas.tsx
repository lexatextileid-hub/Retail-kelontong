import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { InputRupiah } from '../../components/InputRupiah';
import { PilihPeriode, periodeDari, teksPeriode, type Periode } from '../../components/PilihPeriode';
import { Dialog } from '../../components/Dialog';
import { bankContoh, distributorContoh, PIN_PEMILIK_CONTOH } from '../../data/contoh';
import { KartuRingkas, KotakFilter, PilihanChip, Sel, TabelDaftar } from '../../components/Daftar';
import { KATEGORI_PENGELUARAN, akunAktif, catatArus, daftarFaktur, hariIni, laciTerbuka, nomorArus, ringkasLaci, useToko, type ArusKas, type FakturHutang } from '../../data/toko';
import { isoHari, selisihHari, tambahHari } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { tanggalPendek } from '../kasbon/bersama';
import { ambilDistributor } from '../pesanan/bersama';
import { DialogBuktiKasKeluar, DialogLaporanHarian } from './DialogLaci';
import { KepalaKas } from './KepalaKas';
import { FormFakturTunai } from './FormFakturTunai';
import { useSumberDana } from '../../components/PilihSumberDana';
import '../../styles/pesanan.css';
import '../../styles/penjualan.css';
import '../../styles/kasbon.css';

const uangLaci = (toko: ReturnType<typeof useToko>) => { const l = laciTerbuka(undefined, toko); return l ? ringkasLaci(l.id, toko).seharusnya : 0; };
const waktu = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const diPeriode = (iso: string, p: Periode) => { const t = isoHari(new Date(iso)); return t >= p.dari && t <= p.sampai; };

/**
 * Pengeluaran (mode akuntansi, seperti "Pembayaran / Kas Keluar" di Accurate):
 * daftar bukti kas keluar + formulir dengan beberapa baris rincian (kategori, keterangan, jumlah).
 * Kasir melihat pengeluarannya sendiri; pemilik melihat semua.
 */
export function Pengeluaran() {
  const toko = useToko();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(!!params.get('baru'));
  const [periode, setPeriode] = useState<Periode>(() => periodeDari('7-hari', '', { dari: '', sampai: '' }));
  const [fKat, setFKat] = useState('');
  const [fSumber, setFSumber] = useState<'semua' | ArusKas['sumber']>('semua');
  const [cari, setCari] = useState('');
  const [d, setD] = useState<ArusKas | null>(null);
  const semua = toko.peran === 'pemilik';

  if (form) {
    return <FormPengeluaran onBatal={() => { setForm(false); setParams({}); }} onSelesai={(a) => { setForm(false); setParams({}); setD(a); }} />;
  }

  const q = cari.trim().toLowerCase();
  const katDari = (a: ArusKas) => (a.rincian ?? [{ kategori: a.kategori ?? '-', keterangan: a.keterangan, jumlah: Math.abs(a.tunai + a.transfer) }]);
  const dasar = toko.arus
    .filter((a) => a.jenis === 'pengeluaran' && (semua || a.akun === akunAktif(toko)) && diPeriode(a.waktuIso, periode));
  const daftar = dasar
    .filter((a) => fSumber === 'semua' || a.sumber === fSumber)
    .filter((a) => !fKat || katDari(a).some((x) => x.kategori === fKat))
    .filter((a) => !q || a.nomor.toLowerCase().includes(q) || (a.penerima ?? '').toLowerCase().includes(q) || (a.referensi ?? '').toLowerCase().includes(q)
      || katDari(a).some((x) => x.keterangan.toLowerCase().includes(q)))
    .sort((a, b) => b.waktuIso.localeCompare(a.waktuIso));
  const nilai = (a: ArusKas) => Math.abs(a.tunai + a.transfer);
  const jumlah = (xs: ArusKas[]) => xs.reduce((t, a) => t + nilai(a), 0);
  const perKat = new Map<string, number>();
  daftar.forEach((a) => katDari(a).forEach((x) => perKat.set(x.kategori, (perKat.get(x.kategori) ?? 0) + x.jumlah)));
  const namaSumber = (a: ArusKas) => (a.sumber === 'laci' ? 'Laci kasir' : a.sumber === 'brankas' ? 'Brankas' : `Rekening${a.bank ? ` ${a.bank}` : ''}`);
  const banyak = (k: 'semua' | ArusKas['sumber']) => dasar.filter((a) => k === 'semua' || a.sumber === k).length;

  return (
    <div className="ps-halaman">
      <KepalaKas />
      <KartuRingkas item={[
        { judul: `Pengeluaran · ${teksPeriode(periode)}`, nilai: rupiah(jumlah(dasar)), catatan: `${dasar.length} bukti${semua ? ' · semua akun' : ''}`, aktif: fSumber === 'semua', onKlik: () => setFSumber('semua') },
        { judul: 'Dari laci kasir', nilai: rupiah(jumlah(dasar.filter((a) => a.sumber === 'laci'))), catatan: 'tunai', aktif: fSumber === 'laci', onKlik: () => setFSumber('laci') },
        { judul: 'Dari brankas', nilai: rupiah(jumlah(dasar.filter((a) => a.sumber === 'brankas'))), catatan: 'tunai, PIN pemilik', aktif: fSumber === 'brankas', onKlik: () => setFSumber('brankas') },
        { judul: 'Dari rekening', nilai: rupiah(jumlah(dasar.filter((a) => a.sumber === 'bank'))), catatan: 'transfer, PIN pemilik', aktif: fSumber === 'bank', onKlik: () => setFSumber('bank') },
      ]} />
      <KotakFilter cari={{ nilai: cari, onUbah: setCari, placeholder: 'Cari no. bukti, penerima, referensi' }} aksi={<button type="button" className="tombol tombol--utama" onClick={() => setForm(true)}>+ Pengeluaran baru</button>}
        ringkas={[teksPeriode(periode), fKat || 'semua kategori', fSumber === 'semua' ? 'semua sumber' : fSumber === 'bank' ? 'rekening' : fSumber, q && `"${cari}"`].filter(Boolean).join(' · ')}>
        <PilihPeriode awal="7-hari" onUbah={setPeriode} />
        <div className="rt-filter">
          <label className="isian">
            Kategori
            <select className="isian__kontrol" value={fKat} onChange={(e) => setFKat(e.target.value)}>
              <option value="">Semua kategori</option>
              {KATEGORI_PENGELUARAN.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
        </div>
        <PilihanChip label="Sumber dana" nilai={fSumber} onUbah={setFSumber} pilihan={[
          { k: 'semua', judul: 'Semua sumber', jumlah: banyak('semua') }, { k: 'laci', judul: 'Laci kasir', jumlah: banyak('laci') },
          { k: 'brankas', judul: 'Brankas', jumlah: banyak('brankas') }, { k: 'bank', judul: 'Rekening', jumlah: banyak('bank') },
        ]} />
        {perKat.size > 0 && (
          <div className="lc-bagi-lihat">
            {[...perKat].sort((a, b) => b[1] - a[1]).map(([k, v]) => <span key={k}>{k} <strong>{rupiah(v)}</strong></span>)}
          </div>
        )}
      </KotakFilter>
      <TabelDaftar
        data={daftar}
        kunci={(a) => a.id}
        onKlik={setD}
        kosong={<><h2>Tidak ada pengeluaran</h2><p className="teks-pudar">Tidak ada bukti kas keluar untuk filter ini.</p></>}
        kolom={[
          { judul: 'No. bukti', isi: (a) => <Sel utama={<strong>{a.nomor}</strong>} bawah={waktu(a.waktuIso)} /> },
          { judul: 'Penerima', isi: (a) => <Sel utama={a.penerima} bawah={a.referensi ? `ref. ${a.referensi}` : undefined} /> },
          { judul: 'Kategori', isi: (a) => [...new Set(katDari(a).map((x) => x.kategori))].join(', ') },
          { judul: 'Keterangan', bungkus: true, isi: (a) => katDari(a).map((x) => x.keterangan).join('; ') },
          { judul: 'Dibayar dari', isi: (a) => namaSumber(a) },
          { judul: 'Total', kanan: true, isi: (a) => <strong>{rupiah(nilai(a))}</strong>, total: rupiah(jumlah(daftar)) },
          { judul: 'Oleh', isi: (a) => a.akun },
        ]}
      />
      {d && <DialogBuktiKasKeluar a={d} onTutup={() => setD(null)} />}
    </div>
  );
}

/**
 * Formulir bukti kas keluar (pola Expense QuickBooks / Biaya Majoo):
 * kepala — tanggal, no. bukti, dibayar dari (laci / brankas / rekening), penerima, no. referensi, memo;
 * rincian — kategori, keterangan, jumlah (beberapa baris); potongan; total; lampiran.
 */
function FormPengeluaran({ onBatal, onSelesai }: { onBatal: () => void; onSelesai: (a: ArusKas) => void }) {
  const toko = useToko();
  const laci = laciTerbuka(undefined, toko);
  const uang = uangLaci(toko);
  const kosong = () => ({ id: Math.random().toString(36).slice(2), kategori: '', keterangan: '', jumlah: 0 });
  const [baris, setBaris] = useState([kosong()]);
  const [sumber, setSumber] = useState<ArusKas['sumber']>(laci ? 'laci' : 'brankas');
  const [bank, setBank] = useState('');
  const [penerima, setPenerima] = useState('');
  const [referensi, setReferensi] = useState('');
  const [memo, setMemo] = useState('');
  const [potongan, setPotongan] = useState(0);
  const [pin, setPin] = useState('');
  const ubah = (id: string, patch: Partial<ReturnType<typeof kosong>>) => setBaris((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const isi = baris.filter((x) => x.jumlah > 0);
  const subtotal = isi.reduce((t, x) => t + x.jumlah, 0);
  const total = Math.max(0, subtotal - potongan);
  const lengkap = isi.length > 0 && isi.every((x) => x.kategori && x.keterangan.trim());
  const lebih = sumber === 'laci' && total > uang;
  const perluPin = sumber !== 'laci' && toko.peran !== 'pemilik';
  const siap = lengkap && !!penerima.trim() && !lebih && total > 0 && (sumber !== 'laci' || !!laci) && (sumber !== 'bank' || !!bank)
    && (!perluPin || pin === PIN_PEMILIK_CONTOH) && potongan <= subtotal;
  const simpan = () => {
    if (!siap) return;
    const rincian = isi.map((x) => ({ kategori: x.kategori, keterangan: x.keterangan.trim(), jumlah: x.jumlah }));
    onSelesai(catatArus({
      jenis: 'pengeluaran', nomor: nomorArus('KK'), sumber, bank: sumber === 'bank' ? bank : undefined,
      tunai: sumber === 'bank' ? 0 : -total, transfer: sumber === 'bank' ? -total : 0,
      penerima: penerima.trim(), referensi: referensi.trim() || undefined, memo: memo.trim() || undefined, potongan: potongan || undefined,
      kategori: rincian.length === 1 ? rincian[0].kategori : 'Beberapa kategori', keterangan: rincian.map((x) => x.keterangan).join('; '), rincian,
    }));
  };
  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <h2 style={{ margin: 0 }}>Bukti kas keluar</h2>
        <button type="button" className="tautan" onClick={onBatal}>← Kembali ke daftar</button>
      </div>
      <div className="kartu bd-kepala">
        <label className="isian">Tanggal<input className="isian__kontrol" value={tanggalPendek(hariIni())} readOnly /></label>
        <label className="isian">No. bukti<input className="isian__kontrol" value="KK-… (otomatis)" readOnly /></label>
        <label className="isian">
          Nama penerima (wajib)
          <input className="isian__kontrol" value={penerima} onChange={(e) => setPenerima(e.target.value)} placeholder="mis. Pak Udin (kuli), PLN" />
        </label>
        <label className="isian">
          No. referensi (opsional)
          <input className="isian__kontrol" value={referensi} onChange={(e) => setReferensi(e.target.value)} placeholder="no. nota / kuitansi penerima" />
        </label>
        <div className="isian bd-kepala__lebar">
          Dibayar dari
          <div className="kb-cepat kk-sumber" role="group" aria-label="Dibayar dari">
            <button type="button" className="tombol" disabled={!laci} aria-pressed={sumber === 'laci'} onClick={() => setSumber('laci')}>Laci kasir{laci ? ` · ${rupiah(uang)}` : ' (belum dibuka)'}</button>
            <button type="button" className="tombol" aria-pressed={sumber === 'brankas'} onClick={() => setSumber('brankas')}>Brankas</button>
            <button type="button" className="tombol" aria-pressed={sumber === 'bank'} onClick={() => setSumber('bank')}>Rekening (transfer)</button>
          </div>
          <span className="isian__bantuan">
            {sumber === 'laci' ? 'Tunai dari laci kasir; mengurangi uang di laci.' : sumber === 'brankas' ? 'Tunai dari brankas pemilik. Perlu PIN pemilik.' : 'Transfer dari rekening toko. Perlu PIN pemilik.'}
          </span>
        </div>
        {sumber === 'bank' && (
          <div className="isian bd-kepala__lebar">
            Rekening
            <div className="kb-cepat">
              {bankContoh.map((x) => <button key={x} type="button" className="tombol tombol--kecil" aria-pressed={bank === x} onClick={() => setBank(x)}>{x}</button>)}
            </div>
          </div>
        )}
      </div>

      <div className="kartu bd-tabel-kartu">
        <table className="ps-tabel ps-tabel--hp bd-tabel bd-form">
          <thead><tr><th style={{ width: 40 }}>#</th><th>Kategori</th><th>Keterangan (wajib)</th><th className="kanan">Jumlah</th><th aria-label="Hapus" /></tr></thead>
          <tbody>
            {baris.map((x, i) => (
              <tr key={x.id}>
                <td data-label="#">{i + 1}</td>
                <td data-label="Kategori">
                  <select className="isian__kontrol" aria-label={`Kategori baris ${i + 1}`} value={x.kategori} onChange={(e) => ubah(x.id, { kategori: e.target.value })} style={!x.kategori ? { color: 'var(--teks-3)' } : undefined}>
                    <option value="" disabled>Pilih kategori…</option>
                    {KATEGORI_PENGELUARAN.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </td>
                <td data-label="Keterangan">
                  <input className="isian__kontrol" aria-label={`Keterangan baris ${i + 1}`} value={x.keterangan} onChange={(e) => ubah(x.id, { keterangan: e.target.value })} placeholder="mis. bongkar 2 colt gula" />
                </td>
                <td data-label="Jumlah" className="kanan"><InputRupiah id={`kk-${x.id}`} nilai={x.jumlah} label={`Jumlah baris ${i + 1}`} onUbah={(n) => ubah(x.id, { jumlah: n })} /></td>
                <td data-label="">{baris.length > 1 && <button type="button" className="tautan teks-bahaya" onClick={() => setBaris((xs) => xs.filter((y) => y.id !== x.id))}>Hapus</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="tombol tombol--putus" style={{ marginTop: 10 }} onClick={() => setBaris((xs) => [...xs, kosong()])}>+ Tambah baris</button>
      </div>

      <div className="kartu bd-kaki">
        <div className="bd-kaki__angka">
          <label className="isian">
            Memo (opsional)
            <input className="isian__kontrol" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="catatan internal" />
          </label>
          <div className="isian">
            Lampiran foto nota (opsional)
            <button type="button" className="tombol tombol--putus" style={{ alignSelf: 'flex-start' }} disabled>+ Foto nota (versi jadi)</button>
          </div>
          {perluPin && (
            <label className="isian">
              PIN pemilik · uang dari {sumber === 'bank' ? 'rekening' : 'brankas'}
              <input className="isian__kontrol" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
            </label>
          )}
        </div>
        <div className="bd-kaki__angka">
          <div className="ringkas-total"><span>Subtotal ({isi.length} baris)</span><strong>{rupiah(subtotal)}</strong></div>
          <div className="ringkas-total"><span>Potongan (opsional)</span><span style={{ width: 160 }}><InputRupiah id="kk-potongan" nilai={potongan} onUbah={setPotongan} /></span></div>
          <div className="ringkas-total ringkas-total--besar"><span>Total kas keluar</span><strong>{rupiah(total)}</strong></div>
          {lebih && <p className="catatan catatan--peringatan" style={{ margin: 0 }}>Melebihi uang di laci ({rupiah(uang)}). Pilih brankas/rekening atau kurangi jumlah.</p>}
          <div className="baris-tombol" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="tombol" onClick={onBatal}>Batal</button>
            <button type="button" className="tombol tombol--utama" disabled={!siap} onClick={simpan}>Simpan & cetak bukti</button>
          </div>
        </div>
      </div>
    </div>
  );
}

type FilterStatus = 'belum-lunas' | 'lewat' | 'minggu-ini' | 'lunas' | 'semua';

/**
 * Bayar distributor — mode akuntansi seperti "Pembayaran Pembelian" di Accurate:
 * Daftar bukti pembayaran, daftar faktur hutang, dan formulir pembayaran
 * (pemasok, tanggal, no. bukti, dibayar dari; tabel faktur: bayar ✓, no. faktur, tanggal, jatuh tempo, total, terutang, diskon, bayar).
 */
export function BayarDistributor() {
  const toko = useToko();
  const [params, setParams] = useSearchParams();
  const [d, setD] = useState<null | ArusKas | { detail: FakturHutang }>(null);
  const [form, setForm] = useState<null | { distributorId: string; faktur: string[] }>(params.get('baru') ? { distributorId: '', faktur: [] } : null);
  const [tab, setTab] = useState<'pembayaran' | 'faktur'>('faktur');
  const [fDist, setFDist] = useState('');
  const [fStatus, setFStatus] = useState<FilterStatus>('belum-lunas');
  const [cari, setCari] = useState('');
  const [periode, setPeriode] = useState<Periode>(() => periodeDari('bulan-ini', '', { dari: '', sampai: '' }));
  const [pilih, setPilih] = useState<string[]>([]);
  const hari = hariIni();
  const semua = daftarFaktur(toko);
  const terbuka = semua.filter((f) => f.sisa > 0);
  const lewat = terbuka.filter((f) => f.jatuhTempo < hari);
  const minggu = terbuka.filter((f) => f.jatuhTempo >= hari && f.jatuhTempo <= tambahHari(hari, 7));
  const jumlah = (xs: FakturHutang[]) => xs.reduce((t, f) => t + f.sisa, 0);
  const [fakturTunai, setFakturTunai] = useState(!!params.get('tunai'));

  if (fakturTunai) {
    return <FormFakturTunai onBatal={() => { setFakturTunai(false); setParams({}); }} onSelesai={(a) => { setFakturTunai(false); setParams({}); setTab('pembayaran'); setD(a); }} />;
  }

  if (form) {
    return (
      <FormPembayaran
        awal={form}
        onBatal={() => { setForm(null); setParams({}); }}
        onSelesai={(a) => { setForm(null); setParams({}); setPilih([]); setTab('pembayaran'); setD(a); }}
      />
    );
  }

  const q = cari.trim().toLowerCase();
  const cocokStatus = (f: FakturHutang) =>
    fStatus === 'semua' ? true
    : fStatus === 'lunas' ? f.sisa === 0
    : fStatus === 'lewat' ? f.sisa > 0 && f.jatuhTempo < hari
    : fStatus === 'minggu-ini' ? f.sisa > 0 && f.jatuhTempo >= hari && f.jatuhTempo <= tambahHari(hari, 7)
    : f.sisa > 0;
  const tampil = semua
    .filter((f) => !fDist || f.distributorId === fDist)
    .filter(cocokStatus)
    .filter((f) => !q || f.nomorDistributor.toLowerCase().includes(q) || f.nomor.toLowerCase().includes(q));
  const dipilih = tampil.filter((f) => pilih.includes(f.id) && f.sisa > 0);
  const distDipilih = [...new Set(dipilih.map((f) => f.distributorId))];

  const distBukti = (a: ArusKas) => semua.find((x) => x.id === a.faktur?.[0]?.id)?.distributorId;
  const bukti = toko.arus
    .filter((a) => a.jenis === 'bayar-distributor')
    .filter((a) => diPeriode(a.waktuIso, periode))
    .filter((a) => !fDist || distBukti(a) === fDist)
    .filter((a) => !q || a.nomor.toLowerCase().includes(q) || (a.faktur ?? []).some((f) => f.nomor.toLowerCase().includes(q)))
    .sort((a, b) => b.waktuIso.localeCompare(a.waktuIso));
  const totalBukti = bukti.reduce((t, a) => t + (a.faktur ?? []).reduce((x, f) => x + f.jumlah, 0), 0);

  const chip = (f: FakturHutang) => {
    if (f.sisa === 0) return <span className="chip-status chip-status--hijau">Lunas</span>;
    if (f.jatuhTempo < hari) return <span className="chip-status chip-status--merah">Lewat {selisihHari(f.jatuhTempo, hari)} hari</span>;
    if (f.status === 'sebagian') return <span className="chip-status chip-status--kuning">Sebagian</span>;
    return <span className="chip-status chip-status--biru">Belum dibayar</span>;
  };

  return (
    <div className="ps-halaman">
      <KepalaKas />
      <div className="ps-atas">
        <div className="saklar" role="group" aria-label="Tampilan">
          <button type="button" aria-pressed={tab === 'faktur'} onClick={() => setTab('faktur')}>Faktur hutang</button>
          <button type="button" aria-pressed={tab === 'pembayaran'} onClick={() => setTab('pembayaran')}>Bukti pembayaran</button>
        </div>

      </div>

      {tab === 'faktur' && (
        <div className="bd-ringkas">
          <button type="button" className={`kartu kb-angka ${fStatus === 'belum-lunas' ? 'bd-aktif' : ''}`} onClick={() => setFStatus('belum-lunas')}>
            <span className="teks-pudar">Hutang ke distributor</span><strong>{rupiah(jumlah(terbuka))}</strong><span className="teks-pudar">{terbuka.length} faktur belum lunas</span>
          </button>
          <button type="button" className={`kartu kb-angka ${lewat.length ? 'kb-angka--merah' : ''} ${fStatus === 'lewat' ? 'bd-aktif' : ''}`} onClick={() => setFStatus('lewat')}>
            <span className="teks-pudar">Lewat jatuh tempo</span><strong>{rupiah(jumlah(lewat))}</strong><span className="teks-pudar">{lewat.length} faktur</span>
          </button>
          <button type="button" className={`kartu kb-angka ${fStatus === 'minggu-ini' ? 'bd-aktif' : ''}`} onClick={() => setFStatus('minggu-ini')}>
            <span className="teks-pudar">Jatuh tempo 7 hari ke depan</span><strong>{rupiah(jumlah(minggu))}</strong><span className="teks-pudar">{minggu.length} faktur</span>
          </button>
        </div>
      )}

      <KotakFilter
        cari={{ nilai: cari, onUbah: setCari, placeholder: tab === 'faktur' ? 'Cari no. faktur / PB-…' : 'Cari BD-… atau no. faktur' }}
        aksi={<div className="baris-tombol">
          <button type="button" className="tombol" onClick={() => setFakturTunai(true)}>+ Faktur tunai (tanpa nota)</button>
          <button type="button" className="tombol tombol--utama" disabled={!terbuka.length}
            onClick={() => setForm({ distributorId: fDist, faktur: [] })}>+ Pembayaran baru</button>
        </div>}
        ringkas={[tab === 'pembayaran' ? teksPeriode(periode) : { 'belum-lunas': 'Belum lunas', lewat: 'Lewat jatuh tempo', 'minggu-ini': 'Jatuh tempo 7 hari', lunas: 'Lunas', semua: 'Semua status' }[fStatus],
        fDist ? ambilDistributor(fDist).nama : 'semua distributor', q && `"${cari}"`].filter(Boolean).join(' · ')}>
        {tab === 'pembayaran' && <PilihPeriode awal="bulan-ini" onUbah={setPeriode} />}
        <div className="rt-filter">
          <label className="isian">
            Pemasok / distributor
            <select className="isian__kontrol" value={fDist} onChange={(e) => { setFDist(e.target.value); setPilih([]); }}>
              <option value="">Semua distributor</option>
              {distributorContoh.map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
            </select>
          </label>
        </div>
        {tab === 'faktur' && (
          <div className="pj__kategori" role="group" aria-label="Status">
            {([['belum-lunas', 'Belum lunas'], ['lewat', 'Lewat jatuh tempo'], ['minggu-ini', 'Jatuh tempo 7 hari'], ['lunas', 'Lunas'], ['semua', 'Semua']] as [FilterStatus, string][]).map(([k, t]) => (
              <button key={k} type="button" aria-pressed={fStatus === k} onClick={() => setFStatus(k)}>{t}</button>
            ))}
          </div>
        )}
      </KotakFilter>

      {tab === 'faktur' && (
        tampil.length === 0 ? (
          <div className="kartu ps-kosong-besar"><h2>Tidak ada faktur</h2><p className="teks-pudar">Tidak ada faktur untuk filter ini.</p></div>
        ) : (
          <div className="kartu bd-tabel-kartu">
            <table className="ps-tabel ps-tabel--hp bd-tabel">
              <thead>
                <tr>
                  <th style={{ width: 36 }} aria-label="Pilih" />
                  <th>No. faktur</th><th>Distributor</th><th>Tanggal</th><th>Jatuh tempo</th>
                  <th className="kanan">Total</th><th className="kanan">Dibayar</th><th className="kanan">Terutang</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((f) => (
                  <tr key={f.id} className={pilih.includes(f.id) ? 'bd-pilih' : ''} onClick={() => setD({ detail: f })}>
                    <td data-label="Pilih" onClick={(e) => e.stopPropagation()}>
                      {f.sisa > 0 && (
                        <input type="checkbox" className="kb-centang" aria-label={`Pilih ${f.nomorDistributor}`} checked={pilih.includes(f.id)}
                          onChange={(e) => setPilih((xs) => (e.target.checked ? [...xs, f.id] : xs.filter((x) => x !== f.id)))} />
                      )}
                    </td>
                    <td data-label="No. faktur"><strong>{f.nomorDistributor}</strong><div className="teks-pudar" style={{ fontSize: 12 }}>{f.lama ? 'hutang lama' : f.nomor}</div></td>
                    <td data-label="Distributor">{ambilDistributor(f.distributorId).nama}</td>
                    <td data-label="Tanggal">{tanggalPendek(f.tanggal)}</td>
                    <td data-label="Jatuh tempo" className={f.sisa > 0 && f.jatuhTempo < hari ? 'teks-bahaya' : ''}>{tanggalPendek(f.jatuhTempo)}</td>
                    <td data-label="Total" className="kanan">{rupiah(f.total)}</td>
                    <td data-label="Dibayar" className="kanan">{f.dibayar ? rupiah(f.dibayar) : '-'}</td>
                    <td data-label="Terutang" className="kanan"><strong>{rupiah(f.sisa)}</strong></td>
                    <td data-label="Status">{chip(f)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={7} className="kanan"><strong>Total terutang</strong></td><td className="kanan"><strong>{rupiah(jumlah(tampil))}</strong></td><td /></tr>
              </tfoot>
            </table>
          </div>
        )
      )}

      {tab === 'pembayaran' && (
        bukti.length === 0 ? (
          <div className="kartu ps-kosong-besar"><h2>Belum ada pembayaran</h2><p className="teks-pudar">Tidak ada bukti pembayaran untuk periode/filter ini.</p></div>
        ) : (
          <div className="kartu bd-tabel-kartu">
            <table className="ps-tabel ps-tabel--hp bd-tabel">
              <thead>
                <tr><th>No. bukti</th><th>Tanggal</th><th>Distributor</th><th>Faktur dibayar</th><th>Dibayar dari</th><th className="kanan">Diskon</th><th className="kanan">Nilai bayar</th><th>Oleh</th></tr>
              </thead>
              <tbody>
                {bukti.map((a) => {
                  const dis = (a.faktur ?? []).reduce((t, f) => t + (f.diskon ?? 0), 0);
                  const nilai = (a.faktur ?? []).reduce((t, f) => t + f.jumlah, 0);
                  return (
                    <tr key={a.id} onClick={() => setD(a)}>
                      <td data-label="No. bukti"><strong>{a.nomor}</strong></td>
                      <td data-label="Tanggal">{waktu(a.waktuIso)}</td>
                      <td data-label="Distributor">{a.penerima}</td>
                      <td data-label="Faktur dibayar" onClick={(e) => e.stopPropagation()}>
                        {a.faktur?.map((f, i) => {
                          const fk = semua.find((x) => x.id === f.id);
                          return <span key={f.id}>{i > 0 && ', '}{fk ? <button type="button" className="tautan" onClick={() => setD({ detail: fk })}>{f.nomor}</button> : f.nomor}</span>;
                        })}
                      </td>
                      <td data-label="Dibayar dari">{a.sumber === 'laci' ? 'Laci kasir' : 'Kas pemilik'}</td>
                      <td data-label="Diskon" className="kanan">{dis ? rupiah(dis) : '-'}</td>
                      <td data-label="Nilai bayar" className="kanan"><strong>{rupiah(nilai)}</strong></td>
                      <td data-label="Oleh">{a.akun}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><td colSpan={6} className="kanan"><strong>Total dibayar · {teksPeriode(periode)}</strong></td><td className="kanan"><strong>{rupiah(totalBukti)}</strong></td><td /></tr>
              </tfoot>
            </table>
          </div>
        )
      )}

      {tab === 'faktur' && dipilih.length > 0 && (
        <div className="kb-bilah-pilih">
          <span><strong>{dipilih.length} faktur dipilih</strong> · {rupiah(jumlah(dipilih))}{distDipilih.length > 1 ? ' · pilih dari satu distributor' : ''}</span>
          <div className="baris-tombol">
            <button type="button" className="tombol tombol--hantu" onClick={() => setPilih([])}>Batal</button>
            <button type="button" className="tombol tombol--utama" disabled={distDipilih.length !== 1}
              onClick={() => setForm({ distributorId: distDipilih[0], faktur: dipilih.map((f) => f.id) })}>Bayar {dipilih.length} faktur</button>
          </div>
        </div>
      )}

      {d && 'detail' in d && <DialogDetailFaktur f={d.detail} onTutup={() => setD(null)} />}
      {d && 'jenis' in d && <DialogBuktiKasKeluar a={d} onTutup={() => setD(null)} />}
    </div>
  );
}

/** Formulir pembayaran pembelian (gaya Accurate). Dari kasir: dibayar tunai dari laci. */
function FormPembayaran({ awal, onBatal, onSelesai }: { awal: { distributorId: string; faktur: string[] }; onBatal: () => void; onSelesai: (a: ArusKas) => void }) {
  const toko = useToko();
  const [dist, setDist] = useState(awal.distributorId);
  const [per, setPer] = useState<Record<string, { bayar: number; diskon: number }>>(() =>
    Object.fromEntries(daftarFaktur(toko).filter((f) => awal.faktur.includes(f.id)).map((f) => [f.id, { bayar: f.sisa, diskon: 0 }])));
  const [ket, setKet] = useState('');
  const [detail, setDetail] = useState<FakturHutang | null>(null);
  const faktur = daftarFaktur(toko).filter((f) => f.sisa > 0 && f.distributorId === dist);
  const baris = (id: string) => per[id] ?? { bayar: 0, diskon: 0 };
  const totalBayar = faktur.reduce((t, f) => t + baris(f.id).bayar, 0);
  const totalDiskon = faktur.reduce((t, f) => t + baris(f.id).diskon, 0);
  const dipilih = faktur.filter((f) => baris(f.id).bayar + baris(f.id).diskon > 0);
  const dana = useSumberDana(totalBayar);
  const siap = !!dist && dipilih.length > 0 && (totalBayar === 0 || dana.siap);
  const ubah = (f: FakturHutang, patch: Partial<{ bayar: number; diskon: number }>) =>
    setPer((m) => {
      const x = { ...baris(f.id), ...patch };
      x.diskon = Math.min(x.diskon, f.sisa);
      x.bayar = Math.min(x.bayar, f.sisa - x.diskon);
      return { ...m, [f.id]: x };
    });
  const simpan = () => {
    if (!siap) return;
    const nama = ambilDistributor(dist).nama;
    onSelesai(catatArus({
      jenis: 'bayar-distributor', nomor: nomorArus('BD'), sumber: dana.nilai.sumber, bank: dana.bank, ...dana.uang(totalBayar), penerima: nama,
      keterangan: ket.trim() || `Bayar ${nama}`,
      faktur: dipilih.map((f) => ({ id: f.id, nomor: f.nomorDistributor, jumlah: baris(f.id).bayar, diskon: baris(f.id).diskon || undefined })),
    }));
  };

  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <h2 style={{ margin: 0 }}>Pembayaran ke distributor</h2>
        <button type="button" className="tautan" onClick={onBatal}>← Kembali ke daftar</button>
      </div>
      <div className="kartu bd-kepala">
        <label className="isian">
          Distributor (pemasok)
          <select className="isian__kontrol" value={dist} onChange={(e) => { setDist(e.target.value); setPer({}); }} style={!dist ? { color: 'var(--teks-3)' } : undefined}>
            <option value="" disabled>Pilih distributor…</option>
            {distributorContoh.map((x) => {
              const n = daftarFaktur(toko).filter((f) => f.sisa > 0 && f.distributorId === x.id);
              return <option key={x.id} value={x.id} disabled={!n.length}>{x.nama}{n.length ? ` · ${n.length} faktur` : ' · tidak ada hutang'}</option>;
            })}
          </select>
        </label>
        <label className="isian">Tanggal<input className="isian__kontrol" value={tanggalPendek(hariIni())} readOnly /></label>
        <label className="isian">No. bukti<input className="isian__kontrol" value="BD-… (otomatis)" readOnly /></label>
        <label className="isian bd-kepala__lebar">
          Keterangan
          <input className="isian__kontrol" value={ket} onChange={(e) => setKet(e.target.value)} placeholder="opsional, mis. dibayar ke sales Pak Andi" />
        </label>
        {dana.tampil}
      </div>

      <div className="kartu bd-tabel-kartu">
        {!dist ? <p className="ps-kosong">Pilih distributor dulu untuk menampilkan fakturnya.</p> : (
          <table className="ps-tabel ps-tabel--hp bd-tabel bd-form">
            <thead>
              <tr>
                <th style={{ width: 44 }}>Bayar</th><th>No. faktur</th><th>Tanggal</th><th>Jatuh tempo</th>
                <th className="kanan">Total</th><th className="kanan">Terutang</th><th className="kanan">Diskon</th><th className="kanan">Bayar</th>
              </tr>
            </thead>
            <tbody>
              {faktur.map((f) => {
                const b = baris(f.id);
                const aktif = b.bayar + b.diskon > 0;
                return (
                  <tr key={f.id} className={aktif ? 'bd-pilih' : ''}>
                    <td data-label="Bayar">
                      <input type="checkbox" className="kb-centang" aria-label={`Bayar ${f.nomorDistributor}`} checked={aktif}
                        onChange={(e) => ubah(f, e.target.checked ? { bayar: f.sisa, diskon: 0 } : { bayar: 0, diskon: 0 })} />
                    </td>
                    <td data-label="No. faktur"><button type="button" className="tautan" onClick={() => setDetail(f)}><strong>{f.nomorDistributor}</strong></button><div className="teks-pudar" style={{ fontSize: 12 }}>{f.lama ? 'hutang lama' : f.nomor}</div></td>
                    <td data-label="Tanggal">{tanggalPendek(f.tanggal)}</td>
                    <td data-label="Jatuh tempo" className={f.jatuhTempo < hariIni() ? 'teks-bahaya' : ''}>{tanggalPendek(f.jatuhTempo)}</td>
                    <td data-label="Total" className="kanan">{rupiah(f.total)}</td>
                    <td data-label="Terutang" className="kanan"><strong>{rupiah(f.sisa)}</strong></td>
                    <td data-label="Diskon" className="kanan"><InputRupiah id={`dis-${f.id}`} nilai={b.diskon} label={`Diskon ${f.nomorDistributor}`} onUbah={(n) => ubah(f, { diskon: n })} /></td>
                    <td data-label="Bayar" className="kanan"><InputRupiah id={`byr-${f.id}`} nilai={b.bayar} label={`Bayar ${f.nomorDistributor}`} onUbah={(n) => ubah(f, { bayar: n })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="kartu bd-kaki">
        <div className="bd-kaki__angka">
          <div className="ringkas-total"><span>Faktur dibayar</span><strong>{dipilih.length}</strong></div>
          <div className="ringkas-total"><span>Total diskon</span><strong>{rupiah(totalDiskon)}</strong></div>
          <div className="ringkas-total"><span>Hutang berkurang</span><strong>{rupiah(totalBayar + totalDiskon)}</strong></div>
          <div className="ringkas-total ringkas-total--besar"><span>Nilai pembayaran ({dana.nilai.sumber === 'laci' ? 'tunai dari laci' : dana.nilai.sumber === 'bank' ? 'transfer rekening' : 'tunai brankas'})</span><strong>{rupiah(totalBayar)}</strong></div>
        </div>
        <div className="baris-tombol" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="tombol" onClick={onBatal}>Batal</button>
          <button type="button" className="tombol tombol--utama" disabled={!siap} onClick={simpan}>Simpan & cetak bukti</button>
        </div>
      </div>
      {detail && <DialogDetailFaktur f={detail} onTutup={() => setDetail(null)} />}
    </div>
  );
}

/** Detail faktur asli: kepala faktur, rincian barang (dari barang masuk), pembayaran. */
export function DialogDetailFaktur({ f, onTutup }: { f: FakturHutang; onTutup: () => void }) {
  const [info, setInfo] = useState('');
  const a = f.asli;
  return (
    <Dialog judul={`Faktur ${f.nomorDistributor}`} onTutup={onTutup} lebar={640}
      kaki={<>
        <div className="baris-tombol">
          <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, faktur dicetak / diunduh PDF; foto kertas faktur ikut tersimpan.')}>Cetak / unduh</button>
        </div>
        {info && <p className="catatan catatan--info" style={{ margin: 0 }}>{info}</p>}
      </>}>
      <div className="fk-kepala">
        <div><span className="teks-pudar">Distributor</span><strong>{ambilDistributor(f.distributorId).nama}</strong></div>
        <div><span className="teks-pudar">No. faktur (kertas)</span><strong>{f.nomorDistributor}</strong></div>
        <div><span className="teks-pudar">Tanggal faktur</span><strong>{tanggalPendek(f.tanggal)}</strong></div>
        <div><span className="teks-pudar">Jatuh tempo</span><strong className={f.sisa > 0 && f.jatuhTempo < hariIni() ? 'teks-bahaya' : ''}>{tanggalPendek(f.jatuhTempo)}</strong></div>
        {a ? (
          <>
            <div><span className="teks-pudar">Barang masuk</span><strong>{a.nomor}</strong></div>
            <div><span className="teks-pudar">Dari Surat Pesanan</span><strong>{a.spNomor}</strong></div>
            <div><span className="teks-pudar">Pembayaran</span><strong>{a.cara === 'tempo' ? 'Tempo' : 'Cash'}</strong></div>
            <div><span className="teks-pudar">Dicatat</span><strong>{a.oleh} · {a.waktu}</strong></div>
          </>
        ) : (
          <div style={{ gridColumn: '1 / -1' }}><span className="chip-status chip-status--kuning">Hutang lama</span> <span className="teks-pudar">dicatat tanpa rincian barang (sebelum memakai aplikasi)</span></div>
        )}
      </div>

      {a?.baris && a.baris.length > 0 && (
        <table className="ps-tabel fk-tabel">
          <thead><tr><th>Barang</th><th className="kanan">Jumlah</th><th className="kanan">Harga</th><th className="kanan">Subtotal</th></tr></thead>
          <tbody>
            {a.baris.map((b, i) => (
              <tr key={i}><td>{b.nama}</td><td className="kanan">{b.qty} {b.satuan}</td><td className="kanan">{rupiah(b.harga)}</td><td className="kanan">{rupiah(b.qty * b.harga)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={3} className="kanan"><strong>Total faktur</strong></td><td className="kanan"><strong>{rupiah(f.total)}</strong></td></tr></tfoot>
        </table>
      )}

      <div className="fk-ringkas">
        <div className="ringkas-total"><span>Total</span><strong>{rupiah(f.total)}</strong></div>
        <div className="ringkas-total"><span>Dibayar + diskon</span><span>{rupiah(f.dibayar)}</span></div>
        <div className="ringkas-total ringkas-total--besar"><span>Terutang</span><strong>{rupiah(f.sisa)}</strong></div>
      </div>
      <h3 style={{ margin: '4px 0 0' }}>Pembayaran</h3>
      {f.pembayaran.length === 0 ? <p className="teks-pudar" style={{ margin: 0 }}>Belum ada pembayaran.</p> : (
        <table className="ps-tabel fk-tabel">
          <thead><tr><th>No. bukti</th><th>Tanggal</th><th>Dari</th><th className="kanan">Diskon</th><th className="kanan">Bayar</th></tr></thead>
          <tbody>
            {f.pembayaran.map((p) => (
              <tr key={p.nomor}><td>{p.nomor}</td><td>{waktu(p.waktuIso)}</td><td>{p.sumber === 'laci' ? `Laci ${p.akun}` : 'Kas pemilik'}</td>
                <td className="kanan">{p.diskon ? rupiah(p.diskon) : '-'}</td><td className="kanan">{rupiah(p.jumlah)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </Dialog>
  );
}

/** Laporan harian per buka–tutup laci. Kasir melihat lacinya sendiri; pemilik semua. */
export function LaporanHarian() {
  const toko = useToko();
  const [periode, setPeriode] = useState<Periode>(() => periodeDari('7-hari', '', { dari: '', sampai: '' }));
  const [fAkun, setFAkun] = useState('');
  const [buka, setBuka] = useState<string | null>(null);
  const semua = toko.peran === 'pemilik';
  const akunAda = [...new Set(toko.sesiLaci.map((x) => x.akun))];
  const daftar = toko.sesiLaci
    .filter((x) => (semua ? !fAkun || x.akun === fAkun : x.akun === akunAktif(toko)) && x.tanggal >= periode.dari && x.tanggal <= periode.sampai)
    .sort((a, b) => b.dibukaIso.localeCompare(a.dibukaIso))
    .map((x) => ({ x, r: ringkasLaci(x.id, toko) }));
  const jumlah = (f: (v: (typeof daftar)[number]) => number) => daftar.reduce((t, v) => t + f(v), 0);
  const jam = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-');
  return (
    <div className="ps-halaman">
      <KepalaKas />
      <KotakFilter ringkas={[teksPeriode(periode), semua ? fAkun || 'semua akun' : undefined].filter(Boolean).join(' · ')}>
        <PilihPeriode awal="7-hari" onUbah={setPeriode} />
        {semua && (
          <div className="rt-filter">
            <label className="isian">
              Akun kasir
              <select className="isian__kontrol" value={fAkun} onChange={(e) => setFAkun(e.target.value)}>
                <option value="">Semua akun</option>
                {akunAda.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
          </div>
        )}
      </KotakFilter>
      {daftar.length === 0 ? (
        <div className="kartu ps-kosong-besar"><h2>Tidak ada laporan</h2><p className="teks-pudar">Laporan dibuat setiap buka–tutup kasir.</p></div>
      ) : (
        <div className="kartu bd-tabel-kartu">
          <table className="ps-tabel ps-tabel--hp bd-tabel">
            <thead>
              <tr>
                <th>No. / akun</th><th>Tanggal</th><th className="kanan">Modal</th><th className="kanan">Masuk tunai</th>
                <th className="kanan">Keluar tunai</th><th className="kanan">Seharusnya</th><th className="kanan">Fisik</th><th className="kanan">Selisih</th><th className="kanan">Transfer</th><th className="kanan">Penjualan</th>
              </tr>
            </thead>
            <tbody>
              {daftar.map(({ x, r }) => (
                <tr key={x.id} onClick={() => setBuka(x.id)}>
                  <td data-label="No. / akun"><strong>{x.nomor}</strong><div className="teks-pudar" style={{ fontSize: 12 }}>{x.akun}</div></td>
                  <td data-label="Tanggal">{tanggalPendek(x.tanggal)}<div className="teks-pudar" style={{ fontSize: 12 }}>{jam(x.dibukaIso)}–{x.ditutupIso ? jam(x.ditutupIso) : <span className="chip-status chip-status--biru">masih buka</span>}</div></td>
                  <td data-label="Modal" className="kanan">{rupiah(r.modal)}</td>
                  <td data-label="Masuk tunai" className="kanan">{rupiah(r.masukTunai)}</td>
                  <td data-label="Keluar tunai" className="kanan">{rupiah(r.keluarTunai)}</td>
                  <td data-label="Seharusnya" className="kanan"><strong>{rupiah(r.seharusnya)}</strong></td>
                  <td data-label="Fisik" className="kanan">{x.uangFisik !== undefined ? rupiah(x.uangFisik) : '-'}</td>
                  <td data-label="Selisih" className={`kanan ${x.selisih ? 'teks-bahaya' : ''}`}>{x.selisih === undefined ? '-' : x.selisih === 0 ? '0' : `${x.selisih > 0 ? '+' : '−'}${rupiah(Math.abs(x.selisih))}`}</td>
                  <td data-label="Transfer" className="kanan">{rupiah(r.totalTransfer)}</td>
                  <td data-label="Penjualan" className="kanan"><strong>{rupiah(r.omzet)}</strong><div className="teks-pudar" style={{ fontSize: 12 }}>{r.banyakNota} nota</div></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="kanan"><strong>Total · {teksPeriode(periode)}</strong></td>
                <td className="kanan"><strong>{rupiah(jumlah((v) => v.r.masukTunai))}</strong></td>
                <td className="kanan"><strong>{rupiah(jumlah((v) => v.r.keluarTunai))}</strong></td>
                <td /><td />
                <td className={`kanan ${jumlah((v) => v.x.selisih ?? 0) ? 'teks-bahaya' : ''}`}><strong>{(() => { const n = jumlah((v) => v.x.selisih ?? 0); return n === 0 ? '0' : `${n > 0 ? '+' : '−'}${rupiah(Math.abs(n))}`; })()}</strong></td>
                <td className="kanan"><strong>{rupiah(jumlah((v) => v.r.totalTransfer))}</strong></td>
                <td className="kanan"><strong>{rupiah(jumlah((v) => v.r.omzet))}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {buka && <DialogLaporanHarian sesiId={buka} onTutup={() => setBuka(null)} />}
    </div>
  );
}
