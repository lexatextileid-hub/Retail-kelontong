import { useState } from 'react';
import { isoHari, tambahHari } from '../domain/kasbon';

export interface Periode {
  dari: string; // yyyy-mm-dd
  sampai: string;
}

type Pilihan = 'hari-ini' | 'kemarin' | '7-hari' | 'bulan-ini' | 'bulan-lalu' | 'bulan' | 'rentang';

const awalBulan = (ym: string) => `${ym}-01`;
const akhirBulan = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return isoHari(new Date(y, m, 0));
};
const bulanIni = () => isoHari(new Date()).slice(0, 7);
const bulanLalu = () => {
  const d = new Date();
  return isoHari(new Date(d.getFullYear(), d.getMonth() - 1, 1)).slice(0, 7);
};

export function periodeDari(p: Pilihan, bulan: string, rentang: Periode): Periode {
  const hari = isoHari(new Date());
  switch (p) {
    case 'hari-ini': return { dari: hari, sampai: hari };
    case 'kemarin': return { dari: tambahHari(hari, -1), sampai: tambahHari(hari, -1) };
    case '7-hari': return { dari: tambahHari(hari, -6), sampai: hari };
    case 'bulan-ini': return { dari: awalBulan(bulanIni()), sampai: hari };
    case 'bulan-lalu': return { dari: awalBulan(bulanLalu()), sampai: akhirBulan(bulanLalu()) };
    case 'bulan': return { dari: awalBulan(bulan), sampai: bulan === bulanIni() ? hari : akhirBulan(bulan) };
    case 'rentang': return rentang;
  }
}

export const teksPeriode = ({ dari, sampai }: Periode) => {
  const f = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  return dari === sampai ? f(dari) : `${f(dari)} – ${f(sampai)}`;
};

/**
 * Pilih periode: cepat (hari ini, kemarin, 7 hari, bulan ini, bulan lalu), pilih bulan, atau rentang tanggal.
 * Pola seperti filter tanggal di Moka/Majoo.
 */
export function PilihPeriode({ awal = 'hari-ini', onUbah }: { awal?: Pilihan; onUbah: (p: Periode) => void }) {
  const hari = isoHari(new Date());
  const [pilihan, setPilihan] = useState<Pilihan>(awal);
  const [bulan, setBulan] = useState(bulanIni());
  const [rentang, setRentang] = useState<Periode>({ dari: tambahHari(hari, -6), sampai: hari });

  const pakai = (p: Pilihan, b = bulan, r = rentang) => {
    setPilihan(p);
    onUbah(periodeDari(p, b, r));
  };

  return (
    <div className="pp">
      <div className="pj__kategori" role="group" aria-label="Periode">
        {([
          ['hari-ini', 'Hari ini'], ['kemarin', 'Kemarin'], ['7-hari', '7 hari'], ['bulan-ini', 'Bulan ini'],
          ['bulan-lalu', 'Bulan lalu'], ['bulan', 'Pilih bulan'], ['rentang', 'Rentang tanggal'],
        ] as [Pilihan, string][]).map(([k, t]) => (
          <button key={k} type="button" aria-pressed={pilihan === k} onClick={() => pakai(k)}>{t}</button>
        ))}
      </div>
      {pilihan === 'bulan' && (
        <label className="isian pp__isian">
          Bulan
          <input type="month" className="isian__kontrol" value={bulan} max={bulanIni()}
            onChange={(e) => { if (e.target.value) { setBulan(e.target.value); pakai('bulan', e.target.value); } }} />
        </label>
      )}
      {pilihan === 'rentang' && (
        <div className="pp__rentang">
          <label className="isian">
            Dari
            <input type="date" className="isian__kontrol" value={rentang.dari} max={rentang.sampai}
              onChange={(e) => { if (e.target.value) { const r = { ...rentang, dari: e.target.value }; setRentang(r); pakai('rentang', bulan, r); } }} />
          </label>
          <label className="isian">
            Sampai
            <input type="date" className="isian__kontrol" value={rentang.sampai} min={rentang.dari} max={hari}
              onChange={(e) => { if (e.target.value) { const r = { ...rentang, sampai: e.target.value }; setRentang(r); pakai('rentang', bulan, r); } }} />
          </label>
        </div>
      )}
    </div>
  );
}
