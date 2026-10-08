import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { PIN_PEMILIK_CONTOH, type PelangganContoh } from '../../data/contoh';
import { useToko } from '../../data/toko';
import { kunciNama } from '../../domain/satuanBawaan';
import { rupiah } from '../../lib/format';
import { ambilProduk, ambilSatuan, angka, type Nota, type Tertahan } from './model';

const CATATAN_STRUK = 'Retur barang harus dengan nota, maksimal 3×24 jam.';

export function DialogStruk({ nota, onSelesai }: { nota: Nota; onSelesai: () => void }) {
  const [info, setInfo] = useState('');
  return (
    <Dialog judul={`Transaksi ${nota.nomor} selesai`} onTutup={onSelesai} lebar={420}>
      <IsiStruk nota={nota} />
      <div className="baris-tombol">
        <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, struk masuk antrian stasiun printer.')}>Cetak</button>
        <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, struk diunduh sebagai gambar/PDF.')}>Unduh</button>
        <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, struk dikirim ke WhatsApp pelanggan.')}>WhatsApp</button>
      </div>
      {info && <p className="catatan catatan--info">{info}</p>}
      <button type="button" className="tombol tombol--utama tombol--besar" onClick={onSelesai} autoFocus>
        Transaksi baru
      </button>
    </Dialog>
  );
}

/** Isi struk penjualan (dipakai saat transaksi selesai dan cetak ulang dari Riwayat). */
export function IsiStruk({ nota, salinan }: { nota: Nota; salinan?: boolean }) {
  return (
      <div className="struk" aria-label="Pratinjau struk">
        {salinan && <div className="struk__tengah struk__tebal">*** SALINAN ***</div>}
        <div className="struk__tengah">
          <strong>[Nama Toko]</strong>
          <div>[Alamat toko] · [No. HP]</div>
        </div>
        <div className="struk__garis" />
        <div>{nota.nomor} · {nota.waktu}</div>
        <div>Kasir: {nota.kasir} · Pelanggan: {nota.pelanggan}</div>
        <div className="struk__garis" />
        {nota.baris.map((b, i) => (
          <div key={i}>
            <div>{b.nama}</div>
            <div className="struk__baris">
              <span>{angka(b.qty)} {b.label} × {rupiah(b.hargaSatuan)}</span>
              <span>{rupiah(b.bruto)}</span>
            </div>
            {b.diskon > 0 && (
              <div className="struk__baris"><span>  Diskon</span><span>−{rupiah(b.diskon)}</span></div>
            )}
          </div>
        ))}
        <div className="struk__garis" />
        <div className="struk__baris"><span>Subtotal</span><span>{rupiah(nota.subtotal)}</span></div>
        {nota.diskonPelanggan > 0 && <div className="struk__baris"><span>Diskon</span><span>−{rupiah(nota.diskonPelanggan)}</span></div>}
        {nota.potongan > 0 && <div className="struk__baris"><span>{nota.jenisPotongan}</span><span>−{rupiah(nota.potongan)}</span></div>}
        <div className="struk__baris struk__tebal"><span>TOTAL BELANJA</span><span>{rupiah(nota.total)}</span></div>
        {nota.bayarKasbon > 0 && <div className="struk__baris"><span>Bayar kasbon</span><span>{rupiah(nota.bayarKasbon)}</span></div>}
        {nota.tunai > 0 && <div className="struk__baris"><span>Tunai</span><span>{rupiah(nota.tunai)}</span></div>}
        {nota.transfer > 0 && <div className="struk__baris"><span>Transfer</span><span>{rupiah(nota.transfer)}</span></div>}
        {nota.kembalian > 0 && <div className="struk__baris"><span>Kembalian</span><span>{rupiah(nota.kembalian)}</span></div>}
        {nota.kasbonBaru > 0 && <div className="struk__baris"><span>Kasbon baru</span><span>{rupiah(nota.kasbonBaru)}</span></div>}
        {nota.sisaKasbon !== undefined && (nota.bayarKasbon > 0 || nota.kasbonBaru > 0) && (
          <div className="struk__baris struk__tebal"><span>Sisa kasbon</span><span>{rupiah(nota.sisaKasbon)}</span></div>
        )}
        <div className="struk__garis" />
        <div className="struk__tengah">{CATATAN_STRUK}</div>
      </div>
  );
}

