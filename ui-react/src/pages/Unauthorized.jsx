import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="error-page">
      <ShieldX size={64} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
      <h1>403</h1>
      <h2>Access Denied</h2>
      <p>You do not have permission to view this page.</p>
      <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
    </div>
  );
}
