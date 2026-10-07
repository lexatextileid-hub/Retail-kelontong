import { Navigate, Route, Routes } from 'react-router-dom';
import { RencanaModul } from './components/RencanaModul';
import { LayoutBackOffice } from './layouts/LayoutBackOffice';
import { LayoutOperasional } from './layouts/LayoutOperasional';
import { menuBackOffice, menuGudang, menuKasir, type Menu } from './navigasi';

function rute(menu: Menu[]) {
  return [
    <Route key="index" index element={<Navigate to={menu[0].path} replace />} />,
    ...menu.map((m) => <Route key={m.path} path={m.path} element={m.halaman ?? <RencanaModul menu={m} />} />),
  ];
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/kasir" replace />} />
      <Route path="/kasir" element={<LayoutOperasional mode="Kasir" menu={menuKasir} />}>{rute(menuKasir)}</Route>
      <Route path="/gudang" element={<LayoutOperasional mode="Gudang" menu={menuGudang} />}>{rute(menuGudang)}</Route>
      <Route path="/admin" element={<LayoutBackOffice />}>{rute(menuBackOffice)}</Route>
      <Route path="*" element={<Navigate to="/kasir" replace />} />
    </Routes>
  );
}
