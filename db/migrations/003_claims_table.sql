-- Claims table to track payout claims
CREATE TABLE claims (
    id                  BIGSERIAL PRIMARY KEY,
    tx_signature        VARCHAR(88) UNIQUE NOT NULL,
    market_id           BIGINT NOT NULL REFERENCES markets(market_id),
    user_wallet         VARCHAR(44) NOT NULL,
    amount              BIGINT NOT NULL,          -- Collateral received (micro-USDC)
    shares_burned       BIGINT NOT NULL,          -- Shares burned
    slot                BIGINT NOT NULL,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claims_market ON claims(market_id);
CREATE INDEX idx_claims_user ON claims(user_wallet);
CREATE INDEX idx_claims_timestamp ON claims(timestamp DESC);

-- RLS
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON claims
    FOR SELECT
    USING (true);

-- Enable realtime for claims table (optional, for activity feeds)
ALTER PUBLICATION supabase_realtime ADD TABLE claims;