export function DialogTahan({
  namaAwal,
  onTahan,
  onTutup,
}: {
  namaAwal: string;
  onTahan: (nama: string, cetakSiapkan: boolean) => void;
  onTutup: () => void;
}) {
  const [nama, setNama] = useState(namaAwal);
  const [cetak, setCetak] = useState(false);
  return (
    <Dialog judul="Tahan transaksi" onTutup={onTutup} lebar={420}>
      <form
        className="tumpuk"
        onSubmit={(e) => {
          e.preventDefault();
          if (nama.trim()) onTahan(nama.trim(), cetak);
        }}
      >
        <label className="isian">
          Nama penanda
          <input id="nama-tahan" className="isian__kontrol" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Bu Sri, Bapak topi merah" autoFocus />
        </label>
        <label className="centang">
          <input type="checkbox" checked={cetak} onChange={(e) => setCetak(e.target.checked)} />
          Cetak Daftar Siapkan (pesanan WA untuk disiapkan staf)
        </label>
        <p className="teks-pudar" style={{ margin: 0, fontSize: 13 }}>
          Stok belum berkurang, tapi barangnya ditandai "sedang dipesan".
        </p>
        <button type="submit" className="tombol tombol--utama" disabled={!nama.trim()}>Tahan</button>
      </form>
    </Dialog>
  );
}

export function DialogDaftarSiapkan({ tertahan, onTutup }: { tertahan: Tertahan; onTutup: () => void }) {
  return (
    <Dialog judul="Daftar Siapkan" onTutup={onTutup} lebar={420}>
      <div className="struk">
        <div className="struk__tebal">DAFTAR SIAPKAN</div>
        <div>{tertahan.nama} · {tertahan.waktu}</div>
        <div className="struk__garis" />
        {tertahan.keranjang.baris.map((b) => {
          const p = ambilProduk(b.produkId);
          const s = ambilSatuan(p, b.satuanProdukId);
          return (
            <div key={b.id} style={{ marginBottom: 6 }}>
              <div>☐ {p.nama}</div>
              <div className="struk__baris"><span>   {angka(b.qty)} {s.label}</span><span>{p.letak ?? '-'}</span></div>
            </div>
          );
        })}
        <div className="struk__garis" />
        <div>Disiapkan oleh: ______________</div>
      </div>
      <button type="button" className="tombol tombol--utama" onClick={onTutup}>Selesai</button>
    </Dialog>
  );
}

export function DialogPelangganBaru({
  daftar,
  onSimpan,
  onTutup,
}: {
  daftar: PelangganContoh[];
  onSimpan: (nama: string, hp: string, tempoHari: number) => void;
  onTutup: () => void;
}) {
  const [nama, setNama] = useState('');
  const [hp, setHp] = useState('');
  const [tempo, setTempo] = useState(0);
  const [pin, setPin] = useState('');
  const { peran } = useToko();
  // Tempo bayar harus disetujui pemilik: akun selain pemilik memakai PIN pemilik.
  const perluPin = tempo > 0 && peran !== 'pemilik';
  const siap = !!nama.trim() && (!perluPin || pin === PIN_PEMILIK_CONTOH);
  const mirip = nama.trim()
    ? daftar.filter((p) => {
        const a = kunciNama(p.nama);
        const b = kunciNama(nama);
        return a === b || a.includes(b) || b.includes(a);
      })
    : [];
  return (
    <Dialog judul="Pelanggan baru" onTutup={onTutup} lebar={420}>
      <form
        className="tumpuk"
        onSubmit={(e) => {
          e.preventDefault();
          if (siap) onSimpan(nama.trim(), hp.trim(), tempo);
        }}
      >
        <label className="isian">
          Nama
          <input id="pelanggan-nama" className="isian__kontrol" value={nama} onChange={(e) => setNama(e.target.value)} autoFocus />
        </label>
        {mirip.length > 0 && (
          <p className="catatan catatan--peringatan">Mirip dengan pelanggan yang sudah ada: {mirip.map((p) => p.nama).join(', ')}. Pastikan bukan orang yang sama.</p>
        )}
        <label className="isian">
          Nomor HP
          <input id="pelanggan-hp" className="isian__kontrol" inputMode="tel" value={hp} onChange={(e) => setHp(e.target.value)} />
        </label>
        <label className="isian">
          Tempo bayar kasbon (hari) · opsional
          <input id="pelanggan-tempo" className="isian__kontrol" inputMode="numeric" value={tempo || ''} placeholder="kosong = belum diatur"
            onChange={(e) => setTempo(Number(e.target.value.replace(/\D/g, '')) || 0)} />
          <span className="isian__bantuan">Tempo harus disetujui pemilik{peran !== 'pemilik' ? ', isi PIN pemilik di bawah' : ''}. Bisa juga diatur nanti di Back Office.</span>
        </label>
        {perluPin && (
          <label className="isian">
            PIN pemilik
            <input id="pelanggan-pin" className="isian__kontrol" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
            {pin.length >= 4 && pin !== PIN_PEMILIK_CONTOH && <span className="teks-bahaya" style={{ fontSize: 12.5 }}>PIN salah.</span>}
          </label>
        )}
        <p className="teks-pudar" style={{ margin: 0, fontSize: 13 }}>
          Batas kasbon otomatis Rp 0. Pemilik yang mengatur batas kasbon dan diskon di Back Office.
        </p>
        <button type="submit" className="tombol tombol--utama" disabled={!siap}>Simpan pelanggan</button>
      </form>
    </Dialog>
  );
}
