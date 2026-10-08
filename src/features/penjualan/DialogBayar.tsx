import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { InputRupiah } from '../../components/InputRupiah';
import { PIN_PEMILIK_CONTOH } from '../../data/contoh';
import type { PelangganKasbon } from '../../data/toko';
import { cekKasbon } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';

/** Batas potongan di akhir transaksi (Pengaturan). */
export const BATAS_PEMBULATAN = 500;
export const BATAS_DISKON_AKHIR_TANPA_PIN = 10000;

export interface HasilBayar {
  tunai: number;
  transfer: number;
  kembalian: number;
  potongan: number;
  jenisPotongan?: 'Pembulatan' | 'Diskon akhir';
  kasbonBaru: number;
  bayarKasbon: number;
  /** Dibayar dari saldo pelanggan. */
  pakaiSaldo: number;
}

type Metode = 'tunai' | 'transfer' | 'kasbon' | 'campuran';

/** Tombol uang cepat: pecahan wajar di atas tagihan, mis. 17.500 → 20.000, 50.000, 100.000. */
export function uangCepat(tagihan: number): number[] {
  const kandidat = [10000, 20000, 50000, 100000, 150000, 200000, 500000, 1000000];
  const bulat = [5000, 10000, 50000, 100000].map((k) => Math.ceil(tagihan / k) * k);
  return [...new Set([...bulat, ...kandidat])]
    .filter((n) => n > tagihan)
    .sort((a, b) => a - b)
    .slice(0, 4);
}

