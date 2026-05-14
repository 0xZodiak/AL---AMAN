// server.js (Production Optimized)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

// --- Configuration & Initialization ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ CRITICAL: Missing Supabase environment variables');
  process.exit(1);
}

// Supabase client using Service Role key for admin/privileged tasks
// This key stays on the server and is never exposed to the frontend.
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

const app = express();

// --- Security Middleware ---
app.use(helmet()); // Sets various security-related HTTP headers
app.use(cors({
  origin: process.env.CLIENT_URL || '*', // Restrict this in production
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS
app.use(compression()); // Compress all responses

// --- Rate Limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// --- SSE Client Management ---
const sseClients = new Set();

function broadcast(payload) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(msg);
    } catch (err) {
      console.error('SSE Broadcast error:', err);
      sseClients.delete(client);
    }
  });
}

// --- Supabase Realtime Subscription ---
supabase
  .channel('public:customers')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'customers' },
    payload => {
      const type = payload.eventType.toLowerCase();
      const customer = payload.new || payload.old;
      broadcast({ type, customer });
    }
  )
  .subscribe();

// --- Request Validation Middleware ---
const validateCustomer = (req, res, next) => {
  const { name, phone, status } = req.body;
  if (!name || !phone || !status) {
    return res.status(400).json({ error: 'Name, phone, and status are required.' });
  }
  // Simple phone validation
  if (!/^0[0-9]{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format.' });
  }
  next();
};

// --- API Routes ---

// GET: Fetch customers with query filters
app.get('/api/customers', async (req, res, next) => {
  try {
    const { status, agent_id, team_leader_id, date_from, date_to } = req.query;
    
    let query = supabase.from('customers').select('*').order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (agent_id) query = query.eq('agent_id', agent_id);
    if (team_leader_id) query = query.eq('team_leader_id', team_leader_id);
    if (date_from) query = query.gte('added_date', date_from);
    if (date_to) query = query.lte('added_date', date_to);

    const { data, error } = await query;
    if (error) throw error;
    
    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

// GET: Fetch a single customer
app.get('/api/customers/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Customer not found' });
      throw error;
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST: Create a new customer
app.post('/api/customers', validateCustomer, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([{
        ...req.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    
    const newCustomer = data[0];
    res.status(201).json(newCustomer);
  } catch (err) {
    next(err);
  }
});

// PATCH: Update an existing customer
app.patch('/api/customers/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data.length) return res.status(404).json({ error: 'Customer not found' });
    
    res.json(data[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE: Remove a customer
app.delete('/api/customers/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

// SSE: Real-time event stream
app.get('/api/customers/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (Nginx)
  res.flushHeaders();

  sseClients.add(res);
  console.log(`📡 SSE Client connected. Total: ${sseClients.size}`);

  req.on('close', () => {
    sseClients.delete(res);
    console.log(`🔌 SSE Client disconnected. Total: ${sseClients.size}`);
  });
});

// --- Health Check ---
app.get('/health', (req, res) => res.json({ status: 'ok', environment: NODE_ENV }));

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error(`❌ [${new Date().toISOString()}] Error:`, err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    error: NODE_ENV === 'production' ? 'An internal server error occurred.' : err.message,
    status
  });
});

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`🚀 Production-ready API server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
});
