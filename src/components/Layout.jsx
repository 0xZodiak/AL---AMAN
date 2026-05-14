import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './Layout.css';

const NAV_ITEMS = [
  { path: 'dashboard',    icon: '📊', label: 'لوحة التحكم',    roles: ['admin', 'team_leader', 'agent'] },
  { path: 'leads',        icon: '👥', label: 'العملاء',         roles: ['admin', 'team_leader', 'agent'] },
  { path: 'itineraries',  icon: '🚌', label: 'الرحلات',         roles: ['admin', 'team_leader', 'agent'] },
  { path: 'agents',       icon: '🏆', label: 'أداء الإيجنت',   roles: ['admin', 'team_leader'] },
  { path: 'users',        icon: '⚙️', label: 'إدارة الفرق',    roles: ['admin', 'team_leader'] },
];

export default function Layout({ children, activePage, setActivePage }) {
  const { currentUser, logout } = useAuth();
  const { globalDateFrom, setGlobalDateFrom, globalDateTo, setGlobalDateTo } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const roleLabel = {
    admin: { label: 'مدير النظام', color: '#fbbf24', icon: '👑' },
    team_leader: { label: 'تيم ليدر', color: '#818cf8', icon: '👔' },
    agent: { label: 'إيجنت', color: '#34d399', icon: '🧑‍💼' },
  };
  const role = roleLabel[currentUser?.role] || {};

  return (
    <div className={`layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`} dir="rtl">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-box">CRM</div>
            {sidebarOpen && <span className="logo-text">إدارة المبيعات</span>}
          </div>
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.filter(item => item.roles.includes(currentUser?.role)).map(item => (
            <button
              key={item.path}
              className={`nav-item ${activePage === item.path ? 'active' : ''}`}
              onClick={() => setActivePage(item.path)}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
              {sidebarOpen && activePage === item.path && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="user-card" onClick={() => setUserMenuOpen(!userMenuOpen)}>
              <div className="user-avatar" style={{ background: `linear-gradient(135deg, ${role.color}44, ${role.color}22)`, border: `2px solid ${role.color}` }}>
                {currentUser?.name?.charAt(0)}
              </div>
              <div className="user-info">
                <span className="user-name">{currentUser?.name}</span>
                <span className="user-role" style={{ color: role.color }}>{role.icon} {role.label}</span>
              </div>
              <span className="user-arrow">▾</span>
            </div>
          )}
          {userMenuOpen && sidebarOpen && (
            <div className="user-menu">
              <button className="user-menu-item logout" onClick={logout}>
                🚪 تسجيل الخروج
              </button>
            </div>
          )}
          {!sidebarOpen && (
            <button className="logout-icon-btn" onClick={logout} title="تسجيل الخروج">🚪</button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-right">
            <h2 className="page-title">
              {NAV_ITEMS.find(i => i.path === activePage)?.icon}{' '}
              {NAV_ITEMS.find(i => i.path === activePage)?.label}
            </h2>
          </div>
          <div className="top-bar-left">
            <div className="global-date-filter" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '14px' }}>📅 من:</span>
              <input 
                type="date" 
                value={globalDateFrom} 
                onChange={(e) => setGlobalDateFrom(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', colorScheme: 'dark', outline: 'none', fontFamily: 'inherit' }}
              />
              <span style={{ fontSize: '14px', marginRight: '8px' }}>إلى:</span>
              <input 
                type="date" 
                value={globalDateTo} 
                onChange={(e) => setGlobalDateTo(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', colorScheme: 'dark', outline: 'none', fontFamily: 'inherit' }}
              />
              {(globalDateFrom || globalDateTo) && (
                <button 
                  onClick={() => { setGlobalDateFrom(''); setGlobalDateTo(''); }}
                  style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#f87171', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginRight: '8px' }}
                  title="إلغاء التصفية"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
