import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import WaitingList from './pages/WaitingList';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import PatientPortal from './pages/PatientPortal';
import VisitSummary from './pages/VisitSummary';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Patient portal (read-only) */}
      <Route
        path="/patient"
        element={
          <ProtectedRoute role="patient">
            <PatientPortal />
          </ProtectedRoute>
        }
      />

      {/* Admin / receptionist area */}
      <Route
        element={
          <ProtectedRoute role="admin">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="appointments/:id/summary" element={<VisitSummary />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="waiting" element={<WaitingList />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
