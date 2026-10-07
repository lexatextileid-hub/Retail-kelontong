/**
 * Master Satuan bawaan. Nama baku memakai sebutan resmi Coretax DJP bila ada,
 * sisanya sebutan lapangan. Pemilik bisa menambah satuan lain di
 * Back Office → Pengaturan → Data Induk → Satuan.
 * Singkatan wajib unik.
 */
import type { Satuan } from './tipe';

export interface SatuanBawaan extends Omit<Satuan, 'id'> {
  kodeCoretax: string; // UM.0033 = Lainnya
}

export const satuanBawaan: SatuanBawaan[] = [
  { nama: 'Pcs', singkatan: 'pcs', bolehDesimal: false, kodeCoretax: 'UM.0021' },
  { nama: 'Bungkus', singkatan: 'bks', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Sachet', singkatan: 'sct', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Renteng', singkatan: 'rtg', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Pak', singkatan: 'pak', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Boks', singkatan: 'boks', bolehDesimal: false, kodeCoretax: 'UM.0022' },
  { nama: 'Karton', singkatan: 'ktn', bolehDesimal: false, kodeCoretax: 'UM.0037' },
  { nama: 'Slop', singkatan: 'slp', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Bal', singkatan: 'bal', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Karung', singkatan: 'krg', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Lusin', singkatan: 'lsn', bolehDesimal: false, kodeCoretax: 'UM.0017' },
  { nama: 'Botol', singkatan: 'btl', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Kaleng', singkatan: 'klg', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Galon', singkatan: 'gln', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Tabung', singkatan: 'tbg', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Krat', singkatan: 'krt', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Tray', singkatan: 'try', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Butir', singkatan: 'btr', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Ikat', singkatan: 'ikt', bolehDesimal: false, kodeCoretax: 'UM.0033' },
  { nama: 'Lembar', singkatan: 'lbr', bolehDesimal: false, kodeCoretax: 'UM.0020' },
  { nama: 'Kilogram', singkatan: 'kg', bolehDesimal: true, kodeCoretax: 'UM.0003' },
  { nama: 'Gram', singkatan: 'g', bolehDesimal: true, kodeCoretax: 'UM.0004' },
  { nama: 'Liter', singkatan: 'L', bolehDesimal: true, kodeCoretax: 'UM.0007' },
  { nama: 'Mililiter', singkatan: 'ml', bolehDesimal: true, kodeCoretax: 'UM.0033' },
];

/** Kunci pembanding untuk mencegah data ganda: "PCS", "pcs.", " Pcs " → "pcs". */
export function kunciNama(nama: string): string {
  return nama.toLowerCase().replace(/[^a-z0-9]/g, '');
}
