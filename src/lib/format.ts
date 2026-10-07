/** Rp 12.500 */
export function rupiah(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

/** Menampilkan jumlah dalam satuan dasar sebagai kombinasi satuan besar, mis. 132 pcs → "3 dus 12 pcs". */
export function formatStok(jumlahDasar: number, satuan: { label: string; isi: number }[]): string {
  const urut = [...satuan].sort((a, b) => b.isi - a.isi);
  let sisa = jumlahDasar;
  const bagian: string[] = [];
  for (const s of urut) {
    if (s.isi <= 0) continue;
    const n = s.isi === 1 ? sisa : Math.floor(sisa / s.isi);
    if (n > 0) {
      bagian.push(`${n.toLocaleString('id-ID')} ${s.label}`);
      sisa -= n * s.isi;
    }
  }
  return bagian.length ? bagian.join(' ') : '0';
}
