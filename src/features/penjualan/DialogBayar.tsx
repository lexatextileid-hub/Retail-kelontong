import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { InputRupiah } from '../../components/InputRupiah';
import { PIN_PEMILIK_CONTOH, type PelangganContoh } from '../../data/contoh';
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
}

export function DialogBayar({
  belanja,
  pelanggan,
  onBatal,
  onSelesai,
}: {
  belanja: number;
  pelanggan: PelangganContoh;
  onBatal: () => void;
  onSelesai: (h: HasilBayar) => void;
}) {
  const terdaftar = pelanggan.jenis === 'terdaftar';
  const [bayarKasbonAktif, setBayarKasbonAktif] = useState(false);
  const [bayarKasbon, setBayarKasbon] = useState(0);
  const [tunai, setTunai] = useState(0);
  const [transfer, setTransfer] = useState(0);
  const [pilihan, setPilihan] = useState<'potongan' | 'kasbon'>('potongan');
  const [pin, setPin] = useState('');

  const kasbonDibayar = bayarKasbonAktif ? Math.min(bayarKasbon, pelanggan.saldoKasbon) : 0;
  const tagihan = belanja + kasbonDibayar;
  const diterima = tunai + transfer;
  const kurang = Math.max(0, tagihan - diterima);
  const lebih = Math.max(0, diterima - tagihan);
  const kembalian = Math.min(lebih, tunai);
  const transferLebih = lebih > tunai;

  // Kekurangan: potongan atau kasbon
  const jenisPotongan: HasilBayar['jenisPotongan'] = kurang <= BATAS_PEMBULATAN ? 'Pembulatan' : 'Diskon akhir';
  const potonganPerluPin = kurang > BATAS_DISKON_AKHIR_TANPA_PIN;
  const bolehKasbon = terdaftar && !bayarKasbonAktif;
  const cek = bolehKasbon ? cekKasbon(pelanggan, pelanggan.saldoKasbon, kurang) : null;
  const kasbonPerluPin = cek !== null && !cek.boleh;
  const modeKurang = bolehKasbon ? pilihan : 'potongan';
  const potonganTidakBisa = bayarKasbonAktif && kurang > 0;

  const perluPin = kurang > 0 && !potonganTidakBisa && (modeKurang === 'potongan' ? potonganPerluPin : kasbonPerluPin);
  const pinBenar = pin === PIN_PEMILIK_CONTOH;
  const siap = !transferLebih && !potonganTidakBisa && (!perluPin || pinBenar);

  const selesai = () => {
    if (!siap) return;
    onSelesai({
      tunai,
      transfer,
      kembalian,
      potongan: kurang > 0 && modeKurang === 'potongan' ? kurang : 0,
      jenisPotongan: kurang > 0 && modeKurang === 'potongan' ? jenisPotongan : undefined,
      kasbonBaru: kurang > 0 && modeKurang === 'kasbon' ? kurang : 0,
      bayarKasbon: kasbonDibayar,
    });
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

        {terdaftar && pelanggan.saldoKasbon > 0 && (
          <div className="kotak">
            <label className="centang">
              <input type="checkbox" checked={bayarKasbonAktif} onChange={(e) => setBayarKasbonAktif(e.target.checked)} />
              Bayar kasbon sekalian (kasbon {pelanggan.nama}: {rupiah(pelanggan.saldoKasbon)})
            </label>
            {bayarKasbonAktif && (
              <div className="baris-isian">
                <InputRupiah id="bayar-kasbon" label="Jumlah bayar kasbon" nilai={bayarKasbon} onUbah={setBayarKasbon} />
                <button type="button" className="tombol tombol--kecil" onClick={() => setBayarKasbon(pelanggan.saldoKasbon)}>
                  Lunasi
                </button>
              </div>
            )}
            {bayarKasbonAktif && bayarKasbon > pelanggan.saldoKasbon && (
              <p className="catatan catatan--info">Dibatasi sebesar sisa kasbon: {rupiah(pelanggan.saldoKasbon)}</p>
            )}
          </div>
        )}

        <div className="ringkas-total ringkas-total--besar">
          <span>Total dibayar</span>
          <strong>{rupiah(tagihan)}</strong>
        </div>

        <div className="dua-kolom">
          <label className="isian" htmlFor="bayar-tunai">
            Tunai diterima
            <InputRupiah id="bayar-tunai" nilai={tunai} onUbah={setTunai} autoFocus />
          </label>
          <label className="isian" htmlFor="bayar-transfer">
            Transfer
            <InputRupiah id="bayar-transfer" nilai={transfer} onUbah={setTransfer} />
          </label>
        </div>
        <div className="uang-cepat">
          <button type="button" className="tombol tombol--kecil" onClick={() => { setTunai(Math.max(0, tagihan - transfer)); }}>Uang pas</button>
          {[50000, 100000, 200000, 500000].filter((n) => n >= tagihan - transfer).slice(0, 3).map((n) => (
            <button key={n} type="button" className="tombol tombol--kecil" onClick={() => setTunai(n)}>{rupiah(n)}</button>
          ))}
          <button type="button" className="tombol tombol--kecil" onClick={() => { setTransfer(tagihan); setTunai(0); }}>Semua transfer</button>
        </div>

        {lebih > 0 && !transferLebih && (
          <div className="ringkas-total ringkas-total--hijau">
            <span>Kembalian</span>
            <strong>{rupiah(kembalian)}</strong>
          </div>
        )}
        {transferLebih && <p className="catatan catatan--bahaya">Transfer melebihi tagihan. Kembalian hanya bisa dari uang tunai.</p>}

        {kurang > 0 && (
          <div className="kotak">
            <div className="ringkas-total">
              <span>Kurang</span>
              <strong>{rupiah(kurang)}</strong>
            </div>
            {potonganTidakBisa ? (
              <p className="catatan catatan--peringatan">
                Saat membayar kasbon, belanja harus lunas. Kurangi jumlah bayar kasbon atau tambah uang diterima.
              </p>
            ) : (
              <>
                <div className="pilih-opsi" role="radiogroup" aria-label="Kekurangan dijadikan">
                  <label className="centang">
                    <input type="radio" name="kurang" checked={modeKurang === 'potongan'} onChange={() => setPilihan('potongan')} />
                    Jadikan potongan · <span className="teks-pudar">{jenisPotongan}{potonganPerluPin ? ', perlu PIN pemilik' : ''}</span>
                  </label>
                  {terdaftar && (
                    <label className="centang">
                      <input type="radio" name="kurang" checked={modeKurang === 'kasbon'} onChange={() => setPilihan('kasbon')} disabled={!bolehKasbon} />
                      Jadikan kasbon ·{' '}
                      <span className="teks-pudar">
                        {!bolehKasbon
                          ? 'tidak bisa bersamaan dengan bayar kasbon'
                          : cek && !cek.boleh && cek.alasan === 'melebihi_batas'
                            ? `melebihi sisa batas ${rupiah(Math.max(0, cek.sisaBatas))}, perlu PIN pemilik`
                            : 'dalam batas'}
                      </span>
                    </label>
                  )}
                </div>
                {!terdaftar && <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>Pelanggan Umum tidak bisa kasbon.</p>}
                {perluPin && (
                  <label className="isian" htmlFor="pin-pemilik">
                    PIN pemilik <span className="isian__bantuan">(pratinjau: 1234)</span>
                    <input id="pin-pemilik" className="isian__kontrol" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
                  </label>
                )}
              </>
            )}
          </div>
        )}

        <button type="submit" className="tombol tombol--utama tombol--besar" disabled={!siap}>
          Selesaikan transaksi
        </button>
      </form>
    </Dialog>
  );
}
