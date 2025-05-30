import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ModernLayout } from './components/ModernLayout';
import { HomePage } from './pages/HomePage';
import { SSLPage } from './pages/SSLPage';
import { AlertsPage } from './pages/AlertsPage';
import { HelpPage } from './pages/HelpPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <ModernLayout>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/ssl" element={<SSLPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </ModernLayout>
      </div>
    </Router>
  );
}

export default App;
