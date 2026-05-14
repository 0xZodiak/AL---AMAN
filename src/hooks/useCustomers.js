// src/hooks/useCustomers.js
/**
 * Hook for fetching customers from Supabase and keeping them in sync via realtime.
 * Returns { customers, loading, error }.
 */
import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';

export default function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial fetch
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('customers').select('*');
      if (error) {
        setError(error);
        setLoading(false);
        return;
      }
      setCustomers(data);
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('public:customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, payload => {
        const newCustomer = payload.new || payload.old;
        const type = payload.eventType.toLowerCase(); // INSERT, UPDATE, DELETE
        setCustomers(prev => {
          if (type === 'insert') {
            return [...prev, newCustomer];
          }
          if (type === 'update') {
            return prev.map(c => (c.id === newCustomer.id ? newCustomer : c));
          }
          if (type === 'delete') {
            return prev.filter(c => c.id !== newCustomer.id);
          }
          return prev;
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { customers, loading, error };
}
