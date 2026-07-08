import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';

function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDuration(seconds) {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function isOnline(record) {
  if (!record || record.login_status === 'FAILED') return false;
  if (record.logout_time) return false;
  const loginTime = new Date(record.login_time);
  const diff = (Date.now() - loginTime.getTime()) / 1000 / 60;
  return diff < 15; // online if login within last 15 min and no logout
}

export default function LoginActivity() {
  const { authFetch } = useAuth();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);

  const pageSize = 10;

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, page_size: pageSize, sort });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    authFetch(`/api/login-history?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRecords(data.records || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, dateFrom, dateTo, sort, authFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportCSV = () => {
    const headers = ['User ID', 'Email', 'Login Time', 'Logout Time', 'Duration', 'IP', 'Browser', 'OS', 'Status'];
    const rows = records.map((r) => [
      r.user_id || '', r.email_attempted || '', r.login_time || '', r.logout_time || '',
      r.session_duration || '', r.ip_address || '', r.browser || '', r.operating_system || '', r.login_status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'login_activity.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Login Activity">
          <div className="admin-table-wrapper">
            <div className="admin-table-toolbar">
              <div className="admin-search">
                <Search size={16} style={{ color: 'var(--text-muted)' }} />
                <input placeholder="Search by user or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <div className="admin-filters">
                <input type="date" className="filter-select" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} title="From date" />
                <input type="date" className="filter-select" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} title="To date" />
                <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="">All Status</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Failed</option>
                </select>
                <select className="filter-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="latest">Latest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <button className="btn btn-secondary" onClick={fetchData} title="Refresh">
                  <RefreshCw size={16} />
                </button>
                <button className="btn btn-secondary" onClick={exportCSV} title="Export CSV">
                  <Download size={16} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="page-loader"><div className="spinner" /></div>
            ) : records.length === 0 ? (
              <div className="empty-state-admin"><p>No login activity found.</p></div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Login Date</th>
                      <th>Login Time</th>
                      <th>Logout Time</th>
                      <th>Duration</th>
                      <th>Login Status</th>
                      <th>Current Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => {
                      const online = isOnline(r);
                      return (
                        <tr key={r.id}>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {r.user_id ? `User #${r.user_id}` : 'Unknown'}
                          </td>
                          <td>{r.email_attempted || '-'}</td>
                          <td>{formatDate(r.login_time)}</td>
                          <td>{formatTime(r.login_time)}</td>
                          <td>{r.logout_time ? `${formatDate(r.logout_time)} ${formatTime(r.logout_time)}` : '-'}</td>
                          <td>{formatDuration(r.session_duration)}</td>
                          <td>
                            <span className={`badge ${r.login_status === 'SUCCESS' ? 'badge-success' : 'badge-failed'}`}>
                              {r.login_status}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${online ? 'badge-online' : 'badge-offline'}`}>
                              {online ? 'Online' : 'Offline'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pagination">
              <span className="pagination-info">
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
              </span>
              <div className="pagination-btns">
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                      {p}
                    </button>
                  );
                })}
                <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
    </AdminLayout>
  );
}
