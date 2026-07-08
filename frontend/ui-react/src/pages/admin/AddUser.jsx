import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';

export default function AddUser() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', confirm_password: '', role: 'USER', is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'Required';
    if (!form.last_name.trim()) errs.last_name = 'Required';
    if (!form.email.trim()) errs.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Required';
    else if (form.password.length < 6) errs.password = 'Min 6 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) errs.password = 'Need upper, lower & number';
    if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match';
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
      const res = await authFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          role: form.role,
          is_active: form.is_active,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors({ general: data.detail || 'Failed to create user' });
        return;
      }
      navigate('/admin/users');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Add User">
          <div className="form-card">
            {errors.general && <div className="login-error" style={{ marginBottom: '1rem' }}>{errors.general}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input name="first_name" className="form-input" value={form.first_name} onChange={handleChange} placeholder="First name" />
                  {errors.first_name && <div className="form-error">{errors.first_name}</div>}
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input name="last_name" className="form-input" value={form.last_name} onChange={handleChange} placeholder="Last name" />
                  {errors.last_name && <div className="form-error">{errors.last_name}</div>}
                </div>
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input name="email" type="email" className="form-input" value={form.email} onChange={handleChange} placeholder="email@example.com" />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Password *</label>
                  <input name="password" type="password" className="form-input" value={form.password} onChange={handleChange} placeholder="Min 6 characters" />
                  {errors.password && <div className="form-error">{errors.password}</div>}
                </div>
                <div className="form-group">
                  <label>Confirm Password *</label>
                  <input name="confirm_password" type="password" className="form-input" value={form.confirm_password} onChange={handleChange} placeholder="Re-enter password" />
                  {errors.confirm_password && <div className="form-error">{errors.confirm_password}</div>}
                </div>
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
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/users')}>Cancel</button>
              </div>
            </form>
          </div>
    </AdminLayout>
  );
}