export function DialogBayar({
  belanja,
  diskonKasir,
  pelanggan,
  onBatal,
  onSelesai,
}: {
  belanja: number;
  /** Diskon per barang yang diketik kasir di luar diskon pelanggan; ikut dihitung ke batas tanpa PIN. */
  diskonKasir: number;
  pelanggan: PelangganKasbon;
  onBatal: () => void;
  onSelesai: (h: HasilBayar) => void;
}) {
  const terdaftar = pelanggan.jenis === 'terdaftar';
  const [metode, setMetode] = useState<Metode>('tunai');
  const [bayarKasbonAktif, setBayarKasbonAktif] = useState(false);
  const [bayarKasbon, setBayarKasbon] = useState(0);
  const [tunaiInput, setTunai] = useState(0);
  const [transferInput, setTransfer] = useState<number | null>(null);
  const [pilihanKurang, setPilihanKurang] = useState<'potongan' | 'kasbon'>('potongan');
  const [pin, setPin] = useState('');
  const [saldoAktif, setSaldoAktif] = useState(false);

  const kasbonDibayar = bayarKasbonAktif ? Math.min(bayarKasbon, pelanggan.saldoKasbon) : 0;
  // Saldo pelanggan (mis. DP pesanan batal) dipakai untuk belanja ini.
  const saldoDipakai = saldoAktif ? Math.min(pelanggan.saldo, belanja) : 0;
  const tagihan = belanja - saldoDipakai + kasbonDibayar;
  const kasbonBisa = terdaftar && !bayarKasbonAktif;
  const m: Metode = metode === 'kasbon' && !kasbonBisa ? 'tunai' : metode;

  const tunai = m === 'tunai' || m === 'campuran' ? tunaiInput : 0;
  const transfer = m === 'transfer' ? (transferInput ?? tagihan) : m === 'campuran' ? (transferInput ?? 0) : 0;
  const diterima = tunai + transfer;
  const kurang = Math.max(0, tagihan - diterima);
  const lebih = Math.max(0, diterima - tagihan);
  const kembalian = Math.min(lebih, tunai);
  const transferLebih = lebih > tunai;

  const modeKurang: 'potongan' | 'kasbon' = m === 'kasbon' ? 'kasbon' : kasbonBisa ? pilihanKurang : 'potongan';
  const jenisPotongan: HasilBayar['jenisPotongan'] = kurang <= BATAS_PEMBULATAN ? 'Pembulatan' : 'Diskon akhir';
  const potonganDihitung = jenisPotongan === 'Pembulatan' ? 0 : kurang;
  const potonganPerluPin = diskonKasir + potonganDihitung > BATAS_DISKON_AKHIR_TANPA_PIN;
  const diskonKasirPerluPin = diskonKasir > BATAS_DISKON_AKHIR_TANPA_PIN;
  const cek = modeKurang === 'kasbon' ? cekKasbon(pelanggan, pelanggan.saldoKasbon, kurang, pelanggan.lewatTempo > 0) : null;
  const kasbonPerluPin = cek !== null && !cek.boleh;
  const potonganTidakBisa = bayarKasbonAktif && kurang > 0;

  const perluPin =
    diskonKasirPerluPin ||
    (kurang > 0 && !potonganTidakBisa && (modeKurang === 'potongan' ? potonganPerluPin : kasbonPerluPin));
  const siap = !transferLebih && !potonganTidakBisa && (!perluPin || pin === PIN_PEMILIK_CONTOH);

  const selesai = () => {
    if (!siap) return;
    const adaKurang = kurang > 0;
    onSelesai({
      tunai,
      transfer,
      kembalian,
      potongan: adaKurang && modeKurang === 'potongan' ? kurang : 0,
      jenisPotongan: adaKurang && modeKurang === 'potongan' ? jenisPotongan : undefined,
      kasbonBaru: adaKurang && modeKurang === 'kasbon' ? kurang : 0,
      bayarKasbon: kasbonDibayar,
      pakaiSaldo: saldoDipakai,
    });
  };

  const pilihMetode = (x: Metode) => {
    setMetode(x);
    setTransfer(null);
    if (x !== 'campuran') setTunai(0);
  };

  return (
    <Dialog judul="Pembayaran" onTutup={onBatal} lebar={520}>
      <form
        className="tumpuk"
        onSubmit={(e) => {
          e.preventDefault();
          selesai();
        }}
      >
        <div className="ringkas-total">
          <span>Belanja</span>
          <strong>{rupiah(belanja)}</strong>
        </div>
        {diskonKasir > 0 && (
          <p className="catatan catatan--info">
            Termasuk diskon kasir {rupiah(diskonKasir)}{diskonKasirPerluPin ? ' · melebihi Rp 10.000, perlu PIN pemilik' : ''}.
          </p>
        )}

        {terdaftar && pelanggan.saldoKasbon > 0 && (
          <div className="kotak">
            <label className="centang">
              <input type="checkbox" checked={bayarKasbonAktif} onChange={(e) => setBayarKasbonAktif(e.target.checked)} />
              Bayar kasbon sekalian (kasbon {pelanggan.nama}: {rupiah(pelanggan.saldoKasbon)})
            </label>
            {bayarKasbonAktif && (
              <div className="baris-isian">
                <InputRupiah id="bayar-kasbon" label="Jumlah bayar kasbon" nilai={bayarKasbon} onUbah={setBayarKasbon} />
                <button type="button" className="tombol tombol--kecil" onClick={() => setBayarKasbon(pelanggan.saldoKasbon)}>Lunasi</button>
              </div>
            )}
          </div>
        )}

        {terdaftar && pelanggan.saldo > 0 && (
          <div className="kotak">
            <label className="centang">
              <input type="checkbox" checked={saldoAktif} onChange={(e) => setSaldoAktif(e.target.checked)} />
              Pakai saldo {pelanggan.nama}: {rupiah(pelanggan.saldo)}
            </label>
            {saldoAktif && <div className="ringkas-total"><span>Saldo dipakai</span><strong>−{rupiah(saldoDipakai)}</strong></div>}
          </div>
        )}

        <div className="ringkas-total ringkas-total--besar">
          <span>Total dibayar</span>
          <strong>{rupiah(tagihan)}</strong>
        </div>

        <div className="metode" role="radiogroup" aria-label="Metode bayar">
          {(['tunai', 'transfer', 'kasbon', 'campuran'] as Metode[]).map((x) => (
            <button
              key={x}
              type="button"
              role="radio"
              aria-checked={m === x}
              disabled={x === 'kasbon' && !kasbonBisa}
              onClick={() => pilihMetode(x)}
            >
              {x === 'tunai' ? 'Tunai' : x === 'transfer' ? 'Transfer' : x === 'kasbon' ? 'Kasbon' : 'Campuran'}
            </button>
          ))}
        </div>
        {!terdaftar && <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>Kasbon hanya untuk pelanggan terdaftar.</p>}
        {terdaftar && bayarKasbonAktif && <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>Saat membayar kasbon, tidak bisa menambah kasbon baru.</p>}

        {(m === 'tunai' || m === 'campuran') && (
          <label className="isian" htmlFor="bayar-tunai">
            {m === 'campuran' ? 'Bagian tunai' : 'Uang diterima'}
            <InputRupiah id="bayar-tunai" nilai={tunaiInput} onUbah={setTunai} autoFocus />
          </label>
        )}
        {m === 'tunai' && (
          <div className="uang-cepat">
            <button type="button" className="tombol" onClick={() => setTunai(tagihan)}>Uang pas</button>
            {uangCepat(tagihan).map((n) => (
              <button key={n} type="button" className="tombol" onClick={() => setTunai(n)}>{rupiah(n)}</button>
            ))}
          </div>
        )}
        {(m === 'transfer' || m === 'campuran') && (
          <label className="isian" htmlFor="bayar-transfer">
            {m === 'campuran' ? 'Bagian transfer' : 'Nominal transfer diterima'}
            <InputRupiah id="bayar-transfer" nilai={transfer} onUbah={(n) => setTransfer(n)} />
          </label>
        )}
        {m === 'campuran' && tunaiInput > 0 && (
          <button type="button" className="tombol tombol--kecil" style={{ alignSelf: 'flex-start' }} onClick={() => setTransfer(Math.max(0, tagihan - tunaiInput))}>
            Sisanya transfer ({rupiah(Math.max(0, tagihan - tunaiInput))})
          </button>
        )}

        {m === 'kasbon' && (
          <div className="kotak">
            <div className="ringkas-total"><span>Jadi kasbon</span><strong>{rupiah(kurang)}</strong></div>
            <div className="ringkas-total">
              <span>Kasbon setelah ini</span>
              <span>{rupiah(pelanggan.saldoKasbon + kurang)} dari batas {rupiah(pelanggan.batasKasbon)}</span>
            </div>
            {kasbonPerluPin && <p className="catatan catatan--peringatan">{cek?.boleh === false && cek.alasan === 'lewat_tempo' ? `Ada kasbon lewat jatuh tempo (${rupiah(pelanggan.lewatTempo)}). Kasbon baru perlu PIN pemilik.` : 'Melebihi batas kasbon. Perlu PIN pemilik.'}</p>}
          </div>
        )}

        {m !== 'kasbon' && lebih > 0 && !transferLebih && (
          <div className="kembalian">
            <span>Kembalian</span>
            <strong>{rupiah(kembalian)}</strong>
          </div>
        )}
        {transferLebih && <p className="catatan catatan--bahaya">Transfer melebihi tagihan. Kembalian hanya bisa dari uang tunai.</p>}

        {m !== 'kasbon' && kurang > 0 && diterima > 0 && (
          <div className="kotak">
            <div className="ringkas-total"><span>Kurang</span><strong>{rupiah(kurang)}</strong></div>
            {potonganTidakBisa ? (
              <p className="catatan catatan--peringatan">Saat membayar kasbon, belanja harus lunas. Kurangi jumlah bayar kasbon atau tambah uang diterima.</p>
            ) : (
              <div className="pilih-opsi" role="radiogroup" aria-label="Kekurangan dijadikan">
                <label className="centang">
                  <input type="radio" name="kurang" checked={modeKurang === 'potongan'} onChange={() => setPilihanKurang('potongan')} />
                  Jadikan potongan · <span className="teks-pudar">{jenisPotongan}{potonganPerluPin ? ', perlu PIN pemilik' : ''}</span>
                </label>
                {kasbonBisa && (
                  <label className="centang">
                    <input type="radio" name="kurang" checked={modeKurang === 'kasbon'} onChange={() => setPilihanKurang('kasbon')} />
                    Jadikan kasbon · <span className="teks-pudar">{kasbonPerluPin ? (cek?.boleh === false && cek.alasan === 'lewat_tempo' ? 'ada kasbon lewat tempo, perlu PIN pemilik' : 'melebihi batas, perlu PIN pemilik') : 'dalam batas'}</span>
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {perluPin && (
          <label className="isian" htmlFor="pin-pemilik">
            PIN pemilik <span className="isian__bantuan">(pratinjau: 1234)</span>
            <input id="pin-pemilik" className="isian__kontrol" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
          </label>
        )}

        <button type="submit" className="tombol tombol--utama tombol--besar" disabled={!siap || (m !== 'kasbon' && diterima === 0 && tagihan > 0)}>
          {m === 'kasbon' ? `Catat kasbon ${rupiah(kurang)}` : kembalian > 0 ? `Selesai · kembalian ${rupiah(kembalian)}` : 'Selesaikan transaksi'}
        </button>
      </form>
    </Dialog>
  );
}
