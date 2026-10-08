import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { InputRupiah } from '../../components/InputRupiah';
import { aturTempo, batalkan, ringkasPesanan, serahkan, terimaBayar, type Pesanan } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { ambilProduk, ambilSatuan, angka, bolehDesimal } from '../penjualan/model';
import { labelJumlah, namaPelanggan } from './bersama';

/** Serahkan barang yang sudah siap, penuh atau sebagian. */
export function DialogSerahkan({ p, onTutup, onSelesai }: { p: Pesanan; onTutup: () => void; onSelesai: (nomorSJ: string) => void }) {
  const r = ringkasPesanan(p);
  const bisa = r.baris
    .map((x) => {
      const s = ambilSatuan(ambilProduk(x.b.produkId), x.b.satuanProdukId);
      const siapBelumDiserahkan = Math.max(0, x.siap - x.b.diserahkan);
      return { ...x, isi: s.isi, timbang: bolehDesimal(s.satuanId), maks: siapBelumDiserahkan / s.isi };
    })
    .filter((x) => x.maks > 0);
  const [jumlah, setJumlah] = useState<Record<string, string>>(() => Object.fromEntries(bisa.map((x) => [x.b.id, angka(x.maks)])));
  const [diantar, setDiantar] = useState(p.cara === 'antar');
  const nilai = (id: string) => Number((jumlah[id] ?? '').replace(/\./g, '').replace(',', '.')) || 0;
  const valid = bisa.every((x) => nilai(x.b.id) >= 0 && nilai(x.b.id) <= x.maks + 1e-9) && bisa.some((x) => nilai(x.b.id) > 0);
  const sebagian = r.baris.some((x) => {
    const b = bisa.find((y) => y.b.id === x.b.id);
    return x.sisaSerah - (b ? nilai(x.b.id) * b.isi : 0) > 1e-9;
  });

  const kaki = (
    <>
      {sebagian && <p className="catatan catatan--peringatan">Serah terima sebagian. Sisanya tetap tercatat di pesanan.</p>}
      <label className="centang"><input type="checkbox" checked={diantar} onChange={(e) => setDiantar(e.target.checked)} /> Diantar (cetak surat jalan)</label>
      <button
        type="button"
        className="tombol tombol--utama tombol--besar"
        disabled={!valid}
        onClick={() => onSelesai(serahkan(p.id, bisa.map((x) => ({ barisId: x.b.id, jumlahDasar: nilai(x.b.id) * x.isi })).filter((x) => x.jumlahDasar > 0), diantar))}
      >
        {diantar ? 'Kirim & buat surat jalan' : 'Serahkan'}
      </button>
    </>
  );

  return (
    <Dialog judul={`Serahkan ${p.nomor}`} onTutup={onTutup} lebar={560} kaki={kaki}>
      {bisa.length === 0 && <p className="teks-pudar">Belum ada barang yang siap diserahkan.</p>}
      {bisa.map((x) => (
        <div key={x.b.id} className="ps-serah">
          <div>
            <strong>{ambilProduk(x.b.produkId).nama}</strong>
            <div className="teks-pudar" style={{ fontSize: 13 }}>Siap {labelJumlah(x.b.produkId, x.b.satuanProdukId, x.maks)}</div>
          </div>
          <input
            aria-label={`Jumlah diserahkan ${ambilProduk(x.b.produkId).nama}`}
            className="isian__kontrol"
            style={{ width: 96, textAlign: 'right' }}
            inputMode={x.timbang ? 'decimal' : 'numeric'}
            value={jumlah[x.b.id]}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setJumlah((m) => ({ ...m, [x.b.id]: e.target.value.replace(x.timbang ? /[^\d.,]/g : /\D/g, '') }))}
          />
        </div>
      ))}
    </Dialog>
  );
}

/** Surat jalan / nota serah terima (tanpa harga). */
export function DialogSuratJalan({ p, nomorSJ, onTutup }: { p: Pesanan; nomorSJ: string; onTutup: () => void }) {
  const sj = p.serah.find((s) => s.nomor === nomorSJ);
  const [info, setInfo] = useState('');
  if (!sj) return null;
  const kaki = (
    <>
      <div className="baris-tombol">
        <button type="button" className="tombol tombol--utama" onClick={() => setInfo('Di versi jadi, dokumen masuk antrian stasiun printer.')}>Cetak</button>
        <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, dokumen diunduh sebagai PDF.')}>Unduh</button>
        <button type="button" className="tombol tombol--hantu" onClick={onTutup}>Tutup</button>
      </div>
      {info && <p className="catatan catatan--info">{info}</p>}
    </>
  );
  return (
    <Dialog judul={sj.diantar ? 'Surat jalan' : 'Nota serah terima'} onTutup={onTutup} lebar={440} kaki={kaki}>
      <div className="struk">
        <div className="struk__tebal">{sj.diantar ? 'SURAT JALAN' : 'NOTA SERAH TERIMA'} · {sj.nomor}</div>
        <div>[Nama Toko] · {sj.waktu}</div>
        <div className="struk__garis" />
        <div>Kepada : {namaPelanggan(p.pelangganId)}</div>
        {sj.diantar && <div>Alamat : {p.alamat ?? '-'}</div>}
        <div>Pesanan: {p.nomor}</div>
        <div className="struk__garis" />
        {sj.baris.map((x, i) => {
          const b = p.baris.find((y) => y.id === x.barisId)!;
          const s = ambilSatuan(ambilProduk(b.produkId), b.satuanProdukId);
          return (
            <div key={x.barisId} className="struk__baris">
              <span>{i + 1}. {ambilProduk(b.produkId).nama}</span>
              <span>{labelJumlah(b.produkId, b.satuanProdukId, x.jumlahDasar / s.isi)}</span>
            </div>
          );
        })}
        <div className="struk__garis" />
        <div className="sj-ttd">
          <div>Disiapkan<br /><br />(________)</div>
          {sj.diantar && <div>Pengantar<br /><br />(________)</div>}
          <div>Diterima<br /><br />(________)</div>
        </div>
      </div>
    </Dialog>
  );
}

