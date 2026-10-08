import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { InputRupiah } from '../../components/InputRupiah';
import { PIN_PEMILIK_CONTOH } from '../../data/contoh';
import {
  catatKasPemilik, cocokkanTempat, KATEGORI_PENDAPATAN_LAIN, kasbonKaryawan, nomorArus, saldoTempat, useToko,
  type ArusKas,
} from '../../data/toko';
import { namaTempat, type MutasiKas, type TempatUang } from '../../domain/kas';
import { rupiah } from '../../lib/format';
import { IsianPin } from '../kaslaci/DialogLaci';
import '../../styles/keuangan.css';

export const jamTanggal = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Angka bertanda untuk kolom selisih / pindah. */
export const bertanda = (n: number) => (n === 0 ? '0' : `${n > 0 ? '+' : '−'}${rupiah(Math.abs(n))}`);
export const atauStrip = (n: number) => (n ? rupiah(Math.abs(n)) : '-');

/* ---------- Dialog catatan pemilik (brankas / rekening) ---------- */

export type JenisKasPemilik = 'pendapatan-lain' | 'modal' | 'cicilan-karyawan' | 'prive' | 'kasbon-karyawan' | 'pindah' | 'saldo-awal';

const judulJenis: Record<JenisKasPemilik, string> = {
  'pendapatan-lain': 'Pendapatan lain', modal: 'Tambahan modal', 'cicilan-karyawan': 'Cicilan kasbon karyawan',
  prive: 'Prive (ambil pribadi)', 'kasbon-karyawan': 'Kasbon karyawan', pindah: 'Pindah dana', 'saldo-awal': 'Saldo awal',
};
const penjelasan: Record<JenisKasPemilik, string> = {
  'pendapatan-lain': 'Uang masuk di luar penjualan barang, mis. jual kardus bekas, bunga bank, cashback distributor. Masuk kelompok A.',
  modal: 'Uang pribadi pemilik yang dimasukkan ke usaha. Bukan pendapatan.',
  'cicilan-karyawan': 'Kasbon karyawan yang dikembalikan. Bila dipotong dari gaji: catat cicilan di sini dan catat gaji penuh di Pengeluaran.',
  prive: 'Uang usaha yang diambil pemilik untuk keperluan pribadi. Bukan biaya usaha.',
  'kasbon-karyawan': 'Pinjaman ke karyawan. Bukan biaya — menjadi piutang karyawan sampai dicicil / dipotong gaji.',
  pindah: 'Memindah uang antar tempat (brankas ↔ rekening). Bukan pendapatan atau pengeluaran.',
  'saldo-awal': 'Diisi sekali saat mulai memakai aplikasi: uang di brankas (hitung fisik) atau saldo rekening (lihat mutasi bank).',
};

