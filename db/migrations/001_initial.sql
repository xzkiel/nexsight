-- Core market data (indexed from on-chain)
CREATE TABLE markets (
    id                  BIGSERIAL PRIMARY KEY,
    market_id           BIGINT UNIQUE NOT NULL,        -- on-chain market_id
    pubkey              VARCHAR(44) UNIQUE NOT NULL,    -- Market PDA address
    creator             VARCHAR(44) NOT NULL,
    title               VARCHAR(128) NOT NULL,
    description         VARCHAR(512),
    category            VARCHAR(20) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    collateral_mint     VARCHAR(44) NOT NULL,
    yes_mint            VARCHAR(44) NOT NULL,
    no_mint             VARCHAR(44) NOT NULL,
    vault               VARCHAR(44) NOT NULL,
    total_yes_shares    BIGINT DEFAULT 0,
    total_no_shares     BIGINT DEFAULT 0,
    total_collateral    BIGINT DEFAULT 0,
    oracle_source       VARCHAR(20) NOT NULL,
    oracle_feed         VARCHAR(44) NOT NULL,
    oracle_threshold    BIGINT NOT NULL,
    start_timestamp     TIMESTAMPTZ NOT NULL,
    lock_timestamp      TIMESTAMPTZ NOT NULL,
    end_timestamp       TIMESTAMPTZ NOT NULL,
    resolved_outcome    VARCHAR(10),
    resolution_price    BIGINT,
    min_bet             BIGINT NOT NULL,
    max_bet             BIGINT DEFAULT 0,
    fee_bps             SMALLINT NOT NULL,
    is_recurring        BOOLEAN DEFAULT FALSE,
    round_duration      BIGINT,
    current_round       BIGINT DEFAULT 0,
    yes_price           DECIMAL(10, 6),                 -- cached CPMM price
    no_price            DECIMAL(10, 6),
    volume_24h          BIGINT DEFAULT 0,
    participant_count   INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,
    indexed_slot        BIGINT NOT NULL
);

CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_end ON markets(end_timestamp);
CREATE INDEX idx_markets_volume ON markets(volume_24h DESC);

-- Individual bets
CREATE TABLE bets (
    id                  BIGSERIAL PRIMARY KEY,
    tx_signature        VARCHAR(88) UNIQUE NOT NULL,
    market_id           BIGINT NOT NULL REFERENCES markets(market_id),
    user_wallet         VARCHAR(44) NOT NULL,
    outcome             VARCHAR(3) NOT NULL,            -- 'yes' or 'no'
    amount              BIGINT NOT NULL,                -- USDC amount (6 decimals)
    shares              BIGINT NOT NULL,
    fee_paid            BIGINT NOT NULL,
    yes_price_at_bet    DECIMAL(10, 6),
    no_price_at_bet     DECIMAL(10, 6),
    slot                BIGINT NOT NULL,
    timestamp           TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bets_market ON bets(market_id);
CREATE INDEX idx_bets_user ON bets(user_wallet);
CREATE INDEX idx_bets_timestamp ON bets(timestamp DESC);

-- Price history for charts
CREATE TABLE price_snapshots (
    id                  BIGSERIAL PRIMARY KEY,
    market_id           BIGINT NOT NULL REFERENCES markets(market_id),
    yes_price           DECIMAL(10, 6) NOT NULL,
    no_price            DECIMAL(10, 6) NOT NULL,
    total_collateral    BIGINT NOT NULL,
    slot                BIGINT NOT NULL,
    timestamp           TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_snapshots_market_ts ON price_snapshots(market_id, timestamp DESC);

-- User profiles (optional, off-chain metadata)
CREATE TABLE users (
    wallet              VARCHAR(44) PRIMARY KEY,
    username            VARCHAR(32) UNIQUE,
    avatar_url          VARCHAR(256),
    total_bets          INTEGER DEFAULT 0,
    total_volume        BIGINT DEFAULT 0,
    total_pnl           BIGINT DEFAULT 0,
    win_rate            DECIMAL(5, 2) DEFAULT 0,
    rank_score          BIGINT DEFAULT 0,
    first_seen          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
