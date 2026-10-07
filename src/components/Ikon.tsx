/** Ikon garis sederhana (24×24). */
const jalur: Record<string, string> = {
  keranjang: 'M3 4h2l2.4 11h11.2L21 7H6.2M9 20a1 1 0 1 0 0-.01M18 20a1 1 0 1 0 0-.01',
  pesanan: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M8 11h8M8 15h6',
  kasbon: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6',
  retur: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  riwayat: 'M12 7v5l3 2M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  kas: 'M3 7h18v12H3zM3 11h18M16 15h2M6 7l2-3h8l2 3',
  stok: 'M3 8l9-5 9 5-9 5zM3 8v8l9 5 9-5V8M12 13v8',
  masuk: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M6 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01',
  siapkan: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  repack: 'M4 8h16v12H4zM2 4h20v4H2zM10 12h4',
  hitung: 'M6 3h12v18H6zM9 7h6M9 11h1M12 11h1M15 11h0M9 15h1M12 15h1M15 15v3',
  returDist: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  rusak: 'M12 3 2 20h20zM12 10v4M12 17v.01',
  dashboard: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
  produk: 'M3 12V3h9l9 9-9 9zM7.5 7.5v.01',
  kontak: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M18 14a7 7 0 0 1 4 7',
  pembelian: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4',
  hutang: 'M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z',
  keuangan: 'M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18',
  laporan: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  pengaturan: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  lainnya: 'M5 12h.01M12 12h.01M19 12h.01',
  ciut: 'M15 6l-6 6 6 6',
  lebar: 'M9 6l6 6-6 6',
};

export type NamaIkon = keyof typeof jalur;

export function Ikon({ nama, ukuran = 20 }: { nama: string; ukuran?: number }) {
  return (
    <svg width={ukuran} height={ukuran} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={jalur[nama] ?? jalur.lainnya} />
    </svg>
  );
}