export function DialogKasPemilik({ tempat, jenisAwal, pilihan, namaAwal, onTutup }: {
  tempat: 'brankas' | 'bank'; jenisAwal: JenisKasPemilik; pilihan: JenisKasPemilik[]; namaAwal?: string; onTutup: () => void;
}) {
  const toko = useToko();
  const [jenis, setJenis] = useState<JenisKasPemilik>(jenisAwal);
  const [di, setDi] = useState<'brankas' | 'bank'>(tempat);
  const [jumlah, setJumlah] = useState(0);
  const [kategori, setKategori] = useState('');
  const [nama, setNama] = useState(namaAwal ?? '');
  const [ket, setKet] = useState('');
  const [pin, setPin] = useState('');
  const saldo = saldoTempat(di, toko);
  const keluar = jenis === 'prive' || jenis === 'kasbon-karyawan' || jenis === 'pindah';
  const ke: 'brankas' | 'bank' = di === 'brankas' ? 'bank' : 'brankas';
  const karyawan = kasbonKaryawan(toko);
  const perluPin = toko.peran !== 'pemilik';
  const siap = jumlah > 0 && (!keluar || jumlah <= saldo)
    && (jenis !== 'pendapatan-lain' || !!kategori)
    && (jenis !== 'kasbon-karyawan' && jenis !== 'cicilan-karyawan' || !!nama.trim())
    && (!perluPin || pin === PIN_PEMILIK_CONTOH);
  const simpan = () => {
    const n = keluar ? -jumlah : jumlah;
    const uang = di === 'bank' ? { tunai: 0, transfer: n } : { tunai: n, transfer: 0 };
    const dasar = { sumber: di, ...uang } as Pick<ArusKas, 'sumber' | 'tunai' | 'transfer'>;
    const k = ket.trim();
    switch (jenis) {
      case 'pendapatan-lain': catatKasPemilik({ ...dasar, jenis: 'kas-masuk', nomor: nomorArus('KM'), kategori, keterangan: k || kategori }); break;
      case 'modal': catatKasPemilik({ ...dasar, jenis: 'modal', nomor: nomorArus('KM'), keterangan: k || 'Tambahan modal pemilik' }); break;
      case 'saldo-awal': catatKasPemilik({ ...dasar, jenis: 'saldo-awal', nomor: nomorArus('SA'), keterangan: k || `Saldo awal ${namaTempat[di].toLowerCase()}` }); break;
      case 'prive': catatKasPemilik({ ...dasar, jenis: 'prive', nomor: nomorArus('PR'), keterangan: k || 'Prive' }); break;
      case 'kasbon-karyawan': catatKasPemilik({ ...dasar, jenis: 'kasbon-karyawan', nomor: nomorArus('KR'), penerima: nama.trim(), keterangan: k || `Kasbon ${nama.trim()}` }); break;
      case 'cicilan-karyawan': catatKasPemilik({ ...dasar, jenis: 'cicilan-karyawan', nomor: nomorArus('KR'), penerima: nama.trim(), keterangan: k || `Cicilan ${nama.trim()}` }); break;
      case 'pindah': catatKasPemilik({ ...dasar, jenis: 'pindah', nomor: nomorArus('PD'), ke, keterangan: k || `${namaTempat[di]} → ${namaTempat[ke].toLowerCase()}` }); break;
    }
    onTutup();
  };
  return (
    <Dialog judul={judulJenis[jenis]} onTutup={onTutup} lebar={500}
      kaki={<button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={simpan}>Simpan</button>}>
      {pilihan.length > 1 && (
        <div className="kb-cepat" role="group" aria-label="Jenis">
          {pilihan.map((p) => <button key={p} type="button" className="tombol tombol--kecil" aria-pressed={jenis === p} onClick={() => setJenis(p)}>{judulJenis[p]}</button>)}
        </div>
      )}
      <p className="teks-pudar" style={{ margin: 0, fontSize: 13 }}>{penjelasan[jenis]}</p>
      <div className="isian">
        {jenis === 'pindah' ? 'Dari' : keluar ? 'Diambil dari' : 'Masuk ke'}
        <div className="saklar" role="group" aria-label="Tempat uang" style={{ alignSelf: 'flex-start' }}>
          <button type="button" aria-pressed={di === 'brankas'} onClick={() => setDi('brankas')}>Brankas</button>
          <button type="button" aria-pressed={di === 'bank'} onClick={() => setDi('bank')}>Rekening</button>
        </div>
        {jenis === 'pindah' && <span className="isian__bantuan">Ke {namaTempat[ke].toLowerCase()}. {di === 'brankas' ? 'Mis. setor uang brankas ke bank.' : 'Mis. tarik tunai dari ATM untuk brankas.'}</span>}
      </div>
      {jenis === 'pendapatan-lain' && (
        <label className="isian">
          Kategori
          <select className="isian__kontrol" value={kategori} onChange={(e) => setKategori(e.target.value)} style={!kategori ? { color: 'var(--teks-3)' } : undefined}>
            <option value="" disabled>Pilih kategori…</option>
            {KATEGORI_PENDAPATAN_LAIN.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
      )}
      {(jenis === 'kasbon-karyawan' || jenis === 'cicilan-karyawan') && (
        <label className="isian">
          Nama karyawan
          <input className="isian__kontrol" list="daftar-karyawan" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Rudi" />
          <datalist id="daftar-karyawan">{karyawan.map((k) => <option key={k.nama} value={k.nama} />)}</datalist>
          {jenis === 'cicilan-karyawan' && nama && (() => { const k = karyawan.find((x) => x.nama === nama.trim()); return k ? <span className="isian__bantuan">Sisa kasbon {rupiah(k.sisa)}</span> : null; })()}
        </label>
      )}
      <label className="isian">
        Jumlah
        <InputRupiah id="kp-jumlah" nilai={jumlah} onUbah={setJumlah} autoFocus />
        {keluar && <span className={jumlah > saldo ? 'teks-bahaya' : 'isian__bantuan'} style={{ fontSize: 12.5 }}>Saldo buku {namaTempat[di].toLowerCase()} {rupiah(saldo)}</span>}
      </label>
      <label className="isian">
        Keterangan
        <input className="isian__kontrol" value={ket} onChange={(e) => setKet(e.target.value)} placeholder="opsional" />
      </label>
      {perluPin && <IsianPin pin={pin} setPin={setPin} alasan="catatan uang pemilik" />}
    </Dialog>
  );
}

/** Hitung fisik brankas / cocokkan saldo rekening dengan mutasi bank. */
export function DialogCocokkan({ tempat, onTutup }: { tempat: 'brankas' | 'bank'; onTutup: () => void }) {
  const toko = useToko();
  const buku = saldoTempat(tempat, toko);
  const [fisik, setFisik] = useState(0);
  const [diisi, setDiisi] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [pin, setPin] = useState('');
  const selisih = fisik - buku;
  const perluPin = toko.peran !== 'pemilik';
  const siap = diisi && (selisih === 0 || !!catatan.trim()) && (!perluPin || pin === PIN_PEMILIK_CONTOH);
  const bank = tempat === 'bank';
  return (
    <Dialog judul={bank ? 'Cocokkan dengan mutasi bank' : 'Hitung fisik brankas'} onTutup={onTutup} lebar={480}
      kaki={<button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={() => { cocokkanTempat(tempat, fisik, catatan); onTutup(); }}>Simpan hasil {bank ? 'pencocokan' : 'hitung'}</button>}>
      <p className="teks-pudar" style={{ margin: 0, fontSize: 13 }}>
        {bank ? 'Lihat saldo akhir di mutasi / m-banking, lalu isi di bawah.' : 'Hitung semua uang di brankas, lalu isi di bawah.'}
        {' '}Sebelum menyimpan, pastikan semua pengeluaran sudah dicatat — selisih biasanya karena ada yang lupa dicatat.
      </p>
      <div className="ringkas-total"><span>Saldo buku</span><strong>{rupiah(buku)}</strong></div>
      <label className="isian">
        {bank ? 'Saldo di mutasi bank' : 'Uang fisik di brankas'}
        <InputRupiah id="ck-fisik" nilai={fisik} onUbah={(n) => { setFisik(n); setDiisi(true); }} autoFocus />
      </label>
      {diisi && (
        <div className={`catatan ${selisih === 0 ? 'catatan--info' : 'catatan--peringatan'}`} style={{ margin: 0 }}>
          {selisih === 0 ? 'Cocok, tidak ada selisih.' : `Selisih ${selisih > 0 ? 'lebih' : 'kurang'} ${rupiah(Math.abs(selisih))}. Selisih dicatat sebagai penyesuaian hari ini dan saldo buku ikut angka ${bank ? 'mutasi' : 'fisik'}.`}
        </div>
      )}
      {diisi && selisih !== 0 && (
        <label className="isian">
          Penjelasan selisih (wajib)
          <input className="isian__kontrol" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder={bank ? 'mis. biaya admin bank belum dicatat' : 'mis. bayar parkir lupa dicatat'} />
        </label>
      )}
      {perluPin && <IsianPin pin={pin} setPin={setPin} alasan={bank ? 'cocokkan rekening' : 'hitung brankas'} />}
    </Dialog>
  );
}

export const labelLawan = (m: MutasiKas) => (m.lawan ? `${m.kelompok === 'pindah-masuk' ? 'dari' : 'ke'} ${namaTempat[m.lawan as TempatUang].toLowerCase()}` : '');
