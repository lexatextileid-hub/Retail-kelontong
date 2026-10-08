import { useState, type ReactNode } from 'react';
import { Dialog } from '../../components/Dialog';
import { InputRupiah } from '../../components/InputRupiah';
import { bankContoh, PIN_PEMILIK_CONTOH } from '../../data/contoh';
import {
  catatArus, fakturTerbuka, KATEGORI_PENDAPATAN_LAIN, KATEGORI_PENGELUARAN, nomorArus, laporanKasir, ringkasLaci, tutupLaci, useToko,
  type ArusKas, type SesiLaci,
} from '../../data/toko';
import { rupiah } from '../../lib/format';
import { ambilDistributor, labelDasar } from '../pesanan/bersama';
import { ambilProduk } from '../penjualan/model';
import { tanggalPendek } from '../kasbon/bersama';

/* ---------- bagian kecil ---------- */

export function IsianPin({ pin, setPin, alasan }: { pin: string; setPin: (s: string) => void; alasan: string }) {
  return (
    <label className="isian">
      PIN pemilik <span className="teks-pudar" style={{ fontWeight: 500 }}>· {alasan}</span>
      <input className="isian__kontrol" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
      {pin.length >= 4 && pin !== PIN_PEMILIK_CONTOH && <span className="teks-bahaya" style={{ fontSize: 12.5 }}>PIN salah.</span>}
    </label>
  );
}

function PilihBank({ bank, setBank }: { bank: string; setBank: (s: string) => void }) {
  return (
    <div className="isian">
      Rekening (keterangan)
      <div className="kb-cepat">
        {bankContoh.map((b) => (
          <button key={b} type="button" className="tombol tombol--kecil" aria-pressed={bank === b} onClick={() => setBank(bank === b ? '' : b)}>{b}</button>
        ))}
      </div>
    </div>
  );
}

export const namaJenis: Record<ArusKas['jenis'], string> = {
  penjualan: 'Penjualan', kasbon: 'Bayar kasbon', pesanan: 'Pesanan', retur: 'Retur', 'kas-masuk': 'Kas masuk lain',
  'titipan-brankas': 'Dari pemilik', pengeluaran: 'Pengeluaran', 'bayar-distributor': 'Bayar distributor', 'setor-bank': 'Setor bank',
  'saldo-awal': 'Saldo awal', modal: 'Tambahan modal', prive: 'Prive', pindah: 'Pindah dana', 'kasbon-karyawan': 'Kasbon karyawan', 'cicilan-karyawan': 'Cicilan kasbon karyawan',
};

/* ---------- Buka kasir ---------- */

export function DialogBukaKasir({ dariKemarin, onBuka, onTutup }: { dariKemarin: number; onBuka: (tambah: number) => void; onTutup: () => void }) {
  const { peran } = useToko();
  const [tambah, setTambah] = useState(0);
  const [pin, setPin] = useState('');
  const perluPin = tambah > 0 && peran !== 'pemilik';
  const siap = !perluPin || pin === PIN_PEMILIK_CONTOH;
  return (
    <Dialog judul="Buka kasir" onTutup={onTutup} lebar={460}
      kaki={<button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={() => onBuka(tambah)}>Buka kasir · modal {rupiah(dariKemarin + tambah)}</button>}>
      <div className="ringkas-total"><span>Sisa laci sebelumnya</span><strong>{rupiah(dariKemarin)}</strong></div>
      <label className="isian">
        Tambahan uang dari pemilik (opsional)
        <InputRupiah id="buka-tambah" nilai={tambah} onUbah={setTambah} />
        <span className="isian__bantuan">Mis. tambahan uang kembalian yang diberikan pemilik.</span>
      </label>
      {perluPin && <IsianPin pin={pin} setPin={setPin} alasan="uang dari pemilik" />}
      <div className="ringkas-total ringkas-total--besar"><span>Modal awal</span><strong>{rupiah(dariKemarin + tambah)}</strong></div>
    </Dialog>
  );
}

/* ---------- Kas masuk lain ---------- */

