import { useState, type ReactNode } from 'react';
import { Dialog } from '../../components/Dialog';
import { Link, useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { diskonContoh, produkContoh } from '../../data/contoh';
import {
  ambilPelanggan, barisSudahBerjalan, bisaHapusPesanan, hapusBarisPesanan, hapusPesanan, ringkasPesanan, setujuiHarga, stokBebas,
  tambahBarisPesanan, tandaiDisiapkan, ubahBarisPesananPenuh, ubahDataPesanan, useToko, type Pesanan,
} from '../../data/toko';
import type { Produk } from '../../domain/tipe';
import { TARGET_UNTUNG_PERSEN } from '../../domain/harga';
import { rupiah } from '../../lib/format';
import { DialogAturBarang } from '../penjualan/DialogSatuan';
import { ambilProduk } from '../penjualan/model';
import { DialogBuatSP, DialogDokumenSP, DialogTerimaSP, type Kebutuhan } from '../sp/DialogSP';
import { ChipStatus, labelDasar, labelJumlah, namaPelanggan, tanggalPanjang } from './bersama';
import { DialogBatalPesanan, DialogBayarPesanan, DialogSerahkan, DialogSuratJalan } from './DialogPesanan';
import '../../styles/pesanan.css';

type DialogAktif =
  | { jenis: 'sp' }
  | { jenis: 'dokumen'; spIds: string[] }
  | { jenis: 'terima'; spId: string }
  | { jenis: 'serah' }
  | { jenis: 'sj'; nomor: string }
  | { jenis: 'bayar' }
  | { jenis: 'batal' }
  | { jenis: 'siapkan' }
  | { jenis: 'ubah'; barisId: string }
  | { jenis: 'hapusBaris'; barisId: string }
  | { jenis: 'cari' }
  | { jenis: 'tambah'; produk: Produk }
  | { jenis: 'data' }
  | { jenis: 'hapus' }
  | { jenis: 'cetak' }
  | null;

export function DetailPesanan() {
  const { id } = useParams();
  const { pesanan, sp, peran } = useToko();
  const [dialog, setDialog] = useState<DialogAktif>(null);
  const [pesan, setPesan] = useState('');
  const navigasi = useNavigate();
  const p = pesanan.find((x) => x.id === id);
  if (!p) {
    return (
      <div className="ps-halaman">
        <div className="kartu tumpuk">
          <h2>Pesanan tidak ditemukan</h2>
          <p className="teks-pudar" style={{ margin: 0 }}>Data pratinjau tersimpan di memori dan hilang saat halaman dimuat ulang.</p>
          <Link to="../daftar" className="tombol" style={{ alignSelf: 'flex-start' }}>Ke daftar pesanan</Link>
        </div>
      </div>
    );
  }
  const r = ringkasPesanan(p);
  const bolehAdmin = peran !== 'kasir';
  const lihatModal = peran !== 'kasir';
  const selesai = p.dibatalkan || r.status === 'Lunas';
  const bisaUbah = !p.dibatalkan && !r.baris.some((x) => x.b.diserahkan > 0);
  const masihJalan = !p.dibatalkan && r.baris.some((x) => x.sisaSerah > 0);
  const plg = ambilPelanggan(p.pelangganId);

  const spTerkait = sp.filter((x) => x.baris.some((b) => b.untukPesanan.some((u) => u.pesananId === p.id)));
  const spMenunggu = spTerkait.filter((x) => x.status === 'draf' || x.status === 'dikirim' || x.status === 'sebagian');

  const kebutuhan: Kebutuhan[] = r.baris
    .filter((x) => x.masihOrder > x.diOrderDiSP)
    .map((x) => ({
      produkId: x.b.produkId,
      jumlahDasar: x.masihOrder - x.diOrderDiSP,
      untukPesanan: [{ pesananId: p.id, barisId: x.b.id, jumlahDasar: x.masihOrder - x.diOrderDiSP }],
      keterangan: `untuk ${p.nomor}`,
    }));
  const adaSiapSerah = r.baris.some((x) => x.siap - x.b.diserahkan > 0);

  return (
    <div className="ps-halaman">
      <Link to="../daftar" className="tautan">← Daftar pesanan</Link>

      <section className="kartu ps-kepala">
        <div className="ps-kepala__kiri">
          <div className="ps-kepala__nomor">
            <h2>{p.nomor}</h2>
            <ChipStatus status={r.status} />
          </div>
          <div className="teks-pudar">
            <strong style={{ color: 'var(--teks)' }}>{namaPelanggan(p.pelangganId)}</strong> · {p.cara === 'antar' ? `Diantar ke ${p.alamat}` : 'Diambil'} · {tanggalPanjang(p.tanggalJanji)}
          </div>
          <div className="teks-pudar" style={{ fontSize: 12.5 }}>Dicatat {p.dibuat} oleh {p.oleh}{p.catatan ? ` · Catatan: ${p.catatan}` : ''}</div>
        </div>
        <div className="ps-kepala__kanan">
          <span className="teks-pudar">Total</span>
          <strong className="ps-kepala__total">{rupiah(r.total)}</strong>
          <span className="teks-pudar">Dibayar {rupiah(r.dibayar)} · sisa {rupiah(r.sisa)}{p.jatuhTempo ? ` · tempo ${tanggalPanjang(p.jatuhTempo)}` : ''}</span>
        </div>
      </section>

      <div className="baris-tombol">
        <button type="button" className="tombol" onClick={() => setDialog({ jenis: 'cetak' })}>Cetak nota pesanan</button>
        {masihJalan && <button type="button" className="tombol" onClick={() => setDialog({ jenis: 'data' })}>Ubah data pesanan</button>}
        {masihJalan && <button type="button" className="tombol" onClick={() => setDialog({ jenis: 'cari' })}>+ Tambah barang</button>}
        {bolehAdmin && bisaHapusPesanan(p) && (
          <button type="button" className="tombol tombol--hantu teks-bahaya" onClick={() => setDialog({ jenis: 'hapus' })}>Hapus pesanan</button>
        )}
      </div>
      {pesan && <p className="catatan catatan--peringatan">{pesan}</p>}

      {/* Langkah berikutnya sesuai status */}
      {!p.dibatalkan && (
        <section className="ps-langkah">
          {r.status === 'Perlu diorder' && (
            <div className="ps-langkah__isi">
              <div>
                <strong>Ada barang yang perlu diorder ke distributor</strong>
                <p>{bolehAdmin ? 'Buat Surat Pesanan, lalu kirim ke distributor lewat WhatsApp.' : 'Admin akan membuat Surat Pesanan ke distributor.'}</p>
              </div>
              {bolehAdmin && <button type="button" className="tombol tombol--utama" onClick={() => setDialog({ jenis: 'sp' })}>Buat Surat Pesanan</button>}
            </div>
          )}
          {r.status === 'Menunggu barang' && (
            <div className="ps-langkah__isi">
              <div>
                <strong>Menunggu barang dari distributor</strong>
                <p>{spMenunggu.map((x) => x.nomor).join(', ') || 'Surat Pesanan'} {bolehAdmin ? '· catat faktur saat barang datang.' : ''}</p>
              </div>
              {bolehAdmin && spMenunggu[0] && (
                <button type="button" className="tombol tombol--utama" onClick={() => setDialog({ jenis: 'terima', spId: spMenunggu[0].id })}>Terima barang</button>
              )}
            </div>
          )}
          {r.status === 'Perlu persetujuan' && (
            <div className="ps-langkah__isi ps-langkah__isi--merah">
              <div>
                <strong>Untung di bawah target {TARGET_UNTUNG_PERSEN}%</strong>
                <p>{peran === 'pemilik' ? 'Setujui harga atau ubah harga ke pelanggan di baris yang ditandai.' : 'Menunggu persetujuan pemilik.'}</p>
              </div>
            </div>
          )}
          {(r.status === 'Barang siap' || r.status === 'Disiapkan' || (r.status === 'Diserahkan sebagian' && adaSiapSerah)) && (
            <div className="ps-langkah__isi">
              <div>
                <strong>{r.status === 'Barang siap' ? 'Barang siap disiapkan' : 'Siap diserahkan'}</strong>
                <p>{p.cara === 'antar' ? 'Diantar ke pelanggan dengan surat jalan.' : 'Pelanggan mengambil di toko.'}</p>
              </div>
              <div className="baris-tombol">
                {r.status === 'Barang siap' && <button type="button" className="tombol" onClick={() => { tandaiDisiapkan(p.id); setDialog({ jenis: 'siapkan' }); }}>Siapkan & cetak daftar</button>}
                <button type="button" className="tombol tombol--utama" onClick={() => setDialog({ jenis: 'serah' })}>Serahkan</button>
              </div>
            </div>
          )}
          {r.sisa > 0 && r.baris.every((x) => x.sisaSerah === 0) && (
            <div className="ps-langkah__isi">
              <div>
                <strong>Barang sudah diserahkan · sisa tagihan {rupiah(r.sisa)}</strong>
                <p>{p.jatuhTempo ? `Tempo sampai ${tanggalPanjang(p.jatuhTempo)}.` : 'Terima pembayaran atau jadikan tempo.'}</p>
              </div>
              <button type="button" className="tombol tombol--utama" onClick={() => setDialog({ jenis: 'bayar' })}>Terima pembayaran</button>
            </div>
          )}
        </section>
      )}
      {p.dibatalkan && (
        <p className="catatan catatan--bahaya">Dibatalkan {p.dibatalkan.waktu}: {p.dibatalkan.alasan}</p>
      )}

      <section className="kartu ps-tabel-kartu">
        <h2>Barang</h2>
        <div className="ps-tabel-gulir">
          <table className="ps-tabel ps-tabel--hp">
            <thead>
              <tr>
                <th>Barang</th>
                <th>Jumlah</th>
                <th className="kanan">Harga</th>
                <th className="kanan">Total</th>
                {lihatModal && <th className="kanan">Untung</th>}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {r.baris.map((x) => {
                const pr = ambilProduk(x.b.produkId);
                const statusBaris =
                  x.b.diserahkan >= x.total ? { t: 'Diserahkan', w: 'hijau' }
                  : x.siap >= x.total ? { t: x.b.diserahkan > 0 ? `Sisa ${labelDasar(pr.id, x.sisaSerah)}` : x.b.dariStok >= x.total ? 'Stok terkunci' : 'Siap', w: 'biru' }
                  : x.diOrderDiSP > 0 ? { t: `Menunggu ${labelDasar(pr.id, x.masihOrder)}`, w: 'kuning' }
                  : { t: `Perlu order ${labelDasar(pr.id, x.masihOrder - x.diOrderDiSP)}`, w: 'merah' };
                return (
                  <tr key={x.b.id}>
                    <td data-label="Barang">
                      <strong>{pr.nama}</strong>
                      <div className="teks-pudar" style={{ fontSize: 12 }}>{pr.sku}</div>
                    </td>
                    <td data-label="Jumlah">{labelJumlah(x.b.produkId, x.b.satuanProdukId, x.b.qty)}</td>
                    <td className="kanan" data-label="Harga">
                      {rupiah(x.h.hargaSatuan)}
                      {x.h.hargaDiubah && <div className="teks-pudar" style={{ fontSize: 12 }}>bawaan {rupiah(x.h.hargaNormal)}</div>}
                    </td>
                    <td className="kanan" data-label="Total">
                      {rupiah(x.h.netto)}
                      {x.h.diskon > 0 && <div className="teks-pudar" style={{ fontSize: 12 }}>diskon −{rupiah(x.h.diskon)}</div>}
                    </td>
                    {lihatModal && (
                      <td className={x.perluSetuju ? 'kanan teks-bahaya' : 'kanan'} data-label="Untung">
                        {Number.isFinite(x.untung) ? `${x.untung.toLocaleString('id-ID')}%` : '-'}
                        <div className="teks-pudar" style={{ fontSize: 12 }}>{x.modalPasti ? 'pasti' : 'perkiraan'}</div>
                      </td>
                    )}
                    <td data-label="Status">
                      <span className={`chip-status chip-status--${statusBaris.w}`}>{statusBaris.t}</span>
                      <div className="ps-aksi-baris">
                        {x.perluSetuju && peran === 'pemilik' && (
                          <button type="button" className="tautan" onClick={() => setujuiHarga(p.id, x.b.id, pr.nama)}>Setujui harga</button>
                        )}
                        {bisaUbah && (x.perluSetuju ? peran === 'pemilik' : true) && (
                          <button type="button" className="tautan" onClick={() => { setPesan(''); setDialog({ jenis: 'ubah', barisId: x.b.id }); }}>Ubah</button>
                        )}
                        {bisaUbah && p.baris.length > 1 && !barisSudahBerjalan(p, x.b) && (
                          <button type="button" className="tautan teks-bahaya" onClick={() => setDialog({ jenis: 'hapusBaris', barisId: x.b.id })}>Hapus</button>
                        )}
                        {x.b.disetujui && <span className="teks-pudar" style={{ fontSize: 12 }}>harga disetujui</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="ps-dua">
        <section className="kartu tumpuk">
          <div className="ps-judul-baris">
            <h2>Pembayaran</h2>
            {!p.dibatalkan && r.sisa > 0 && (
              <button type="button" className="tombol tombol--kecil" onClick={() => setDialog({ jenis: 'bayar' })}>Terima / tempo</button>
            )}
          </div>
          {p.pembayaran.length === 0 ? (
            <p className="teks-pudar" style={{ margin: 0 }}>Belum ada pembayaran.</p>
          ) : (
            <ul className="ps-daftar">
              {p.pembayaran.map((b, i) => (
                <li key={i}><span>{b.waktu} · {b.jenis} · {b.metode}</span><strong>{rupiah(b.jumlah)}</strong></li>
              ))}
            </ul>
          )}
          {spTerkait.length > 0 && (
            <>
              <h2>Surat Pesanan</h2>
              <ul className="ps-daftar">
                {spTerkait.map((x) => (
                  <li key={x.id}>
                    <button type="button" className="tautan" onClick={() => setDialog({ jenis: 'dokumen', spIds: [x.id] })}>{x.nomor}</button>
                    <ChipStatus status={x.status} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {p.serah.length > 0 && (
            <>
              <h2>Serah terima</h2>
              <ul className="ps-daftar">
                {p.serah.map((s) => (
                  <li key={s.nomor}>
                    <button type="button" className="tautan" onClick={() => setDialog({ jenis: 'sj', nomor: s.nomor })}>{s.nomor}</button>
                    <span className="teks-pudar">{s.waktu} · {s.diantar ? 'diantar' : 'diambil'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="kartu tumpuk">
          <h2>Riwayat</h2>
          <ol className="ps-riwayat">
            {[...p.riwayat].reverse().map((x, i) => (
              <li key={i}><span className="teks-pudar">{x.waktu}</span> {x.teks}</li>
            ))}
          </ol>
          {!selesai && bolehAdmin && !r.baris.some((x) => x.b.diserahkan > 0) && (
            <button type="button" className="tombol tombol--bahaya" style={{ alignSelf: 'flex-start', height: 40 }} onClick={() => setDialog({ jenis: 'batal' })}>
              Batalkan pesanan
            </button>
          )}
        </section>
      </div>

      {dialog?.jenis === 'sp' && (
        <DialogBuatSP sumber="pesanan" kebutuhan={kebutuhan} onTutup={() => setDialog(null)} onDibuat={(spIds) => setDialog({ jenis: 'dokumen', spIds })} />
      )}
      {dialog?.jenis === 'dokumen' && (
        <DialogDokumenSP
          spId={dialog.spIds[0]}
          onTutup={() => setDialog(dialog.spIds.length > 1 ? { jenis: 'dokumen', spIds: dialog.spIds.slice(1) } : null)}
        />
      )}
      {dialog?.jenis === 'terima' && (
        <DialogTerimaSP sp={sp.find((x) => x.id === dialog.spId)!} onTutup={() => setDialog(null)} onSelesai={() => setDialog(null)} />
      )}
      {dialog?.jenis === 'serah' && (
        <DialogSerahkan p={p} onTutup={() => setDialog(null)} onSelesai={(nomor) => setDialog({ jenis: 'sj', nomor })} />
      )}
      {dialog?.jenis === 'sj' && (
        <DialogSuratJalan
          p={p}
          nomorSJ={dialog.nomor}
          onTutup={() => setDialog(r.baris.every((x) => x.sisaSerah === 0) && r.sisa > 0 && !p.jatuhTempo ? { jenis: 'bayar' } : null)}
        />
      )}
      {dialog?.jenis === 'bayar' && <DialogBayarPesanan p={p} onTutup={() => setDialog(null)} />}
      {dialog?.jenis === 'batal' && <DialogBatalPesanan p={p} onTutup={() => setDialog(null)} />}
      {dialog?.jenis === 'siapkan' && (
        <DialogDaftarSiapkanPesanan p={p} onTutup={() => setDialog(null)} />
      )}
      {dialog?.jenis === 'ubah' && (() => {
        const b = p.baris.find((x) => x.id === dialog.barisId)!;
        return (
          <DialogAturBarang
            produk={ambilProduk(b.produkId)}
            pelanggan={plg}
            daftarDiskon={diskonContoh}
            bolehUbahHarga
            awal={b}
            onSimpan={(h) => {
              setPesan(ubahBarisPesananPenuh(p.id, b.id, { produkId: b.produkId, ...h }) ?? '');
              setDialog(null);
            }}
            onHapus={p.baris.length > 1 && !barisSudahBerjalan(p, b) ? () => setDialog({ jenis: 'hapusBaris', barisId: b.id }) : undefined}
            onTutup={() => setDialog(null)}
          />
        );
      })()}
      {dialog?.jenis === 'hapusBaris' && (() => {
        const b = p.baris.find((x) => x.id === dialog.barisId)!;
        return (
          <DialogKonfirmasi
            judul="Hapus barang dari pesanan?"
            teks={`${ambilProduk(b.produkId).nama} · ${labelJumlah(b.produkId, b.satuanProdukId, b.qty)} dihapus dari ${p.nomor}. Stok yang dikunci untuk barang ini dilepas lagi.`}
            tombol="Hapus barang"
            onYa={() => { setPesan(hapusBarisPesanan(p.id, b.id) ?? ''); setDialog(null); }}
            onTutup={() => setDialog(null)}
          />
        );
      })()}
      {dialog?.jenis === 'cari' && (
        <DialogPilihBarang onPilih={(produk) => setDialog({ jenis: 'tambah', produk })} onTutup={() => setDialog(null)} />
      )}
      {dialog?.jenis === 'tambah' && (
        <DialogAturBarang
          produk={dialog.produk}
          pelanggan={plg}
          daftarDiskon={diskonContoh}
          bolehUbahHarga
          teksTombol="Tambah ke pesanan"
          onSimpan={(h) => { tambahBarisPesanan(p.id, { produkId: dialog.produk.id, ...h }); setPesan(''); setDialog(null); }}
          onTutup={() => setDialog(null)}
        />
      )}
      {dialog?.jenis === 'data' && <DialogUbahData p={p} onTutup={() => setDialog(null)} />}
      {dialog?.jenis === 'hapus' && (
        <DialogKonfirmasi
          judul={`Hapus ${p.nomor}?`}
          teks="Untuk pesanan yang salah catat. Pesanan hilang dari daftar dan stok yang dikunci dilepas. Pesanan yang sudah ada pembayaran, Surat Pesanan, atau serah terima tidak bisa dihapus — pakai Batalkan pesanan."
          tombol="Hapus pesanan"
          onYa={() => { hapusPesanan(p.id); navigasi('../daftar'); }}
          onTutup={() => setDialog(null)}
        />
      )}
      {dialog?.jenis === 'cetak' && <DialogNotaPesanan p={p} onTutup={() => setDialog(null)} />}
    </div>
  );
}

function DialogDaftarSiapkanPesanan({ p, onTutup }: { p: Pesanan; onTutup: () => void }) {
  return (
    <DialogStrukSederhana judul="Daftar Siapkan" onTutup={onTutup}>
      <div className="struk__tebal">DAFTAR SIAPKAN · {p.nomor}</div>
      <div>{namaPelanggan(p.pelangganId)} · {tanggalPanjang(p.tanggalJanji)}</div>
      <div className="struk__garis" />
      {p.baris.map((b) => (
        <div key={b.id} style={{ marginBottom: 6 }}>
          <div>☐ {ambilProduk(b.produkId).nama}</div>
          <div className="struk__baris">
            <span>   {labelJumlah(b.produkId, b.satuanProdukId, b.qty)}</span>
            <span>{ambilProduk(b.produkId).letak ?? '-'}</span>
          </div>
        </div>
      ))}
      <div className="struk__garis" />
      <div>Disiapkan oleh: ______________</div>
    </DialogStrukSederhana>
  );
}

function DialogStrukSederhana({ judul, onTutup, children }: { judul: string; onTutup: () => void; children: ReactNode }) {
  return (
    <Dialog judul={judul} onTutup={onTutup} lebar={420} kaki={<button type="button" className="tombol tombol--utama" onClick={onTutup}>Selesai</button>}>
      <div className="struk">{children}</div>
    </Dialog>
  );
}

function DialogKonfirmasi({ judul, teks, tombol, onYa, onTutup }: { judul: string; teks: string; tombol: string; onYa: () => void; onTutup: () => void }) {
  return (
    <Dialog
      judul={judul}
      onTutup={onTutup}
      lebar={440}
      kaki={
        <div className="baris-tombol" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="tombol" onClick={onTutup}>Batal</button>
          <button type="button" className="tombol tombol--utama tombol--merah" onClick={onYa}>{tombol}</button>
        </div>
      }
    >
      <p style={{ margin: 0 }}>{teks}</p>
    </Dialog>
  );
}

function DialogPilihBarang({ onPilih, onTutup }: { onPilih: (p: Produk) => void; onTutup: () => void }) {
  const [cari, setCari] = useState('');
  const q = cari.trim().toLowerCase();
  const hasil = (q
    ? produkContoh.filter((p) => p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.kode ?? '').toLowerCase().includes(q))
    : produkContoh
  ).slice(0, 30);
  return (
    <Dialog judul="Tambah barang" onTutup={onTutup} lebar={520}>
      <label className="pj__cari-kotak">
        <span className="sr">Cari barang</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama, SKU, kode" autoComplete="off" autoFocus />
      </label>
      <ul className="ps-hasil">
        {hasil.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPilih(p)}>
              <span>{p.nama}</span>
              <span className="teks-pudar">{p.sku} · stok bebas {labelDasar(p.id, Math.max(0, stokBebas(p.id)))}</span>
            </button>
          </li>
        ))}
      </ul>
      {hasil.length === 0 && <p className="teks-pudar" style={{ margin: 0 }}>Barang tidak ditemukan.</p>}
    </Dialog>
  );
}

function DialogUbahData({ p, onTutup }: { p: Pesanan; onTutup: () => void }) {
  const [tanggal, setTanggal] = useState(p.tanggalJanji);
  const [cara, setCara] = useState(p.cara);
  const [alamat, setAlamat] = useState(p.alamat ?? '');
  const [catatan, setCatatan] = useState(p.catatan ?? '');
  const siap = !!tanggal && (cara === 'ambil' || !!alamat.trim());
  return (
    <Dialog
      judul={`Ubah data ${p.nomor}`}
      onTutup={onTutup}
      lebar={480}
      kaki={
        <button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap}
          onClick={() => { ubahDataPesanan(p.id, { tanggalJanji: tanggal, cara, alamat: alamat.trim() || undefined, catatan: catatan.trim() || undefined }); onTutup(); }}>
          Simpan perubahan
        </button>
      }
    >
      <p className="teks-pudar" style={{ margin: 0, fontSize: 13 }}>Pelanggan: {namaPelanggan(p.pelangganId)} (tidak bisa diganti; bila salah pelanggan, hapus atau batalkan lalu buat ulang).</p>
      <label className="isian">
        Tanggal ambil / antar
        <input type="date" className="isian__kontrol" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
      </label>
      <div className="isian">
        Cara serah
        <div className="saklar" role="group" aria-label="Cara serah" style={{ alignSelf: 'flex-start' }}>
          <button type="button" aria-pressed={cara === 'ambil'} onClick={() => setCara('ambil')}>Diambil</button>
          <button type="button" aria-pressed={cara === 'antar'} onClick={() => setCara('antar')}>Diantar</button>
        </div>
      </div>
      {cara === 'antar' && (
        <label className="isian">
          Alamat antar
          <input className="isian__kontrol" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
        </label>
      )}
      <label className="isian">
        Catatan
        <input className="isian__kontrol" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
      </label>
    </Dialog>
  );
}

/** Nota pesanan untuk pelanggan (thermal): barang, total, DP/pembayaran, sisa. Tanpa modal/untung. */
function DialogNotaPesanan({ p, onTutup }: { p: Pesanan; onTutup: () => void }) {
  const [info, setInfo] = useState('');
  const r = ringkasPesanan(p);
  return (
    <Dialog
      judul={`Nota pesanan ${p.nomor}`}
      onTutup={onTutup}
      lebar={420}
      kaki={
        <>
          <div className="baris-tombol">
            <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, nota masuk antrian stasiun printer.')}>Cetak</button>
            <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, nota diunduh sebagai gambar/PDF.')}>Unduh</button>
            <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, nota dikirim ke WhatsApp pelanggan.')}>WhatsApp</button>
          </div>
          {info && <p className="catatan catatan--info" style={{ margin: 0 }}>{info}</p>}
        </>
      }
    >
      <div className="struk" aria-label="Pratinjau nota pesanan">
        <div className="struk__tengah">
          <strong>[Nama Toko]</strong>
          <div>[Alamat toko] · [No. HP]</div>
        </div>
        <div className="struk__garis" />
        <div className="struk__tengah struk__tebal">NOTA PESANAN</div>
        <div>{p.nomor} · {p.dibuat}</div>
        <div>Pelanggan: {namaPelanggan(p.pelangganId)}</div>
        <div>{p.cara === 'antar' ? `Diantar: ${p.alamat}` : 'Diambil di toko'} · {tanggalPanjang(p.tanggalJanji)}</div>
        {p.catatan && <div>Catatan: {p.catatan}</div>}
        <div className="struk__garis" />
        {r.baris.map((x) => (
          <div key={x.b.id}>
            <div>{ambilProduk(x.b.produkId).nama}</div>
            <div className="struk__baris">
              <span>{labelJumlah(x.b.produkId, x.b.satuanProdukId, x.b.qty)} × {rupiah(x.h.hargaSatuan)}</span>
              <span>{rupiah(x.h.bruto)}</span>
            </div>
            {x.h.diskon > 0 && <div className="struk__baris"><span>  Diskon</span><span>−{rupiah(x.h.diskon)}</span></div>}
          </div>
        ))}
        <div className="struk__garis" />
        <div className="struk__baris struk__tebal"><span>TOTAL</span><span>{rupiah(r.total)}</span></div>
        {p.pembayaran.map((b, i) => (
          <div key={i} className="struk__baris"><span>{b.jenis} ({b.metode})</span><span>−{rupiah(b.jumlah)}</span></div>
        ))}
        <div className="struk__baris struk__tebal"><span>SISA</span><span>{rupiah(r.sisa)}</span></div>
        <div className="struk__garis" />
        {r.baris.some((x) => !x.modalPasti) && <div className="struk__tengah">Harga dapat menyesuaikan harga distributor saat barang datang.</div>}
      </div>
    </Dialog>
  );
}
