import React, { useMemo, useState } from 'react';
import { useData, computeSeatAssignments, BUS_CAPACITY } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import './Itineraries.css';

const BUS_LABELS = {
  'VIP-30': { label: 'VIP', icon: '⭐', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)' },
  'Tourist-49': { label: 'سياحي', icon: '🚌', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.25)' },
  'Tourist-51': { label: 'سياحي+', icon: '🚌', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' },
};

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch { return d; }
}

// ─── Single Bus Grid ──────────────────────────────────────────────────────────
function BusGrid({ busNumber, busType, passengers, currentUser }) {
  const capacity = BUS_CAPACITY[busType] || 49;
  const style = BUS_LABELS[busType] || BUS_LABELS['Tourist-49'];
  const filled = passengers.length;
  const isFull = filled >= capacity;

  const seatMap = {};
  passengers.forEach(p => { seatMap[p.seat_number] = p; });

  const seats = Array.from({ length: capacity }, (_, i) => i + 1);
  const rows = [];
  for (let i = 0; i < capacity; i += 4) rows.push(seats.slice(i, i + 4));

  return (
    <div className="bus-grid-card">
      <div className="bus-grid-header" style={{ borderColor: style.border, background: style.bg }}>
        <div className="bus-grid-title">
          <span className="bus-num-badge" style={{ color: style.color }}>
            {style.icon} باص {busNumber}
          </span>
          <span className="bus-type-tag" style={{ color: style.color, borderColor: style.border, background: style.bg }}>
            {style.label} — {capacity} مقعد
          </span>
        </div>
        <div className="bus-fill-info">
          <span className={`fill-count ${isFull ? 'full' : ''}`}>
            {filled} / {capacity}
          </span>
          {isFull && <span className="full-badge">مكتمل ✓</span>}
        </div>
      </div>

      <div className="seat-grid-wrap">
        <div className="bus-cockpit">
          <span>🚌 مقدمة الباص</span>
        </div>

        <div className="seat-grid">
          <div className="seat-col-headers">
            <span>A</span><span>B</span>
            <span className="aisle-gap" />
            <span>C</span><span>D</span>
          </div>

          {rows.map((row, ri) => (
            <div key={ri} className="seat-row-grid">
              <div className="seat-pair-grid">
                {[row[0], row[1]].map((seatNum, ci) => {
                  if (!seatNum) return <div key={ci} className="seat-cell empty" />;
                  const passenger = seatMap[seatNum];
                  let isMine = false;
                  if (passenger) {
                    isMine = currentUser.role === 'admin' || passenger.agent_id === currentUser.id || (currentUser.role === 'team_leader' && passenger.team_leader_id === currentUser.id);
                  }

                  return (
                    <div
                      key={ci}
                      className={`seat-cell ${passenger ? 'booked' : 'free'}`}
                      title={passenger ? (isMine ? passenger.name : 'محجوز') : `مقعد ${seatNum}`}
                    >
                      <span className="seat-cell-num">{seatNum}</span>
                      {passenger && (
                        <span className="seat-cell-name">
                          {isMine ? passenger.name.split(' ')[0] : '🔒'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="aisle-gap-grid" />
              <div className="seat-pair-grid">
                {[row[2], row[3]].map((seatNum, ci) => {
                  if (!seatNum) return <div key={ci} className="seat-cell empty" />;
                  const passenger = seatMap[seatNum];
                  let isMine = false;
                  if (passenger) {
                    isMine = currentUser.role === 'admin' || passenger.agent_id === currentUser.id || (currentUser.role === 'team_leader' && passenger.team_leader_id === currentUser.id);
                  }

                  return (
                    <div
                      key={ci}
                      className={`seat-cell ${passenger ? 'booked' : 'free'}`}
                      title={passenger ? (isMine ? passenger.name : 'محجوز') : `مقعد ${seatNum}`}
                    >
                      <span className="seat-cell-num">{seatNum}</span>
                      {passenger && (
                        <span className="seat-cell-name">
                          {isMine ? passenger.name.split(' ')[0] : '🔒'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="passenger-list">
          <div className="passenger-list-title">قائمة الركاب ({filled})</div>
          {filled === 0 ? (
            <p className="no-passengers">لا يوجد ركاب بعد</p>
          ) : currentUser.role === 'agent' ? (
            <p className="no-passengers" style={{ fontSize: 11 }}>القائمة الكاملة مخفية للخصوصية. راجع خريطة المقاعد.</p>
          ) : (
            <div className="passenger-rows">
              {passengers
                .sort((a, b) => a.seat_number - b.seat_number)
                .map(p => (
                  <div key={p.id} className="passenger-row">
                    <span className="p-seat">{p.seat_number}</span>
                    <span className="p-name">{p.name}</span>
                    <span className="p-agent">{p.agent_name}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Trip Details Viewer ──────────────────────────────────────────────────────
function TripDetails({ date, leads, assignments, currentUser }) {
  const dateLeads = leads.filter(l => l.status === 'مؤكد' && l.departure_date === date && l.bus_type);

  const allBusesMap = {};

  dateLeads.forEach(l => {
    const seatNumber = assignments[l.id]?.bus_number ? assignments[l.id].seat_number : null;
    const busNumber = assignments[l.id]?.bus_number;
    if (seatNumber && busNumber) {
      const busKey = `${l.bus_type}-${busNumber}`;
      if (!allBusesMap[busKey]) {
        allBusesMap[busKey] = {
          busType: l.bus_type,
          busNumber: busNumber,
          passengers: []
        };
      }
      allBusesMap[busKey].passengers.push({ ...l, seat_number: seatNumber, bus_number: busNumber });
    }
  });

  const allBuses = Object.values(allBusesMap).sort((a, b) => a.busNumber - b.busNumber);

  if (allBuses.length === 0) {
    return <p className="no-passengers">لا يوجد تفاصيل لهذه الرحلة</p>;
  }

  return (
    <div className="itin-buses-list">
      <div className="trip-buses-grid">
        {allBuses.map(b => (
          <BusGrid
            key={`${b.busType}-${b.busNumber}`}
            busNumber={b.busNumber}
            busType={b.busType}
            passengers={b.passengers}
            currentUser={currentUser}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Itineraries Page ────────────────────────────────────────────────────
export default function Itineraries() {
  const { leads, loading } = useData();
  const { currentUser } = useAuth();
  const [expandedDate, setExpandedDate] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const assignments = useMemo(() => computeSeatAssignments(leads), [leads]);

  const departureDates = useMemo(() => {
    if (!leads) return [];
    return [...new Set(
      leads
        .filter(l => l.status === 'مؤكد' && l.departure_date && l.departure_date >= todayStr)
        .map(l => l.departure_date)
    )].sort();
  }, [leads, todayStr]);

  if (loading) {
    return (
      <div className="itin-loading">
        <span className="spinner" />
        <p>جاري تحميل الرحلات...</p>
      </div>
    );
  }

  if (departureDates.length === 0) {
    return (
      <div className="itin-empty">
        <div className="itin-empty-icon">🚌</div>
        <h2>لا توجد رحلات قادمة</h2>
        <p>الرحلات السابقة تُخفى تلقائياً</p>
      </div>
    );
  }

  return (
    <div className="itin-page">
      <div className="all-trips-section">
        <h3 className="section-title">📅 جدول مواعيد الرحلات القادمة</h3>

        <div className="trips-grid">
          {departureDates.map(date => {
            const dLeads = leads.filter(l => l.status === 'مؤكد' && l.departure_date === date && l.bus_type);
            const daysLeft = Math.ceil((new Date(date + 'T00:00:00') - new Date()) / 86400000);
            const isExpanded = expandedDate === date;

            return (
              <div key={date} className={`trip-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="trip-card-header" onClick={() => setExpandedDate(isExpanded ? null : date)}>
                  <div className="trip-card-info">
                    <span className="trip-card-date">{date}</span>
                    <span className="trip-card-label">{formatDate(date)}</span>
                    <span className="trip-card-days">بعد {daysLeft} يوم</span>
                  </div>
                  <div className="trip-card-actions">
                    <span className="trip-card-count">{dLeads.length} راكب</span>
                    <span className="expand-icon">{isExpanded ? '▼' : '◀'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="trip-card-body">
                    <TripDetails date={date} leads={leads} assignments={assignments} currentUser={currentUser} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
