import { useState } from 'react';
import { KartuRingkas, KotakFilter, Sel, TabelDaftar } from '../../components/Daftar';
import { kasbonKaryawan, useToko } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { DialogKasPemilik, jamTanggal, type JenisKasPemilik } from './bersama';

/** Kasbon karyawan — hanya di Back Office (kasir tidak melihat). Piutang ke karyawan, bukan biaya. */
export function KasbonKaryawan() {
  const toko = useToko();
  const [cari, setCari] = useState('');
  const [dialog, setDialog] = useState<null | { jenis: JenisKasPemilik; nama?: string }>(null);
  const q = cari.trim().toLowerCase();
  const semua = kasbonKaryawan(toko);
  const tampil = semua.filter((k) => !q || k.nama.toLowerCase().includes(q));
  const riwayat = toko.arus
    .filter((a) => (a.jenis === 'kasbon-karyawan' || a.jenis === 'cicilan-karyawan') && (!q || (a.penerima ?? '').toLowerCase().includes(q)))
    .sort((a, b) => b.waktuIso.localeCompare(a.waktuIso));
  const total = (f: (k: (typeof semua)[number]) => number) => tampil.reduce((t, k) => t + f(k), 0);
  return (
    <div className="ps-halaman">
      <KartuRingkas item={[
        { judul: 'Sisa kasbon karyawan', nilai: rupiah(semua.reduce((t, k) => t + k.sisa, 0)), catatan: `${semua.filter((k) => k.sisa > 0).length} karyawan` },
        { judul: 'Sudah diberikan', nilai: rupiah(semua.reduce((t, k) => t + k.diberi, 0)) },
        { judul: 'Sudah kembali', nilai: rupiah(semua.reduce((t, k) => t + k.dibayar, 0)), catatan: 'cicilan / potong gaji' },
      ]} />
      <KotakFilter
        cari={{ nilai: cari, onUbah: setCari, placeholder: 'Cari nama karyawan' }}
        aksi={<div className="baris-tombol">
          <button type="button" className="tombol" onClick={() => setDialog({ jenis: 'cicilan-karyawan' })}>Terima cicilan</button>
          <button type="button" className="tombol tombol--utama" onClick={() => setDialog({ jenis: 'kasbon-karyawan' })}>+ Beri kasbon</button>
        </div>}
      />
      <TabelDaftar
        data={tampil}
        kunci={(k) => k.nama}
        onKlik={(k) => setDialog({ jenis: k.sisa > 0 ? 'cicilan-karyawan' : 'kasbon-karyawan', nama: k.nama })}
        kosong={<><h2>Belum ada kasbon karyawan</h2><p className="teks-pudar">Pinjaman ke karyawan dicatat di sini, dibayar dari brankas atau rekening.</p></>}
        kolom={[
          { judul: 'Karyawan', isi: (k) => <Sel utama={<strong>{k.nama}</strong>} bawah={`terakhir ${jamTanggal(k.terakhir)}`} /> },
          { judul: 'Diberikan', kanan: true, isi: (k) => rupiah(k.diberi), total: rupiah(total((k) => k.diberi)) },
          { judul: 'Kembali', kanan: true, isi: (k) => rupiah(k.dibayar), total: rupiah(total((k) => k.dibayar)) },
          { judul: 'Sisa', kanan: true, isi: (k) => <strong className={k.sisa > 0 ? 'teks-bahaya' : undefined}>{rupiah(k.sisa)}</strong>, total: rupiah(total((k) => k.sisa)) },
          { judul: 'Status', isi: (k) => <span className={`chip-status ${k.sisa > 0 ? 'chip-status--kuning' : 'chip-status--hijau'}`}>{k.sisa > 0 ? 'Belum lunas' : 'Lunas'}</span> },
        ]}
      />
      <h2 className="kf-judul">Riwayat</h2>
      <TabelDaftar
        data={riwayat}
        kunci={(a) => a.id}
        kosong={<p className="teks-pudar">Belum ada riwayat.</p>}
        kolom={[
          { judul: 'Tanggal', isi: (a) => jamTanggal(a.waktuIso) },
          { judul: 'No.', isi: (a) => <strong>{a.nomor}</strong> },
          { judul: 'Karyawan', isi: (a) => a.penerima ?? '-' },
          { judul: 'Keterangan', bungkus: true, isi: (a) => <Sel utama={a.keterangan} bawah={a.sumber === 'bank' ? 'Rekening' : 'Brankas'} /> },
          { judul: 'Diberikan', kanan: true, isi: (a) => (a.jenis === 'kasbon-karyawan' ? rupiah(Math.abs(a.tunai + a.transfer)) : '-') },
          { judul: 'Kembali', kanan: true, isi: (a) => (a.jenis === 'cicilan-karyawan' ? rupiah(Math.abs(a.tunai + a.transfer)) : '-') },
        ]}
      />
      {dialog && <DialogKasPemilik tempat="brankas" jenisAwal={dialog.jenis} pilihan={[dialog.jenis]} namaAwal={dialog.nama} onTutup={() => setDialog(null)} />}
    </div>
  );
}
