import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aturStokContoh, produkContoh } from '../../data/contoh';
import { ringkasPesanan, stokBebas, useToko } from '../../data/toko';
import { ambilProduk, ambilSatuan, angka } from '../penjualan/model';
import { ambilDistributor, distributorTermurah, labelDasar, namaPelanggan, satuanBeliUrut, tanggalPanjang } from '../pesanan/bersama';
import { DialogBuatSP, DialogDokumenSP, type Kebutuhan } from './DialogSP';
import '../../styles/pesanan.css';

type Cara = 'maks' | 'tetap' | 'rata' | 'manual';
const HARI_RATA = 14;

interface Saran {
  key: string;
  produkId: string;
  sumber: 'stok' | 'pesanan';
  keterangan: string;
  untukPesanan: Kebutuhan['untukPesanan'];
  /** Usulan dalam satuan beli. */
  usulan: Partial<Record<Exclude<Cara, 'manual'>, number>>;
  isi: number;
  labelSatuan: string;
}

/**
 * Pesanan Toko dari dua sumber (halaman terpisah):
 * - `pesanan`: barang pesanan pelanggan (pre-order) yang belum ada, jumlah sesuai pesanan.
 * - `stok`: barang di bawah stok minimum; jumlah dari 3 cara (sampai maks, order tetap, rata-rata), admin memilih.
 */
