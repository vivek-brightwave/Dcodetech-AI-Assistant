import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../../components/admin/Sidebar';
import Navbar from '../../components/admin/Navbar';
import { useAuth } from '../../contexts/AuthContext';

export default function EditUser() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', role: 'USER', is_active: true });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authFetch(`/api/users/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          role: data.role || 'USER',
          is_active: data.is_active ?? true,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, authFetch]);

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'Required';
    if (!form.last_name.trim()) errs.last_name = 'Required';
    if (!form.email.trim()) errs.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const res = await authFetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors({ general: data.detail || 'Failed to update' });
        return;
      }
      navigate('/admin/users');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="admin-layout"><Sidebar /><div className="admin-main"><Navbar title="Edit User" /><div className="admin-content"><div className="page-loader"><div className="spinner" /></div></div></div></div>;

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <Navbar title="Edit User" />
        <div className="admin-content">
          <div className="form-card">
            {errors.general && <div className="login-error" style={{ marginBottom: '1rem' }}>{errors.general}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input name="first_name" className="form-input" value={form.first_name} onChange={handleChange} />
                  {errors.first_name && <div className="form-error">{errors.first_name}</div>}
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input name="last_name" className="form-input" value={form.last_name} onChange={handleChange} />
                  {errors.last_name && <div className="form-error">{errors.last_name}</div>}
                </div>
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input name="email" type="email" className="form-input" value={form.email} onChange={handleChange} />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <select name="role" className="filter-select" style={{ width: '100%' }} value={form.role} onChange={handleChange}>
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Active</label>
                  <div style={{ paddingTop: '0.5rem' }}>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/users')}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
