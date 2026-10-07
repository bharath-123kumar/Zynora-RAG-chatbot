import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ZynoraChat from './pages/ZynoraChat';
import AdminDashboard from './pages/AdminDashboard';
import KnowledgeDocuments from './pages/KnowledgeDocuments';
import KnowledgeEditor from './pages/KnowledgeEditor';
import AdminMonitoring from './pages/AdminMonitoring';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { token, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-indigo-400 font-mono text-sm">
        Loading Zynora...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/chat" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ZynoraChat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/monitoring"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminMonitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/documents"
        element={
          <ProtectedRoute requireAdmin={true}>
            <KnowledgeDocuments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/editor"
        element={
          <ProtectedRoute requireAdmin={true}>
            <KnowledgeEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/editor/:id"
        element={
          <ProtectedRoute requireAdmin={true}>
            <KnowledgeEditor />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
