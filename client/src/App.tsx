import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Footer } from './components/Footer';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { TradeList } from './pages/TradeList';
import { CreateTrade } from './pages/CreateTrade';
import { TradeDetails } from './pages/TradeDetails';
import { EditTrade } from './pages/EditTrade';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <div className="app-root">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/trades" element={<TradeList />} />
            <Route path="/trades/new" element={<CreateTrade />} />
            <Route path="/trades/:id" element={<TradeDetails />} />
            <Route path="/trades/:id/edit" element={<EditTrade />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
