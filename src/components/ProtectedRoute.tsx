// ================================================================
// PROTECTED ROUTE — Role-based route guard component
// Redirects to /login if not authenticated
// Shows 403 if user doesn't have required role
// ================================================================
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: ('admin' | 'student' | 'verifier')[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { currentUser } = useStore();

  // Not logged in → redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Role check (if roles specified)
  if (roles && roles.length > 0 && !roles.includes(currentUser.role as 'admin' | 'student' | 'verifier')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Accès interdit</h2>
          <p className="text-slate-500">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          <p className="text-xs text-slate-400">
            Rôle requis : <strong>{roles.join(' ou ')}</strong> — Votre rôle : <strong>{currentUser.role}</strong>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
