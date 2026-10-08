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

/** isiPer + dari = isi berantai seperti cara orang menyebut: "Karton isi 10 Slop", "Slop isi 10 Bungkus". */
type BarisSatuan = SatuanProduk & { kunci: string; isiPer: number; dari: string };
type BarisTingkat = TingkatHarga & { kunci: string };
const kunci = () => Math.random().toString(36).slice(2);
const namaSatuan = (sid: string) => satuanBawaan.find((s) => s.singkatan === sid)?.nama ?? sid;
const ukuran = (sid: string) => satuanBawaan.find((s) => s.singkatan === sid)?.bolehDesimal ?? false;
const labelOtomatis = (x: BarisSatuan, semua: BarisSatuan[], dasarKunci: string) => {
  if (x.kunci === dasarKunci) return namaSatuan(x.satuanId);
  const d = semua.find((y) => y.kunci === x.dari);
  return `${namaSatuan(x.satuanId)} isi ${(x.isiPer || 0).toLocaleString('id-ID')} ${d ? namaSatuan(d.satuanId) : ''}`.trim();
};

/** Hitung isi (dalam satuan dasar) dari rantai isiPer × isi satuan acuannya. Rantai berputar → 0 (salah). */
function hitungIsi(xs: BarisSatuan[], dasarKunci: string): BarisSatuan[] {
  const peta = new Map(xs.map((x) => [x.kunci, x]));
  const isiDari = (k: string, jejak: Set<string>): number => {
    if (k === dasarKunci) return 1;
    const x = peta.get(k);
    if (!x || jejak.has(k)) return 0;
    jejak.add(k);
    return (x.isiPer || 0) * isiDari(x.dari || dasarKunci, jejak);
  };
  return xs.map((x) => ({ ...x, isi: isiDari(x.kunci, new Set()) }));
}

/** Urut kecil → besar, satuan dasar paling atas, yang belum benar di bawah. */
const urutkan = (xs: BarisSatuan[], dasarKunci: string) =>
  [...xs].sort((a, b) => (a.kunci === dasarKunci ? -1 : b.kunci === dasarKunci ? 1 : (a.isi || Infinity) - (b.isi || Infinity)));

