import { useState } from 'react';
import { DialogPilihBarang } from '../../components/DialogPilihBarang';
import { InputRupiah } from '../../components/InputRupiah';
import { bankContoh, distributorContoh, PIN_PEMILIK_CONTOH } from '../../data/contoh';
import { buatFakturTunai, hariIni, laciTerbuka, ringkasLaci, useToko, type ArusKas } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { tanggalPendek } from '../kasbon/bersama';
import { ambilProduk } from '../penjualan/model';

interface Baris { id: string; produkId: string; satuanProdukId: string; qty: number; harga: number }

/**
 * Faktur tunai — belanja barang dagangan tanpa nota distributor (mis. beli di toko sebelah saat stok habis).
 * Toko membuat fakturnya sendiri; langsung dibayar dan stok bertambah. Masuk laporan sebagai belanja barang.
 */
export function FormFakturTunai({ onBatal, onSelesai }: { onBatal: () => void; onSelesai: (a: ArusKas) => void }) {
  const toko = useToko();
  const laci = laciTerbuka(undefined, toko);
  const uang = laci ? ringkasLaci(laci.id, toko).seharusnya : 0;
  const [pemasok, setPemasok] = useState('');
  const [namaLain, setNamaLain] = useState('');
  const [nomorNota, setNomorNota] = useState('');
  const [baris, setBaris] = useState<Baris[]>([]);
  const [pilih, setPilih] = useState(false);
  const [sumber, setSumber] = useState<ArusKas['sumber']>(laci ? 'laci' : 'brankas');
  const [bank, setBank] = useState('');
  const [pin, setPin] = useState('');
  const ubah = (id: string, patch: Partial<Baris>) => setBaris((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const total = Math.round(baris.reduce((t, b) => t + b.qty * b.harga, 0));
  const nama = pemasok === 'lain' ? namaLain.trim() : distributorContoh.find((d) => d.id === pemasok)?.nama ?? '';
  const lebih = sumber === 'laci' && total > uang;
  const perluPin = sumber !== 'laci' && toko.peran !== 'pemilik';
  const siap = !!nama && baris.length > 0 && baris.every((b) => b.qty > 0 && b.harga > 0) && total > 0 && !lebih
    && (sumber !== 'laci' || !!laci) && (sumber !== 'bank' || !!bank) && (!perluPin || pin === PIN_PEMILIK_CONTOH);
  const simpan = () => {
    if (!siap) return;
    const { arus } = buatFakturTunai({
      distributorId: pemasok === 'lain' ? `lain:${nama}` : pemasok, namaPemasok: nama, nomorNota: nomorNota.trim() || undefined,
      sumber, bank: sumber === 'bank' ? bank : undefined, baris: baris.map(({ produkId, satuanProdukId, qty, harga }) => ({ produkId, satuanProdukId, qty, harga })),
    });
    onSelesai(arus);
  };
  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <h2 style={{ margin: 0 }}>Faktur tunai (belanja tanpa nota)</h2>
        <button type="button" className="tautan" onClick={onBatal}>← Kembali</button>
      </div>
      <p className="teks-pudar" style={{ margin: 0, fontSize: 13 }}>
        Untuk barang dagangan yang dibeli tunai tanpa faktur distributor. Toko membuat fakturnya, langsung lunas, dan stok bertambah.
        Kebutuhan toko (plastik, sapu, token listrik) dicatat di Pengeluaran, bukan di sini.
      </p>
      <div className="kartu bd-kepala">
        <label className="isian">Tanggal<input className="isian__kontrol" value={tanggalPendek(hariIni())} readOnly /></label>
        <label className="isian">No. faktur<input className="isian__kontrol" value="FT-… (otomatis)" readOnly /></label>
        <label className="isian">
          Dibeli dari
          <select className="isian__kontrol" value={pemasok} onChange={(e) => setPemasok(e.target.value)} style={!pemasok ? { color: 'var(--teks-3)' } : undefined}>
            <option value="" disabled>Pilih penjual…</option>
            {distributorContoh.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
            <option value="lain">Penjual lain (toko sebelah, pasar, dll.)</option>
          </select>
        </label>
        {pemasok === 'lain' ? (
          <label className="isian">
            Nama penjual
            <input className="isian__kontrol" value={namaLain} onChange={(e) => setNamaLain(e.target.value)} placeholder="mis. Toko Makmur blok B" />
          </label>
        ) : (
          <label className="isian">
            No. nota / kuitansi (opsional)
            <input className="isian__kontrol" value={nomorNota} onChange={(e) => setNomorNota(e.target.value)} placeholder="bila ada" />
          </label>
        )}
        <div className="isian bd-kepala__lebar">
          Dibayar dari
          <div className="kb-cepat kk-sumber" role="group" aria-label="Dibayar dari">
            <button type="button" className="tombol" disabled={!laci} aria-pressed={sumber === 'laci'} onClick={() => setSumber('laci')}>Laci kasir{laci ? ` · ${rupiah(uang)}` : ' (belum dibuka)'}</button>
            <button type="button" className="tombol" aria-pressed={sumber === 'brankas'} onClick={() => setSumber('brankas')}>Brankas</button>
            <button type="button" className="tombol" aria-pressed={sumber === 'bank'} onClick={() => setSumber('bank')}>Rekening (transfer)</button>
          </div>
          {sumber !== 'laci' && <span className="isian__bantuan">Uang pemilik. Perlu PIN pemilik.</span>}
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
        {baris.length > 0 && (
          <table className="ps-tabel ps-tabel--hp bd-tabel bd-form">
            <thead><tr><th>Barang</th><th>Satuan</th><th className="kanan">Jumlah</th><th className="kanan">Harga beli</th><th className="kanan">Subtotal</th><th aria-label="Hapus" /></tr></thead>
            <tbody>
              {baris.map((b) => {
                const p = ambilProduk(b.produkId);
                return (
                  <tr key={b.id} style={{ cursor: 'default' }}>
                    <td data-label="Barang"><strong>{p.nama}</strong></td>
                    <td data-label="Satuan">
                      <select className="isian__kontrol" aria-label={`Satuan ${p.nama}`} value={b.satuanProdukId} onChange={(e) => ubah(b.id, { satuanProdukId: e.target.value })}>
                        {p.satuan.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </td>
                    <td data-label="Jumlah" className="kanan">
                      <input className="isian__kontrol kk-qty" type="number" min={0} inputMode="decimal" aria-label={`Jumlah ${p.nama}`} value={b.qty || ''} onChange={(e) => ubah(b.id, { qty: Number(e.target.value) })} />
                    </td>
                    <td data-label="Harga beli" className="kanan"><InputRupiah id={`ft-${b.id}`} nilai={b.harga} label={`Harga ${p.nama}`} onUbah={(n) => ubah(b.id, { harga: n })} /></td>
                    <td data-label="Subtotal" className="kanan">{rupiah(Math.round(b.qty * b.harga))}</td>
                    <td data-label=""><button type="button" className="tautan teks-bahaya" onClick={() => setBaris((xs) => xs.filter((x) => x.id !== b.id))}>Hapus</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <button type="button" className="tombol tombol--putus" style={{ marginTop: 10 }} onClick={() => setPilih(true)}>+ Tambah barang</button>
      </div>

      <div className="kartu bd-kaki">
        <div className="bd-kaki__angka">
          {perluPin && (
            <label className="isian">
              PIN pemilik · uang dari {sumber === 'bank' ? 'rekening' : 'brankas'}
              <input className="isian__kontrol" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
            </label>
          )}
        </div>
        <div className="bd-kaki__angka">
          <div className="ringkas-total ringkas-total--besar"><span>Total faktur ({baris.length} barang)</span><strong>{rupiah(total)}</strong></div>
          {lebih && <p className="catatan catatan--peringatan" style={{ margin: 0 }}>Melebihi uang di laci ({rupiah(uang)}).</p>}
          <div className="baris-tombol" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="tombol" onClick={onBatal}>Batal</button>
            <button type="button" className="tombol tombol--utama" disabled={!siap} onClick={simpan}>Simpan, bayar & cetak bukti</button>
          </div>
        </div>
      </div>
      {pilih && (
        <DialogPilihBarang judul="Pilih barang dibeli" onTutup={() => setPilih(false)} onPilih={(p) => {
          const satuanBeli = p.satuan.find((s) => s.dibeli) ?? p.satuan[0];
          setBaris((xs) => [...xs, { id: Math.random().toString(36).slice(2), produkId: p.id, satuanProdukId: satuanBeli.id, qty: 1, harga: 0 }]);
          setPilih(false);
        }} />
      )}
    </div>
  );
}
