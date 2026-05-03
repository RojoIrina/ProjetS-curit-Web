/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserCRUD from './pages/Admin/UserCRUD';
import ModuleCRUD from './pages/Admin/ModuleCRUD';
import StudentDashboard from './pages/Student/StudentDashboard';
import CertificateView from './pages/Student/CertificateView';

export default function App() {
  return (
    <StoreProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/verify/:uid" element={<Home />} />
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes — Protected, requires admin role */}
            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute roles={['admin']}>
                <UserCRUD />
              </ProtectedRoute>
            } />
            <Route path="/admin/modules" element={
              <ProtectedRoute roles={['admin']}>
                <ModuleCRUD />
              </ProtectedRoute>
            } />
            
            {/* Student Routes — Protected, requires student role */}
            <Route path="/student" element={
              <ProtectedRoute roles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/certificate/:id" element={
              <ProtectedRoute roles={['student', 'admin']}>
                <CertificateView />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </StoreProvider>
  );
}
