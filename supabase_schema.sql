-- RLS Setup for CRM Application

-- 1. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Table Policies
-- Allow anyone to read profiles (needed for select boxes, etc.)
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- Admins can do anything with profiles
CREATE POLICY "Admins have full access to profiles" 
ON profiles FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());


-- 3. Customers Table Policies

-- Admin policy: full access
CREATE POLICY "Admins have full access to customers" 
ON customers FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Team Leader policy: can see and edit their team's leads
CREATE POLICY "Team Leaders can manage their team leads" 
ON customers FOR ALL 
TO authenticated 
USING (
  team_leader_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'team_leader'
  )
)
WITH CHECK (
  team_leader_id = auth.uid()
);

-- Agent policy: can see and edit only their assigned leads
CREATE POLICY "Agents can manage their assigned leads" 
ON customers FOR ALL 
TO authenticated 
USING (
  agent_id = auth.uid()
)
WITH CHECK (
  agent_id = auth.uid()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_agent_id ON customers(agent_id);
CREATE INDEX IF NOT EXISTS idx_customers_team_leader_id ON customers(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_added_date ON customers(added_date);
