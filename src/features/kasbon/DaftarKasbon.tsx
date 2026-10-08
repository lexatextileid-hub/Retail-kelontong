import { useState } from 'react';
import { Link } from 'react-router-dom';
import { hariIni, ringkasKasbon, useToko } from '../../data/toko';
import { selisihHari } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { tanggalPendek, teksTempo } from './bersama';
import '../../styles/pesanan.css';
import '../../styles/kasbon.css';

type Filter = 'ada' | 'lewat' | 'semua';

/** Daftar kasbon per pelanggan. `dariOffice`: tampilan Back Office → Piutang (data sama). */
export function DaftarKasbon({ dariOffice = false }: { dariOffice?: boolean }) {
  const toko = useToko();
  const [cari, setCari] = useState('');
  const [f, setF] = useState<Filter>('ada');
  const hari = hariIni();

  const semua = toko.pelanggan
    .filter((p) => p.jenis === 'terdaftar')
    .map((p) => ({ p, r: ringkasKasbon(p.id, toko) }));
  const totalKasbon = semua.reduce((t, x) => t + x.r.saldo, 0);
  const totalLewat = semua.reduce((t, x) => t + x.r.lewatTempo, 0);
  const banyakAda = semua.filter((x) => x.r.saldo > 0).length;
  const banyakLewat = semua.filter((x) => x.r.lewatTempo > 0).length;

  const q = cari.trim().toLowerCase();
  const tampil = semua
    .filter(({ r }) => (f === 'semua' ? true : f === 'lewat' ? r.lewatTempo > 0 : r.saldo > 0))
    .filter(({ p }) => !q || p.nama.toLowerCase().includes(q) || (p.hp ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§'))
    // lewat tempo dulu, lalu yang paling lama
    .sort((a, b) => b.r.lewatTempo - a.r.lewatTempo || b.r.tertuaHari - a.r.tertuaHari || a.p.nama.localeCompare(b.p.nama));

  const ke = (id: string) => `../detail/${id}`;

  return (
    <div className="ps-halaman">
      <div className="kb-ringkas">
        <div className="kartu kb-angka">
          <span className="teks-pudar">{dariOffice ? 'Total piutang pelanggan' : 'Total kasbon'}</span>
          <strong>{rupiah(totalKasbon)}</strong>
          <span className="teks-pudar">{banyakAda} pelanggan</span>
        </div>
        <div className={`kartu kb-angka ${totalLewat > 0 ? 'kb-angka--merah' : ''}`}>
          <span className="teks-pudar">Lewat jatuh tempo</span>
          <strong>{rupiah(totalLewat)}</strong>
          <span className="teks-pudar">{banyakLewat} pelanggan</span>
        </div>
      </div>

      <div className="ps-atas">
        <div className="pj__kategori" role="group" aria-label="Filter">
          <button type="button" aria-pressed={f === 'ada'} onClick={() => setF('ada')}>Ada kasbon<span className="ps-hitung">{banyakAda}</span></button>
          <button type="button" aria-pressed={f === 'lewat'} onClick={() => setF('lewat')}>Lewat tempo<span className="ps-hitung">{banyakLewat}</span></button>
          <button type="button" aria-pressed={f === 'semua'} onClick={() => setF('semua')}>Semua pelanggan</button>
        </div>
        <Link to="../lama" className="tombol">+ Catat kasbon lama</Link>
      </div>

      <label className="pj__cari-kotak" style={{ maxWidth: 480 }}>
        <span className="sr">Cari pelanggan</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama atau nomor HP" autoComplete="off" />
      </label>

      {tampil.length === 0 ? (
        <div className="kartu ps-kosong-besar">
          <h2>{f === 'lewat' ? 'Tidak ada kasbon lewat tempo' : q ? 'Pelanggan tidak ditemukan' : 'Belum ada kasbon'}</h2>
          <p className="teks-pudar">Kasbon tercatat otomatis dari kasir dan pesanan yang sudah diserahkan. Kasbon dari catatan lama bisa dimasukkan lewat Catat kasbon lama.</p>
        </div>
      ) : (
        <div className="ps-grid">
          {tampil.map(({ p, r }) => {
            const sisaBatas = p.batasKasbon - r.saldo;
            const tempo = r.jatuhTempoTerdekat ? selisihHari(hari, r.jatuhTempoTerdekat) : null;
            return (
              <Link key={p.id} to={ke(p.id)} className="ps-kartu">
                <span className="ps-kartu__atas">
                  <strong className="ps-kartu__nama">{p.nama}</strong>
                  {r.lewatTempo > 0 ? (
                    <span className="chip-status chip-status--merah">Lewat tempo</span>
                  ) : r.saldo > 0 ? (
                    <span className="chip-status chip-status--biru">Berjalan</span>
                  ) : (
                    <span className="chip-status chip-status--abu">Tidak ada</span>
                  )}
                </span>
                <span className="teks-pudar" style={{ fontSize: 13 }}>
                  {r.banyakNota > 0 ? `${r.banyakNota} tagihan · tertua ${r.tertuaHari} hari` : 'Tidak ada tagihan'} · tempo {p.tempoHari} hari
                </span>
                {r.lewatTempo > 0 && <span className="teks-bahaya" style={{ fontSize: 13 }}>Lewat tempo {rupiah(r.lewatTempo)}</span>}
                {r.lewatTempo === 0 && tempo !== null && r.jatuhTempoTerdekat && (
                  <span className="teks-pudar" style={{ fontSize: 13 }}>Jatuh tempo terdekat {tanggalPendek(r.jatuhTempoTerdekat)} ({teksTempo(tempo)})</span>
                )}
                <span className="ps-kartu__bawah">
                  <span>{rupiah(r.saldo)}</span>
                  <span className={sisaBatas < 0 ? 'teks-bahaya' : 'teks-pudar'} style={{ fontWeight: 500, fontSize: 13 }}>
                    {p.batasKasbon === 0 ? 'batas belum diatur' : `batas ${rupiah(p.batasKasbon)}`}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
