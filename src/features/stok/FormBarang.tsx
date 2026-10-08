import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { InputRupiah } from '../../components/InputRupiah';
import { PIN_PEMILIK_CONTOH, produkContoh } from '../../data/contoh';
import { infoBarang, simpanProduk, useToko } from '../../data/toko';
import { buatSku, kategoriBawaan, kelompokBawaan } from '../../domain/kategoriBawaan';
import { satuanBawaan } from '../../domain/satuanBawaan';
import type { MetodeHarga, Produk, SatuanProduk, TingkatHarga } from '../../domain/tipe';
import { rupiah } from '../../lib/format';
import { IsianPin } from '../kaslaci/DialogLaci';
import { ambilProduk } from '../penjualan/model';
import { hargaJualTingkat, teksPersen } from './bersama';

type BarisSatuan = SatuanProduk & { kunci: string };
const kunci = () => Math.random().toString(36).slice(2);
const namaSatuan = (sid: string) => satuanBawaan.find((s) => s.singkatan === sid)?.nama ?? sid;
const labelOtomatis = (sid: string, isi: number, dasar: string) => (isi === 1 ? namaSatuan(sid) : `${namaSatuan(sid)} isi ${isi.toLocaleString('id-ID')}${sid === dasar ? '' : ''}`);

/**
 * Tambah / ubah barang (Gudang → Stok Barang). Pemilik langsung; admin dengan PIN pemilik.
 * SKU otomatis dari kategori dan tidak pernah berubah.
 */
