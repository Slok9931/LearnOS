import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Index from './pages/Index';
import CPUScheduling from './pages/CPUScheduling';
import MemoryManagement from './pages/MemoryManagement';
import DiskScheduling from './pages/DiskScheduling';
import NotFound from './pages/NotFound';
import { Toaster } from '@/components/ui/toaster';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/cpu-scheduling" element={<CPUScheduling />} />
          <Route path="/memory-management" element={<MemoryManagement />} />
          <Route path="/disk-scheduling" element={<DiskScheduling />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
      <Toaster />
    </Router>
  );
}

export default App;