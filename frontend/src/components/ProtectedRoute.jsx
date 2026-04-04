import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-dark-900">
        <div className="flex flex-col items-center gap-4">
          <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="4" fill="#fff"/>
              <circle cx="11" cy="3" r="2" fill="#fff" opacity="0.5"/>
              <circle cx="11" cy="19" r="2" fill="#fff" opacity="0.5"/>
              <circle cx="3" cy="11" r="2" fill="#fff" opacity="0.5"/>
              <circle cx="19" cy="11" r="2" fill="#fff" opacity="0.5"/>
            </svg>
          </div>
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading Synapse…</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
