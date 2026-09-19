import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authService } from './services/auth';
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Knowledge } from './pages/Knowledge';
import { DocumentSummary } from './pages/DocumentSummary';
import { Goals } from './pages/Goals';
import { CreateGoal } from './pages/CreateGoal';
import { Tasks } from './pages/Tasks';
import { Schedule } from './pages/Schedule';
import { StayOnAI } from './pages/StayOnAI';
import { Settings } from './pages/Settings';
import { Help } from './pages/Help';

// Protected Route Guard component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Root Entry Redirect Component
const RootRedirect: React.FC = () => {
  if (authService.isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

// Public Only Guard component (redirects logged-in users away from /login)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (authService.isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Root / Entry Point */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public Unauthenticated Login Route */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Authenticated Protected Shell Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AuthenticatedLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="knowledge" element={<Knowledge />} />
            <Route path="knowledge/:documentId" element={<DocumentSummary />} />
            <Route path="goals" element={<Goals />} />
            <Route path="goals/new" element={<CreateGoal />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="stay-on-ai" element={<StayOnAI />} />
            <Route path="settings" element={<Settings />} />
            <Route path="help" element={<Help />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
