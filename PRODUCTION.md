# CRM Production Deployment Guide

This document contains all the necessary steps and information to deploy the CRM application to production.

## 1. Database Setup (Supabase)

### SQL Schema & RLS
Run the following SQL in your Supabase SQL Editor:

```sql
-- Profiles table for user metadata
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  role TEXT CHECK (role IN ('admin', 'team_leader', 'agent')),
  team_leader_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table for leads
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'محتمل',
  added_date DATE DEFAULT CURRENT_DATE,
  departure_date DATE,
  bus_type TEXT,
  booking_price DECIMAL,
  seat_number INTEGER,
  bus_number INTEGER,
  agent_id UUID REFERENCES auth.users,
  team_leader_id UUID REFERENCES auth.users,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Customers Policies
CREATE POLICY "Admins have full access" 
ON customers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Team Leaders access team data" 
ON customers FOR ALL TO authenticated USING (
  team_leader_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'team_leader')
);

CREATE POLICY "Agents access own leads" 
ON customers FOR ALL TO authenticated USING (agent_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
```

## 2. Environment Variables

Create a `.env` file in the root directory (for Backend) and ensure Vite picks up its variables (prefixed with `VITE_`).

### Backend (`server.js`)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=4000
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.com
```

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://your-backend-api.com
```

## 3. Deployment Steps

### Backend (Render / Heroku)
1.  Connect your repository to Render.
2.  Set the Environment Variables in the Render dashboard.
3.  Set Build Command: `npm install`
4.  Set Start Command: `node server.js`

### Frontend (Vercel / Netlify)
1.  Connect your repository to Vercel.
2.  Set the Environment Variables (VITE_ prefixed).
3.  Set Framework Preset: `Vite`
4.  Build Command: `npm run build`
5.  Output Directory: `dist`

## 4. Production Checklist
- [ ] Supabase RLS enabled and tested.
- [ ] `NODE_ENV` set to `production`.
- [ ] `CLIENT_URL` correctly set in backend to restrict CORS.
- [ ] Rate limiting is active (included in `server.js`).
- [ ] No `service_role` keys are in the frontend code.
- [ ] SSL is active on both frontend and backend.

## 5. Known Issues
- **SSE Connection**: In some serverless environments (like Vercel Functions), SSE may not stay open. It is recommended to deploy the backend to a long-running instance like Render (Web Service) or a VPS.
