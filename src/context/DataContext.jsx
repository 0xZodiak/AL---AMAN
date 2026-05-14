import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const DataContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Bus capacity by type
export const BUS_CAPACITY = {
  'VIP-30':     30,
  'Tourist-49': 49,
  'Tourist-51': 51,
};

// ─── Seat assignment logic ───────────────────────────
export function computeSeatAssignments(leads) {
  if (!leads || !leads.length) return {};
  const confirmed = leads.filter(l => l.status === 'مؤكد' && l.departure_date && l.bus_type);

  const assignments = {};
  const takenByTrip = {}; 

  confirmed.forEach(lead => {
    if (lead.bus_number && lead.seat_number) {
      const key = `${lead.departure_date}__${lead.bus_type}`;
      if (!takenByTrip[key]) takenByTrip[key] = new Set();
      takenByTrip[key].add(`${lead.bus_number}-${lead.seat_number}`);
      assignments[lead.id] = { bus_number: lead.bus_number, seat_number: lead.seat_number, tripKey: key };
    }
  });

  const unassigned = confirmed.filter(l => !l.bus_number || !l.seat_number);
  const tripMap = {};
  unassigned.forEach(lead => {
    const key = `${lead.departure_date}__${lead.bus_type}`;
    if (!tripMap[key]) tripMap[key] = [];
    tripMap[key].push(lead);
  });

  Object.entries(tripMap).forEach(([key, group]) => {
    const capacity = BUS_CAPACITY[key.split('__')[1]] || 49;
    if (!takenByTrip[key]) takenByTrip[key] = new Set();
    const sorted = [...group].sort((a, b) => {
      if (a.added_date !== b.added_date) return a.added_date.localeCompare(b.added_date);
      return a.id.toString().localeCompare(b.id.toString());
    });
    sorted.forEach(lead => {
      let busNum = 1, seatNum = 1;
      while (takenByTrip[key].has(`${busNum}-${seatNum}`)) {
        seatNum++;
        if (seatNum > capacity) { seatNum = 1; busNum++; }
      }
      takenByTrip[key].add(`${busNum}-${seatNum}`);
      assignments[lead.id] = { bus_number: busNum, seat_number: seatNum, tripKey: key };
    });
  });
  return assignments;
}

