import React, { useState, useMemo } from 'react';
import { useData, BUS_CAPACITY, computeSeatAssignments } from '../context/DataContext';
import './LeadModal.css';

const DEMO_USERS_IMPORT = [
  { id: 'tl1', name: 'محمد سالم', role: 'team_leader', teamId: 'team1' },
  { id: 'tl2', name: 'سارة أحمد', role: 'team_leader', teamId: 'team2' },
  { id: 'agent1', name: 'خالد عمر', role: 'agent', teamId: 'team1', teamLeaderId: 'tl1' },
  { id: 'agent2', name: 'نور حسن', role: 'agent', teamId: 'team1', teamLeaderId: 'tl1' },
  { id: 'agent3', name: 'ريم علي', role: 'agent', teamId: 'team2', teamLeaderId: 'tl2' },
  { id: 'agent4', name: 'يوسف كمال', role: 'agent', teamId: 'team2', teamLeaderId: 'tl2' },
];

const BUS_TYPES = [
  { value: 'VIP-30',     label: '⭐ VIP — 30 مقعد' },
  { value: 'Tourist-49', label: '🚌 سياحي — 49 مقعد' },
  { value: 'Tourist-51', label: '🚌 سياحي — 51 مقعد' },
];

// Can this user see financial booking price?
export const canSeePrice = (role) => role === 'agent' || role === 'admin';

