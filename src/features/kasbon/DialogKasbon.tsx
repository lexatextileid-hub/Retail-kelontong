import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { InputRupiah } from '../../components/InputRupiah';
import { bankContoh } from '../../data/contoh';
import { bayarKasbon, ringkasKasbon, type BayarKasbon, type PelangganKasbon, type TagihanKasbon } from '../../data/toko';
import { alokasiTertua } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { uangCepat } from '../penjualan/DialogBayar';
import { ChipSumber, tanggalPendek } from './bersama';

/** Terima pembayaran kasbon: sebagian/penuh, tunai/transfer; menutup tagihan tertua dulu (bisa dipilih manual). */
export function DialogBayarKasbon({
  pelanggan,
  tagihan,
  notaAwal,
  onTutup,
  onSelesai,
}: {
  pelanggan: PelangganKasbon;
  tagihan: TagihanKasbon[];
  /** Dibuka dari satu baris tagihan: langsung mode "Pilih nota" dengan nota itu dilunasi. */
  notaAwal?: string;
  onTutup: () => void;
  onSelesai: (b: BayarKasbon) => void;
}) {
  const terbuka = tagihan.filter((t) => t.sisa > 0);
  const saldo = terbuka.reduce((t, x) => t + x.sisa, 0);
  const [jumlah, setJumlah] = useState(0);
  const [metode, setMetode] = useState<'tunai' | 'transfer'>('tunai');
  const [bank, setBank] = useState('');
  const [diterima, setDiterima] = useState(0);
  const awal = notaAwal ? terbuka.find((t) => t.id === notaAwal) : undefined;
  const [manual, setManual] = useState(!!awal);
  const [pilih, setPilih] = useState<Record<string, number>>(awal ? { [awal.id]: awal.sisa } : {});

  const totalManual = Object.values(pilih).reduce((t, x) => t + x, 0);
  const bayar = manual ? totalManual : jumlah;
  const alokasi = manual
    ? terbuka.filter((t) => (pilih[t.id] ?? 0) > 0).map((t) => ({ notaId: t.id, jumlah: Math.min(pilih[t.id], t.sisa) }))
    : alokasiTertua(terbuka, jumlah);
  const kembalian = metode === 'tunai' ? Math.max(0, diterima - bayar) : 0;
  const kurangUang = metode === 'tunai' && diterima > 0 && diterima < bayar;
  const siap = bayar > 0 && bayar <= saldo && !kurangUang;

  const simpan = () => {
    if (!siap) return;
    onSelesai(bayarKasbon({ pelangganId: pelanggan.id, jumlah: bayar, metode, bank: bank.trim() || undefined, alokasi }));
  };

  const kaki = (
    <div className="tumpuk" style={{ gap: 10 }}>
      <div className="ringkas-total"><span>Sisa kasbon setelah ini</span><strong>{rupiah(Math.max(0, saldo - bayar))}</strong></div>
      {kembalian > 0 && <div className="ringkas-total ringkas-total--besar"><span>Kembalian</span><strong>{rupiah(kembalian)}</strong></div>}
      <button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={simpan}>
        Terima {rupiah(bayar)}
      </button>
    </div>
  );

  return (
    <Dialog judul={`Bayar kasbon · ${pelanggan.nama}`} onTutup={onTutup} lebar={560} kaki={kaki}>
      <div className="ringkas-total"><span>Kasbon sekarang</span><strong>{rupiah(saldo)}</strong></div>

      <div className="saklar" role="group" aria-label="Cara bagi pembayaran" style={{ alignSelf: 'flex-start' }}>
        <button type="button" aria-pressed={!manual} onClick={() => setManual(false)}>Tertua dulu</button>
        <button type="button" aria-pressed={manual} onClick={() => setManual(true)}>Pilih nota</button>
      </div>

      {!manual ? (
        <div className="isian">
          Jumlah bayar
          <div className="kb-jumlah">
            <InputRupiah id="kb-jumlah" nilai={jumlah} onUbah={setJumlah} autoFocus label="Jumlah bayar" />
            <button type="button" className="tombol" onClick={() => setJumlah(saldo)}>Lunasi</button>
          </div>
          {jumlah > saldo && <span className="teks-bahaya" style={{ fontSize: 12.5 }}>Melebihi kasbon {rupiah(saldo)}.</span>}
        </div>
      ) : null}

      <div className="kb-alokasi">
        {terbuka.map((t) => {
          const a = alokasi.find((x) => x.notaId === t.id)?.jumlah ?? 0;
          return (
            <div key={t.id} className="kb-alokasi__baris">
              <div className="kb-alokasi__info">
                <span><strong>{t.nomor}</strong> <ChipSumber sumber={t.sumber} /></span>
                <span className="teks-pudar">{tanggalPendek(t.tanggal)} · sisa {rupiah(t.sisa)}</span>
              </div>
              {manual ? (
                <div className="kb-alokasi__isi">
                  <InputRupiah id={`kb-${t.id}`} nilai={pilih[t.id] ?? 0} label={`Bayar ${t.nomor}`}
                    onUbah={(n) => setPilih((m) => ({ ...m, [t.id]: Math.min(n, t.sisa) }))} />
                  <button type="button" className="tautan" onClick={() => setPilih((m) => ({ ...m, [t.id]: t.sisa }))}>Lunas</button>
                </div>
              ) : (
                <span className={a > 0 ? 'kb-alokasi__nilai' : 'teks-pudar'}>
                  {a > 0 ? (a >= t.sisa ? `lunas ${rupiah(a)}` : rupiah(a)) : '-'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="isian">
        Cara bayar
        <div className="saklar" role="group" aria-label="Cara bayar" style={{ alignSelf: 'flex-start' }}>
          <button type="button" aria-pressed={metode === 'tunai'} onClick={() => setMetode('tunai')}>Tunai</button>
          <button type="button" aria-pressed={metode === 'transfer'} onClick={() => setMetode('transfer')}>Transfer</button>
        </div>
      </div>
      {metode === 'tunai' ? (
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
        <div className="struk__baris"><span>{bayar.metode === 'tunai' ? 'Tunai' : `Transfer${bayar.bank ? ` ${bayar.bank}` : ''}`}</span><span>{rupiah(bayar.jumlah)}</span></div>
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
