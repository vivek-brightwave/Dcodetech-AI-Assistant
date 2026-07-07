import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, Menu, Search, Bell, PaintBucket, Github, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar({ title, onMenuClick }) {
  const { logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  
  const userRef = useRef(null);
  const langRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="admin-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button className="hamburger" onClick={onMenuClick}>
          <Menu size={22} />
        </button>
        <h1 className="navbar-title" style={{ display: 'none' }}>{title}</h1> {/* Hide title as MDBootstrap doesn't use it or keep it optional */}
      </div>
      
      <div className="navbar-right">
        {/* Search form */}
        <div className="navbar-search">
          <input type="search" className="search-input" placeholder='Search (ctrl + "/" to focus)' />
          <span className="search-icon"><Search size={16} /></span>
        </div>

        {/* Notification dropdown */}
        <div className="nav-item-dropdown" ref={notifRef}>
          <button className="nav-icon-btn" onClick={() => setNotifOpen(!notifOpen)}>
            <Bell size={20} />
            <span className="badge-notification">1</span>
          </button>
          {notifOpen && (
            <div className="navbar-dropdown right-aligned">
              <button>Some news</button>
              <button>Another news</button>
              <button>Something else here</button>
            </div>
          )}
        </div>

        {/* Icons */}
        <button className="nav-icon-btn">
          <PaintBucket size={20} />
        </button>
        <button className="nav-icon-btn">
          <Github size={20} />
        </button>

        {/* Language dropdown */}
        <div className="nav-item-dropdown" ref={langRef}>
          <button className="nav-icon-btn" onClick={() => setLangOpen(!langOpen)}>
            <Globe size={20} />
          </button>
          {langOpen && (
            <div className="navbar-dropdown right-aligned">
              <button>English <span style={{color: '#4ade80', marginLeft: 'auto'}}>✓</span></button>
              <div className="dropdown-divider"></div>
              <button>Polski</button>
              <button>中文</button>
              <button>日本語</button>
            </div>
          )}
        </div>

        {/* Avatar Dropdown */}
        <div className="navbar-user" ref={userRef} onClick={() => setDropdownOpen(!dropdownOpen)}>
          <img src="https://mdbcdn.b-cdn.net/img/Photos/Avatars/img (31).webp" className="navbar-avatar-img" alt="Avatar" />
          
          {dropdownOpen && (
            <div className="navbar-dropdown right-aligned">
              <button onClick={() => { navigate('/admin/profile'); setDropdownOpen(false); }}>
                <UserCircle size={16} /> My profile
              </button>
              <button onClick={() => { navigate('/admin/profile'); setDropdownOpen(false); }}>
                Settings
              </button>
              <button onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