export function FormBarang() {
  const { id } = useParams();
  const toko = useToko();
  const navigasi = useNavigate();
  const lama = id ? ambilProduk(id) : undefined;
  const [nama, setNama] = useState(lama?.nama ?? '');
  const [kategori, setKategori] = useState(lama?.kategoriId ?? '');
  const [kode, setKode] = useState(lama?.kode ?? '');
  const [dasar, setDasar] = useState(lama?.satuanDasarId ?? '');
  const [metode, setMetode] = useState<MetodeHarga>(lama?.metodeHarga ?? 'per_satuan');
  const [satuan, setSatuan] = useState<BarisSatuan[]>(() => (lama?.satuan ?? []).map((s) => ({ ...s, kunci: kunci() })));
  const [tingkat, setTingkat] = useState<(TingkatHarga & { kunci: string })[]>(() => (lama?.tingkatHarga.length ? lama.tingkatHarga : [{ mulaiJumlah: 0, harga: 0 }]).map((t) => ({ ...t, kunci: kunci() })));
  const [minimum, setMinimum] = useState(lama?.stokMinimum ?? 0);
  const [letak, setLetak] = useState(lama?.letak ?? '');
  const [musiman, setMusiman] = useState(!!lama?.musiman);
  const [aktif, setAktif] = useState(lama?.aktif ?? true);
  const [pin, setPin] = useState('');
  const [coba, setCoba] = useState(false);
  const modal = lama ? infoBarang(lama.id, toko).modal : undefined;

  // Baris satuan dasar selalu ada (isi 1) dan mengikuti pilihan satuan dasar.
  const pilihDasar = (sid: string) => {
    setDasar(sid);
    setSatuan((xs) => {
      const lain = xs.filter((x) => x.isi !== 1);
      const d = xs.find((x) => x.isi === 1);
      return [{ ...(d ?? { id: '', kunci: kunci(), dibeli: false, dijual: true, isi: 1 }), satuanId: sid, label: namaSatuan(sid), isi: 1 } as BarisSatuan, ...lain];
    });
  };
  const ubahSatuan = (k: string, patch: Partial<BarisSatuan>) => setSatuan((xs) => xs.map((x) => {
    if (x.kunci !== k) return x;
    const baru = { ...x, ...patch };
    if ((patch.satuanId || patch.isi) && x.label === labelOtomatis(x.satuanId, x.isi, dasar)) baru.label = labelOtomatis(baru.satuanId, baru.isi, dasar);
    return baru;
  }));

  const urut = [...satuan].sort((a, b) => a.isi - b.isi);
  const masalah: string[] = [];
  if (!nama.trim()) masalah.push('Nama barang wajib.');
  if (!lama && produkContoh.some((p) => p.nama.trim().toLowerCase() === nama.trim().toLowerCase())) masalah.push('Nama barang sudah ada.');
  if (!kategori) masalah.push('Pilih kategori.');
  if (!dasar) masalah.push('Pilih satuan dasar.');
  if (satuan.some((s) => s.isi !== 1 && s.isi <= 1)) masalah.push('Isi satuan besar harus lebih dari 1.');
  if (new Set(satuan.map((s) => s.isi)).size !== satuan.length) masalah.push('Dua satuan tidak boleh punya isi yang sama.');
  if (!satuan.some((s) => s.dijual)) masalah.push('Minimal satu satuan dijual.');
  if (metode === 'per_satuan' && satuan.some((s) => s.dijual && !s.hargaJual)) masalah.push('Isi harga jual untuk setiap satuan yang dijual.');
  if (metode === 'bertingkat' && (tingkat.some((t) => !t.harga) || !tingkat.some((t) => t.mulaiJumlah === 0))) masalah.push('Tingkat harga: harus ada harga mulai 0 dan semua harga terisi.');
  const perluPin = toko.peran !== 'pemilik';
  const pinOk = !perluPin || pin === PIN_PEMILIK_CONTOH;

  const simpan = () => {
    setCoba(true);
    if (masalah.length || !pinOk) return;
    const idBaru = lama?.id ?? `${nama.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${kunci().slice(0, 4)}`;
    const p: Produk = {
      id: idBaru,
      sku: lama?.sku ?? buatSku(kategori, produkContoh.map((x) => x.sku)),
      kode: kode.trim().toUpperCase() || undefined, letak: letak.trim() || undefined,
      nama: nama.trim(), kategoriId: kategori, satuanDasarId: dasar, stokMinimum: minimum, metodeHarga: metode,
      satuan: urut.map(({ kunci: _k, ...s }) => ({ ...s, id: s.id || `${idBaru}-${s.satuanId}${s.isi > 1 ? s.isi : ''}`, hargaJual: metode === 'per_satuan' && s.dijual ? s.hargaJual : undefined })),
      tingkatHarga: metode === 'bertingkat' ? [...tingkat].sort((a, b) => a.mulaiJumlah - b.mulaiJumlah).map(({ kunci: _k, ...t }) => t) : [],
      aktif, musiman: musiman || undefined,
    };
    simpanProduk(p);
    navigasi(`../detail/${p.id}`);
  };

  const pratinjauHarga = lama ? hargaJualTingkat({ ...lama, metodeHarga: metode, satuan: urut, tingkatHarga: tingkat }, modal) : [];

  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <h2 style={{ margin: 0 }}>{lama ? `Ubah ${lama.nama}` : 'Tambah barang'}</h2>
        <Link to={lama ? `../detail/${lama.id}` : '../daftar'} className="tautan">← Batal</Link>
      </div>

      <div className="kartu bd-kepala">
        <label className="isian bd-kepala__lebar">
          Nama barang
          <input className="isian__kontrol" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Sarimi Goreng Ayam Kremes" autoFocus={!lama} />
        </label>
        <label className="isian">
          Kategori
          <select className="isian__kontrol" value={kategori} onChange={(e) => setKategori(e.target.value)} disabled={!!lama && false} style={!kategori ? { color: 'var(--teks-3)' } : undefined}>
            <option value="" disabled>Pilih kategori…</option>
            {kelompokBawaan.map((g) => (
              <optgroup key={g} label={g}>
                {kategoriBawaan.filter((k) => k.kelompok === g).map((k) => <option key={k.kode} value={k.kode}>{k.nama}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="isian">
          SKU
          <input className="isian__kontrol" readOnly value={lama?.sku ?? (kategori ? `${buatSku(kategori, produkContoh.map((x) => x.sku))} (otomatis)` : 'otomatis dari kategori')} />
        </label>
        <label className="isian">
          Kode cepat (opsional)
          <input className="isian__kontrol" value={kode} onChange={(e) => setKode(e.target.value)} placeholder="mis. SRM" maxLength={6} />
        </label>
        <label className="isian">
          Satuan dasar (terkecil yang dijual)
          <select className="isian__kontrol" value={dasar} onChange={(e) => pilihDasar(e.target.value)} disabled={!!lama} style={!dasar ? { color: 'var(--teks-3)' } : undefined}>
            <option value="" disabled>Pilih satuan…</option>
            {satuanBawaan.map((s) => <option key={s.singkatan} value={s.singkatan}>{s.nama} ({s.singkatan})</option>)}
          </select>
          {lama && <span className="isian__bantuan">Satuan dasar tidak bisa diubah karena stok tercatat dalam satuan ini.</span>}
        </label>
        <label className="isian">
          Stok minimum ({dasar || 'satuan dasar'})
          <input className="isian__kontrol" type="number" min={0} value={minimum || ''} onChange={(e) => setMinimum(Number(e.target.value))} />
        </label>
        <label className="isian">
          Letak (opsional)
          <input className="isian__kontrol" value={letak} onChange={(e) => setLetak(e.target.value)} placeholder="mis. Rak toko, Gudang ruko 5" />
        </label>
        <div className="isian bd-kepala__lebar sb-cek">
          <label><input type="checkbox" checked={musiman} onChange={(e) => setMusiman(e.target.checked)} /> Barang musiman <span className="teks-pudar">(mis. sirup Lebaran — tidak dicap "Berhenti" di luar musimnya)</span></label>
          <label><input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} /> Aktif <span className="teks-pudar">(nonaktif = tidak muncul di kasir dan daftar)</span></label>
        </div>
      </div>

      <div className="kartu bd-tabel-kartu">
        <div className="ps-atas" style={{ padding: '8px 0' }}>
          <strong>Satuan & harga jual</strong>
          <div className="saklar saklar--kecil" role="group" aria-label="Metode harga">
            <button type="button" aria-pressed={metode === 'per_satuan'} onClick={() => setMetode('per_satuan')}>Harga per satuan</button>
            <button type="button" aria-pressed={metode === 'bertingkat'} onClick={() => setMetode('bertingkat')}>Bertingkat (grosir)</button>
          </div>
        </div>
        {!dasar ? <p className="teks-pudar">Pilih satuan dasar dulu.</p> : (
          <table className="ps-tabel ps-tabel--hp bd-tabel bd-form">
            <thead><tr><th>Satuan</th><th className="kanan">Isi ({dasar})</th><th>Nama tampil</th><th>Beli</th><th>Jual</th>{metode === 'per_satuan' && <th className="kanan">Harga jual</th>}<th aria-label="Hapus" /></tr></thead>
            <tbody>
              {urut.map((s) => (
                <tr key={s.kunci} style={{ cursor: 'default' }}>
                  <td data-label="Satuan">
                    {s.isi === 1 ? <strong>{namaSatuan(s.satuanId)} (dasar)</strong> : (
                      <select className="isian__kontrol" aria-label="Satuan" value={s.satuanId} onChange={(e) => ubahSatuan(s.kunci, { satuanId: e.target.value })}>
                        {satuanBawaan.map((x) => <option key={x.singkatan} value={x.singkatan}>{x.nama}</option>)}
                      </select>
                    )}
                  </td>
                  <td data-label={`Isi (${dasar})`} className="kanan">
                    {s.isi === 1 ? '1' : <input className="isian__kontrol kk-qty" type="number" min={2} aria-label="Isi" value={s.isi || ''} onChange={(e) => ubahSatuan(s.kunci, { isi: Number(e.target.value) })} />}
                  </td>
                  <td data-label="Nama tampil"><input className="isian__kontrol" aria-label="Nama tampil" value={s.label} onChange={(e) => ubahSatuan(s.kunci, { label: e.target.value })} /></td>
                  <td data-label="Beli"><input type="checkbox" className="kb-centang" aria-label={`Dibeli ${s.label}`} checked={s.dibeli} onChange={(e) => ubahSatuan(s.kunci, { dibeli: e.target.checked })} /></td>
                  <td data-label="Jual"><input type="checkbox" className="kb-centang" aria-label={`Dijual ${s.label}`} checked={s.dijual} onChange={(e) => ubahSatuan(s.kunci, { dijual: e.target.checked })} /></td>
                  {metode === 'per_satuan' && (
                    <td data-label="Harga jual" className="kanan">
                      {s.dijual ? <InputRupiah id={`hj-${s.kunci}`} nilai={s.hargaJual ?? 0} label={`Harga ${s.label}`} onUbah={(n) => ubahSatuan(s.kunci, { hargaJual: n })} /> : '-'}
                    </td>
                  )}
                  <td data-label="">{s.isi !== 1 && <button type="button" className="tautan teks-bahaya" onClick={() => setSatuan((xs) => xs.filter((x) => x.kunci !== s.kunci))}>Hapus</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {dasar && <button type="button" className="tombol tombol--putus" style={{ marginTop: 10 }}
          onClick={() => { const isi = Math.max(2, ...satuan.map((s) => s.isi * 10)); setSatuan((xs) => [...xs, { kunci: kunci(), id: '', satuanId: 'ktn', label: labelOtomatis('ktn', isi, dasar), isi, dibeli: true, dijual: false }]); }}>
          + Satuan besar (karton, renteng, slop…)
        </button>}
        {metode === 'bertingkat' && dasar && (
          <div className="tumpuk" style={{ marginTop: 14 }}>
            <strong>Tingkat harga (per {dasar})</strong>
            {[...tingkat].sort((a, b) => a.mulaiJumlah - b.mulaiJumlah).map((t) => (
              <div key={t.kunci} className="sb-tingkat">
                <label className="isian">Mulai jumlah ({dasar})<input className="isian__kontrol" type="number" min={0} value={t.mulaiJumlah} onChange={(e) => setTingkat((xs) => xs.map((x) => (x.kunci === t.kunci ? { ...x, mulaiJumlah: Number(e.target.value) } : x)))} /></label>
                <label className="isian">Harga per {dasar}<InputRupiah id={`tk-${t.kunci}`} nilai={t.harga} onUbah={(n) => setTingkat((xs) => xs.map((x) => (x.kunci === t.kunci ? { ...x, harga: n } : x)))} /></label>
                {t.mulaiJumlah !== 0 && <button type="button" className="tautan teks-bahaya" onClick={() => setTingkat((xs) => xs.filter((x) => x.kunci !== t.kunci))}>Hapus</button>}
              </div>
            ))}
            <button type="button" className="tombol tombol--putus" style={{ alignSelf: 'flex-start' }} onClick={() => setTingkat((xs) => [...xs, { kunci: kunci(), mulaiJumlah: Math.max(...xs.map((x) => x.mulaiJumlah)) + 5, harga: 0 }])}>+ Tingkat harga</button>
          </div>
        )}
        {pratinjauHarga.length > 0 && modal !== undefined && (
          <p className="teks-pudar" style={{ fontSize: 13 }}>
            Modal sekarang {rupiah(modal)}/{dasar}. Untung: {pratinjauHarga.map((h) => `${h.judul} ${teksPersen(h.untungPersen)}`).join(' · ')}
          </p>
        )}
      </div>

      <div className="kartu bd-kaki">
        <div className="bd-kaki__angka">
          {perluPin && <IsianPin pin={pin} setPin={setPin} alasan={lama ? 'ubah data barang' : 'tambah barang baru'} />}
          {!lama && <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>Stok barang baru 0. Stok bertambah lewat Barang Masuk (faktur) atau hitung stok.</p>}
        </div>
        <div className="bd-kaki__angka">
          {coba && masalah.length > 0 && <ul className="catatan catatan--peringatan" style={{ margin: 0, paddingLeft: 28 }}>{masalah.map((m) => <li key={m}>{m}</li>)}</ul>}
          <div className="baris-tombol" style={{ justifyContent: 'flex-end' }}>
            <Link to={lama ? `../detail/${lama.id}` : '../daftar'} className="tombol">Batal</Link>
            <button type="button" className="tombol tombol--utama" disabled={!pinOk} onClick={simpan}>{lama ? 'Simpan perubahan' : 'Simpan barang'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
