import { useState, type ReactNode } from 'react';
import { Dialog } from '../../components/Dialog';
import { InputRupiah } from '../../components/InputRupiah';
import { bankContoh, PIN_PEMILIK_CONTOH } from '../../data/contoh';
import {
  catatArus, fakturTerbuka, KATEGORI_PENGELUARAN, nomorArus, ringkasLaci, tutupLaci, useToko,
  type ArusKas, type SesiLaci,
} from '../../data/toko';
import { rupiah } from '../../lib/format';
import { ambilDistributor } from '../pesanan/bersama';
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
  'titipan-brankas': 'Titipan brankas', pengeluaran: 'Pengeluaran', 'bayar-distributor': 'Bayar distributor', 'setor-bank': 'Setor bank',
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
        Tambah modal dari brankas (opsional)
        <InputRupiah id="buka-tambah" nilai={tambah} onUbah={setTambah} />
        <span className="isian__bantuan">Dicatat sebagai pindah dana brankas → laci.</span>
      </label>
      {perluPin && <IsianPin pin={pin} setPin={setPin} alasan="ambil dari brankas" />}
      <div className="ringkas-total ringkas-total--besar"><span>Modal awal</span><strong>{rupiah(dariKemarin + tambah)}</strong></div>
    </Dialog>
  );
}

/* ---------- Kas masuk lain ---------- */

export function DialogKasMasuk({ onSelesai, onTutup }: { onSelesai: (a: ArusKas) => void; onTutup: () => void }) {
  const { peran } = useToko();
  const [jenis, setJenis] = useState<'kas-masuk' | 'titipan-brankas'>('kas-masuk');
  const [jumlah, setJumlah] = useState(0);
  const [ket, setKet] = useState('');
  const [pin, setPin] = useState('');
  const perluPin = jenis === 'titipan-brankas' && peran !== 'pemilik';
  const siap = jumlah > 0 && !!ket.trim() && (!perluPin || pin === PIN_PEMILIK_CONTOH);
  return (
    <Dialog judul="Kas masuk" onTutup={onTutup} lebar={480}
      kaki={<button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap}
        onClick={() => onSelesai(catatArus({ jenis, nomor: nomorArus('KM'), tunai: jumlah, transfer: 0, keterangan: ket.trim() }))}>Simpan kas masuk</button>}>
      <div className="saklar" role="group" aria-label="Jenis kas masuk" style={{ alignSelf: 'flex-start' }}>
        <button type="button" aria-pressed={jenis === 'kas-masuk'} onClick={() => setJenis('kas-masuk')}>Pendapatan lain</button>
        <button type="button" aria-pressed={jenis === 'titipan-brankas'} onClick={() => setJenis('titipan-brankas')}>Dari brankas</button>
      </div>
      <p className="teks-pudar" style={{ margin: 0, fontSize: 13 }}>
        {jenis === 'kas-masuk'
          ? 'Mis. jual kardus bekas, barang rusak/kedaluwarsa (pendapatan lain-lain). Bukan penjualan barang.'
          : 'Uang dari brankas ke laci, mis. titipan untuk bayar distributor atau tambahan uang kembalian. Pindah dana, bukan pendapatan.'}
      </p>
      <label className="isian">Jumlah<InputRupiah id="km-jumlah" nilai={jumlah} onUbah={setJumlah} autoFocus /></label>
      <label className="isian">
        Keterangan
        <input className="isian__kontrol" value={ket} onChange={(e) => setKet(e.target.value)} placeholder={jenis === 'kas-masuk' ? 'mis. jual 20 kardus bekas' : 'mis. titipan bayar Distributor A'} />
      </label>
      {perluPin && <IsianPin pin={pin} setPin={setPin} alasan="uang dari brankas" />}
    </Dialog>
  );
}

/* ---------- Pengeluaran ---------- */