// ─── Seat Picker component ────────────────────────────────────────────────────
function SeatPicker({ bus_type, departure_date, currentLeadId, value, onChange, allLeads, currentUser }) {
  const capacity = BUS_CAPACITY[bus_type] || 49;

  const autoAssign = useMemo(() => computeSeatAssignments(allLeads), [allLeads]);
  
  const autoTaken = useMemo(() => {
    const map = {};
    allLeads.forEach(l => {
      if (
        l.status === 'مؤكد' &&
        l.departure_date === departure_date &&
        l.bus_type === bus_type &&
        l.id !== currentLeadId
      ) {
        // Privacy rule
        const isMine = currentUser.role === 'admin' || l.agent_id === currentUser.id || (currentUser.role === 'team_leader' && l.team_leader_id === currentUser.id);
        const displayName = isMine ? l.name : 'محجوز';

        if (l.bus_number && l.seat_number) {
          map[`${l.bus_number}-${l.seat_number}`] = displayName;
        } else {
          const a = autoAssign[l.id];
          if (a) {
            map[`${a.bus_number}-${a.seat_number}`] = displayName;
          }
        }
      }
    });
    return map;
  }, [allLeads, departure_date, bus_type, currentLeadId, autoAssign, currentUser]);

  const takenKeys = Object.keys(autoTaken);
  const maxBus = takenKeys.length > 0
    ? Math.max(...takenKeys.map(k => Number(k.split('-')[0])))
    : 1;
  const seatsByBus = {};
  takenKeys.forEach(k => {
    const [b] = k.split('-').map(Number);
    if (!seatsByBus[b]) seatsByBus[b] = 0;
    seatsByBus[b]++;
  });
  const lastFull = (seatsByBus[maxBus] || 0) >= capacity;
  const busCount = lastFull ? maxBus + 1 : maxBus;

  const [activeBus, setActiveBus] = useState(value?.bus_number || 1);

  const seats = Array.from({ length: capacity }, (_, i) => i + 1);
  const rows = [];
  for (let i = 0; i < capacity; i += 4) rows.push(seats.slice(i, i + 4));

  const isAvailable = (seatNum) => !autoTaken[`${activeBus}-${seatNum}`];
  const isSelected  = (seatNum) => value?.bus_number === activeBus && value?.seat_number === seatNum;
  const takenBy     = (seatNum) => autoTaken[`${activeBus}-${seatNum}`];

  return (
    <div className="seat-picker">
      {busCount > 1 && (
        <div className="sp-bus-tabs">
          {Array.from({ length: busCount }, (_, i) => i + 1).map(bn => {
            const cnt = seatsByBus[bn] || 0;
            const full = cnt >= capacity;
            return (
              <button
                key={bn}
                type="button"
                className={`sp-bus-tab ${activeBus === bn ? 'active' : ''} ${full ? 'full' : ''}`}
                onClick={() => { setActiveBus(bn); onChange(null); }}
              >
                🚌 باص {bn}
                <span className="sp-tab-count">{cnt}/{capacity}</span>
                {full && <span className="sp-tab-full">مكتمل</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="sp-cockpit">🚌 مقدمة الباص {activeBus}</div>
      <div className="sp-col-labels">
        <span>A</span><span>B</span>
        <span className="sp-aisle-lbl" />
        <span>C</span><span>D</span>
      </div>
      <div className="sp-grid">
        {rows.map((row, ri) => (
          <div key={ri} className="sp-row">
            <div className="sp-pair">
              {[row[0], row[1]].map((seatNum, ci) => !seatNum ? (
                <div key={ci} className="sp-seat-empty" />
              ) : (
                <button
                  key={ci}
                  type="button"
                  disabled={!isAvailable(seatNum)}
                  className={`sp-seat ${isSelected(seatNum) ? 'selected' : isAvailable(seatNum) ? 'free' : 'taken'}`}
                  title={takenBy(seatNum) ? takenBy(seatNum) : `مقعد ${seatNum}`}
                  onClick={() => onChange({ bus_number: activeBus, seat_number: seatNum })}
                >
                  {seatNum}
                </button>
              ))}
            </div>
            <div className="sp-aisle" />
            <div className="sp-pair">
              {[row[2], row[3]].map((seatNum, ci) => !seatNum ? (
                <div key={ci} className="sp-seat-empty" />
              ) : (
                <button
                  key={ci}
                  type="button"
                  disabled={!isAvailable(seatNum)}
                  className={`sp-seat ${isSelected(seatNum) ? 'selected' : isAvailable(seatNum) ? 'free' : 'taken'}`}
                  title={takenBy(seatNum) ? takenBy(seatNum) : `مقعد ${seatNum}`}
                  onClick={() => onChange({ bus_number: activeBus, seat_number: seatNum })}
                >
                  {seatNum}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sp-footer">
        <div className="sp-legend">
          <span className="sp-legend-item free">متاح</span>
          <span className="sp-legend-item taken">محجوز</span>
          <span className="sp-legend-item selected">مختار</span>
        </div>
        {value && (
          <div className="sp-selected-info">
            ✅ باص {value.bus_number} — مقعد <strong>{value.seat_number}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LeadModal ────────────────────────────────────────────────────────────────
export default function LeadModal({ lead, users, currentUser, onSave, onClose }) {
  const { leads: allLeads } = useData();

  const agentsAndTLs = users
    ? users.filter(u => u.role === 'agent' || u.role === 'team_leader')
    : DEMO_USERS_IMPORT.filter(u => u.role === 'agent' || u.role === 'team_leader');
  const teamLeaders = users
    ? users.filter(u => u.role === 'team_leader')
    : DEMO_USERS_IMPORT.filter(u => u.role === 'team_leader');

  const getDefaultAgent = () => {
    if (currentUser?.role === 'agent' || currentUser?.role === 'team_leader') {
      return agentsAndTLs.find(a => a.id === currentUser.id) || agentsAndTLs[0];
    }
    return agentsAndTLs[0];
  };

  const defaultAgent = lead ? agentsAndTLs.find(a => a.id === lead.agent_id) || agentsAndTLs[0] : getDefaultAgent();
  const defaultTL = lead
    ? teamLeaders.find(t => t.id === lead.team_leader_id) || teamLeaders[0]
    : teamLeaders.find(t => t.id === defaultAgent?.teamLeaderId) || teamLeaders[0];

  const showPrice = canSeePrice(currentUser?.role);

  const [form, setForm] = useState({
    name:           lead?.name || '',
    phone:          lead?.phone || '',
    departure_date: lead?.departure_date || '',
    bus_type:       lead?.bus_type || 'Tourist-49',
    booking_price:  lead?.booking_price || '',
    seat_number:    lead?.seat_number || null,
    bus_number:     lead?.bus_number || null,
    status:         lead?.status || 'محتمل',
    agent_id:       lead?.agent_id || defaultAgent?.id || '',
    agent_name:     lead?.agent_name || defaultAgent?.name || '',
    team_leader_id: lead?.team_leader_id || defaultTL?.id || '',
    team_leader_name: lead?.team_leader_name || defaultTL?.name || '',
    notes:          lead?.notes || '',
  });
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleAgentChange = (agentId) => {
    const agent = agentsAndTLs.find(a => a.id === agentId);
    if (!agent) return;
    const tl = agent.role === 'team_leader' ? agent : teamLeaders.find(t => t.id === agent.teamLeaderId);
    setForm(prev => ({
      ...prev,
      agent_id: agent.id,
      agent_name: agent.name,
      team_leader_id: tl?.id || '',
      team_leader_name: tl?.name || '',
    }));
  };

  const handleDepartureDateChange = (val) => {
    setForm(prev => ({ ...prev, departure_date: val, seat_number: null, bus_number: null }));
  };
  const handleBusTypeChange = (val) => {
    setForm(prev => ({ ...prev, bus_type: val, seat_number: null, bus_number: null }));
  };
  const handleSeatChange = (seat) => {
    if (!seat) { set('seat_number', null); set('bus_number', null); return; }
    setForm(prev => ({ ...prev, seat_number: seat.seat_number, bus_number: seat.bus_number }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'الاسم مطلوب';
    if (!form.phone.trim()) e.phone = 'رقم التليفون مطلوب';
    else if (!/^0[0-9]{10}$/.test(form.phone.trim())) e.phone = 'رقم غير صحيح (11 رقم يبدأ بـ 0)';
    if (!form.agent_id) e.agentId = 'اختر الإيجنت';
    if (form.status === 'مؤكد' && !form.departure_date) e.departure_date = 'حدد يوم الانطلاق للعميل المؤكد';
    if (showPrice && form.booking_price && isNaN(Number(form.booking_price))) e.booking_price = 'أدخل رقم صحيح';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const price = form.booking_price ? Number(form.booking_price) : '';
    onSave({
      ...form,
      phone: form.phone.trim(),
      booking_price: price,
      campaign: form.departure_date,
    });
  };

  const showSeatPicker = form.status === 'مؤكد';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="lead-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{lead ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="modal-field">
              <label>الاسم *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="اسم العميل"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="modal-field">
              <label>رقم التليفون *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>

            <div className="modal-field">
              <label>الحالة *</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="محتمل">🟡 عميل محتمل</option>
                <option value="مهتم">🔵 عميل مهتم</option>
                <option value="مؤكد">🟢 عميل مؤكد (حجز)</option>
              </select>
            </div>

            <div className="modal-field">
              <label>يوم الانطلاق {form.status === 'مؤكد' ? '*' : ''}</label>
              <input
                type="date"
                value={form.departure_date}
                onChange={e => handleDepartureDateChange(e.target.value)}
                className={errors.departure_date ? 'error' : ''}
              />
              {errors.departure_date && <span className="field-error">{errors.departure_date}</span>}
            </div>

            {form.status === 'مؤكد' && (
              <div className="modal-field">
                <label>نوع الباص</label>
                <select value={form.bus_type} onChange={e => handleBusTypeChange(e.target.value)}>
                  {BUS_TYPES.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
            )}

            {currentUser?.role !== 'agent' && (
              <div className="modal-field">
                <label>الإيجنت *</label>
                <select
                  value={form.agent_id}
                  onChange={e => handleAgentChange(e.target.value)}
                  className={errors.agentId ? 'error' : ''}
                >
                  <option value="">اختر الإيجنت / التيم ليدر</option>
                  {agentsAndTLs.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role === 'team_leader' ? 'TL' : 'Agent'})
                    </option>
                  ))}
                </select>
                {errors.agentId && <span className="field-error">{errors.agentId}</span>}
              </div>
            )}

            <div className="modal-field">
              <label>التيم ليدر</label>
              <input type="text" value={form.team_leader_name} readOnly className="readonly" placeholder="يتحدد تلقائياً" />
            </div>

            {showPrice && (
              <div className="modal-field">
                <label className="price-label">
                  💰 سعر الحجز
                </label>
                <div className="price-input-wrap">
                  <input
                    type="number"
                    value={form.booking_price}
                    onChange={e => set('booking_price', e.target.value)}
                    placeholder="0"
                    min="0"
                    step="50"
                    className={errors.booking_price ? 'error' : ''}
                    dir="ltr"
                  />
                  <span className="price-currency">ريال</span>
                </div>
                {errors.booking_price && <span className="field-error">{errors.booking_price}</span>}
              </div>
            )}

            <div className="modal-field full-width">
              <label>ملاحظات</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="أي ملاحظات إضافية..."
                rows={2}
              />
            </div>
          </div>

          {showSeatPicker && (
            <div className="seat-picker-section">
              <div className="seat-picker-label">
                🪑 اختر المقعد
                {form.seat_number && (
                  <span className="seat-chosen-badge">
                    باص {form.bus_number} — مقعد {form.seat_number}
                  </span>
                )}
              </div>
              
              {!form.departure_date ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, color: 'rgba(255,255,255,0.4)', fontSize: 13, border: '1px dashed rgba(255,255,255,0.1)' }}>
                  ⚠️ يرجى تحديد "يوم الانطلاق" أولاً لكي تظهر خريطة الباصات المتاحة.
                </div>
              ) : (
                <SeatPicker
                  bus_type={form.bus_type}
                  departure_date={form.departure_date}
                  currentLeadId={lead?.id}
                  value={form.seat_number ? { bus_number: form.bus_number, seat_number: form.seat_number } : null}
                  onChange={handleSeatChange}
                  allLeads={allLeads}
                  currentUser={currentUser}
                />
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn-save">
              {lead ? '💾 حفظ التعديلات' : '+ إضافة العميل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
