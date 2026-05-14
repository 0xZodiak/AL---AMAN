import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import './Users.css';

const ROLE_LABELS = {
  admin:       { label: 'مدير النظام', color: '#fbbf24', icon: '👑', bg: 'rgba(251,191,36,0.1)',    border: 'rgba(251,191,36,0.25)' },
  team_leader: { label: 'تيم ليدر',   color: '#818cf8', icon: '👔', bg: 'rgba(129,140,248,0.1)',   border: 'rgba(129,140,248,0.25)' },
  agent:       { label: 'إيجنت',       color: '#34d399', icon: '🧑‍💼', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' },
};

const TARGET_AGENT = 150;
const TARGET_TL    = 200;

function progressColor(pct) {
  if (pct >= 110) return '#8b5cf6';
  if (pct >= 100) return '#22c55e';
  if (pct >= 50)  return '#eab308';
  return '#ef4444';
}

function SmallLeadsList({ leads }) {
  const [expanded, setExpanded] = useState(false);
  if (!leads || leads.length === 0) return null;

  const STATUS_COLORS = {
    'مؤكد':   { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
    'مهتم':   { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
    'محتمل':  { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  };

  const displayed = expanded ? leads : leads.slice(0, 3);

  return (
    <div className="small-leads-list">
      <div className="sll-header" onClick={() => setExpanded(!expanded)}>
        <span>العملاء ({leads.length})</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="sll-items">
          {displayed.map(lead => {
            const sc = STATUS_COLORS[lead.status] || STATUS_COLORS['محتمل'];
            return (
              <div key={lead.id} className="sll-item">
                <div className="sll-info">
                  <div className="sll-name">{lead.name}</div>
                  <div className="sll-date">{lead.addedDate}</div>
                </div>
                <div className="sll-status" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                  {lead.status}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Users() {
  const { users, loading, error, getAgentStats, getTeamLeaderStats } = useData();
  const { currentUser } = useAuth();
  
  if (loading) {
    return (
      <div className="users-loading">
        <span className="spinner" />
        <p>جاري تحميل قائمة المستخدمين والفرق...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="users-error">
        <p>⚠️ حدث خطأ: {error}</p>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';
  const admins  = users.filter(u => u.role === 'admin');
  let tls       = users.filter(u => u.role === 'team_leader');
  
  if (!isAdmin) {
    tls = tls.filter(t => t.id === currentUser.id);
  }

  const allAgents = users.filter(u => u.role === 'agent');

  return (
    <div className="users-page">

      {/* ── Summary chips (Admins only) ───────────────────────────── */}
      {isAdmin && (
        <div className="users-summary">
          {[
            { label: 'المديرون',  count: admins.length,    ...ROLE_LABELS.admin },
            { label: 'التيم ليدر', count: tls.length,      ...ROLE_LABELS.team_leader },
            { label: 'الإيجنت',   count: allAgents.length, ...ROLE_LABELS.agent },
          ].map(s => (
            <div className="summary-card" key={s.label} style={{ background: s.bg, borderColor: s.border }}>
              <span className="summary-icon">{s.icon}</span>
              <div>
                <div className="summary-count" style={{ color: s.color }}>{s.count}</div>
                <div className="summary-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Admins strip (Admins only) ────────────────────────────── */}
      {isAdmin && (
        <div className="admins-strip">
          <h3 className="section-title">👑 المديرون</h3>
          <div className="admins-row">
            {admins.map(admin => (
              <div key={admin.id} className="admin-chip">
                <div className="admin-avatar">{admin.name.charAt(0)}</div>
                <div>
                  <div className="admin-name">{admin.name}</div>
                  <div className="admin-role">مدير النظام</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Teams (one section per TL) ────────────────────────────── */}
      {tls.map(tl => {
        const tlStats   = getTeamLeaderStats(tl.id);
        const tlPct     = tlStats.progress;
        const tlColor   = progressColor(tlPct);
        const teamAgents = allAgents.filter(a => a.team_leader_id === tl.id);

        return (
          <div key={tl.id} className="team-section">

            {/* TL header */}
            <div className="tl-header">
              <div className="tl-avatar-lg">{tl.name.charAt(0)}</div>

              <div className="tl-header-info">
                <div className="tl-header-name">{tl.name}</div>
                <span className="tl-role-tag" style={{ color: ROLE_LABELS.team_leader.color, background: ROLE_LABELS.team_leader.bg, borderColor: ROLE_LABELS.team_leader.border }}>
                  {ROLE_LABELS.team_leader.icon} تيم ليدر
                </span>
              </div>

              {/* TL target progress */}
              <div className="tl-progress-block">
                <div className="tl-prog-nums">
                  <span style={{ color: tlColor, fontWeight: 900, fontSize: 26 }}>{tlStats.bookings}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>/ {TARGET_TL}</span>
                </div>
                <div className="tl-prog-bar-track">
                  <div className="tl-prog-bar-fill" style={{ width: `${Math.min(tlPct, 100)}%`, background: tlColor }} />
                </div>
                <div className="tl-prog-pct" style={{ color: tlColor }}>{tlPct.toFixed(1)}% من الهدف</div>
              </div>

              <div className="tl-mini-stats">
                <div className="tl-mini-stat"><span>{tlStats.total}</span><span>عملاء</span></div>
                <div className="tl-mini-stat"><span style={{ color: tlColor }}>{tlStats.bookings}</span><span>حجز</span></div>
                <div className="tl-mini-stat"><span>{TARGET_TL}</span><span>هدف</span></div>
              </div>
            </div>

            {/* TL's direct leads */}
            {tlStats.directLeads && tlStats.directLeads.length > 0 && (
              <div className="tl-direct-leads" style={{ padding: '0 20px', marginTop: '10px' }}>
                <h4 style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px 0' }}>عملاء التيم ليدر المباشرين:</h4>
                <SmallLeadsList leads={tlStats.directLeads} />
              </div>
            )}

            {/* Agent cards */}
            <div className="team-agents-grid">
              {teamAgents.map(agent => {
                const s   = getAgentStats(agent.id);
                const pct = s.progress;
                const col = progressColor(pct);

                return (
                  <div key={agent.id} className="agent-perf-card">
                    {/* Header */}
                    <div className="apc-header">
                      <div className="apc-avatar">{agent.name.charAt(0)}</div>
                      <div className="apc-info">
                        <div className="apc-name">{agent.name}</div>
                        <span className="apc-tag" style={{ color: ROLE_LABELS.agent.color, background: ROLE_LABELS.agent.bg, borderColor: ROLE_LABELS.agent.border }}>
                          {ROLE_LABELS.agent.icon} إيجنت
                        </span>
                      </div>
                      <div className="apc-bookings" style={{ color: col }}>{s.bookings}</div>
                    </div>

                    {/* Progress */}
                    <div className="apc-prog-label">
                      <span>{s.bookings} حجز من {TARGET_AGENT}</span>
                      <span style={{ color: col, fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div className="apc-prog-track">
                      <div className="apc-prog-fill" style={{ width: `${Math.min(pct, 100)}%`, background: col }} />
                    </div>

                    {/* Stats row */}
                    <div className="apc-stats">
                      <div className="apc-stat">
                        <span>{s.total}</span>
                        <span>عملاء</span>
                      </div>
                      <div className="apc-stat">
                        <span style={{ color: col }}>{s.bookings}</span>
                        <span>حجوزات</span>
                      </div>
                      <div className="apc-stat">
                        <span style={{ color: s.commission > 0 ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>
                          {s.commission > 0 ? `${s.commission} ج` : '—'}
                        </span>
                        <span>كوميشن</span>
                      </div>
                    </div>

                    {/* Leads list for this agent */}
                    <div className="apc-leads-wrap" style={{ marginTop: '16px' }}>
                      <SmallLeadsList leads={s.leads} />
                    </div>

                    {/* Commission badge */}
                    {s.commission > 0 && (
                      <div className="apc-comm-badge">
                        💰 كوميشن إضافي: <strong>{s.commission} جنيه</strong>
                      </div>
                    )}
                  </div>
                );
              })}

              {teamAgents.length === 0 && (
                <div className="no-agents">لا يوجد إيجنت في هذا الفريق بعد</div>
              )}
            </div>
          </div>
        );
      })}

      {/* ── User Directory (Admins only) ─────────────────── */}
      {isAdmin && (
        <div className="creds-guide">
          <h3 className="section-title">👥 دليل المستخدمين</h3>
          <div className="creds-table-wrap">
            <table className="creds-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الدور</th>
                  <th>البريد الإلكتروني</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const r = ROLE_LABELS[u.role] || ROLE_LABELS.agent;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700, color: 'white' }}>{u.name}</td>
                      <td>
                        <span className="role-tag" style={{ background: r.bg, borderColor: r.border, color: r.color }}>
                          {r.icon} {r.label}
                        </span>
                      </td>
                      <td><code className="cred-code">{u.email}</code></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
