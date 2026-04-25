import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// User Pages
import Home from './pages/Home';
import PostDetails from './pages/PostDetails';
import Messages from './pages/Messages';
import UserSettings from './pages/UserSettings';
import UserLogin from './pages/UserLogin';
import UserRegister from './pages/UserRegister';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUpload from './pages/admin/AdminUpload';
import AdminManagePosts from './pages/admin/AdminManagePosts';
import AdminComments from './pages/admin/AdminComments';
import AdminSettings from './pages/admin/AdminSettings';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

const AdminMessagesRedirect = () => <Navigate to="/messages" replace />;

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<UserLogin />} />
              <Route path="/register" element={<UserRegister />} />
              <Route path="/post/:id" element={<PostDetails />} />
              
              {/* Protected User Routes */}
              <Route path="/messages" element={
                <PrivateRoute>
                  <Messages />
                </PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute>
                  <UserSettings />
                </PrivateRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              <Route path="/admin/login" element={<AdminLogin />} />


              <Route path="/admin" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              <Route path="/admin/upload" element={
                <AdminRoute>
                  <AdminUpload />
                </AdminRoute>
              } />
              <Route path="/admin/posts" element={
                <AdminRoute>
                  <AdminManagePosts />
                </AdminRoute>
              } />
              <Route path="/admin/comments" element={
                <AdminRoute>
                  <AdminComments />
                </AdminRoute>
              } />
              <Route path="/admin/settings" element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              } />
              <Route path="/admin/chat" element={
                <AdminRoute>
                  <Messages />
                </AdminRoute>
              } />
              <Route path="/admin/messages" element={
                <AdminRoute>
                  <AdminMessagesRedirect />
                </AdminRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