export function DialogKasMasuk({ onSelesai, onTutup }: { onSelesai: (a: ArusKas) => void; onTutup: () => void }) {
  const { peran } = useToko();
  const [jenis, setJenis] = useState<'kas-masuk' | 'titipan-brankas'>('kas-masuk');
  const [jumlah, setJumlah] = useState(0);
  const [kategori, setKategori] = useState('');
  const [ket, setKet] = useState('');
  const [pin, setPin] = useState('');
  const perluPin = jenis === 'titipan-brankas' && peran !== 'pemilik';
  const siap = jumlah > 0 && !!ket.trim() && (jenis !== 'kas-masuk' || !!kategori) && (!perluPin || pin === PIN_PEMILIK_CONTOH);
  return (
    <Dialog judul="Kas masuk" onTutup={onTutup} lebar={480}
      kaki={<button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap}
        onClick={() => onSelesai(catatArus({ jenis, nomor: nomorArus('KM'), tunai: jumlah, transfer: 0, keterangan: ket.trim(), kategori: jenis === 'kas-masuk' ? kategori : undefined }))}>Simpan kas masuk</button>}>
      <div className="saklar" role="group" aria-label="Jenis kas masuk" style={{ alignSelf: 'flex-start' }}>
        <button type="button" aria-pressed={jenis === 'kas-masuk'} onClick={() => setJenis('kas-masuk')}>Pendapatan lain</button>
        <button type="button" aria-pressed={jenis === 'titipan-brankas'} onClick={() => setJenis('titipan-brankas')}>Dari pemilik</button>
      </div>
      <p className="teks-pudar" style={{ margin: 0, fontSize: 13 }}>
        {jenis === 'kas-masuk'
          ? 'Mis. jual kardus bekas, barang rusak/kedaluwarsa (pendapatan lain-lain). Bukan penjualan barang.'
          : 'Uang yang diberikan pemilik ke laci, mis. titipan untuk bayar distributor atau tambahan uang kembalian. Bukan pendapatan.'}
      </p>
      {jenis === 'kas-masuk' && (
        <label className="isian">
          Kategori
          <select className="isian__kontrol" value={kategori} onChange={(e) => setKategori(e.target.value)} style={!kategori ? { color: 'var(--teks-3)' } : undefined}>
            <option value="" disabled>Pilih kategori…</option>
            {KATEGORI_PENDAPATAN_LAIN.filter((k) => k !== 'Bunga/cashback bank').map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
      )}
      <label className="isian">Jumlah<InputRupiah id="km-jumlah" nilai={jumlah} onUbah={setJumlah} autoFocus /></label>
      <label className="isian">
        Keterangan
        <input className="isian__kontrol" value={ket} onChange={(e) => setKet(e.target.value)} placeholder={jenis === 'kas-masuk' ? 'mis. jual 20 kardus bekas' : 'mis. titipan bayar Distributor A'} />
      </label>
      {perluPin && <IsianPin pin={pin} setPin={setPin} alasan="uang dari pemilik" />}
    </Dialog>
  );
}

/* ---------- Pengeluaran ---------- */

