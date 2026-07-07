import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Loader2, UserCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { login, continueAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/chat');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    setError('');
    try {
      await continueAsGuest();
      navigate('/chat');
    } catch (err) {
      setError('Could not start guest session. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background blobs */}
      <div className="login-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Branding */}
        <div className="login-brand">
          <div className="login-logo">D</div>
          <h1>Dcodetech AI Assistant</h1>
          <p>Enter your email to sign in or create an account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <AnimatePresence>
            {error && (
              <motion.div
                className="login-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              minLength={6}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <p className="login-hint">
            New user? A new account will be created automatically.
          </p>

          <button
            type="submit"
            className="login-btn"
            disabled={loading || guestLoading}
          >
            {loading ? <Loader2 size={20} className="spin" /> : 'Continue'}
          </button>
        </form>

        {/* OR divider */}
        <div className="login-divider">
          <span>or</span>
        </div>

        {/* Guest Access */}
        <button
          className="guest-btn"
          onClick={handleGuest}
          disabled={loading || guestLoading}
        >
          {guestLoading ? (
            <Loader2 size={18} className="spin" />
          ) : (
            <UserCircle2 size={18} />
          )}
          <span>Continue as Guest</span>
        </button>

        <div className="login-footer">
          <p>Dcodetech &copy; {new Date().getFullYear()}</p>
        </div>
      </motion.div>
    </div>
  );
}
