import { useState } from 'react';
import { bankContoh, PIN_PEMILIK_CONTOH } from '../data/contoh';
import { laciTerbuka, ringkasLaci, useToko, type ArusKas } from '../data/toko';
import { rupiah } from '../lib/format';

export interface SumberDana { sumber: ArusKas['sumber']; bank: string; pin: string }

/** Pilihan "dibayar dari" yang sama di semua uang keluar: laci kasir, brankas, atau rekening (PIN pemilik bila bukan pemilik). */
export function useSumberDana(jumlah: number) {
  const toko = useToko();
  const laci = laciTerbuka(undefined, toko);
  const uangLaci = laci ? ringkasLaci(laci.id, toko).seharusnya : 0;
  const [nilai, setNilai] = useState<SumberDana>({ sumber: laci ? 'laci' : 'brankas', bank: '', pin: '' });
  const perluPin = nilai.sumber !== 'laci' && toko.peran !== 'pemilik';
  const masalah =
    nilai.sumber === 'laci' && !laci ? 'Laci belum dibuka.'
    : nilai.sumber === 'laci' && jumlah > uangLaci ? `Melebihi uang di laci (${rupiah(uangLaci)}).`
    : nilai.sumber === 'bank' && !nilai.bank ? 'Pilih rekening.'
    : perluPin && nilai.pin !== PIN_PEMILIK_CONTOH ? 'Perlu PIN pemilik.'
    : '';
  /** Kolom uang untuk catatArus: laci/brankas = tunai, rekening = transfer (nilai negatif = keluar). */
  const uang = (n: number) => (nilai.sumber === 'bank' ? { tunai: 0, transfer: -n } : { tunai: -n, transfer: 0 });
  const tampil = (
    <div className="isian bd-kepala__lebar">
      Dibayar dari
      <div className="kb-cepat kk-sumber" role="group" aria-label="Dibayar dari">
        <button type="button" className="tombol" disabled={!laci} aria-pressed={nilai.sumber === 'laci'} onClick={() => setNilai((x) => ({ ...x, sumber: 'laci' }))}>
          Laci kasir{laci ? ` · ${rupiah(uangLaci)}` : ' (belum dibuka)'}
        </button>
        <button type="button" className="tombol" aria-pressed={nilai.sumber === 'brankas'} onClick={() => setNilai((x) => ({ ...x, sumber: 'brankas' }))}>Brankas</button>
        <button type="button" className="tombol" aria-pressed={nilai.sumber === 'bank'} onClick={() => setNilai((x) => ({ ...x, sumber: 'bank' }))}>Rekening (transfer)</button>
      </div>
      {nilai.sumber === 'bank' && (
        <div className="kb-cepat">
          {bankContoh.map((b) => <button key={b} type="button" className="tombol tombol--kecil" aria-pressed={nilai.bank === b} onClick={() => setNilai((x) => ({ ...x, bank: b }))}>{b}</button>)}
        </div>
      )}
      {perluPin && (
        <label className="isian" style={{ maxWidth: 260 }}>
          PIN pemilik · uang dari {nilai.sumber === 'bank' ? 'rekening' : 'brankas'}
          <input className="isian__kontrol" type="password" inputMode="numeric" value={nilai.pin} onChange={(e) => setNilai((x) => ({ ...x, pin: e.target.value }))} />
        </label>
      )}
      {masalah && jumlah > 0 && <span className="teks-bahaya" style={{ fontSize: 12.5 }}>{masalah}</span>}
    </div>
  );
  return { nilai, siap: !masalah, masalah, uang, tampil, bank: nilai.sumber === 'bank' ? nilai.bank : undefined };
}
