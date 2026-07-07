import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AdminLayout({ title, children }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('adminSidebarCollapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      const newState = !isSidebarCollapsed;
      setIsSidebarCollapsed(newState);
      localStorage.setItem('adminSidebarCollapsed', newState);
    }
  };

  return (
    <div className={`admin-layout ${isSidebarCollapsed && !isMobile ? 'collapsed' : ''}`}>
      <Sidebar 
        isCollapsed={isSidebarCollapsed && !isMobile} 
        isOpen={isMobileOpen} 
        onClose={() => setIsMobileOpen(false)} 
        onToggle={toggleSidebar}
      />
      <div className="admin-main">
        <Navbar title={title} onMenuClick={toggleSidebar} />
        <div className="admin-content">
          {children}
        </div>
      </div>
      
      {/* Mobile overlay */}
      {isMobileOpen && isMobile && (
        <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />
      )}
    </div>
  );
}
