import type { TagihanKasbon } from '../../data/toko';

export const tanggalPendek = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export const namaSumber: Record<TagihanKasbon['sumber'], string> = {
  penjualan: 'Nota kasir',
  lama: 'Kasbon lama',
  pesanan: 'Pesanan',
};

export function ChipSumber({ sumber }: { sumber: TagihanKasbon['sumber'] }) {
  const warna = sumber === 'lama' ? 'kuning' : sumber === 'pesanan' ? 'biru' : 'abu';
  return <span className={`chip-status chip-status--${warna}`}>{namaSumber[sumber]}</span>;
}

/** "lewat 3 hari" / "jatuh tempo hari ini" / "4 hari lagi" */
export function teksTempo(selisih: number) {
  if (selisih < 0) return `lewat ${-selisih} hari`;
  if (selisih === 0) return 'jatuh tempo hari ini';
  return `${selisih} hari lagi`;
}
