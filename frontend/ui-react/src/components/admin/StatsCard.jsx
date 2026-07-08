import React from 'react';
import { motion } from 'framer-motion';

const iconColors = {
  blue: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
  green: { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' },
  purple: { bg: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' },
  red: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
  yellow: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
  cyan: { bg: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' },
};

export default function StatsCard({ icon: Icon, label, value, color = 'blue', delay = 0 }) {
  const colors = iconColors[color] || iconColors.blue;

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="stat-card-header">
        <div className="stat-card-icon" style={{ background: colors.bg }}>
          <Icon size={20} style={{ color: colors.color }} />
        </div>
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </motion.div>
  );
}
