CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_pubkey VARCHAR(44) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  total_contributions INT DEFAULT 0,
  approved_contributions INT DEFAULT 0,
  reviews_completed INT DEFAULT 0,
  total_earned BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contributions (
  id SERIAL PRIMARY KEY,
  planet_name VARCHAR(100) NOT NULL,
  data_field VARCHAR(50) NOT NULL,
  value TEXT NOT NULL,
  source_doi VARCHAR(255) NOT NULL,
  methodology TEXT,
  confidence DECIMAL(3,2),
  contributor_wallet VARCHAR(44) NOT NULL,
  data_hash VARCHAR(64),
  status VARCHAR(20) DEFAULT 'pending_review',
  reward_amount BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  contribution_id INT REFERENCES contributions(id),
  reviewer_wallet VARCHAR(44) NOT NULL,
  approved BOOLEAN NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contributions_planet ON contributions(planet_name);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_contributions_wallet ON contributions(contributor_wallet);
CREATE INDEX idx_reviews_contribution ON reviews(contribution_id);
