import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, UserCircle, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar({ title, onMenuClick }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : '?';

  return (
    <header className="admin-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button className="hamburger" onClick={onMenuClick}>
          <Menu size={22} />
        </button>
        <h1 className="navbar-title">{title}</h1>
      </div>

      <div className="navbar-right">
        <div className="navbar-user" ref={ref} onClick={() => setDropdownOpen(!dropdownOpen)}>
          <div className="navbar-avatar">{initials}</div>
          <div className="navbar-user-info">
            <span className="navbar-user-name">{user?.first_name} {user?.last_name}</span>
            <span className="navbar-user-role">{user?.role}</span>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />

          {dropdownOpen && (
            <div className="navbar-dropdown">
              <button onClick={() => { navigate('/admin/profile'); setDropdownOpen(false); }}>
                <UserCircle size={16} /> Profile
              </button>
              <button onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
