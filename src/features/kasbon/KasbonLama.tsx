import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { InputRupiah } from '../../components/InputRupiah';
import { PIN_PEMILIK_CONTOH } from '../../data/contoh';
import { catatKasbonLama, hariIni, useToko } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { idBaru } from '../penjualan/model';
import { tanggalPendek } from './bersama';
import '../../styles/pesanan.css';
import '../../styles/kasbon.css';

interface Baris {
  id: string;
  tanggal: string;
  jumlah: number;
  keterangan: string;
  nomorLama: string;
}
const barisBaru = (): Baris => ({ id: idBaru(), tanggal: hariIni(), jumlah: 0, keterangan: '', nomorLama: '' });

/**
 * Catat kasbon lama (sebelum memakai aplikasi), tanpa rincian barang. Nota boleh sudah hilang.
 * Menambah piutang langsung → pemilik, atau akun lain dengan PIN pemilik.
 */
export function KasbonLama() {
  const toko = useToko();
  const [params] = useSearchParams();
  const terdaftar = toko.pelanggan.filter((p) => p.jenis === 'terdaftar');
  const [pelangganId, setPelangganId] = useState(params.get('pelanggan') ?? '');
  const [baris, setBaris] = useState<Baris[]>([barisBaru()]);
  const [pin, setPin] = useState('');
  const [info, setInfo] = useState('');

  const perluPin = toko.peran !== 'pemilik';
  const ubah = (id: string, patch: Partial<Baris>) => setBaris((xs) => xs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const isi = baris.filter((b) => b.jumlah > 0);
  const total = isi.reduce((t, b) => t + b.jumlah, 0);
  const tanggalSalah = baris.some((b) => b.jumlah > 0 && (!b.tanggal || b.tanggal > hariIni()));
  const siap = !!pelangganId && isi.length > 0 && !tanggalSalah && (!perluPin || pin === PIN_PEMILIK_CONTOH);
  const plg = terdaftar.find((p) => p.id === pelangganId);

  const lama = toko.notaKasbon.filter((n) => n.sumber === 'lama').slice().reverse();

  const simpan = () => {
    if (!siap || !plg) return;
    const nomor = isi.map((b) =>
      catatKasbonLama({
        pelangganId, tanggal: b.tanggal, jumlah: b.jumlah,
        keterangan: b.keterangan.trim() || undefined, nomorLama: b.nomorLama.trim() || undefined,
      }),
    );
    setInfo(`${nomor.length} kasbon lama ${plg.nama} tersimpan (${rupiah(total)}).`);
    setBaris([barisBaru()]);
    setPin('');
  };

  return (
    <div className="ps-halaman">
      <p className="teks-pudar" style={{ margin: 0, maxWidth: 760 }}>
        Untuk kasbon dari sebelum memakai aplikasi, misalnya dari buku catatan. Tidak perlu rincian barang, nota boleh sudah hilang.
        Isi tanggal kasbonnya (perkiraan bila lupa) supaya umur dan jatuh temponya benar. Bisa beberapa baris sekaligus.
      </p>
      {info && <p className="catatan catatan--info">{info} <Link to={`../detail/${pelangganId}`} className="tautan">Lihat kasbon</Link></p>}

      <div className="ps-buat">
        <section className="ps-kolom">
          <div className="kartu tumpuk">
            <label className="isian">
              Pelanggan
              <select className="isian__kontrol" value={pelangganId} onChange={(e) => setPelangganId(e.target.value)} style={!pelangganId ? { color: 'var(--teks-3)' } : undefined}>
                <option value="" disabled>Pilih pelanggan…</option>
                {terdaftar.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
              <span className="isian__bantuan">Pelanggan belum ada? Tambahkan dulu (Kasir → Penjualan → + Pelanggan baru).</span>
            </label>
          </div>

          <div className="kartu tumpuk">
            <h2>Kasbon lama</h2>
            {baris.map((b, i) => (
              <div key={b.id} className="kb-lama">
                <div className="kb-lama__atas">
                  <strong>Kasbon {i + 1}</strong>
                  {baris.length > 1 && <button type="button" className="tautan" onClick={() => setBaris((xs) => xs.filter((x) => x.id !== b.id))}>Hapus</button>}
                </div>
                <div className="kb-lama__isian">
                  <label className="isian">
                    Tanggal kasbon
                    <input type="date" className="isian__kontrol" max={hariIni()} value={b.tanggal} onChange={(e) => ubah(b.id, { tanggal: e.target.value })} />
                  </label>
                  <label className="isian">
                    Jumlah
                    <InputRupiah id={`kl-${b.id}`} nilai={b.jumlah} onUbah={(n) => ubah(b.id, { jumlah: n })} />
                  </label>
                  <label className="isian">
                    Keterangan (opsional)
                    <input className="isian__kontrol" value={b.keterangan} onChange={(e) => ubah(b.id, { keterangan: e.target.value })} placeholder="mis. buku kasbon hal. 12" />
                  </label>
                  <label className="isian">
                    No. nota lama (bila ada)
                    <input className="isian__kontrol" value={b.nomorLama} onChange={(e) => ubah(b.id, { nomorLama: e.target.value })} placeholder="boleh kosong" />
                  </label>
                </div>
              </div>
            ))}
            <button type="button" className="tombol tombol--putus" style={{ alignSelf: 'flex-start' }} onClick={() => setBaris((xs) => [...xs, barisBaru()])}>+ Tambah baris</button>
          </div>
        </section>

        <aside className="ps-ringkas kartu tumpuk">
          <h2>Ringkasan</h2>
          <div className="ringkas-total"><span>{isi.length} kasbon · {plg ? plg.nama : 'pelanggan belum dipilih'}</span></div>
          <div className="ringkas-total ringkas-total--besar"><span>Total</span><strong>{rupiah(total)}</strong></div>
          {tanggalSalah && <p className="catatan catatan--bahaya">Tanggal kasbon tidak boleh kosong atau setelah hari ini.</p>}
          {perluPin && (
            <label className="isian">
              PIN pemilik
              <input className="isian__kontrol" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Kasbon lama menambah piutang" />
              {pin.length >= 4 && pin !== PIN_PEMILIK_CONTOH && <span className="teks-bahaya" style={{ fontSize: 12.5 }}>PIN salah.</span>}
            </label>
          )}
          <button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={simpan}>Simpan kasbon lama</button>
          {!pelangganId && <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>Pilih pelanggan dulu.</p>}
        </aside>
      </div>

      {lama.length > 0 && (
        <div className="kartu tumpuk">
          <h2>Kasbon lama yang sudah dicatat</h2>
          <ul className="kb-riwayat">
            {lama.map((n) => (
              <li key={n.id}>
                <div className="kb-riwayat__atas">
                  <span><strong>{n.nomor}</strong> · {toko.pelanggan.find((p) => p.id === n.pelangganId)?.nama}</span>
                  <strong>{rupiah(n.jumlah)}</strong>
                </div>
                <span className="teks-pudar">
                  Tanggal {tanggalPendek(n.tanggal)}{n.keterangan ? ` · ${n.keterangan}` : ''}{n.nomorLama ? ` · nota lama ${n.nomorLama}` : ''} · dicatat {n.oleh}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
