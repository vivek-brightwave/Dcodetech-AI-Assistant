import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, UserCircle, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ isOpen, isCollapsed, onClose, onToggle }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const links = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/login-activity', icon: Activity, label: 'Login Activity' },
    { to: '/admin/profile', icon: UserCircle, label: 'Profile' },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', padding: isCollapsed ? '1.5rem 0' : '1.5rem' }}>
        {!isCollapsed && (
          <div className="sidebar-brand">
            <div className="sidebar-logo">D</div>
            <div className="sidebar-brand-text">
              <h2>Dcodetech</h2>
              <span>Admin Portal</span>
            </div>
          </div>
        )}
        <button className="sidebar-toggle-btn" onClick={onToggle} aria-label="Toggle Sidebar">
          <Menu size={22} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
            data-tooltip={isCollapsed ? link.label : ""}
          >
            <link.icon size={18} />
            <span className="nav-label">{link.label}</span>
          </NavLink>
        ))}

        <button className="nav-link logout-link" onClick={handleLogout} data-tooltip={isCollapsed ? "Logout" : ""}>
          <LogOut size={18} />
          <span className="nav-label">Logout</span>
        </button>
      </nav>
    </aside>
  );
}
