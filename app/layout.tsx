'use client';

import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Dashboard from '../components/Dashboard';
import GeneratePage from '../components/GeneratePage';
import EditPage from '../components/EditPage';
import GalleryPage from '../components/GalleryPage';

export default function Layout() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Dashboard />;
      case 'generate':
        return <GeneratePage />;
      case 'edit':
        return <EditPage />;
      case 'gallery':
        return <GalleryPage />;
      case 'favorites':
        return <GalleryPage />;
      case 'history':
        return <GalleryPage />;
      case 'batch':
        return <div className="p-6"><h1 className="text-2xl font-bold">Batch Processing - Coming Soon</h1></div>;
      case 'styles':
        return <div className="p-6"><h1 className="text-2xl font-bold">Art Styles - Coming Soon</h1></div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header currentPage={currentPage} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
