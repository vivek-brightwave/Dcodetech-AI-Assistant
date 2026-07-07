import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
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
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo">D</div>
          <div className="sidebar-brand-text">
            <h2>Dcodetech</h2>
            <span>Admin Portal</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <link.icon size={18} />
            {link.label}
          </NavLink>
        ))}

        <button className="nav-link logout-link" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </nav>
    </aside>
  );
}
