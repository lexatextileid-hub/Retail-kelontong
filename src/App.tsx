import { Navigate, Route, Routes } from 'react-router-dom';
import { RencanaModul } from './components/RencanaModul';
import { LayoutBackOffice } from './layouts/LayoutBackOffice';
import { LayoutOperasional } from './layouts/LayoutOperasional';
import { menuBackOffice, menuOperasional } from './navigasi';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/kasir" replace />} />

      <Route path="/kasir" element={<LayoutOperasional />}>
        <Route index element={<Navigate to={menuOperasional[0].path} replace />} />
        {menuOperasional.map((m) => (
          <Route key={m.path} path={m.path} element={m.halaman ?? <RencanaModul menu={m} />} />
        ))}
      </Route>

      <Route path="/admin" element={<LayoutBackOffice />}>
        <Route index element={<Navigate to={menuBackOffice[0].path} replace />} />
        {menuBackOffice.map((m) => (
          <Route key={m.path} path={m.path} element={m.halaman ?? <RencanaModul menu={m} />} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/kasir" replace />} />
    </Routes>
  );
}
