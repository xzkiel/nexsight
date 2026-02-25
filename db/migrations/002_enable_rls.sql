-- Enable Row Level Security
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for markets
-- Allow everyone to read markets
CREATE POLICY "Enable read access for all users" ON markets
    FOR SELECT
    USING (true);

-- Allow service role (indexer) to insert/update/delete
-- Note: Service role bypasses RLS by default, so we don't strictly need a policy for it if we don't define a restrictive one.
-- But if we want to be explicit or if we are using an authenticated user that isn't service role:
-- For now, we just enable read and rely on "default deny" for write for everyone else.

-- Create policies for bets
CREATE POLICY "Enable read access for all users" ON bets
    FOR SELECT
    USING (true);

-- Create policies for price_snapshots
CREATE POLICY "Enable read access for all users" ON price_snapshots
    FOR SELECT
    USING (true);

-- Create policies for users
CREATE POLICY "Enable read access for all users" ON users
    FOR SELECT
    USING (true);

-- Allow users to update their own profile (if using Supabase Auth)
-- CREATE POLICY "Enable update for users based on wallet" ON users
--     FOR UPDATE
--     USING (auth.uid() = wallet); -- This assumes wallet is the UID or linked. Commented out for now.
