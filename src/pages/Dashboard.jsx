import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { leads, users, loading, error, getAgentStats, getTeamLeaderStats, getRanking, globalDateFrom, globalDateTo } = useData();
  const { currentUser } = useAuth();

  const stats = useMemo(() => {
    if (loading || !leads) return null;
    let filteredLeads = leads;
    if (currentUser.role === 'team_leader') {
      filteredLeads = leads.filter(l => l.team_leader_id === currentUser.id);
    } else if (currentUser.role === 'agent') {
      filteredLeads = leads.filter(l => l.agent_id === currentUser.id);
    }

    if (globalDateFrom) filteredLeads = filteredLeads.filter(l => l.added_date >= globalDateFrom);
    if (globalDateTo)   filteredLeads = filteredLeads.filter(l => l.added_date <= globalDateTo);

    const total = filteredLeads.length;
    const bookings = filteredLeads.filter(l => l.status === 'مؤكد').length;
    const interested = filteredLeads.filter(l => l.status === 'مهتم').length;
    const potential = filteredLeads.filter(l => l.status === 'محتمل').length;
    const conversionRate = total > 0 ? ((bookings / total) * 100).toFixed(1) : 0;
    const revenue = filteredLeads.filter(l => l.status === 'مؤكد').reduce((sum, l) => sum + (Number(l.booking_price) || 0), 0);

    return { total, bookings, interested, potential, conversionRate, revenue, filteredLeads };
  }, [leads, currentUser, globalDateFrom, globalDateTo, loading]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <span className="spinner" />
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>⚠️ حدث خطأ أثناء تحميل البيانات: {error}</p>
      </div>
    );
  }

  const teamLeaders = users.filter(u => u.role === 'team_leader');
  const ranking = getRanking();

  const tlChartData = teamLeaders.map(tl => {
    const s = getTeamLeaderStats(tl.id);
    return { name: tl.name.split(' ')[0], حجوزات: s.bookings, هدف: s.target };
  });

  const pieData = [
    { name: 'مؤكد', value: stats.bookings },
    { name: 'مهتم', value: stats.interested },
    { name: 'محتمل', value: stats.potential },
  ].filter(d => d.value > 0);

  const timelineData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLeads = stats.filteredLeads.filter(l => l.added_date === dateStr);
      days.push({
        day: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
        عملاء: dayLeads.length,
        حجوزات: dayLeads.filter(l => l.status === 'مؤكد').length,
      });
    }
    return days;
  }, [stats.filteredLeads]);

  const topAgent = ranking[0];
  const topTL = teamLeaders.map(tl => {
    const s = getTeamLeaderStats(tl.id);
    return { ...tl, bookings: s.bookings };
  }).sort((a, b) => b.bookings - a.bookings)[0];

  return (
    <div className="dashboard">
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-icon">👥</div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.total}</span>
            <span className="kpi-label">إجمالي العملاء</span>
          </div>
          <div className="kpi-bg-icon">👥</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon">✅</div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.bookings}</span>
            <span className="kpi-label">إجمالي الحجوزات</span>
          </div>
          <div className="kpi-bg-icon">✅</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon">🔥</div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.interested}</span>
            <span className="kpi-label">عملاء مهتمون</span>
          </div>
          <div className="kpi-bg-icon">🔥</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-icon">📈</div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.conversionRate}%</span>
            <span className="kpi-label">نسبة التحويل</span>
          </div>
          <div className="kpi-bg-icon">📈</div>
        </div>
        {currentUser.role === 'admin' && (
          <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', borderColor: '#fbbf24' }}>
            <div className="kpi-icon">💰</div>
            <div className="kpi-info">
              <span className="kpi-value">{stats.revenue.toLocaleString('ar-EG')} <small style={{fontSize:14, fontWeight:600}}>ريال</small></span>
              <span className="kpi-label">قيمة الحجوزات</span>
            </div>
            <div className="kpi-bg-icon">💰</div>
          </div>
        )}
      </div>

      <div className="charts-row">
        <div className="chart-card wide">
          <h3 className="chart-title">📅 نشاط آخر 7 أيام</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timelineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: 'Cairo', color: 'rgba(255,255,255,0.7)' }} />
              <Line type="monotone" dataKey="عملاء" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
              <Line type="monotone" dataKey="حجوزات" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card narrow">
          <h3 className="chart-title">🎯 توزيع الحالات</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                style={{ fontFamily: 'Cairo', fontSize: 11 }}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pie-legend">
            {pieData.map((d, i) => (
              <div key={i} className="pie-item">
                <span className="pie-dot" style={{ background: COLORS[i] }} />
                <span className="pie-name">{d.name}</span>
                <span className="pie-val">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {currentUser.role !== 'agent' && (
        <div className="charts-row">
          <div className="chart-card wide">
            <h3 className="chart-title">👔 أداء التيم ليدر</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tlChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontFamily: 'Cairo', color: 'rgba(255,255,255,0.7)' }} />
                <Bar dataKey="حجوزات" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="هدف" fill="rgba(255,255,255,0.08)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card narrow">
            <h3 className="chart-title">🏆 أفضل الأداء</h3>
            <div className="top-performers">
              {topAgent && (
                <div className="performer-card agent-p">
                  <div className="performer-badge">🥇 أفضل إيجنت</div>
                  <div className="performer-name">{topAgent.name}</div>
                  <div className="performer-stat">{topAgent.bookings} حجز</div>
                  <div className="performer-commission">
                    💰 كوميشن: {topAgent.commission} جنيه
                  </div>
                </div>
              )}
              {topTL && (
                <div className="performer-card tl-p">
                  <div className="performer-badge">🥇 أفضل تيم ليدر</div>
                  <div className="performer-name">{topTL.name}</div>
                  <div className="performer-stat">{topTL.bookings} حجز</div>
                  <div className="performer-commission">
                    🎯 من هدف 200
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentUser.role !== 'agent' && (
        <div className="tl-cards">
          <h3 className="section-title">👥 أداء فرق البيع</h3>
          <div className="tl-grid">
            {teamLeaders.map(tl => {
              const s = getTeamLeaderStats(tl.id);
              const percent = Math.min(s.progress, 100);
              const color = s.progress >= 100 ? '#22c55e' : s.progress >= 50 ? '#eab308' : '#ef4444';
              return (
                <div className="tl-card" key={tl.id}>
                  <div className="tl-card-header">
                    <div className="tl-avatar">{tl.name.charAt(0)}</div>
                    <div>
                      <div className="tl-name">{tl.name}</div>
                      <div className="tl-meta">تيم ليدر</div>
                    </div>
                    <div className="tl-bookings" style={{ color }}>{s.bookings}</div>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${percent}%`, background: color }} />
                    </div>
                    <span className="progress-pct" style={{ color }}>{s.progress.toFixed(1)}%</span>
                  </div>
                  <div className="tl-stats">
                    <span>العملاء: {s.total}</span>
                    <span>الهدف: {s.target}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
