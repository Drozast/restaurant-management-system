import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import LayoutNew from './components/LayoutNew';
import Login from './pages/Login';
import DashboardNew from './pages/DashboardNew';
import SalesNew from './pages/SalesNew';
import RecipesNew from './pages/RecipesNew';
import IngredientsNew from './pages/IngredientsNew';
import ReportsNew from './pages/ReportsNew';
import ShiftsNew from './pages/ShiftsNew';
import ChecklistNew from './pages/ChecklistNew';
import HistorialNew from './pages/HistorialNew';
import AnalyticsCharts from './pages/AnalyticsCharts';
import UsersNew from './pages/UsersNew';
import RewardsNew from './pages/RewardsNew';
import MiDesempeno from './pages/MiDesempeno';
import ReportesCompletos from './pages/ReportesCompletos';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <LayoutNew />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardNew />} />
          <Route path="ventas" element={<SalesNew />} />
          <Route path="pizzas" element={<RecipesNew />} />
          <Route path="inventario" element={<IngredientsNew />} />
          <Route path="lista-compras" element={<ReportsNew />} />
          <Route path="checklist" element={<ChecklistNew />} />
          <Route path="historial" element={<HistorialNew />} />
          <Route path="analytics" element={<AnalyticsCharts />} />
          <Route path="premios" element={<RewardsNew />} />
          <Route path="usuarios" element={<UsersNew />} />
          <Route path="mi-desempeno" element={<MiDesempeno />} />
          <Route path="reportes-completos" element={<ReportesCompletos />} />
        </Route>

        {/* Redirect any other route to dashboard if logged in, or login if not */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
