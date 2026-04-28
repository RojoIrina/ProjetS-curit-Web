/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, GraduationCap, Users, BookOpen, LogOut, Search, FileCheck, CheckCircle, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from './hooks/useStore';
import { StoreProvider } from './context/StoreContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserCRUD from './pages/Admin/UserCRUD';
import ModuleCRUD from './pages/Admin/ModuleCRUD';
import StudentDashboard from './pages/Student/StudentDashboard';
import CertificateView from './pages/Student/CertificateView';

function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="max-w-7xl mx-auto px-6 pt-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">C</div>
            <div>
              <h1 className="text-lg font-black leading-tight uppercase tracking-tighter text-slate-900">CertiVerify</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none">Trust Architecture</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-6">
            {!currentUser ? (
              <Link to="/login" className="bg-slate-950 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95">
                Connexion
              </Link>
            ) : (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{currentUser.role}</p>
                  <p className="text-sm font-bold text-slate-700">{currentUser.name}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                  title="Déconnexion"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserCRUD />} />
            <Route path="/admin/modules" element={<ModuleCRUD />} />
            
            {/* Student Routes */}
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/certificate/:id" element={<CertificateView />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </StoreProvider>
  );
}
