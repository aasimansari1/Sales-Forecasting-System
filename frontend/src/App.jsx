import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import ErrorBoundary from './components/Common/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import DataUpload from './pages/DataUpload'
import Forecast from './pages/Forecast'
import Analytics from './pages/Analytics'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Reports from './pages/Reports'

function Wrap({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Wrap><Dashboard /></Wrap>} />
            <Route path="/upload" element={<Wrap><DataUpload /></Wrap>} />
            <Route path="/forecast" element={<Wrap><Forecast /></Wrap>} />
            <Route path="/analytics" element={<Wrap><Analytics /></Wrap>} />
            <Route path="/inventory" element={<Wrap><Inventory /></Wrap>} />
            <Route path="/customers" element={<Wrap><Customers /></Wrap>} />
            <Route path="/reports" element={<Wrap><Reports /></Wrap>} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