/** Dari data barang (isi dalam satuan dasar) → baris berantai: acuan = satuan lebih kecil terbesar yang membagi habis. */
function keBaris(satuan: SatuanProduk[], beli: Record<string, { harga: number }> = {}): { baris: BarisSatuan[]; dasarKunci: string } {
  const urut = [...satuan].sort((a, b) => a.isi - b.isi);
  const baris: BarisSatuan[] = [];
  for (const s of urut) {
    const acuan = [...baris].reverse().find((b) => b.isi < s.isi && s.isi % b.isi === 0);
    baris.push({ ...s, kunci: kunci(), hargaBeli: beli[s.id]?.harga ?? s.hargaBeli, dari: acuan?.kunci ?? '', isiPer: acuan ? s.isi / acuan.isi : 1 });
  }
  return { baris, dasarKunci: baris.find((b) => b.isi === 1)?.kunci ?? '' };
}

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
  const [awal] = useState(() => keBaris(lama?.satuan ?? [], info?.beliPerSatuan));
  const [satuan, setSatuan] = useState<BarisSatuan[]>(awal.baris);
  // Baris satuan dasar ditandai tersendiri (bukan dari isi = 1), supaya mengetik "10" tidak mengubah baris jadi satuan dasar.
  const [dasarKunci, setDasarKunci] = useState<string>(awal.dasarKunci);
  const [tingkat, setTingkat] = useState<BarisTingkat[]>(() => (lama?.tingkatHarga.length ? lama.tingkatHarga : [{ mulaiJumlah: 0, harga: 0 }]).map((t) => ({ ...t, kunci: kunci() })));
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
    const k = dasarKunci || kunci();
    setDasarKunci(k);
    setSatuan((xs) => {
      const lain = xs.filter((x) => x.kunci !== k);
      const d = xs.find((x) => x.kunci === k);
      const baru = [{ ...(d ?? { id: '', dibeli: false, dijual: true }), kunci: k, satuanId: sid, label: namaSatuan(sid), isi: 1, isiPer: 1, dari: '' } as BarisSatuan, ...lain];
      return hitungIsi(baru.map((x) => (x.kunci !== k && !x.dari ? { ...x, dari: k } : x)), k);
    });
  };
  // Ubah satu baris lalu hitung ulang rantai isi; nama tampil ikut berubah selama belum diketik manual.
  const ubahSatuan = (k: string, patch: Partial<BarisSatuan>) => setSatuan((xs) => {
    const lamaOto = new Map(xs.map((x) => [x.kunci, labelOtomatis(x, xs, dasarKunci)]));
    const ganti = hitungIsi(xs.map((x) => (x.kunci === k ? { ...x, ...patch } : x)), dasarKunci);
    return ganti.map((x) => (x.label === lamaOto.get(x.kunci) && !('label' in patch && x.kunci === k) ? { ...x, label: labelOtomatis(x, ganti, dasarKunci) } : x));
  });
  const rapikan = () => setSatuan((xs) => urutkan(xs, dasarKunci));

  const urut = satuan;
  const isiSalah = (s: BarisSatuan) => s.kunci !== dasarKunci && !(s.isiPer > 1 && s.isi > 1);
  const rantai = (s: BarisSatuan): string => {
    const d = satuan.find((y) => y.kunci === s.dari);
    if (!d) return '';
    return d.kunci === dasarKunci ? '' : ` = ${s.isi.toLocaleString('id-ID')} ${namaSatuan(dasar)}`;
  };
  // Harga beli acuan per satuan dasar untuk satuan yang tidak dibeli (mis. eceran):
  // faktur terakhir, atau perkiraan dari satuan beli terkecil yang diisi harganya.
  const perkiraan = satuan.filter((x) => x.dibeli && x.hargaBeli && !isiSalah(x)).sort((a, b) => a.isi - b.isi)[0];
  // Harga beli yang baru diubah di form (paling hati-hati: satuan terkecil) menjadi acuan baru.
  const diubah = satuan.filter((x) => x.dibeli && x.hargaBeli && !isiSalah(x) && x.hargaBeli !== awal.baris.find((b) => b.id && b.id === x.id)?.hargaBeli).sort((a, b) => a.isi - b.isi)[0];
  const acuanDasar = diubah ? diubah.hargaBeli! / diubah.isi : info?.beliAcuan ?? (perkiraan ? perkiraan.hargaBeli! / perkiraan.isi : undefined);
  const modalBaris = (s: BarisSatuan) => (s.dibeli && s.hargaBeli ? s.hargaBeli : acuanDasar ? acuanDasar * s.isi : undefined);
  const masalah: string[] = [];
  if (!nama.trim()) masalah.push('Nama barang wajib.');
  if (!lama && produkContoh.some((p) => p.nama.trim().toLowerCase() === nama.trim().toLowerCase())) masalah.push('Nama barang sudah ada.');
  if (!kategori) masalah.push('Pilih kategori.');
  if (!dasar) masalah.push('Pilih satuan dasar.');
  if (satuan.some(isiSalah)) masalah.push('Isi satuan besar harus lebih dari 1.');
  if (new Set(satuan.map((s) => s.isi)).size !== satuan.length) masalah.push('Dua satuan tidak boleh punya isi yang sama.');
  if (!satuan.some((s) => s.dijual)) masalah.push('Minimal satu satuan dijual.');
  if (metode === 'per_satuan' && satuan.some((s) => s.dijual && !s.hargaJual)) masalah.push('Isi harga jual untuk setiap satuan yang dijual.');
  if (metode === 'bertingkat' && (tingkat.some((t) => !t.harga) || !tingkat.some((t) => t.mulaiJumlah === 0))) masalah.push('Tingkat harga: harus ada harga mulai 0 dan semua harga terisi.');
  if (maksimum && maksimum < minimum) masalah.push('Stok maksimum harus lebih besar dari stok minimum.');
  const perluPin = toko.peran !== 'pemilik';
  const pinOk = !perluPin || pin === PIN_PEMILIK_CONTOH;
  // Satuan besar berupa ukuran (kg, liter) sementara satuan dasar kemasan → kemungkinan terbalik.
  const terbalik = dasar && !ukuran(dasar) ? satuan.filter((s) => s.kunci !== dasarKunci && s.isi > 1 && ukuran(s.satuanId)) : [];

  const simpan = () => {
    setCoba(true);
    if (masalah.length || !pinOk) return;
    const idBaru = lama?.id ?? `${nama.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${kunci().slice(0, 4)}`;
    const p: Produk = {
      id: idBaru,
      sku: lama?.sku ?? buatSku(kategori, produkContoh.map((x) => x.sku)),
      kode: kode.trim().toUpperCase() || undefined, letak: letak.trim() || undefined,
      nama: nama.trim(), kategoriId: kategori, satuanDasarId: dasar, stokMinimum: minimum, stokMaksimum: maksimum || undefined, metodeHarga: metode,
      hargaBeliAcuan: undefined,
      satuan: [...urut].sort((a, b) => a.isi - b.isi).map(({ kunci: _k, isiPer: _i, dari: _d, ...s }) => ({
        ...s, id: s.id || `${idBaru}-${s.satuanId}${s.isi > 1 ? s.isi : ''}`,
        hargaJual: metode === 'per_satuan' && s.dijual ? s.hargaJual : undefined,
        // Harga beli per satuan beli (perkiraan); faktur nanti menimpa dengan harga sebenarnya.
        hargaBeli: s.dibeli ? s.hargaBeli || undefined : undefined,
        // Harga beli yang diubah manual diberi tanggal supaya mengalahkan faktur lama (sampai faktur berikutnya).
        hargaBeliTanggal: s.dibeli && s.hargaBeli && s.hargaBeli !== awal.baris.find((b) => b.id && b.id === s.id)?.hargaBeli ? new Date().toISOString() : s.hargaBeliTanggal,
      })),
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
                <th>Satuan</th><th>Isi</th><th>Beli</th><th>Jual</th><th className="kanan">Harga beli</th>
                {metode === 'per_satuan' && <><th className="kanan">Harga jual</th><th className="kanan">Untung %</th><th className="kanan">Untung Rp</th></>}
                <th aria-label="Hapus" />
              </tr>
            </thead>
            <tbody>
              {urut.map((s) => (
                <tr key={s.kunci} style={{ cursor: 'default' }}>
                  <td data-label="Satuan">
                    {s.kunci === dasarKunci ? <strong>{namaSatuan(s.satuanId)} (dasar)</strong> : (
                      <select className="isian__kontrol" aria-label="Satuan" value={s.satuanId} onChange={(e) => ubahSatuan(s.kunci, { satuanId: e.target.value })}>
                        {satuanBawaan.map((x) => <option key={x.singkatan} value={x.singkatan}>{x.nama}</option>)}
                      </select>
                    )}
                    <input className="isian__kontrol sb-label" aria-label="Nama tampil" value={s.label} onChange={(e) => ubahSatuan(s.kunci, { label: e.target.value })} />
                    {s.kunci !== dasarKunci && (isiSalah(s)
                      ? <div className="teks-bahaya" style={{ fontSize: 12 }}>Isi harus lebih dari 1 (dan tidak berputar)</div>
                      : <div className="teks-pudar" style={{ fontSize: 12 }}>1 {namaSatuan(s.satuanId)} = {s.isiPer.toLocaleString('id-ID')} {namaSatuan(satuan.find((y) => y.kunci === s.dari)?.satuanId ?? dasar)}{rantai(s)}</div>)}
                  </td>
                  <td data-label="Isi" className="kanan">
                    {s.kunci === dasarKunci ? '1' : (
                      <div className="sb-isi">
                        <input className="isian__kontrol kk-qty" type="number" min={2} aria-label="Isi" value={s.isiPer || ''}
                          onChange={(e) => ubahSatuan(s.kunci, { isiPer: Number(e.target.value) })} onBlur={rapikan} />
                        <select className="isian__kontrol" aria-label="Isi dalam satuan" value={s.dari || dasarKunci}
                          onChange={(e) => { ubahSatuan(s.kunci, { dari: e.target.value }); setTimeout(rapikan); }}>
                          {satuan.filter((y) => y.kunci !== s.kunci).map((y) => <option key={y.kunci} value={y.kunci}>{namaSatuan(y.satuanId)}</option>)}
                        </select>
                      </div>
                    )}
                  </td>
                  <td data-label="Beli"><input type="checkbox" className="kb-centang" aria-label={`Dibeli ${s.label}`} checked={s.dibeli} onChange={(e) => ubahSatuan(s.kunci, { dibeli: e.target.checked })} /></td>
                  <td data-label="Jual"><input type="checkbox" className="kb-centang" aria-label={`Dijual ${s.label}`} checked={s.dijual} onChange={(e) => ubahSatuan(s.kunci, { dijual: e.target.checked })} /></td>
                  <td data-label="Harga beli" className="kanan">
                    {s.dibeli ? (
                      <>
                        <InputRupiah id={`hb-${s.kunci}`} nilai={s.hargaBeli ?? 0} label={`Harga beli ${s.label}`} onUbah={(n) => ubahSatuan(s.kunci, { hargaBeli: n })} />
                        {(() => {
                          const f = info?.beliPerSatuan[s.id];
                          const awalnya = awal.baris.find((b) => b.id && b.id === s.id)?.hargaBeli;
                          if (s.id && awalnya !== undefined && s.hargaBeli !== awalnya) return <div className="sb-ubah-beli">diubah dari {rupiah(awalnya)} · dipakai sampai faktur berikutnya</div>;
                          return f ? <div className="teks-pudar" style={{ fontSize: 12 }}>{f.nomor === 'perkiraan' ? 'perkiraan (belum ada faktur)' : f.manual ? `diubah manual ${f.tanggal}` : `dari faktur ${f.nomor}`}</div> : null;
                        })()}
                      </>
                    )
                      : modalBaris(s) ? <span className="teks-pudar">≈ {rupiah(modalBaris(s)!)}</span> : '-'}
                  </td>
                  {metode === 'per_satuan' && (s.dijual
                    ? <HargaUntung id={s.label} modalTotal={modalBaris(s)} harga={s.hargaJual ?? 0} onHarga={(n) => ubahSatuan(s.kunci, { hargaJual: n })} />
                    : <><td data-label="Harga jual" className="kanan teks-pudar">tidak dijual</td><td /><td /></>)}
                  <td data-label="">{s.kunci !== dasarKunci && <button type="button" className="tautan teks-bahaya" onClick={() => setSatuan((xs) => xs.filter((x) => x.kunci !== s.kunci))}>Hapus</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="teks-pudar" style={{ fontSize: 12.5, margin: '8px 0 0' }}>
          Setiap satuan yang dibeli (✓ Beli) punya harga beli sendiri — mis. per slop dan per karton bisa berbeda. Terisi dari faktur terakhir dan boleh diubah
          (mis. distributor mengabari harga naik); harga yang diubah dipakai sampai faktur berikutnya masuk. Belum pernah difaktur → isi perkiraan. Satuan yang tidak dibeli (eceran) dihitung dari {dariFaktur ? `faktur terakhir ${dariFaktur.nomor}` : 'satuan beli terkecil'}.
        </p>
        {terbalik.length > 0 && (
          <p className="catatan catatan--peringatan" style={{ margin: '8px 0 0' }}>
            Periksa satuan: "1 {namaSatuan(terbalik[0].satuanId)} = {terbalik[0].isi} {namaSatuan(dasar)}" tampak terbalik.
            Bila 1 {namaSatuan(dasar)} berisi beberapa {namaSatuan(terbalik[0].satuanId)}, jadikan {namaSatuan(terbalik[0].satuanId)} sebagai satuan dasar.
          </p>
        )}
        {dasar && <button type="button" className="tombol tombol--putus" style={{ marginTop: 10 }}
          onClick={() => setSatuan((xs) => {
            const besar = [...xs].sort((a, b) => b.isi - a.isi)[0];
            const baru: BarisSatuan = { kunci: kunci(), id: '', satuanId: 'ktn', label: '', isi: 0, isiPer: 10, dari: besar?.kunci ?? dasarKunci, dibeli: true, dijual: false };
            const semua = hitungIsi([...xs, baru], dasarKunci);
            return semua.map((x) => (x.kunci === baru.kunci ? { ...x, label: labelOtomatis(x, semua, dasarKunci) } : x));
          })}>
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
                    <HargaUntung id={`tk-${t.kunci}`} modalTotal={acuanDasar} harga={t.harga} onHarga={(n) => setTingkat((xs) => xs.map((x) => (x.kunci === t.kunci ? { ...x, harga: n } : x)))} />
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
