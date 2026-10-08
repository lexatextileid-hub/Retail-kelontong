import { useState, type ReactNode } from 'react';
import { Dialog } from '../../components/Dialog';
import { Link, useParams } from 'react-router-dom';
import { diskonContoh, pelangganContoh } from '../../data/contoh';
import { ringkasPesanan, setujuiHarga, tandaiDisiapkan, ubahBarisPesanan, useToko, type Pesanan } from '../../data/toko';
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
  | null;

export function DetailPesanan() {
  const { id } = useParams();
  const { pesanan, sp, peran } = useToko();
  const [dialog, setDialog] = useState<DialogAktif>(null);
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
  const plg = pelangganContoh.find((x) => x.id === p.pelangganId)!;

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
          <table className="ps-tabel">
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
                    <td>
                      <strong>{pr.nama}</strong>
                      <div className="teks-pudar" style={{ fontSize: 12 }}>{pr.sku}</div>
                    </td>
                    <td>{labelJumlah(x.b.produkId, x.b.satuanProdukId, x.b.qty)}</td>
                    <td className="kanan">
                      {rupiah(x.h.hargaSatuan)}
                      {x.h.hargaDiubah && <div className="teks-pudar" style={{ fontSize: 12 }}>bawaan {rupiah(x.h.hargaNormal)}</div>}
                    </td>
                    <td className="kanan">
                      {rupiah(x.h.netto)}
                      {x.h.diskon > 0 && <div className="teks-pudar" style={{ fontSize: 12 }}>diskon −{rupiah(x.h.diskon)}</div>}
                    </td>
                    {lihatModal && (
                      <td className={x.perluSetuju ? 'kanan teks-bahaya' : 'kanan'}>
                        {Number.isFinite(x.untung) ? `${x.untung.toLocaleString('id-ID')}%` : '-'}
                        <div className="teks-pudar" style={{ fontSize: 12 }}>{x.modalPasti ? 'pasti' : 'perkiraan'}</div>
                      </td>
                    )}
                    <td>
                      <span className={`chip-status chip-status--${statusBaris.w}`}>{statusBaris.t}</span>
                      <div className="ps-aksi-baris">
                        {x.perluSetuju && peran === 'pemilik' && (
                          <button type="button" className="tautan" onClick={() => setujuiHarga(p.id, x.b.id, pr.nama)}>Setujui harga</button>
                        )}
                        {bisaUbah && (x.perluSetuju ? peran === 'pemilik' : true) && (
                          <button type="button" className="tautan" onClick={() => setDialog({ jenis: 'ubah', barisId: x.b.id })}>Ubah</button>
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
        <DialogBuatSP kebutuhan={kebutuhan} onTutup={() => setDialog(null)} onDibuat={(spIds) => setDialog({ jenis: 'dokumen', spIds })} />
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
              ubahBarisPesanan(p.id, b.id, { ...h, disetujui: false }, `${ambilProduk(b.produkId).nama} diubah`);
              setDialog(null);
            }}
            onTutup={() => setDialog(null)}
          />
        );
      })()}
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
