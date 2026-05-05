import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Knowledge from './pages/Knowledge';
import Conversations from './pages/Conversations';
import Login from './pages/Login';
import Layout from './components/Layout';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="conversations" element={<Conversations />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
