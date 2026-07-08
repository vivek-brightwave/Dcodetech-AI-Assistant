import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Wifi, CalendarClock, ShieldAlert, Activity } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import StatsCard from '../../components/admin/StatsCard';
import { useAuth } from '../../contexts/AuthContext';

export default function Dashboard() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        { icon: Users, label: 'Total Users', value: stats.total_users, color: 'blue' },
        { icon: UserCheck, label: 'Active Users', value: stats.active_users, color: 'green' },
        { icon: Wifi, label: 'Online Users', value: stats.online_users, color: 'cyan' },
        { icon: CalendarClock, label: 'Logged In Today', value: stats.logged_in_today, color: 'purple' },
        { icon: ShieldAlert, label: 'Failed Logins Today', value: stats.failed_logins_today, color: 'red' },
        { icon: Activity, label: 'Sessions Today', value: stats.total_sessions_today, color: 'yellow' },
      ]
    : [];

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <>
          <div className="stats-grid">
            {cards.map((c, i) => (
              <StatsCard key={c.label} {...c} delay={i * 0.08} />
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