/** Terima pembayaran pesanan atau jadikan tempo. */
export function DialogBayarPesanan({ p, onTutup }: { p: Pesanan; onTutup: () => void }) {
  const r = ringkasPesanan(p);
  const [mode, setMode] = useState<'bayar' | 'tempo'>('bayar');
  const [jumlah, setJumlah] = useState(r.sisa);
  const [metode, setMetode] = useState<'tunai' | 'transfer'>('tunai');
  const [tanggal, setTanggal] = useState(new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10));
  const valid = mode === 'tempo' ? Boolean(tanggal) : jumlah > 0 && jumlah <= r.sisa;
  const kaki = (
    <button
      type="button"
      className="tombol tombol--utama tombol--besar"
      disabled={!valid}
      onClick={() => {
        if (mode === 'tempo') aturTempo(p.id, tanggal);
        else terimaBayar(p.id, jumlah, metode, jumlah === r.sisa ? 'Pelunasan' : 'Cicilan');
        onTutup();
      }}
    >
      {mode === 'tempo' ? 'Simpan jatuh tempo' : jumlah === r.sisa ? `Lunasi ${rupiah(jumlah)}` : `Terima cicilan ${rupiah(jumlah)}`}
    </button>
  );
  return (
    <Dialog judul={`Pembayaran ${p.nomor}`} onTutup={onTutup} lebar={460} kaki={kaki}>
      <div className="ringkas-total"><span>Total pesanan</span><span>{rupiah(r.total)}</span></div>
      <div className="ringkas-total"><span>Sudah dibayar</span><span>{rupiah(r.dibayar)}</span></div>
      <div className="ringkas-total ringkas-total--besar"><span>Sisa</span><strong>{rupiah(r.sisa)}</strong></div>
      <div className="metode" role="radiogroup" aria-label="Jenis" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <button type="button" role="radio" aria-checked={mode === 'bayar'} onClick={() => setMode('bayar')}>Terima bayar</button>
        <button type="button" role="radio" aria-checked={mode === 'tempo'} onClick={() => setMode('tempo')}>Jadikan tempo</button>
      </div>
      {mode === 'bayar' ? (
        <>
          <label className="isian" htmlFor="ps-bayar">Jumlah<InputRupiah id="ps-bayar" nilai={jumlah} onUbah={setJumlah} autoFocus /></label>
          {jumlah > r.sisa && <p className="catatan catatan--bahaya">Melebihi sisa tagihan.</p>}
          <div className="saklar" role="group" aria-label="Metode" style={{ alignSelf: 'flex-start' }}>
            <button type="button" aria-pressed={metode === 'tunai'} onClick={() => setMetode('tunai')}>Tunai</button>
            <button type="button" aria-pressed={metode === 'transfer'} onClick={() => setMetode('transfer')}>Transfer</button>
          </div>
        </>
      ) : (
        <label className="isian">
          Jatuh tempo
          <input type="date" className="isian__kontrol" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          <span className="isian__bantuan">Sisa tagihan tercatat sebagai piutang pelanggan. Pembayaran bisa dicicil.</span>
        </label>
      )}
    </Dialog>
  );
}

export function DialogBatalPesanan({ p, onTutup }: { p: Pesanan; onTutup: () => void }) {
  const r = ringkasPesanan(p);
  const [alasan, setAlasan] = useState('');
  const [dp, setDp] = useState<'kembali' | 'saldo'>('kembali');
  const kaki = (
    <button type="button" className="tombol tombol--bahaya tombol--besar" disabled={!alasan.trim()} onClick={() => { batalkan(p.id, alasan.trim(), dp); onTutup(); }}>
      Batalkan pesanan
    </button>
  );
  return (
    <Dialog judul={`Batalkan ${p.nomor}?`} onTutup={onTutup} lebar={440} kaki={kaki}>
      <p className="teks-pudar" style={{ margin: 0 }}>Stok yang terkunci kembali ke stok umum. Barang yang sudah diorder tetap datang dan masuk stok umum.</p>
      <label className="isian">Alasan<input className="isian__kontrol" value={alasan} onChange={(e) => setAlasan(e.target.value)} autoFocus /></label>
      {r.dibayar > 0 && (
        <div className="kotak">
          <strong>Uang yang sudah dibayar {rupiah(r.dibayar)}</strong>
          <label className="centang"><input type="radio" name="dp" checked={dp === 'kembali'} onChange={() => setDp('kembali')} /> Dikembalikan ke pelanggan</label>
          <label className="centang"><input type="radio" name="dp" checked={dp === 'saldo'} onChange={() => setDp('saldo')} /> Disimpan sebagai saldo pelanggan</label>
        </div>
      )}
    </Dialog>
  );
}