export function DataProvider({ children }) {
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [globalDateFrom, setGlobalDateFrom] = useState('');
  const [globalDateTo, setGlobalDateTo] = useState('');

  // ─── Toast System ───────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // ─── Real-time SSE Subscription ───────────────────────────
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/customers/stream`);
    
    eventSource.onmessage = (event) => {
      const { type, customer } = JSON.parse(event.data);
      if (type === 'insert') {
        setLeads(prev => [customer, ...prev.filter(l => l.id !== customer.id)]);
      } else if (type === 'update') {
        setLeads(prev => prev.map(l => l.id === customer.id ? customer : l));
      } else if (type === 'delete') {
        setLeads(prev => prev.filter(l => l.id !== customer.id));
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Connection Error:', err);
      eventSource.close();
      // Retry connection after 5 seconds
      setTimeout(() => {
        // This is a simplified retry; a more robust one might be needed
      }, 5000);
    };

    return () => eventSource.close();
  }, []);

  // ─── Data Fetching ───────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Leads
      const leadsRes = await fetch(`${API_BASE_URL}/api/customers`);
      if (!leadsRes.ok) throw new Error('فشل تحميل بيانات العملاء');
      const leadsData = await leadsRes.json();
      setLeads(leadsData);

      // Fetch Profiles (Users) directly from Supabase
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;
      setUsers(profiles || []);

    } catch (err) {
      console.error('Data Fetch Error:', err);
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── CRUD Operations ───────────────────────────
  const addLead = async (lead) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إضافة العميل');
      
      showToast('تم إضافة العميل بنجاح');
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const updateLead = async (id, updates) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث بيانات العميل');
      
      showToast('تم تحديث البيانات بنجاح');
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const deleteLead = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'فشل حذف العميل');
      }
      showToast('تم حذف العميل بنجاح');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  // ─── Stats & Filtering ───────────────────────────
  const getFilteredLeads = useCallback((filters, currentUser) => {
    if (!currentUser) return [];
    let filtered = [...leads];

    // Role-based scoping
    if (currentUser.role === 'agent') {
      filtered = filtered.filter(l => l.agent_id === currentUser.id);
    } else if (currentUser.role === 'team_leader') {
      filtered = filtered.filter(l => l.team_leader_id === currentUser.id);
    }

    // Date range filtering
    const start = filters.dateFrom || globalDateFrom;
    const end = filters.dateTo || globalDateTo;
    if (start) filtered = filtered.filter(l => l.added_date >= start);
    if (end)   filtered = filtered.filter(l => l.added_date <= end);

    // Filter by fields
    if (filters.status)   filtered = filtered.filter(l => l.status === filters.status);
    if (filters.agentId)  filtered = filtered.filter(l => l.agent_id === filters.agentId);
    if (filters.departureDate) filtered = filtered.filter(l => l.departure_date === filters.departureDate);
    
    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q)
      );
    }

    return filtered;
  }, [leads, globalDateFrom, globalDateTo]);

  const getAgentStats = useCallback((agentId) => {
    let agentLeads = leads.filter(l => l.agent_id === agentId);
    if (globalDateFrom) agentLeads = agentLeads.filter(l => l.added_date >= globalDateFrom);
    if (globalDateTo)   agentLeads = agentLeads.filter(l => l.added_date <= globalDateTo);

    const bookings = agentLeads.filter(l => l.status === 'مؤكد').length;
    const TARGET = 150;
    const progress = (bookings / TARGET) * 100;
    const commission = bookings > TARGET ? (bookings - TARGET) * 20 : 0;

    let progressColor = '#ef4444';
    if (progress >= 110) progressColor = '#8b5cf6';
    else if (progress >= 100) progressColor = '#22c55e';
    else if (progress >= 50) progressColor = '#eab308';

    return {
      total: agentLeads.length,
      bookings,
      target: TARGET,
      progress: Math.round(progress * 10) / 10,
      commission,
      progressColor,
      leads: agentLeads,
    };
  }, [leads, globalDateFrom, globalDateTo]);

  const getTeamLeaderStats = useCallback((tlId) => {
    let tlLeads = leads.filter(l => l.team_leader_id === tlId);
    if (globalDateFrom) tlLeads = tlLeads.filter(l => l.added_date >= globalDateFrom);
    if (globalDateTo)   tlLeads = tlLeads.filter(l => l.added_date <= globalDateTo);

    const bookings = tlLeads.filter(l => l.status === 'مؤكد').length;
    const TARGET = 200;
    const progress = (bookings / TARGET) * 100;

    return {
      total: tlLeads.length,
      bookings,
      target: TARGET,
      progress: Math.round(progress * 10) / 10,
    };
  }, [leads, globalDateFrom, globalDateTo]);

  const getRanking = useCallback(() => {
    const agents = users.filter(u => u.role === 'agent');
    const ranked = agents.map(agent => ({
      ...agent,
      ...getAgentStats(agent.id),
    })).sort((a, b) => b.bookings - a.bookings);

    const BONUSES = [500, 300, 200];
    return ranked.map((agent, i) => ({
      ...agent,
      rank: i + 1,
      bonus: BONUSES[i] || 0,
    }));
  }, [users, getAgentStats]);

  const value = useMemo(() => ({
    leads, 
    users, 
    loading, 
    error,
    addLead, 
    updateLead, 
    deleteLead, 
    getFilteredLeads, 
    getAgentStats, 
    getTeamLeaderStats, 
    getRanking,
    globalDateFrom, 
    setGlobalDateFrom, 
    globalDateTo, 
    setGlobalDateTo,
    toasts,
    showToast
  }), [
    leads, users, loading, error, addLead, updateLead, deleteLead, 
    getFilteredLeads, getAgentStats, getTeamLeaderStats, getRanking, 
    globalDateFrom, globalDateTo, toasts, showToast
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
      {/* Global Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' ? '✅' : '❌'} {t.message}
          </div>
        ))}
      </div>
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
