import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';

function formatDate(d) {
  if (!d) return 'Never';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDuration(seconds) {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Profile() {
  const { authFetch, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '' });
  const [saving, setSaving] = useState(false);

  // Change password state
  const [showChangePass, setShowChangePass] = useState(false);
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passErrors, setPassErrors] = useState({});
  const [passSuccess, setPassSuccess] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);

  useEffect(() => {
    authFetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setForm({ first_name: data.first_name, last_name: data.last_name, email: data.email });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await authFetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setEditing(false);
    // Refresh profile
    const data = await authFetch('/api/profile').then((r) => r.json());
    setProfile(data);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!passForm.current_password) errs.current_password = 'Required';
    if (!passForm.new_password) errs.new_password = 'Required';
    else if (passForm.new_password.length < 6) errs.new_password = 'Min 6 characters';
    if (passForm.new_password !== passForm.confirm_password) errs.confirm_password = 'Passwords do not match';
    setPassErrors(errs);
    if (Object.keys(errs).length) return;

    setPassSubmitting(true);
    setPassSuccess('');
    try {
      const res = await authFetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passForm.current_password,
          new_password: passForm.new_password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassErrors({ general: data.detail || 'Failed to change password' });
        return;
      }
      setPassSuccess('Password changed successfully!');
      setPassForm({ current_password: '', new_password: '', confirm_password: '' });
    } finally {
      setPassSubmitting(false);
    }
  };

  if (loading) return (
    <AdminLayout title="Profile"><div className="page-loader"><div className="spinner" /></div></AdminLayout>
  );

  return (
    <AdminLayout title="Profile">
          {/* Profile Info Card */}
          <div className="form-card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Personal Information</h2>
              {!editing && (
                <button className="btn btn-secondary" onClick={() => setEditing(true)}>Edit</button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave}>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input className="form-input" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input className="form-input" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="form-input" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <strong>Name:</strong> {profile?.first_name} {profile?.last_name}
                </p>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <strong>Email:</strong> {profile?.email}
                </p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  <strong>Role:</strong> <span className={`badge ${profile?.role === 'ADMIN' ? 'badge-admin' : 'badge-user'}`}>{profile?.role}</span>
                </p>
              </div>
            )}
          </div>

          {/* Change Password Card */}
          <div className="form-card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={18} /> Change Password
              </h2>
              {!showChangePass && (
                <button className="btn btn-secondary" onClick={() => { setShowChangePass(true); setPassSuccess(''); setPassErrors({}); }}>Change Password</button>
              )}
            </div>

            {showChangePass ? (
              <form onSubmit={handleChangePassword}>
                {passErrors.general && <div className="login-error" style={{ marginBottom: '1rem' }}>{passErrors.general}</div>}
                {passSuccess && <div style={{ padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', color: '#4ade80', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>{passSuccess}</div>}

                <div className="form-group">
                  <label>Current Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showCurrentPass ? 'text' : 'password'} className="form-input" value={passForm.current_password} onChange={(e) => setPassForm((p) => ({ ...p, current_password: e.target.value }))} placeholder="Enter current password" />
                    <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passErrors.current_password && <div className="form-error">{passErrors.current_password}</div>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>New Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showNewPass ? 'text' : 'password'} className="form-input" value={passForm.new_password} onChange={(e) => setPassForm((p) => ({ ...p, new_password: e.target.value }))} placeholder="Min 6 characters" />
                      <button type="button" onClick={() => setShowNewPass(!showNewPass)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passErrors.new_password && <div className="form-error">{passErrors.new_password}</div>}
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password *</label>
                    <input type="password" className="form-input" value={passForm.confirm_password} onChange={(e) => setPassForm((p) => ({ ...p, confirm_password: e.target.value }))} placeholder="Re-enter new password" />
                    {passErrors.confirm_password && <div className="form-error">{passErrors.confirm_password}</div>}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={passSubmitting}>{passSubmitting ? 'Saving...' : 'Update Password'}</button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowChangePass(false); setPassErrors({}); setPassSuccess(''); }}>Cancel</button>
                </div>
              </form>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Click "Change Password" to update your password.</p>
            )}
          </div>

          {/* Login Stats */}
          <div className="section-header"><h2>Login Statistics</h2></div>
          <div className="profile-grid">
            <div className="profile-stat">
              <div className="profile-stat-label">Last Login</div>
              <div className="profile-stat-value">{formatDate(profile?.last_login)}</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-label">Previous Login</div>
              <div className="profile-stat-value">{formatDate(profile?.previous_login)}</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-label">Total Login Count</div>
              <div className="profile-stat-value">{profile?.total_login_count || 0}</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-label">Last Logout</div>
              <div className="profile-stat-value">{formatDate(profile?.last_logout_time)}</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-label">Avg Session Duration</div>
              <div className="profile-stat-value">{formatDuration(profile?.average_session_duration)}</div>
            </div>
          </div>

          {/* Recent Login History */}
          <div className="section-header" style={{ marginTop: '1rem' }}><h2>Recent Login History</h2></div>
          <div className="admin-table-wrapper">
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Login Time</th>
                    <th>Logout Time</th>
                    <th>Duration</th>
                    <th>IP</th>
                    <th>Browser</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile?.recent_login_history || []).map((h) => (
                    <tr key={h.id}>
                      <td>{formatDate(h.login_time)}</td>
                      <td>{h.logout_time ? formatDate(h.logout_time) : '-'}</td>
                      <td>{formatDuration(h.session_duration)}</td>
                      <td>{h.ip_address || '-'}</td>
                      <td>{h.browser || '-'}</td>
                      <td>
                        <span className={`badge ${h.login_status === 'SUCCESS' ? 'badge-success' : 'badge-failed'}`}>
                          {h.login_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
    </AdminLayout>
  );
}
