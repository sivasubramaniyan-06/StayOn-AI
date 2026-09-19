import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { CelestialBackground } from './CelestialBackground';

export const AuthenticatedLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-800 relative overflow-x-hidden">
      {/* Reusable Celestial Space Background */}
      <CelestialBackground variant="app" />

      {/* Desktop Left Sidebar */}
      <Sidebar />

      {/* Main Content Area offset by Sidebar width */}
      <div className="flex-1 flex flex-col md:pl-[72px] transition-all duration-300 min-h-screen pb-20 md:pb-8 relative z-10">
        {/* Global Reusable Topbar Header */}
        <Topbar />

        {/* Dynamic Route Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