export function DialogPengeluaran({ maksLaci = 0, onSelesai, onTutup }: { adaLaci?: boolean; maksLaci?: number; onSelesai: (a: ArusKas) => void; onTutup: () => void }) {
  const [kategori, setKategori] = useState('');
  const [jumlah, setJumlah] = useState(0);
  const [ket, setKet] = useState('');
  const [penerima, setPenerima] = useState('');
  const lebihLaci = jumlah > maksLaci;
  const siap = !!kategori && jumlah > 0 && !lebihLaci && !!ket.trim() && !!penerima.trim();
  const simpan = () =>
    onSelesai(catatArus({
      jenis: 'pengeluaran', nomor: nomorArus('KK'), kategori, penerima: penerima.trim(), keterangan: ket.trim(), tunai: -jumlah, transfer: 0,
    }));
  return (
    <Dialog judul="Catat pengeluaran dari laci" onTutup={onTutup} lebar={520}
      kaki={<button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={simpan}>Simpan & cetak bukti kas keluar</button>}>
      <label className="isian">
        Kategori
        <select className="isian__kontrol" value={kategori} onChange={(e) => setKategori(e.target.value)} style={!kategori ? { color: 'var(--teks-3)' } : undefined}>
          <option value="" disabled>Pilih kategori…</option>
          {KATEGORI_PENGELUARAN.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>
      <label className="isian">Jumlah<InputRupiah id="kk-jumlah" nilai={jumlah} onUbah={setJumlah} /></label>
      {lebihLaci && <span className="teks-bahaya" style={{ fontSize: 12.5 }}>Melebihi uang di laci ({rupiah(maksLaci)}).</span>}
      <label className="isian">
        Keterangan (wajib)
        <input className="isian__kontrol" value={ket} onChange={(e) => setKet(e.target.value)} placeholder="mis. bongkar 2 colt gula dari Distributor A" />
      </label>
      <label className="isian">
        Nama penerima (wajib)
        <input className="isian__kontrol" value={penerima} onChange={(e) => setPenerima(e.target.value)} placeholder="mis. Pak Udin (kuli)" />
      </label>
      <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>Foto nota (opsional) bisa ditambahkan di versi jadi.</p>
    </Dialog>
  );
}

/** Bukti kas keluar dengan kolom tanda tangan penerima. */
export function DialogBuktiKasKeluar({ a, onTutup }: { a: ArusKas; onTutup: () => void }) {
  const [info, setInfo] = useState('');
  const jumlah = Math.abs(a.tunai + a.transfer);
  return (
    <Dialog judul={`Bukti kas keluar ${a.nomor}`} onTutup={onTutup} lebar={420}
      kaki={<>
        <div className="baris-tombol">
          <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, bukti masuk antrian stasiun printer.')}>Cetak</button>
          <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, bukti diunduh sebagai PDF.')}>Unduh PDF</button>
        </div>
        {info && <p className="catatan catatan--info" style={{ margin: 0 }}>{info}</p>}
        <button type="button" className="tombol tombol--utama tombol--besar" onClick={onTutup}>Selesai</button>
      </>}>
      <div className="struk">
        <div className="struk__tengah"><strong>[Nama Toko]</strong></div>
        <div className="struk__garis" />
        <div className="struk__tengah struk__tebal">BUKTI KAS KELUAR</div>
        <div>{a.nomor} · {new Date(a.waktuIso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        {!a.rincian && <div>Kategori: {a.kategori ?? (a.jenis === 'bayar-distributor' ? (a.faktur?.some((f) => f.id.startsWith('ft:')) ? 'Belanja barang (faktur tunai)' : 'Bayar faktur distributor') : 'Setor bank')}</div>}
        <div>Dibayar dari: {a.sumber === 'laci' ? `Laci ${a.akun}` : a.sumber === 'bank' ? `Rekening ${a.bank ?? ''} (transfer)` : 'Brankas'}</div>
        {a.referensi && <div>No. referensi: {a.referensi}</div>}
        <div className="struk__garis" />
        {a.rincian ? a.rincian.map((x, i) => (
          <div key={i}><div>{x.kategori}</div><div className="struk__baris"><span>  {x.keterangan}</span><span>{rupiah(x.jumlah)}</span></div></div>
        )) : <div>{a.keterangan}</div>}
        {a.faktur?.map((f) => <div key={f.id} className="struk__baris"><span>  {f.nomor}</span><span>{rupiah(f.jumlah)}</span></div>)}
        {!!a.potongan && <div className="struk__baris"><span>Potongan</span><span>−{rupiah(a.potongan)}</span></div>}
        <div className="struk__baris struk__tebal"><span>JUMLAH</span><span>{rupiah(jumlah)}</span></div>
        {a.memo && <div>Memo: {a.memo}</div>}
        <div className="struk__garis" />
        <div>Dicatat: {a.akun}</div>
        <div style={{ marginTop: 18 }}>Penerima: {a.penerima ?? '______________'}</div>
        <div style={{ marginTop: 22 }}>Tanda tangan: ______________</div>
      </div>
    </Dialog>
  );
}

/* ---------- Setor bank ---------- */

export function DialogSetorBank({ maks, onSelesai, onTutup }: { maks: number; onSelesai: (a: ArusKas) => void; onTutup: () => void }) {
  const [jumlah, setJumlah] = useState(0);
  const [bank, setBank] = useState('');
  const siap = jumlah > 0 && jumlah <= maks && !!bank;
  return (
    <Dialog judul="Setor tunai ke bank" onTutup={onTutup} lebar={460}
      kaki={<button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap}
        onClick={() => onSelesai(catatArus({ jenis: 'setor-bank', nomor: nomorArus('ST'), tunai: -jumlah, transfer: 0, bank, keterangan: `Setor tunai ke ${bank}` }))}>Simpan setoran</button>}>
      <p className="teks-pudar" style={{ margin: 0, fontSize: 13 }}>Pindah dana laci → rekening, bukan pengeluaran. Uang di laci sekarang {rupiah(maks)}.</p>
      <label className="isian">Jumlah<InputRupiah id="st-jumlah" nilai={jumlah} onUbah={setJumlah} autoFocus /></label>
      {jumlah > maks && <span className="teks-bahaya" style={{ fontSize: 12.5 }}>Melebihi uang di laci.</span>}
      <PilihBank bank={bank} setBank={setBank} />
    </Dialog>
  );
}

/* ---------- Bayar distributor ---------- */

export function DialogBayarDistributor({ maksLaci = 0, fakturDipilih = [], onSelesai, onTutup }: { adaLaci?: boolean; maksLaci?: number; fakturDipilih?: string[]; onSelesai: (a: ArusKas) => void; onTutup: () => void }) {
  const toko = useToko();
  const faktur = fakturTerbuka(toko);
  const [per, setPer] = useState<Record<string, number>>(() => Object.fromEntries(faktur.filter((f) => fakturDipilih.includes(f.id)).map((f) => [f.id, f.sisa])));
  const total = faktur.reduce((t, f) => t + (per[f.id] ?? 0), 0);
  const dipilih = faktur.filter((f) => (per[f.id] ?? 0) > 0);
  const distributor = [...new Set(dipilih.map((f) => f.distributorId))];
  const lebihLaci = total > maksLaci;
  const siap = total > 0 && !lebihLaci && distributor.length === 1;
  const simpan = () =>
    onSelesai(catatArus({
      jenis: 'bayar-distributor', nomor: nomorArus('BD'), tunai: -total, transfer: 0,
      penerima: ambilDistributor(distributor[0]).nama, keterangan: `Bayar ${ambilDistributor(distributor[0]).nama}`,
      faktur: dipilih.map((f) => ({ id: f.id, nomor: f.nomorDistributor, jumlah: per[f.id] })),
    }));
  const kelompok = [...new Set(faktur.map((f) => f.distributorId))];
  return (
    <Dialog judul="Bayar distributor" onTutup={onTutup} lebar={600}
      kaki={<button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={simpan}>Bayar {rupiah(total)}</button>}>
      {faktur.length === 0 && <p className="ps-kosong">Tidak ada faktur tempo yang belum lunas.</p>}
      {kelompok.map((d) => (
        <div key={d} className="kb-alokasi">
          <div className="kb-alokasi__kepala"><span>{ambilDistributor(d).nama}</span></div>
          {faktur.filter((f) => f.distributorId === d).map((f) => {
            const a = per[f.id] ?? 0;
            return (
              <div key={f.id} className={`kb-alokasi__baris ${a > 0 ? 'kb-alokasi__baris--pilih' : ''}`}>
                <input type="checkbox" className="kb-centang" aria-label={`Centang ${f.nomorDistributor}`} checked={a > 0}
                  onChange={(e) => setPer((m) => ({ ...m, [f.id]: e.target.checked ? f.sisa : 0 }))} />
                <div className="kb-alokasi__info">
                  <span><strong>{f.nomorDistributor}</strong> {f.lama && <span className="chip-status chip-status--kuning">Hutang lama</span>}</span>
                  <span className="teks-pudar">{tanggalPendek(f.tanggal)} · jatuh tempo {tanggalPendek(f.jatuhTempo)} · sisa {rupiah(f.sisa)}{f.dibayar ? ` dari ${rupiah(f.total)}` : ''}</span>
                </div>
                <div className="kb-alokasi__isi">
                  <InputRupiah id={`bd-${f.id}`} nilai={a} label={`Bayar ${f.nomorDistributor}`} onUbah={(n) => setPer((m) => ({ ...m, [f.id]: Math.min(n, f.sisa) }))} />
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {distributor.length > 1 && <p className="catatan catatan--peringatan" style={{ margin: 0 }}>Satu pembayaran untuk satu distributor. Pilih faktur dari distributor yang sama.</p>}
      <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>
        Dibayar tunai dari laci (uang di laci {rupiah(maksLaci)}). Bila kurang, minta titipan dari pemilik lewat Kas masuk → Dari pemilik.
      </p>
      {lebihLaci && <p className="catatan catatan--peringatan" style={{ margin: 0 }}>Uang di laci hanya {rupiah(maksLaci)}. Bayar sebagian atau minta titipan dari pemilik dulu.</p>}
    </Dialog>
  );
}

/* ---------- Tutup kasir ---------- */

export function DialogTutupKasir({ sesi, onSelesai, onTutup }: { sesi: SesiLaci; onSelesai: (sesiId: string) => void; onTutup: () => void }) {
  const toko = useToko();
  const r = ringkasLaci(sesi.id, toko);
  const [fisik, setFisik] = useState(0);
  const [diisi, setDiisi] = useState(false);
  const [tanggung, setTanggung] = useState<'toko' | 'kasir'>('toko');
  const [sisaLaci, setSisaLaci] = useState(Math.min(r.modal, r.seharusnya));
  const [keKasPemilik, setKePemilik] = useState(0);
  const [bank, setBank] = useState(0);
  const [bankNama, setBankNama] = useState('');
  const [pin, setPin] = useState('');
  const selisih = fisik - r.seharusnya;
  const dibagi = sisaLaci + keKasPemilik + bank;
  const perluPin = toko.peran !== 'pemilik' && (selisih !== 0 || keKasPemilik > 0);
  const siap = diisi && dibagi === fisik && (bank === 0 || !!bankNama) && (!perluPin || pin === PIN_PEMILIK_CONTOH);
  const isiFisik = (n: number) => {
    setFisik(n); setDiisi(true);
    // Bawaan: sisakan modal awal, sisanya diserahkan ke pemilik
    const sisa = Math.min(n, r.modal);
    setSisaLaci(sisa); setKePemilik(Math.max(0, n - sisa)); setBank(0);
  };
  return (
    <Dialog judul="Tutup kasir" onTutup={onTutup} lebar={540}
      kaki={<>
        {diisi && dibagi !== fisik && <p className="teks-bahaya" style={{ margin: 0, fontSize: 13 }}>Pembagian {rupiah(dibagi)} harus sama dengan uang fisik {rupiah(fisik)} (beda {rupiah(fisik - dibagi)}).</p>}
        <button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap}
          onClick={() => { const id = tutupLaci({ uangFisik: fisik, selisihDitanggung: tanggung, pembagian: { sisaLaci, brankas: keKasPemilik, bank, bankNama: bankNama || undefined, prive: 0 } }); if (id) onSelesai(id); }}>
          Tutup kasir & cetak laporan
        </button>
      </>}>
      <div className="lc-dua">
        <div className="kartu kb-angka">
          <span className="teks-pudar">Seharusnya tunai di laci</span>
          <strong>{rupiah(r.seharusnya)}</strong>
        </div>
        <div className="kartu kb-angka">
          <span className="teks-pudar">Masuk lewat transfer</span>
          <strong>{rupiah(r.totalTransfer)}</strong>
          <span className="teks-pudar">cek di mutasi rekening</span>
        </div>
      </div>
      <label className="isian">
        Uang fisik di laci (total)
        <InputRupiah id="tk-fisik" nilai={fisik} onUbah={isiFisik} autoFocus />
      </label>
      {diisi && (
        <div className={`catatan ${selisih === 0 ? 'catatan--info' : 'catatan--peringatan'}`} style={{ margin: 0 }}>
          {selisih === 0 ? 'Cocok, tidak ada selisih.' : `Selisih ${selisih > 0 ? 'lebih' : 'kurang'} ${rupiah(Math.abs(selisih))}. Perlu persetujuan pemilik.`}
        </div>
      )}
      {diisi && selisih !== 0 && (
        <div className="isian">
          Selisih ditanggung
          <div className="saklar" role="group" aria-label="Selisih ditanggung" style={{ alignSelf: 'flex-start' }}>
            <button type="button" aria-pressed={tanggung === 'toko'} onClick={() => setTanggung('toko')}>Toko (biaya)</button>
            <button type="button" aria-pressed={tanggung === 'kasir'} onClick={() => setTanggung('kasir')}>Dibebankan ke kasir</button>
          </div>
        </div>
      )}
      {diisi && (
        <div className="tumpuk" style={{ gap: 10 }}>
          <strong>Uang fisik dibagi ke</strong>
          <div className="lc-bagi">
            <label className="isian">Sisa di laci (modal besok)<InputRupiah id="tk-sisa" nilai={sisaLaci} onUbah={setSisaLaci} /></label>
            <label className="isian">Diserahkan ke pemilik<InputRupiah id="tk-pemilik" nilai={keKasPemilik} onUbah={setKePemilik} /></label>
            <label className="isian">Setor bank<InputRupiah id="tk-bank" nilai={bank} onUbah={setBank} /></label>
          </div>
          {bank > 0 && <PilihBank bank={bankNama} setBank={setBankNama} />}
        </div>
      )}
      {perluPin && <IsianPin pin={pin} setPin={setPin} alasan="setujui selisih / terima uang" />}
    </Dialog>
  );
}

/* ---------- Laporan harian ---------- */


const n = (x: number, satuan: string) => (x ? `${x} ${satuan}` : '');

/** Baris struk: label · jumlah (nota) · rupiah. */
function BarisN({ k, jml, v, minus, tebal }: { k: ReactNode; jml?: string; v: number; minus?: boolean; tebal?: boolean }) {
  return (
    <div className={`struk__baris ${tebal ? 'struk__tebal' : ''}`}>
      <span>{k}{jml ? <span className="struk__jml"> · {jml}</span> : null}</span>
      <span>{minus && v > 0 ? '−' : ''}{rupiah(Math.abs(v))}</span>
    </div>
  );
}
const Judul = ({ children }: { children: ReactNode }) => <div className="struk__tebal" style={{ marginTop: 8 }}>{children}</div>;
const Sub = ({ children }: { children: ReactNode }) => <div style={{ marginTop: 4 }}>{children}</div>;
const Garis = () => <div className="struk__garis" />;

/**
 * Laporan Harian Kasir (struk thermal) — rumusan yang disepakati:
 * I Pendapatan · II Pengeluaran dari laci · III Kasbon pelanggan · IV Kas laci · V Transfer masuk · VI Barang terjual.
 * Kasir hanya melihat lacinya; tidak ada modal/laba.
 */
export function DialogLaporanHarian({ sesiId, onTutup }: { sesiId: string; onTutup: () => void }) {
  const toko = useToko();
  const l = laporanKasir(sesiId, toko);
  const s = l.sesi;
  const k = l.kas;
  const [info, setInfo] = useState('');
  const [biasa, setBiasa] = useState(false);
  const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const uangPesanan = (u: { tunai: number; transfer: number }) => u.tunai + u.transfer;
  return (
    <Dialog judul={`Laporan harian ${s.nomor}`} onTutup={onTutup} lebar={biasa ? 640 : 440}
      kaki={<>
        <div className="baris-tombol">
          <div className="saklar saklar--kecil" role="group" aria-label="Format">
            <button type="button" aria-pressed={!biasa} onClick={() => setBiasa(false)}>Thermal</button>
            <button type="button" aria-pressed={biasa} onClick={() => setBiasa(true)}>Cetak biasa</button>
          </div>
          <button type="button" className="tombol" onClick={() => setInfo(biasa ? 'Di versi jadi, laporan dicetak ukuran A4 / diunduh PDF.' : 'Di versi jadi, laporan masuk antrian stasiun printer.')}>Cetak</button>
        </div>
        {info && <p className="catatan catatan--info" style={{ margin: 0 }}>{info}</p>}
        <button type="button" className="tombol tombol--utama tombol--besar" onClick={onTutup}>Selesai</button>
      </>}>
      <div className={`struk ${biasa ? 'struk--biasa' : ''}`}>
        <div className="struk__tengah"><strong>[Nama Toko]</strong></div>
        <div className="struk__tengah struk__tebal">LAPORAN HARIAN KASIR</div>
        <div>{s.nomor} · {s.akun}</div>
        <div>{new Date(s.dibukaIso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <div>{jam(s.dibukaIso)}–{s.ditutupIso ? jam(s.ditutupIso) : 'masih buka (sementara)'}</div>
        <Garis />

        <Judul>I. PENDAPATAN</Judul>
        <Sub>1. Penjualan</Sub>
        <BarisN k="  Tunai" jml={n(l.penjualan.tunai.n, 'nota')} v={l.penjualan.tunai.jumlah} />
        <BarisN k="  Transfer" jml={n(l.penjualan.transfer.n, 'nota')} v={l.penjualan.transfer.jumlah} />
        <BarisN k="  Kasbon" jml={n(l.penjualan.kasbon.n, 'nota')} v={l.penjualan.kasbon.jumlah} />
        <BarisN k="  Total penjualan" jml={n(l.penjualan.total.n, 'nota')} v={l.penjualan.total.jumlah} tebal />
        {l.retur.n > 0 && <BarisN k="  Retur penjualan" jml={n(l.retur.n, 'retur')} v={l.retur.bersih} minus />}
        <BarisN k="  Penjualan bersih" v={l.penjualan.total.jumlah - l.retur.bersih} tebal />
        <BarisN k="  (info) Potongan/pembulatan" v={l.penjualan.potongan} />
        <Sub>2. Pesanan pelanggan</Sub>
        <BarisN k="  DP" jml={n(l.pesanan.DP.n, 'pesanan')} v={uangPesanan(l.pesanan.DP)} />
        <BarisN k="  Pelunasan" jml={n(l.pesanan.Pelunasan.n, 'pesanan')} v={uangPesanan(l.pesanan.Pelunasan)} />
        <Sub>3. Pendapatan lain-lain</Sub>
        {l.lain.length === 0 && <BarisN k="  -" v={0} />}
        {l.lain.map(([kt, u]) => <BarisN key={kt} k={`  ${kt}`} v={u.tunai + u.transfer} />)}
        <BarisN k="TOTAL PENDAPATAN" v={l.totalPendapatan} tebal />
        <Garis />

        <Judul>II. PENGELUARAN DARI LACI</Judul>
        <Sub>1. Belanja barang</Sub>
        {l.faktur.length === 0 && <BarisN k="  -" v={0} />}
        {l.faktur.map((f, i) => <BarisN key={i} k={`  ${f.nomor} ${f.penerima}`} v={f.jumlah} />)}
        <Sub>2. Operasional</Sub>
        {l.operasional.length === 0 && <BarisN k="  -" v={0} />}
        {l.operasional.map(([kt, o]) => <BarisN key={kt} k={`  ${kt}`} jml={n(o.n, 'bukti')} v={o.jumlah} />)}
        {l.bukti.map((b) => <div key={b.nomor} className="struk__baris struk__kecil"><span>    {b.nomor} {b.keterangan}</span><span>{rupiah(b.jumlah)}</span></div>)}
        <BarisN k="TOTAL PENGELUARAN" v={l.totalPengeluaran} tebal />
        {l.dibayarPemilik.length > 0 && (
          <>
            <Sub>Info: dibayar pemilik (tidak dari laci)</Sub>
            {l.dibayarPemilik.map((b) => <div key={b.nomor} className="struk__baris struk__kecil"><span>    {b.nomor} {b.keterangan}</span><span>{rupiah(b.jumlah)}</span></div>)}
          </>
        )}
        <Garis />

        <Judul>III. KASBON PELANGGAN</Judul>
        <BarisN k="  Kasbon baru" jml={n(l.kasbon.baru.n, 'nota')} v={l.kasbon.baru.jumlah} />
        <BarisN k="  Dibayar hari ini" jml={n(l.kasbon.dibayar.n, 'kali')} v={l.kasbon.dibayar.tunai + l.kasbon.dibayar.transfer} />
        {l.kasbon.dibayar.n > 0 && <div className="struk__kecil">    tunai {rupiah(l.kasbon.dibayar.tunai)} · transfer {rupiah(l.kasbon.dibayar.transfer)}</div>}
        <BarisN k="  Dipotong retur" v={l.kasbon.potongRetur} />
        <BarisN k="  Total kasbon semua pelanggan" v={l.kasbon.totalSemua} tebal />
        <Garis />

        <Judul>IV. KAS LACI (TUNAI)</Judul>
        <BarisN k="  Saldo awal (sisa sebelumnya)" v={k.saldoAwal} />
        {k.dariPemilik > 0 && <BarisN k="+ Dari pemilik" v={k.dariPemilik} />}
        <BarisN k="+ Pendapatan tunai" v={k.pendapatan} />
        <BarisN k="+ Bayar kasbon tunai" v={k.bayarKasbon} />
        {k.returKembali > 0 && <BarisN k="− Uang kembali retur" v={k.returKembali} minus />}
        <BarisN k="− Pengeluaran dari laci" v={k.pengeluaran} minus />
        {k.setorBank > 0 && <BarisN k="− Setor bank" v={k.setorBank} minus />}
        <BarisN k="= SEHARUSNYA DI LACI" v={k.seharusnya} tebal />
        {k.fisik !== undefined && <BarisN k="  Uang fisik" v={k.fisik} />}
        {k.selisih !== undefined && (
          <div className="struk__baris struk__tebal"><span>  Selisih{k.selisih ? ` (${k.selisihDitanggung === 'kasir' ? 'dibebankan kasir' : 'ditanggung toko'})` : ''}</span><span>{k.selisih > 0 ? '+' : k.selisih < 0 ? '−' : ''}{rupiah(Math.abs(k.selisih))}</span></div>
        )}
        {k.pembagian && (
          <>
            <Sub>Pembagian uang fisik</Sub>
            <BarisN k="  Sisa di laci" v={k.pembagian.sisaLaci} />
            <BarisN k="  Diserahkan ke pemilik" v={k.pembagian.brankas + k.pembagian.prive} />
            <BarisN k={`  Setor bank${k.pembagian.bankNama ? ` ${k.pembagian.bankNama}` : ''}`} v={k.pembagian.bank} />
          </>
        )}
        <Garis />

        <Judul>V. TRANSFER MASUK (cek mutasi)</Judul>
        <BarisN k="  Penjualan" v={l.transfer.penjualan} />
        <BarisN k="  DP pesanan" v={l.transfer.dp} />
        <BarisN k="  Pelunasan pesanan" v={l.transfer.pelunasan} />
        <BarisN k="  Bayar kasbon" v={l.transfer.kasbon} />
        <BarisN k="  Pendapatan lain" v={l.transfer.lain} />
        {l.transfer.retur !== 0 && <BarisN k="  Retur (dikembalikan)" v={-l.transfer.retur} minus />}
        <BarisN k="TOTAL TRANSFER" v={l.totalTransfer} tebal />
        <Garis />

        <Judul>VI. BARANG TERJUAL</Judul>
        {l.perKategori.length === 0 && <div>  -</div>}
        {l.perKategori.map(([kt, x]) => <BarisN key={kt} k={`  ${kt}`} jml={n(x.n, 'barang')} v={x.jumlah} />)}
        {l.terlaris.length > 0 && <Sub>10 barang terlaris</Sub>}
        {l.terlaris.map((b, i) => <BarisN key={b.produkId} k={`  ${i + 1}. ${ambilProduk(b.produkId).nama}`} jml={labelDasar(b.produkId, b.jumlahDasar)} v={b.jumlah} />)}
        <Garis />
        <div style={{ marginTop: 14 }}>Kasir: ____________  Pemilik: ____________</div>
      </div>
    </Dialog>
  );
}
