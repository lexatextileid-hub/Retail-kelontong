import { Navigate, Route, Routes } from 'react-router-dom';
import { RencanaModul } from './components/RencanaModul';
import { LayoutAplikasi } from './layouts/LayoutAplikasi';
import { daftarMode, type Menu } from './navigasi';

function rute(menu: Menu[]) {
  return [
    <Route key="index" index element={<Navigate to={menu[0].path} replace />} />,
    ...menu.map((m) =>
      m.anak ? (
        <Route key={m.path} path={m.path}>
          <Route index element={<Navigate to={m.anak[0].path} replace />} />
          {m.anak.map((a) => (
            <Route key={a.path} path={a.path} element={a.halaman ?? <RencanaModul menu={m} sub={a.judul} />} />
          ))}
        </Route>
      ) : (
        <Route key={m.path} path={m.path} element={m.halaman ?? <RencanaModul menu={m} />} />
      ),
    ),
  ];
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/kasir" replace />} />
      {daftarMode.map((md) => (
        <Route key={md.kode} path={`/${md.kode}`} element={<LayoutAplikasi mode={md.kode} />}>
          {rute(md.menu)}
        </Route>
      ))}
      <Route path="*" element={<Navigate to="/kasir" replace />} />
    </Routes>
  );
}