export function SaranSP({ sumber }: { sumber: 'pesanan' | 'stok' }) {
  const toko = useToko();
  const navigasi = useNavigate();
  const [pilih, setPilih] = useState<Record<string, { aktif: boolean; cara: Cara; manual: number }>>({});
  const [dialog, setDialog] = useState<null | { jenis: 'buat'; kebutuhan: Kebutuhan[] } | { jenis: 'dok'; ids: string[] }>(null);

  // Barang yang sudah ada di SP terbuka (tidak disarankan lagi).
  const diSPTerbuka = new Set(
    toko.sp.filter((x) => x.status !== 'selesai' && x.status !== 'ditutup').flatMap((x) => x.baris.filter((b) => !b.diterima).map((b) => b.produkId)),
  );

  const saran: Saran[] = [];
  // 1) Dari pesanan pelanggan
  for (const p of toko.pesanan) {
    if (sumber !== 'pesanan' || p.dibatalkan) continue;
    for (const x of ringkasPesanan(p).baris) {
      const kurang = x.masihOrder - x.diOrderDiSP;
      if (kurang <= 0) continue;
      const s = satuanBeliUrut(x.b.produkId)[0];
      saran.push({
        key: `ps-${x.b.id}`, produkId: x.b.produkId, sumber: 'pesanan', keterangan: `${namaPelanggan(p.pelangganId)} · ${p.nomor} · janji ${tanggalPanjang(p.tanggalJanji)}`,
        untukPesanan: [{ pesananId: p.id, barisId: x.b.id, jumlahDasar: kurang }],
        usulan: { maks: Math.ceil(kurang / s.isi) }, isi: s.isi, labelSatuan: s.label,
      });
    }
  }
  // 2) Dari stok di bawah minimum
  for (const pr of produkContoh) {
    if (sumber !== 'stok' || diSPTerbuka.has(pr.id)) continue;
    const s = satuanBeliUrut(pr.id)[0];
    if (!s) continue; // barang hasil repack tidak dibeli
    const stok = stokBebas(pr.id);
    if (stok >= pr.stokMinimum) continue;
    const a = aturStokContoh[pr.id];
    const usulan: Saran['usulan'] = {};
    const maks = pr.stokMaksimum ?? a?.maks;
    if (maks) usulan.maks = Math.max(1, Math.ceil((maks - stok) / s.isi));
    if (a) {
      if (a.orderTetap > 0) usulan.tetap = a.orderTetap;
      usulan.rata = Math.max(1, Math.ceil((a.rataHarian * HARI_RATA - stok) / s.isi));
    }
    if (!usulan.maks && !usulan.tetap) usulan.maks = 1;
    saran.push({
      key: `st-${pr.id}`, produkId: pr.id, sumber: 'stok',
      keterangan: `stok ${labelDasar(pr.id, Math.max(0, stok))} · minimum ${labelDasar(pr.id, pr.stokMinimum)}`,
      untukPesanan: [], usulan, isi: s.isi, labelSatuan: s.label,
    });
  }

  const status = (x: Saran) => pilih[x.key] ?? { aktif: true, cara: (x.usulan.maks !== undefined ? 'maks' : 'tetap') as Cara, manual: x.usulan.maks ?? 1 };
  const jumlahDipilih = (x: Saran) => {
    const st = status(x);
    return st.cara === 'manual' ? st.manual : x.usulan[st.cara] ?? 0;
  };
  const ubah = (x: Saran, patch: Partial<ReturnType<typeof status>>) => setPilih((m) => ({ ...m, [x.key]: { ...status(x), ...patch } }));
  const terpilih = saran.filter((x) => status(x).aktif && jumlahDipilih(x) > 0);

  const lanjut = () =>
    setDialog({
      jenis: 'buat',
      kebutuhan: terpilih.map((x) => ({
        produkId: x.produkId,
        jumlahDasar: jumlahDipilih(x) * x.isi,
        untukPesanan: x.untukPesanan,
        keterangan: x.keterangan,
      })),
    });

  const namaCara: Record<Exclude<Cara, 'manual'>, string> = { maks: 'Sampai maks', tetap: 'Order tetap', rata: `Rata ${HARI_RATA} hari` };

  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <p className="teks-pudar" style={{ margin: 0, maxWidth: 720 }}>
          {sumber === 'pesanan'
            ? 'Barang pesanan pelanggan yang stoknya belum ada dan belum dipesan ke distributor. Jumlah sesuai pesanan, dibulatkan ke satuan beli.'
            : 'Barang di bawah stok minimum. Pilih cara hitung jumlah per barang, lalu jadikan Surat Pesanan (satu per distributor).'}
        </p>
        <button type="button" className="tombol tombol--utama" disabled={!terpilih.length} onClick={lanjut}>
          Jadikan Surat Pesanan ({terpilih.length})
        </button>
      </div>

      {saran.length === 0 ? (
        <div className="kartu ps-kosong-besar">
          <h2>{sumber === 'pesanan' ? 'Tidak ada pesanan pelanggan yang perlu dipesan' : 'Tidak ada stok menipis'}</h2>
          <p className="teks-pudar">
            {sumber === 'pesanan'
              ? 'Semua barang pesanan pelanggan sudah ada stoknya atau sudah dipesan ke distributor.'
              : 'Semua stok di atas minimum, atau barangnya sudah ada di pesanan toko yang masih terbuka.'}{' '}
            Barang lain bisa dipesan lewat Pesanan Baru.
          </p>
        </div>
      ) : (
        <div className="kartu sp-saran-daftar">
          {saran.map((x) => {
            const st = status(x);
            const pr = ambilProduk(x.produkId);
            const t = distributorTermurah(x.produkId);
            return (
              <div key={x.key} className="sp-saran" style={{ opacity: st.aktif ? 1 : 0.55 }}>
                <input type="checkbox" className="sp-saran__pilih" aria-label={`Pilih ${pr.nama}`} checked={st.aktif} onChange={(e) => ubah(x, { aktif: e.target.checked })} />
                <div className="sp-saran__barang">
                  <strong>{pr.nama}</strong>
                  <div>
                    <span className="teks-pudar">{x.keterangan}</span>
                  </div>
                  <span className="teks-pudar">Termurah: {t ? `${ambilDistributor(t.distributorId).nama} · ${ambilSatuan(pr, t.satuanProdukId).label}` : '-'}</span>
                </div>
                <div className="sp-saran__cara">
                  <div className="sp-cara">
                    {(Object.keys(namaCara) as Exclude<Cara, 'manual'>[]).filter((c) => x.usulan[c] !== undefined).map((c) => (
                      <button key={c} type="button" aria-pressed={st.cara === c} onClick={() => ubah(x, { cara: c })}>
                        {x.sumber === 'pesanan' && c === 'maks' ? 'Sesuai pesanan' : namaCara[c]}<span>{angka(x.usulan[c]!)}</span>
                      </button>
                    ))}
                    <button type="button" aria-pressed={st.cara === 'manual'} onClick={() => ubah(x, { cara: 'manual', manual: jumlahDipilih(x) })}>
                      Ketik sendiri
                    </button>
                  </div>
                </div>
                <div className="sp-saran__jumlah">
                  {st.cara === 'manual' ? (
                    <input
                      aria-label={`Jumlah ${pr.nama}`}
                      className="isian__kontrol"
                      inputMode="numeric"
                      value={st.manual || ''}
                      onChange={(e) => ubah(x, { manual: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                    />
                  ) : (
                    <strong>{angka(jumlahDipilih(x))}</strong>
                  )}
                  <span className="teks-pudar">{x.labelSatuan}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dialog?.jenis === 'buat' && (
        <DialogBuatSP sumber={sumber} kebutuhan={dialog.kebutuhan} onTutup={() => setDialog(null)} onDibuat={(ids) => { setPilih({}); setDialog({ jenis: 'dok', ids }); }} />
      )}
      {dialog?.jenis === 'dok' && (
        <DialogDokumenSP
          spId={dialog.ids[0]}
          onTutup={() => (dialog.ids.length > 1 ? setDialog({ jenis: 'dok', ids: dialog.ids.slice(1) }) : (setDialog(null), navigasi('../daftar')))}
        />
      )}
    </div>
  );
}
