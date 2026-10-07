/** Isian rupiah: tampil "750.000", nilainya angka bulat. */
export function InputRupiah({
  id,
  nilai,
  onUbah,
  autoFocus,
  label,
}: {
  id: string;
  nilai: number;
  onUbah: (n: number) => void;
  autoFocus?: boolean;
  label?: string;
}) {
  return (
    <div className="input-rp">
      <span aria-hidden="true">Rp</span>
      <input
        id={id}
        aria-label={label}
        inputMode="numeric"
        autoFocus={autoFocus}
        value={nilai ? nilai.toLocaleString('id-ID') : ''}
        placeholder="0"
        onChange={(e) => onUbah(Number(e.target.value.replace(/\D/g, '')) || 0)}
      />
    </div>
  );
}
