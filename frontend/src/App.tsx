import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { AppLayout } from './components/Layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { ProductSpaceDetail } from './pages/ProductSpaceDetail';
import { CompetitiveIntelligence } from './pages/CompetitiveIntelligence';
import { Settings } from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="product-spaces/:id" element={<ProductSpaceDetail />} />
        <Route
          path="product-spaces/:id/competitive-intelligence"
          element={<CompetitiveIntelligence />}
        />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
