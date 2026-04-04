import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Existing pages (unchanged)
import Landing   from './pages/Landing';
import Login     from './pages/Login';
import Register  from './pages/Register';
import Dashboard from './pages/Dashboard';
import Editor    from './pages/Editor';

// New pages
import WorkspaceHub from './pages/WorkspaceHub';
import DocsEditor   from './pages/DocsEditor';
import ExcelEditor  from './pages/ExcelEditor';
import PptEditor    from './pages/PptEditor';
import CodeEditor   from './pages/CodeEditor';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' },
            success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/"        element={<Landing />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Design workspace (original) */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/editor/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />

          {/* Workspace hub */}
          <Route path="/hub" element={<ProtectedRoute><WorkspaceHub /></ProtectedRoute>} />

          {/* New workspaces */}
          <Route path="/docs"   element={<ProtectedRoute><DocsEditor /></ProtectedRoute>} />
          <Route path="/sheets" element={<ProtectedRoute><ExcelEditor /></ProtectedRoute>} />
          <Route path="/slides" element={<ProtectedRoute><PptEditor /></ProtectedRoute>} />
          <Route path="/code"   element={<ProtectedRoute><CodeEditor /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
