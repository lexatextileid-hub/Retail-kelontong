export function Merek({ sub }: { sub: string }) {
  return (
    <div className="merek">
      <div className="merek__logo" aria-hidden="true">TK</div>
      <div>
        <div className="merek__nama">[Nama Toko]</div>
        <div className="merek__sub">{sub}</div>
      </div>
    </div>
  );
}