export function DialogPengeluaran({ adaLaci, maksLaci = 0, onSelesai, onTutup }: { adaLaci: boolean; maksLaci?: number; onSelesai: (a: ArusKas) => void; onTutup: () => void }) {
  const { peran } = useToko();
  const [kategori, setKategori] = useState('');
  const [jumlah, setJumlah] = useState(0);
  const [sumber, setSumber] = useState<ArusKas['sumber']>(adaLaci ? 'laci' : 'brankas');
  const [bank, setBank] = useState('');
  const [ket, setKet] = useState('');
  const [penerima, setPenerima] = useState('');
  const [pin, setPin] = useState('');
  const perluPin = sumber !== 'laci' && peran !== 'pemilik';
  const lebihLaci = sumber === 'laci' && jumlah > maksLaci;
  const siap = !!kategori && jumlah > 0 && !lebihLaci && !!ket.trim() && !!penerima.trim() && (!perluPin || pin === PIN_PEMILIK_CONTOH);
  const simpan = () =>
    onSelesai(catatArus({
      jenis: 'pengeluaran', nomor: nomorArus('KK'), sumber, kategori, penerima: penerima.trim(), keterangan: ket.trim(),
      tunai: sumber === 'bank' ? 0 : -jumlah, transfer: sumber === 'bank' ? -jumlah : 0, bank: sumber === 'bank' ? bank || undefined : undefined,
    }));
  return (
    <Dialog judul="Catat pengeluaran" onTutup={onTutup} lebar={520}
      kaki={<button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={simpan}>Simpan & cetak bukti kas keluar</button>}>
      <label className="isian">
        Kategori
        <select className="isian__kontrol" value={kategori} onChange={(e) => setKategori(e.target.value)} style={!kategori ? { color: 'var(--teks-3)' } : undefined}>
          <option value="" disabled>Pilih kategori…</option>
          {KATEGORI_PENGELUARAN.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>
      <label className="isian">Jumlah<InputRupiah id="kk-jumlah" nilai={jumlah} onUbah={setJumlah} /></label>
      {lebihLaci && <span className="teks-bahaya" style={{ fontSize: 12.5 }}>Melebihi uang di laci ({rupiah(maksLaci)}). Pilih brankas/bank atau kurangi jumlah.</span>}
      <div className="isian">
        Sumber dana
        <div className="saklar" role="group" aria-label="Sumber dana" style={{ alignSelf: 'flex-start' }}>
          <button type="button" disabled={!adaLaci} aria-pressed={sumber === 'laci'} onClick={() => setSumber('laci')}>Laci saya</button>
          <button type="button" aria-pressed={sumber === 'brankas'} onClick={() => setSumber('brankas')}>Brankas</button>
          <button type="button" aria-pressed={sumber === 'bank'} onClick={() => setSumber('bank')}>Bank</button>
        </div>
        {!adaLaci && <span className="isian__bantuan">Laci belum dibuka; pengeluaran dari laci perlu buka kasir dulu.</span>}
      </div>
      {sumber === 'bank' && <PilihBank bank={bank} setBank={setBank} />}
      <label className="isian">
        Keterangan (wajib)
        <input className="isian__kontrol" value={ket} onChange={(e) => setKet(e.target.value)} placeholder="mis. bongkar 2 colt gula dari Distributor A" />
      </label>
      <label className="isian">
        Nama penerima (wajib)
        <input className="isian__kontrol" value={penerima} onChange={(e) => setPenerima(e.target.value)} placeholder="mis. Pak Udin (kuli)" />
      </label>
      <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>Foto nota (opsional) bisa ditambahkan di versi jadi.</p>
      {perluPin && <IsianPin pin={pin} setPin={setPin} alasan={`uang dari ${sumber}`} />}
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
        <div>Kategori: {a.kategori ?? (a.jenis === 'bayar-distributor' ? 'Bayar distributor' : 'Setor bank')}</div>
        <div>Sumber: {a.sumber === 'laci' ? `Laci ${a.akun}` : a.sumber === 'bank' ? `Bank ${a.bank ?? ''}` : 'Brankas'}</div>
        <div className="struk__garis" />
        <div>{a.keterangan}</div>
        {a.faktur?.map((f) => <div key={f.id} className="struk__baris"><span>  {f.nomor}</span><span>{rupiah(f.jumlah)}</span></div>)}
        <div className="struk__baris struk__tebal"><span>JUMLAH</span><span>{rupiah(jumlah)}</span></div>
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

export function DialogBayarDistributor({ adaLaci, maksLaci = 0, onSelesai, onTutup }: { adaLaci: boolean; maksLaci?: number; onSelesai: (a: ArusKas) => void; onTutup: () => void }) {
  const toko = useToko();
  const faktur = fakturTerbuka(toko);
  const [per, setPer] = useState<Record<string, number>>({});
  const [sumber, setSumber] = useState<ArusKas['sumber']>(adaLaci ? 'laci' : 'brankas');
  const [bank, setBank] = useState('');
  const [pin, setPin] = useState('');
  const total = faktur.reduce((t, f) => t + (per[f.id] ?? 0), 0);
  const dipilih = faktur.filter((f) => (per[f.id] ?? 0) > 0);
  const distributor = [...new Set(dipilih.map((f) => f.distributorId))];
  const perluPin = sumber !== 'laci' && toko.peran !== 'pemilik';
  const lebihLaci = sumber === 'laci' && total > maksLaci;
  const siap = total > 0 && !lebihLaci && distributor.length === 1 && (!perluPin || pin === PIN_PEMILIK_CONTOH);
  const simpan = () =>
    onSelesai(catatArus({
      jenis: 'bayar-distributor', nomor: nomorArus('BD'), sumber, bank: sumber === 'bank' ? bank || undefined : undefined,
      tunai: sumber === 'bank' ? 0 : -total, transfer: sumber === 'bank' ? -total : 0,
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
                  <span className="teks-pudar">{f.lama ? tanggalPendek(f.tanggal) : f.tanggal} · sisa {rupiah(f.sisa)}{f.dibayar ? ` dari ${rupiah(f.total)}` : ''}</span>
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
      <div className="isian">
        Sumber dana
        <div className="saklar" role="group" aria-label="Sumber dana" style={{ alignSelf: 'flex-start' }}>
          <button type="button" disabled={!adaLaci} aria-pressed={sumber === 'laci'} onClick={() => setSumber('laci')}>Laci saya</button>
          <button type="button" aria-pressed={sumber === 'brankas'} onClick={() => setSumber('brankas')}>Brankas</button>
          <button type="button" aria-pressed={sumber === 'bank'} onClick={() => setSumber('bank')}>Transfer bank</button>
        </div>
        <span className="isian__bantuan">Uang titipan dari brankas: catat dulu lewat Kas masuk → Dari brankas, lalu bayar dari laci.</span>
      </div>
      {lebihLaci && <p className="catatan catatan--peringatan" style={{ margin: 0 }}>Uang di laci hanya {rupiah(maksLaci)}. Bayar sebagian, ambil titipan dari brankas dulu (Kas masuk), atau pilih brankas/bank.</p>}
      {sumber === 'bank' && <PilihBank bank={bank} setBank={setBank} />}
      {perluPin && <IsianPin pin={pin} setPin={setPin} alasan={`uang dari ${sumber}`} />}
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
  const [brankas, setBrankas] = useState(0);
  const [bank, setBank] = useState(0);
  const [bankNama, setBankNama] = useState('');
  const [prive, setPrive] = useState(0);
  const [pin, setPin] = useState('');
  const selisih = fisik - r.seharusnya;
  const dibagi = sisaLaci + brankas + bank + prive;
  const perluPin = toko.peran !== 'pemilik' && (selisih !== 0 || brankas > 0 || prive > 0);
  const siap = diisi && dibagi === fisik && (bank === 0 || !!bankNama) && (!perluPin || pin === PIN_PEMILIK_CONTOH);
  const isiFisik = (n: number) => {
    setFisik(n); setDiisi(true);
    // Bawaan: sisakan modal awal, sisanya ke brankas
    const sisa = Math.min(n, r.modal);
    setSisaLaci(sisa); setBrankas(Math.max(0, n - sisa)); setBank(0); setPrive(0);
  };
  return (
    <Dialog judul="Tutup kasir" onTutup={onTutup} lebar={540}
      kaki={<>
        {diisi && dibagi !== fisik && <p className="teks-bahaya" style={{ margin: 0, fontSize: 13 }}>Pembagian {rupiah(dibagi)} harus sama dengan uang fisik {rupiah(fisik)} (beda {rupiah(fisik - dibagi)}).</p>}
        <button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap}
          onClick={() => { const id = tutupLaci({ uangFisik: fisik, selisihDitanggung: tanggung, pembagian: { sisaLaci, brankas, bank, bankNama: bankNama || undefined, prive } }); if (id) onSelesai(id); }}>
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
            <label className="isian">Ke brankas (lewat pemilik)<InputRupiah id="tk-brankas" nilai={brankas} onUbah={setBrankas} /></label>
            <label className="isian">Setor bank<InputRupiah id="tk-bank" nilai={bank} onUbah={setBank} /></label>
            <label className="isian">Diambil pemilik (prive)<InputRupiah id="tk-prive" nilai={prive} onUbah={setPrive} /></label>
          </div>
          {bank > 0 && <PilihBank bank={bankNama} setBank={setBankNama} />}
        </div>
      )}
      {perluPin && <IsianPin pin={pin} setPin={setPin} alasan="setujui selisih / terima uang brankas / prive" />}
    </Dialog>
  );
}

/* ---------- Laporan harian ---------- */

function Baris({ k, v, tebal, minus }: { k: ReactNode; v: number; tebal?: boolean; minus?: boolean }) {
  return <div className={`struk__baris ${tebal ? 'struk__tebal' : ''}`}><span>{k}</span><span>{minus && v > 0 ? '−' : ''}{rupiah(Math.abs(v))}</span></div>;
}

export function DialogLaporanHarian({ sesiId, onTutup }: { sesiId: string; onTutup: () => void }) {
  const toko = useToko();
  const r = ringkasLaci(sesiId, toko);
  const s = r.sesi;
  const [info, setInfo] = useState('');
  const [biasa, setBiasa] = useState(false);
  const t = r.tunai;
  const tf = r.transfer;
  const keluar = r.arus.filter((a) => a.tunai < 0 && a.sumber === 'laci');
  return (
    <Dialog judul={`Laporan harian ${s.nomor}`} onTutup={onTutup} lebar={biasa ? 640 : 420}
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
        <div>Buka {new Date(s.dibukaIso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {s.ditutupIso ? ` · Tutup ${new Date(s.ditutupIso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ' · masih buka'}</div>
        <div className="struk__garis" />
        <Baris k="Modal awal" v={r.modal} tebal />
        {s.tambahBrankas > 0 && <Baris k="  termasuk dari brankas" v={s.tambahBrankas} />}
        <div className="struk__tebal" style={{ marginTop: 6 }}>Uang masuk tunai</div>
        <Baris k="  Penjualan" v={t.penjualan} />
        <Baris k="  Bayar kasbon" v={t.kasbon} />
        <Baris k="  Pesanan" v={t.pesanan} />
        {t['kas-masuk'] > 0 && <Baris k="  Kas masuk lain" v={t['kas-masuk']} />}
        {t['titipan-brankas'] > 0 && <Baris k="  Titipan brankas" v={t['titipan-brankas']} />}
        {t.retur > 0 && <Baris k="  Retur (tambah bayar)" v={t.retur} />}
        <div className="struk__tebal" style={{ marginTop: 6 }}>Uang keluar tunai</div>
        <Baris k="  Pengeluaran" v={-t.pengeluaran} minus />
        <Baris k="  Bayar distributor" v={-t['bayar-distributor']} minus />
        <Baris k="  Setor bank" v={-t['setor-bank']} minus />
        {t.retur < 0 && <Baris k="  Retur uang kembali" v={-t.retur} minus />}
        {keluar.length > 0 && keluar.map((a) => <div key={a.id} className="struk__baris" style={{ fontSize: '0.92em' }}><span>    {a.nomor} {a.penerima ?? a.bank ?? ''}</span><span>−{rupiah(-a.tunai)}</span></div>)}
        <div className="struk__garis" />
        <Baris k="SEHARUSNYA DI LACI" v={r.seharusnya} tebal />
        {s.uangFisik !== undefined && <Baris k="Uang fisik" v={s.uangFisik} />}
        {s.selisih !== undefined && (
          <div className="struk__baris struk__tebal"><span>Selisih{s.selisih ? ` (${s.selisihDitanggung === 'kasir' ? 'dibebankan kasir' : 'ditanggung toko'})` : ''}</span><span>{s.selisih > 0 ? '+' : s.selisih < 0 ? '−' : ''}{rupiah(Math.abs(s.selisih))}</span></div>
        )}
        {s.pembagian && (
          <>
            <div className="struk__garis" />
            <div className="struk__tebal">Pembagian uang fisik</div>
            <Baris k="  Sisa di laci" v={s.pembagian.sisaLaci} />
            <Baris k="  Ke brankas" v={s.pembagian.brankas} />
            <Baris k={`  Setor bank${s.pembagian.bankNama ? ` ${s.pembagian.bankNama}` : ''}`} v={s.pembagian.bank} />
            <Baris k="  Prive pemilik" v={s.pembagian.prive} />
          </>
        )}
        <div className="struk__garis" />
        <div className="struk__tebal">Non-tunai (catatan)</div>
        <Baris k="  Penjualan transfer" v={tf.penjualan} />
        <Baris k="  Kasbon & pesanan transfer" v={tf.kasbon + tf.pesanan} />
        <Baris k="  Kasbon baru" v={r.kasbonBaru} />
        <Baris k="  Potongan pembulatan/diskon akhir" v={r.potongan} />
        <div className="struk__garis" />
        <Baris k={`Total penjualan (${r.banyakNota} nota)`} v={r.omzet} tebal />
        <div style={{ marginTop: 18 }}>Kasir: ____________  Pemilik: ____________</div>
      </div>
    </Dialog>
  );
}
