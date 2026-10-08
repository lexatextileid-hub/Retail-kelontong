import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { InputRupiah } from '../../components/InputRupiah';
import { bankContoh } from '../../data/contoh';
import { bayarKasbon, kembalikanSaldo, laciTerbuka, ringkasKasbon, ringkasLaci, saldoPelanggan, useToko, type BayarKasbon, type PelangganKasbon, type TagihanKasbon } from '../../data/toko';
import { alokasiTertua } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { uangCepat } from '../penjualan/DialogBayar';
import { ChipSumber, tanggalPendek } from './bersama';

/**
 * Terima pembayaran kasbon (pola "terima pembayaran" seperti QuickBooks/Accurate):
 * daftar nota belum lunas dengan centang + kolom bayar. Ketik jumlah total → diisi dari nota tertua.
 * Centang nota → dibayar penuh. Kolom bayar per nota bisa diubah. Satu transaksi bisa 1 nota atau beberapa.
 */
export function DialogBayarKasbon({
  pelanggan,
  tagihan,
  notaDipilih = [],
  onTutup,
  onSelesai,
}: {
  pelanggan: PelangganKasbon;
  tagihan: TagihanKasbon[];
  /** Nota yang dicentang dari layar detail: langsung terisi penuh. */
  notaDipilih?: string[];
  onTutup: () => void;
  onSelesai: (b: BayarKasbon) => void;
}) {
  const terbuka = tagihan.filter((t) => t.sisa > 0);
  const saldo = terbuka.reduce((t, x) => t + x.sisa, 0);
  const [per, setPer] = useState<Record<string, number>>(() =>
    Object.fromEntries(terbuka.filter((t) => notaDipilih.includes(t.id)).map((t) => [t.id, t.sisa])),
  );
  const [metode, setMetode] = useState<'tunai' | 'transfer' | 'saldo'>('tunai');
  const [bank, setBank] = useState('');
  const [diterima, setDiterima] = useState(0);
  const saldoPlg = saldoPelanggan(pelanggan.id);

  const bayar = terbuka.reduce((t, x) => t + (per[x.id] ?? 0), 0);
  const isiTotal = (n: number) =>
    setPer(Object.fromEntries(alokasiTertua(terbuka, Math.min(n, saldo)).map((a) => [a.notaId, a.jumlah])));
  const centang = (t: TagihanKasbon, ya: boolean) => setPer((m) => ({ ...m, [t.id]: ya ? t.sisa : 0 }));
  const semuaDicentang = terbuka.length > 0 && terbuka.every((t) => (per[t.id] ?? 0) >= t.sisa);
  const banyakNota = terbuka.filter((t) => (per[t.id] ?? 0) > 0).length;

  const kembalian = metode === 'tunai' ? Math.max(0, diterima - bayar) : 0;
  const kurangUang = metode === 'tunai' && diterima > 0 && diterima < bayar;
  const saldoKurang = metode === 'saldo' && bayar > saldoPlg;
  const siap = bayar > 0 && !kurangUang && !saldoKurang;

  const simpan = () => {
    if (!siap) return;
    const alokasi = terbuka.filter((t) => (per[t.id] ?? 0) > 0).map((t) => ({ notaId: t.id, jumlah: per[t.id] }));
    onSelesai(bayarKasbon({ pelangganId: pelanggan.id, jumlah: bayar, metode, bank: bank.trim() || undefined, alokasi }));
  };

  const kaki = (
    <div className="tumpuk" style={{ gap: 8 }}>
      <div className="ringkas-total"><span>{banyakNota} nota dibayar · sisa kasbon setelah ini</span><strong>{rupiah(saldo - bayar)}</strong></div>
      {kembalian > 0 && <div className="ringkas-total ringkas-total--besar"><span>Kembalian</span><strong>{rupiah(kembalian)}</strong></div>}
      <button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={simpan}>
        Terima {rupiah(bayar)}
      </button>
    </div>
  );

  return (
    <Dialog judul={`Bayar kasbon · ${pelanggan.nama}`} onTutup={onTutup} lebar={600} kaki={kaki}>
      <div className="isian">
        Jumlah bayar
        <div className="kb-jumlah">
          <InputRupiah id="kb-jumlah" nilai={bayar} onUbah={isiTotal} autoFocus={!notaDipilih.length} label="Jumlah bayar" />
          <button type="button" className="tombol" onClick={() => isiTotal(saldo)}>Lunasi semua</button>
        </div>
        <span className="isian__bantuan">Ketik jumlah → otomatis menutup nota tertua dulu. Atau centang nota yang mau dibayar.</span>
      </div>

      <div className="kb-alokasi">
        <label className="kb-alokasi__kepala centang">
          <input type="checkbox" checked={semuaDicentang} onChange={(e) => isiTotal(e.target.checked ? saldo : 0)} />
          <span>Nota belum lunas ({terbuka.length})</span>
          <span className="teks-pudar">Kasbon {rupiah(saldo)}</span>
        </label>
        {terbuka.map((t) => {
          const a = per[t.id] ?? 0;
          return (
            <div key={t.id} className={`kb-alokasi__baris ${a > 0 ? 'kb-alokasi__baris--pilih' : ''}`}>
              <input type="checkbox" className="kb-centang" aria-label={`Centang ${t.nomor}`} checked={a > 0} onChange={(e) => centang(t, e.target.checked)} />
              <div className="kb-alokasi__info">
                <span><strong>{t.nomor}</strong> <ChipSumber sumber={t.sumber} /></span>
                <span className="teks-pudar">{tanggalPendek(t.tanggal)} · sisa {rupiah(t.sisa)}</span>
              </div>
              <div className="kb-alokasi__isi">
                <InputRupiah id={`kb-${t.id}`} nilai={a} label={`Bayar ${t.nomor}`} onUbah={(n) => setPer((m) => ({ ...m, [t.id]: Math.min(n, t.sisa) }))} />
                <span className={`chip-status chip-status--${a === 0 ? 'abu' : a >= t.sisa ? 'hijau' : 'kuning'}`}>
                  {a === 0 ? 'Belum' : a >= t.sisa ? 'Lunas' : 'Sebagian'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="isian">
        Cara bayar
        <div className="saklar" role="group" aria-label="Cara bayar" style={{ alignSelf: 'flex-start' }}>
          <button type="button" aria-pressed={metode === 'tunai'} onClick={() => setMetode('tunai')}>Tunai</button>
          <button type="button" aria-pressed={metode === 'transfer'} onClick={() => setMetode('transfer')}>Transfer</button>
          {saldoPlg > 0 && <button type="button" aria-pressed={metode === 'saldo'} onClick={() => setMetode('saldo')}>Saldo {rupiah(saldoPlg)}</button>}
        </div>
      </div>
      {metode === 'saldo' ? (
        <p className={saldoKurang ? 'catatan catatan--peringatan' : 'teks-pudar'} style={{ margin: 0, fontSize: 13 }}>
          {saldoKurang ? `Saldo hanya ${rupiah(saldoPlg)}. Kurangi jumlah bayar.` : `Dibayar dari saldo pelanggan (mis. DP pesanan batal). Sisa saldo ${rupiah(saldoPlg - bayar)}.`}
        </p>
      ) : metode === 'tunai' ? (
        <div className="isian">
          Uang diterima (opsional, untuk kembalian)
          <InputRupiah id="kb-diterima" nilai={diterima} onUbah={setDiterima} label="Uang diterima" />
          {bayar > 0 && (
            <div className="kb-cepat">
              {uangCepat(bayar).map((u) => (
                <button key={u} type="button" className="tombol tombol--kecil" onClick={() => setDiterima(u)}>{rupiah(u)}</button>
              ))}
            </div>
          )}
          {kurangUang && <span className="teks-bahaya" style={{ fontSize: 12.5 }}>Uang diterima kurang dari jumlah bayar.</span>}
        </div>
      ) : (
        <div className="isian">
          Ke rekening (keterangan)
          <div className="kb-cepat">
            {bankContoh.map((b) => (
              <button key={b} type="button" className="tombol tombol--kecil" aria-pressed={bank === b} onClick={() => setBank(bank === b ? '' : b)}>{b}</button>
            ))}
          </div>
          <input className="isian__kontrol" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="mis. BCA, atau ketik lain" />
        </div>
      )}
    </Dialog>
  );
}

/** Bukti pembayaran kasbon (thermal). */
export function DialogStrukKasbon({ bayar, nama, onTutup }: { bayar: BayarKasbon; nama: string; onTutup: () => void }) {
  const [info, setInfo] = useState('');
  const sisa = ringkasKasbon(bayar.pelangganId).saldo;
  return (
    <Dialog judul={`Pembayaran ${bayar.nomor} tersimpan`} onTutup={onTutup} lebar={420}>
      <div className="struk" aria-label="Pratinjau bukti bayar kasbon">
        <div className="struk__tengah">
          <strong>[Nama Toko]</strong>
          <div>[Alamat toko] · [No. HP]</div>
        </div>
        <div className="struk__garis" />
        <div className="struk__tengah struk__tebal">BUKTI BAYAR KASBON</div>
        <div>{bayar.nomor} · {bayar.waktu}</div>
        <div>Pelanggan: {nama} · {bayar.oleh}</div>
        <div className="struk__garis" />
        {bayar.alokasi.map((a) => (
          <div key={a.notaId} className="struk__baris"><span>{a.nomor}</span><span>{rupiah(a.jumlah)}</span></div>
        ))}
        <div className="struk__garis" />
        <div className="struk__baris struk__tebal"><span>DIBAYAR</span><span>{rupiah(bayar.jumlah)}</span></div>
        <div className="struk__baris"><span>{bayar.metode === 'tunai' ? 'Tunai' : bayar.metode === 'saldo' ? 'Saldo pelanggan' : `Transfer${bayar.bank ? ` ${bayar.bank}` : ''}`}</span><span>{rupiah(bayar.jumlah)}</span></div>
        <div className="struk__baris struk__tebal"><span>Sisa kasbon</span><span>{rupiah(sisa)}</span></div>
        <div className="struk__garis" />
        <div className="struk__tengah">Terima kasih.</div>
      </div>
      <div className="baris-tombol">
        <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, bukti masuk antrian stasiun printer.')}>Cetak</button>
        <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, bukti diunduh sebagai gambar/PDF.')}>Unduh</button>
      </div>
      {info && <p className="catatan catatan--info">{info}</p>}
      <button type="button" className="tombol tombol--utama tombol--besar" onClick={onTutup} autoFocus>Selesai</button>
    </Dialog>
  );
}

/** Kembalikan saldo pelanggan (mis. DP pesanan batal) — uang keluar dari laci (tunai) atau rekening (transfer). */
export function DialogKembalikanSaldo({ pelangganId, nama, onTutup }: { pelangganId: string; nama: string; onTutup: () => void }) {
  const toko = useToko();
  const saldo = saldoPelanggan(pelangganId, toko);
  const laci = laciTerbuka(undefined, toko);
  const uangLaci = laci ? ringkasLaci(laci.id, toko).seharusnya : 0;
  const [jumlah, setJumlah] = useState(saldo);
  const [metode, setMetode] = useState<'tunai' | 'transfer'>('tunai');
  const [bank, setBank] = useState('');
  const masalah = jumlah <= 0 ? '' : jumlah > saldo ? `Melebihi saldo (${rupiah(saldo)}).`
    : metode === 'tunai' && !laci ? 'Laci belum dibuka — buka kasir dulu atau kembalikan lewat transfer.'
    : metode === 'tunai' && jumlah > uangLaci ? `Uang di laci hanya ${rupiah(uangLaci)}.` : '';
  return (
    <Dialog judul={`Kembalikan saldo ${nama}`} onTutup={onTutup} lebar={440}
      kaki={<button type="button" className="tombol tombol--utama tombol--besar" disabled={jumlah <= 0 || !!masalah}
        onClick={() => { kembalikanSaldo(pelangganId, jumlah, metode, metode === 'transfer' ? bank.trim() || undefined : undefined); onTutup(); }}>
        Kembalikan {rupiah(jumlah)}
      </button>}>
      <div className="ringkas-total"><span>Saldo pelanggan</span><strong>{rupiah(saldo)}</strong></div>
      <label className="isian">Jumlah dikembalikan<InputRupiah id="sl-jumlah" nilai={jumlah} onUbah={setJumlah} autoFocus /></label>
      <div className="saklar" role="group" aria-label="Cara" style={{ alignSelf: 'flex-start' }}>
        <button type="button" aria-pressed={metode === 'tunai'} onClick={() => setMetode('tunai')}>Tunai dari laci</button>
        <button type="button" aria-pressed={metode === 'transfer'} onClick={() => setMetode('transfer')}>Transfer</button>
      </div>
      {metode === 'transfer' && (
        <label className="isian">Ke rekening (keterangan)<input className="isian__kontrol" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="mis. BCA a.n. pelanggan" /></label>
      )}
      {masalah && <p className="catatan catatan--peringatan" style={{ margin: 0 }}>{masalah}</p>}
      <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>Tercatat sebagai uang keluar "kembali ke pelanggan" di kas dan laporan.</p>
    </Dialog>
  );
}
