import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { InputRupiah } from '../../components/InputRupiah';
import { PIN_PEMILIK_CONTOH, produkContoh } from '../../data/contoh';
import { infoBarang, simpanProduk, useToko } from '../../data/toko';
import { hargaDariPersen, hargaDariUntungRp, TARGET_UNTUNG_PERSEN, untungDariModal } from '../../domain/harga';
import { buatSku, kategoriBawaan, kelompokBawaan } from '../../domain/kategoriBawaan';
import { satuanBawaan } from '../../domain/satuanBawaan';
import type { MetodeHarga, Produk, SatuanProduk, TingkatHarga } from '../../domain/tipe';
import { rupiah } from '../../lib/format';
import { IsianPin } from '../kaslaci/DialogLaci';
import { ambilProduk } from '../penjualan/model';
import { tanggalPendek } from '../kasbon/bersama';

type BarisSatuan = SatuanProduk & { kunci: string };
type BarisTingkat = TingkatHarga & { kunci: string };
const kunci = () => Math.random().toString(36).slice(2);
const namaSatuan = (sid: string) => satuanBawaan.find((s) => s.singkatan === sid)?.nama ?? sid;
const ukuran = (sid: string) => satuanBawaan.find((s) => s.singkatan === sid)?.bolehDesimal ?? false;
const labelOtomatis = (sid: string, isi: number, dasar: string) => (isi === 1 ? namaSatuan(sid) : `${namaSatuan(sid)} isi ${isi.toLocaleString('id-ID')} ${namaSatuan(dasar)}`);

/** Untung % yang bisa diketik (desimal) tanpa melompat saat sedang diketik. */
function InputPersen({ nilai, onUbah, label, merah }: { nilai?: number; onUbah: (n: number) => void; label: string; merah?: boolean }) {
  const [draf, setDraf] = useState<string | null>(null);
  const tampil = draf ?? (nilai === undefined || !Number.isFinite(nilai) ? '' : String(nilai).replace('.', ','));
  return (
    <span className={`sb-persen ${merah ? 'sb-persen--merah' : ''}`}>
      <input className="isian__kontrol" inputMode="decimal" aria-label={label} value={tampil}
        onFocus={() => setDraf(tampil)} onBlur={() => setDraf(null)}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9,.-]/g, '');
          setDraf(t);
          const n = Number(t.replace(',', '.'));
          if (t !== '' && Number.isFinite(n)) onUbah(n);
        }} />
      <span>%</span>
    </span>
  );
}

/** Tiga isian yang saling terhubung: harga jual · untung % · untung Rp (isi salah satu). */
function HargaUntung({ id, modalTotal, harga, onHarga }: { id: string; modalTotal?: number; harga: number; onHarga: (n: number) => void }) {
  const ada = !!modalTotal && modalTotal > 0;
  const persen = ada && harga ? untungDariModal(harga, modalTotal!) : undefined;
  const rp = ada && harga ? harga - modalTotal! : undefined;
  const merah = persen !== undefined && persen < TARGET_UNTUNG_PERSEN;
  return (
    <>
      <td data-label="Harga jual" className="kanan"><InputRupiah id={`hj-${id}`} nilai={harga} label={`Harga jual ${id}`} onUbah={onHarga} /></td>
      <td data-label="Untung %" className="kanan">
        {ada ? <InputPersen nilai={persen} merah={merah} label={`Untung persen ${id}`} onUbah={(n) => onHarga(hargaDariPersen(modalTotal!, n))} /> : <span className="teks-pudar">isi harga beli</span>}
      </td>
      <td data-label="Untung Rp" className="kanan">
        {ada ? <InputRupiah id={`ur-${id}`} nilai={Math.max(0, rp ?? 0)} label={`Untung rupiah ${id}`} onUbah={(n) => onHarga(hargaDariUntungRp(modalTotal!, n))} /> : '-'}
        {rp !== undefined && rp < 0 && <div className="teks-bahaya" style={{ fontSize: 12 }}>rugi {rupiah(-rp)}</div>}
      </td>
    </>
  );
}

/**
 * Tambah / ubah barang (Gudang → Stok Barang). Pemilik langsung; admin dengan PIN pemilik.
 * Harga jual: isi harga, untung %, atau untung Rp (dari harga beli terakhir); dua lainnya terhitung otomatis.
 */
