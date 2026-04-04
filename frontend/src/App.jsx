import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { NotificationProvider } from './components/NotificationSystem';
import OfflineGame from './components/OfflineGame';

// Pages
import Landing      from './pages/Landing';
import Login        from './pages/Login';
import Register     from './pages/Register';
import WorkspaceHub from './pages/WorkspaceHub';   // ← main post-login page
import Dashboard    from './pages/Dashboard';       // Design workspace
import Editor       from './pages/Editor';
import DocsEditor   from './pages/DocsEditor';
import ExcelEditor  from './pages/ExcelEditor';
import PptEditor    from './pages/PptEditor';
import CodeEditor   from './pages/CodeEditor';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' },
              success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
            }}
          />
          <OfflineGame />
          <Routes>
            {/* Public */}
            <Route path="/"         element={<Landing />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected — hub is now the landing page after login */}
            <Route path="/hub"      element={<ProtectedRoute><WorkspaceHub /></ProtectedRoute>} />

            {/* Design workspace */}
            <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/editor/:id"  element={<ProtectedRoute><Editor /></ProtectedRoute>} />

            {/* Other workspaces */}
            <Route path="/docs"    element={<ProtectedRoute><DocsEditor /></ProtectedRoute>} />
            <Route path="/sheets"  element={<ProtectedRoute><ExcelEditor /></ProtectedRoute>} />
            <Route path="/slides"  element={<ProtectedRoute><PptEditor /></ProtectedRoute>} />
            <Route path="/code"    element={<ProtectedRoute><CodeEditor /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
