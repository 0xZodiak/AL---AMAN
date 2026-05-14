import React, { useState, useMemo } from 'react';
import { useData, computeSeatAssignments } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import LeadModal, { canSeePrice } from '../components/LeadModal';
import './Leads.css';

const STATUS_COLORS = {
  'محتمل': { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  'مهتم':  { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  'مؤكد':  { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
};

const BUS_TYPE_SHORT = {
  'VIP-30':     '⭐ VIP',
  'Tourist-49': '🚌 49',
  'Tourist-51': '🚌 51',
};

export default function Leads() {
  const { leads, users, loading, error, addLead, updateLead, deleteLead, getFilteredLeads } = useData();
  const { currentUser } = useAuth();

  const showPrice = canSeePrice(currentUser?.role);

  const [filters, setFilters] = useState({ status: '', agentId: '', dateFrom: '', dateTo: '', search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 15;

  const agents = users.filter(u => u.role === 'agent');
  const filtered = useMemo(() => getFilteredLeads(filters, currentUser), [leads, filters, currentUser]);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const seatAssignments = useMemo(() => computeSeatAssignments(leads), [leads]);

  if (loading) {
    return (
      <div className="leads-loading">
        <span className="spinner" />
        <p>جاري تحميل العملاء...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leads-error">
        <p>⚠️ خطأ في تحميل البيانات: {error}</p>
      </div>
    );
  }

  const handleFilterChange = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setCurrentPage(1);
  };

  const handleSave = (lead) => {
    if (editLead) {
      updateLead(editLead.id, lead);
    } else {
      addLead(lead);
    }
    setModalOpen(false);
    setEditLead(null);
  };

  const handleEdit = (lead) => {
    setEditLead(lead);
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    deleteLead(id);
    setDeleteConfirm(null);
  };

  const canEdit = (lead) => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'team_leader') return lead.team_leader_id === currentUser.id;
    return lead.agent_id === currentUser.id;
  };

  const canDelete = currentUser.role === 'admin';

  const resetFilters = () => {
    setFilters({ status: '', agentId: '', dateFrom: '', dateTo: '', search: '' });
    setCurrentPage(1);
  };

  return (
    <div className="leads-page">
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="بحث بالاسم أو الرقم..."
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="">كل الحالات</option>
            <option value="محتمل">محتمل</option>
            <option value="مهتم">مهتم</option>
            <option value="مؤكد">مؤكد</option>
          </select>

          {currentUser.role !== 'agent' && (
            <select value={filters.agentId} onChange={e => handleFilterChange('agentId', e.target.value)}>
              <option value="">كل الإيجنت</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}

          <input type="date" value={filters.dateFrom} onChange={e => handleFilterChange('dateFrom', e.target.value)} title="من تاريخ" />
          <input type="date" value={filters.dateTo} onChange={e => handleFilterChange('dateTo', e.target.value)} title="إلى تاريخ" />

          {Object.values(filters).some(Boolean) && (
            <button className="reset-btn" onClick={resetFilters}>✕ مسح</button>
          )}
        </div>

        {(currentUser.role === 'admin' || currentUser.role === 'team_leader' || currentUser.role === 'agent') && (
          <button className="add-btn" onClick={() => { setEditLead(null); setModalOpen(true); }}>
            + إضافة عميل
          </button>
        )}
      </div>

      <div className="leads-stats-bar">
        <span className="stats-total">إجمالي النتائج: <strong>{filtered.length}</strong></span>
        {['محتمل', 'مهتم', 'مؤكد'].map(s => (
          <span key={s} className="stats-badge" style={{ color: STATUS_COLORS[s].color, background: STATUS_COLORS[s].bg, border: `1px solid ${STATUS_COLORS[s].border}` }}>
            {s}: {filtered.filter(l => l.status === s).length}
          </span>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="leads-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الاسم</th>
              <th>رقم التليفون</th>
              <th>الحالة</th>
              <th>يوم الانطلاق</th>
              <th>الباص</th>
              <th>المقعد</th>
              {showPrice && <th>💰 السعر</th>}
              <th>الإيجنت</th>
              <th>التيم ليدر</th>
              <th>تاريخ الإضافة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={showPrice ? 12 : 11} className="empty-row">
                  <div className="empty-state">
                    <span>📭</span>
                    <p>لا توجد نتائج مطابقة</p>
                  </div>
                </td>
              </tr>
            ) : paginated.map((lead, i) => {
              const sc = STATUS_COLORS[lead.status] || {};
              const seat = seatAssignments[lead.id];
              const busShort = BUS_TYPE_SHORT[lead.bus_type] || '';

              return (
                <tr key={lead.id} className="lead-row">
                  <td className="row-num">{(currentPage - 1) * PER_PAGE + i + 1}</td>
                  <td className="lead-name">{lead.name}</td>
                  <td className="lead-phone" dir="ltr">{lead.phone}</td>
                  <td>
                    <span className="status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="date-cell">
                    {lead.departure_date || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                  </td>
                  <td>
                    {lead.bus_type ? (
                      <span className="bus-type-cell">{busShort}</span>
                    ) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                  </td>
                  <td>
                    {lead.status === 'مؤكد' && seat ? (
                      <span className="seat-cell-badge">
                        🚌{seat.bus_number} — <strong>{seat.seat_number}</strong>
                      </span>
                    ) : <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                  </td>
                  {showPrice && (
                    <td className="price-cell">
                      {lead.status === 'مؤكد' && lead.booking_price
                        ? <span className="price-val">{Number(lead.booking_price).toLocaleString('ar-EG')} ريال</span>
                        : <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
                      }
                    </td>
                  )}
                  <td>{lead.agent_name}</td>
                  <td>{lead.team_leader_name}</td>
                  <td className="date-cell">{lead.added_date}</td>
                  <td className="actions-cell">
                    {canEdit(lead) && (
                      <button className="action-btn edit" onClick={() => handleEdit(lead)} title="تعديل">✏️</button>
                    )}
                    {canDelete && (
                      <button className="action-btn delete" onClick={() => setDeleteConfirm(lead)} title="حذف">🗑️</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>‹ السابق</button>
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="ellipsis">...</span>}
                  <button
                    className={p === currentPage ? 'active' : ''}
                    onClick={() => setCurrentPage(p)}
                  >{p}</button>
                </React.Fragment>
              ))}
          </div>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>التالي ›</button>
        </div>
      )}

      {modalOpen && (
        <LeadModal
          lead={editLead}
          users={users}
          currentUser={currentUser}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditLead(null); }}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-icon">🗑️</div>
            <h3>تأكيد الحذف</h3>
            <p>هل تريد حذف عميل <strong>{deleteConfirm.name}</strong>؟</p>
            <p className="delete-warning">هذا الإجراء لا يمكن التراجع عنه</p>
            <div className="delete-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
              <button className="btn-delete" onClick={() => handleDelete(deleteConfirm.id)}>حذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