export function FormBarang() {
  const { id } = useParams();
  const toko = useToko();
  const navigasi = useNavigate();
  const lama = id ? ambilProduk(id) : undefined;
  const info = lama ? infoBarang(lama.id, toko) : undefined;
  const dariFaktur = info?.beliTerakhir;
  const [nama, setNama] = useState(lama?.nama ?? '');
  const [kategori, setKategori] = useState(lama?.kategoriId ?? '');
  const [kode, setKode] = useState(lama?.kode ?? '');
  const [dasar, setDasar] = useState(lama?.satuanDasarId ?? '');
  const [metode, setMetode] = useState<MetodeHarga>(lama?.metodeHarga ?? 'per_satuan');
  const [satuan, setSatuan] = useState<BarisSatuan[]>(() => (lama?.satuan ?? []).map((s) => ({ ...s, kunci: kunci() })));
  const [tingkat, setTingkat] = useState<BarisTingkat[]>(() => (lama?.tingkatHarga.length ? lama.tingkatHarga : [{ mulaiJumlah: 0, harga: 0 }]).map((t) => ({ ...t, kunci: kunci() })));
  /** Harga beli per satuan dasar (dasar hitung untung). */
  const [beli, setBeli] = useState<number>(info?.beliAcuan ?? 0);
  const [minimum, setMinimum] = useState(lama?.stokMinimum ?? 0);
  const [maksimum, setMaksimum] = useState(lama?.stokMaksimum ?? 0);
  const [letak, setLetak] = useState(lama?.letak ?? '');
  const [musiman, setMusiman] = useState(!!lama?.musiman);
  const [aktif, setAktif] = useState(lama?.aktif ?? true);
  const [pin, setPin] = useState('');
  const [coba, setCoba] = useState(false);

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
  if (maksimum && maksimum < minimum) masalah.push('Stok maksimum harus lebih besar dari stok minimum.');
  const perluPin = toko.peran !== 'pemilik';
  const pinOk = !perluPin || pin === PIN_PEMILIK_CONTOH;
  // Satuan besar berupa ukuran (kg, liter) sementara satuan dasar kemasan → kemungkinan terbalik.
  const terbalik = dasar && !ukuran(dasar) ? satuan.filter((s) => s.isi > 1 && ukuran(s.satuanId)) : [];

  const simpan = () => {
    setCoba(true);
    if (masalah.length || !pinOk) return;
    const idBaru = lama?.id ?? `${nama.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${kunci().slice(0, 4)}`;
    const p: Produk = {
      id: idBaru,
      sku: lama?.sku ?? buatSku(kategori, produkContoh.map((x) => x.sku)),
      kode: kode.trim().toUpperCase() || undefined, letak: letak.trim() || undefined,
      nama: nama.trim(), kategoriId: kategori, satuanDasarId: dasar, stokMinimum: minimum, stokMaksimum: maksimum || undefined, metodeHarga: metode,
      // Harga beli dari form hanya disimpan sebagai perkiraan bila belum ada faktur.
      hargaBeliAcuan: dariFaktur ? lama?.hargaBeliAcuan : beli || undefined,
      satuan: urut.map(({ kunci: _k, ...s }) => ({ ...s, id: s.id || `${idBaru}-${s.satuanId}${s.isi > 1 ? s.isi : ''}`, hargaJual: metode === 'per_satuan' && s.dijual ? s.hargaJual : undefined })),
      tingkatHarga: metode === 'bertingkat' ? [...tingkat].sort((a, b) => a.mulaiJumlah - b.mulaiJumlah).map(({ kunci: _k, ...t }) => t) : [],
      aktif, musiman: musiman || undefined,
    };
    simpanProduk(p);
    navigasi(`../detail/${p.id}`);
  };

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
          <select className="isian__kontrol" value={kategori} onChange={(e) => setKategori(e.target.value)} style={!kategori ? { color: 'var(--teks-3)' } : undefined}>
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
          {lama ? <span className="isian__bantuan">Tidak bisa diubah karena stok tercatat dalam satuan ini.</span>
            : <span className="isian__bantuan">Mis. minyak curah → Liter; mi → Pcs; gula curah → Kilogram.</span>}
        </label>
        <label className="isian">
          Stok minimum ({dasar || 'satuan dasar'})
          <input className="isian__kontrol" type="number" min={0} value={minimum || ''} onChange={(e) => setMinimum(Number(e.target.value))} />
          <span className="isian__bantuan">Di bawah ini → muncul di Stok Menipis.</span>
        </label>
        <label className="isian">
          Stok maksimum ({dasar || 'satuan dasar'})
          <input className="isian__kontrol" type="number" min={0} value={maksimum || ''} onChange={(e) => setMaksimum(Number(e.target.value))} />
          <span className="isian__bantuan">Saran pesan "sampai maks" mengisi sampai angka ini.</span>
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
          <div>
            <strong>Satuan, harga beli & harga jual</strong>
            <div className="teks-pudar" style={{ fontSize: 12.5 }}>
              Isi salah satu: harga jual, untung %, atau untung Rp — yang lain terhitung. Untung dari harga beli terakhir; hasil hitung dibulatkan ke atas Rp 100.
            </div>
          </div>
          <div className="saklar saklar--kecil" role="group" aria-label="Metode harga">
            <button type="button" aria-pressed={metode === 'per_satuan'} onClick={() => setMetode('per_satuan')}>Harga per satuan</button>
            <button type="button" aria-pressed={metode === 'bertingkat'} onClick={() => setMetode('bertingkat')}>Bertingkat (grosir)</button>
          </div>
        </div>
        {!dasar ? <p className="teks-pudar">Pilih satuan dasar dulu.</p> : (
          <table className="ps-tabel ps-tabel--hp bd-tabel bd-form sb-form-harga">
            <thead>
              <tr>
                <th>Satuan</th><th className="kanan">Isi</th><th>Beli</th><th>Jual</th><th className="kanan">Harga beli</th>
                {metode === 'per_satuan' && <><th className="kanan">Harga jual</th><th className="kanan">Untung %</th><th className="kanan">Untung Rp</th></>}
                <th aria-label="Hapus" />
              </tr>
            </thead>
            <tbody>
              {urut.map((s) => (
                <tr key={s.kunci} style={{ cursor: 'default' }}>
                  <td data-label="Satuan">
                    {s.isi === 1 ? <strong>{namaSatuan(s.satuanId)} (dasar)</strong> : (
                      <select className="isian__kontrol" aria-label="Satuan" value={s.satuanId} onChange={(e) => ubahSatuan(s.kunci, { satuanId: e.target.value })}>
                        {satuanBawaan.map((x) => <option key={x.singkatan} value={x.singkatan}>{x.nama}</option>)}
                      </select>
                    )}
                    <input className="isian__kontrol sb-label" aria-label="Nama tampil" value={s.label} onChange={(e) => ubahSatuan(s.kunci, { label: e.target.value })} />
                    {s.isi > 1 && <div className="teks-pudar" style={{ fontSize: 12 }}>1 {namaSatuan(s.satuanId)} = {s.isi.toLocaleString('id-ID')} {namaSatuan(dasar)}</div>}
                  </td>
                  <td data-label="Isi" className="kanan">
                    {s.isi === 1 ? '1' : <input className="isian__kontrol kk-qty" type="number" min={2} aria-label="Isi" value={s.isi || ''} onChange={(e) => ubahSatuan(s.kunci, { isi: Number(e.target.value) })} />}
                  </td>
                  <td data-label="Beli"><input type="checkbox" className="kb-centang" aria-label={`Dibeli ${s.label}`} checked={s.dibeli} onChange={(e) => ubahSatuan(s.kunci, { dibeli: e.target.checked })} /></td>
                  <td data-label="Jual"><input type="checkbox" className="kb-centang" aria-label={`Dijual ${s.label}`} checked={s.dijual} onChange={(e) => ubahSatuan(s.kunci, { dijual: e.target.checked })} /></td>
                  <td data-label="Harga beli" className="kanan">
                    {dariFaktur ? <span>{rupiah(beli * s.isi)}</span>
                      : <InputRupiah id={`hb-${s.kunci}`} nilai={Math.round(beli * s.isi)} label={`Harga beli ${s.label}`} onUbah={(n) => setBeli(n / s.isi)} />}
                  </td>
                  {metode === 'per_satuan' && (s.dijual
                    ? <HargaUntung id={s.label} modalTotal={beli ? beli * s.isi : undefined} harga={s.hargaJual ?? 0} onHarga={(n) => ubahSatuan(s.kunci, { hargaJual: n })} />
                    : <><td data-label="Harga jual" className="kanan teks-pudar">tidak dijual</td><td /><td /></>)}
                  <td data-label="">{s.isi !== 1 && <button type="button" className="tautan teks-bahaya" onClick={() => setSatuan((xs) => xs.filter((x) => x.kunci !== s.kunci))}>Hapus</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {dariFaktur && (
          <p className="teks-pudar" style={{ fontSize: 12.5, margin: '8px 0 0' }}>
            Harga beli dari faktur terakhir {dariFaktur.nomor} ({tanggalPendek(dariFaktur.tanggal)}). Berubah otomatis saat faktur baru masuk.
          </p>
        )}
        {!dariFaktur && dasar && <p className="teks-pudar" style={{ fontSize: 12.5, margin: '8px 0 0' }}>Harga beli perkiraan — isi di satuan mana saja; dipakai sampai faktur pertama masuk.</p>}
        {terbalik.length > 0 && (
          <p className="catatan catatan--peringatan" style={{ margin: '8px 0 0' }}>
            Periksa satuan: "1 {namaSatuan(terbalik[0].satuanId)} = {terbalik[0].isi} {namaSatuan(dasar)}" tampak terbalik.
            Bila 1 {namaSatuan(dasar)} berisi beberapa {namaSatuan(terbalik[0].satuanId)}, jadikan {namaSatuan(terbalik[0].satuanId)} sebagai satuan dasar.
          </p>
        )}
        {dasar && <button type="button" className="tombol tombol--putus" style={{ marginTop: 10 }}
          onClick={() => { const isi = Math.max(2, ...satuan.map((s) => s.isi * 10)); setSatuan((xs) => [...xs, { kunci: kunci(), id: '', satuanId: 'ktn', label: labelOtomatis('ktn', isi, dasar), isi, dibeli: true, dijual: false }]); }}>
          + Satuan besar (karton, renteng, slop…)
        </button>}
        {metode === 'bertingkat' && dasar && (
          <div className="tumpuk" style={{ marginTop: 14 }}>
            <strong>Tingkat harga (per {namaSatuan(dasar)})</strong>
            <table className="ps-tabel ps-tabel--hp bd-tabel bd-form sb-form-harga">
              <thead><tr><th>Mulai jumlah ({dasar})</th><th className="kanan">Harga jual</th><th className="kanan">Untung %</th><th className="kanan">Untung Rp</th><th aria-label="Hapus" /></tr></thead>
              <tbody>
                {[...tingkat].sort((a, b) => a.mulaiJumlah - b.mulaiJumlah).map((t) => (
                  <tr key={t.kunci} style={{ cursor: 'default' }}>
                    <td data-label={`Mulai (${dasar})`}>
                      <input className="isian__kontrol kk-qty" style={{ marginLeft: 0 }} type="number" min={0} aria-label="Mulai jumlah" value={t.mulaiJumlah}
                        onChange={(e) => setTingkat((xs) => xs.map((x) => (x.kunci === t.kunci ? { ...x, mulaiJumlah: Number(e.target.value) } : x)))} />
                    </td>
                    <HargaUntung id={`tk-${t.kunci}`} modalTotal={beli || undefined} harga={t.harga} onHarga={(n) => setTingkat((xs) => xs.map((x) => (x.kunci === t.kunci ? { ...x, harga: n } : x)))} />
                    <td data-label="">{t.mulaiJumlah !== 0 && <button type="button" className="tautan teks-bahaya" onClick={() => setTingkat((xs) => xs.filter((x) => x.kunci !== t.kunci))}>Hapus</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="tombol tombol--putus" style={{ alignSelf: 'flex-start' }} onClick={() => setTingkat((xs) => [...xs, { kunci: kunci(), mulaiJumlah: Math.max(...xs.map((x) => x.mulaiJumlah)) + 5, harga: 0 }])}>+ Tingkat harga</button>
          </div>
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
