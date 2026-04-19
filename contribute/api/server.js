import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3001;

let pool;
let useMemory = false;

try {
  pool = new Pool({
    connectionString:
      process.env.DATABASE_URL || "postgres://localhost:5432/astrodex",
  });
} catch {
  useMemory = true;
}

// In-memory fallback store (used when Postgres is unavailable)
const memStore = {
  users: [],
  contributions: [],
  reviews: [],
  nextUserId: 1,
  nextContribId: 1,
  nextReviewId: 1,
};

async function dbAvailable() {
  if (useMemory) return false;
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    useMemory = true;
    return false;
  }
}

// ---------------------------------------------------------------------------
// Hardcoded exoplanet catalogue (MVP seed data)
// ---------------------------------------------------------------------------

const PLANETS = {
  "TRAPPIST-1 b": {
    name: "TRAPPIST-1 b",
    distance_ly: 40.66,
    star_type: "M8V",
    discovery_year: 2016,
    discovery_method: "Transit",
    orbital_period_days: 1.51,
    semi_major_axis_au: 0.01154,
    eccentricity: 0.006,
    mass_earth: 1.374,
    radius_earth: 1.116,
    density_g_cm3: 5.75,
    temp_eq_k: 400,
    atmosphere_composition: null,
    geometric_albedo: null,
    surface_gravity: null,
    magnetic_field_strength: null,
    tidal_lock_status: null,
    spectral_features: null,
  },

  "Kepler-442b": {
    name: "Kepler-442b",
    distance_ly: 1206,
    star_type: "K5V",
    discovery_year: 2015,
    discovery_method: "Transit",
    orbital_period_days: 112.3,
    semi_major_axis_au: 0.409,
    eccentricity: 0.04,
    mass_earth: 2.36,
    radius_earth: 1.34,
    density_g_cm3: null,
    temp_eq_k: 233,
    atmosphere_composition: null,
    geometric_albedo: null,
    surface_gravity: null,
    magnetic_field_strength: null,
    tidal_lock_status: null,
    spectral_features: null,
  },

  "Proxima Centauri b": {
    name: "Proxima Centauri b",
    distance_ly: 4.24,
    star_type: "M5.5Ve",
    discovery_year: 2016,
    discovery_method: "Radial Velocity",
    orbital_period_days: 11.186,
    semi_major_axis_au: 0.0485,
    eccentricity: 0.02,
    mass_earth: 1.07,
    radius_earth: null,
    density_g_cm3: null,
    temp_eq_k: 234,
    atmosphere_composition: null,
    geometric_albedo: null,
    surface_gravity: null,
    magnetic_field_strength: null,
    tidal_lock_status: "Likely tidally locked",
    spectral_features: null,
  },

  "WASP-121 b": {
    name: "WASP-121 b",
    distance_ly: 881,
    star_type: "F6V",
    discovery_year: 2015,
    discovery_method: "Transit",
    orbital_period_days: 1.2749,
    semi_major_axis_au: 0.02544,
    eccentricity: 0.0,
    mass_earth: 372.0,
    radius_earth: 19.2,
    density_g_cm3: 0.183,
    temp_eq_k: 2358,
    atmosphere_composition: "H2O, TiO, VO detected via transmission spectroscopy",
    geometric_albedo: null,
    surface_gravity: 9.36,
    magnetic_field_strength: null,
    tidal_lock_status: "Tidally locked",
    spectral_features: "Fe I and Fe II emission in dayside spectrum",
  },

  "K2-18 b": {
    name: "K2-18 b",
    distance_ly: 124,
    star_type: "M2.5V",
    discovery_year: 2015,
    discovery_method: "Transit",
    orbital_period_days: 32.94,
    semi_major_axis_au: 0.1429,
    eccentricity: null,
    mass_earth: 8.63,
    radius_earth: 2.61,
    density_g_cm3: 2.67,
    temp_eq_k: 255,
    atmosphere_composition: "CO2, CH4 detected (JWST 2023); possible DMS",
    geometric_albedo: null,
    surface_gravity: null,
    magnetic_field_strength: null,
    tidal_lock_status: null,
    spectral_features: null,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the list of field names whose value is null for a planet object. */
function getMissingFields(planet) {
  return Object.entries(planet)
    .filter(([key, val]) => val === null && key !== "name")
    .map(([key]) => key);
}

/** Normalise a planet name for case-insensitive lookup. */
function normaliseName(raw) {
  return raw.trim().toLowerCase();
}

function lookupPlanet(name) {
  const key = normaliseName(name);
  return Object.values(PLANETS).find(
    (p) => normaliseName(p.name) === key,
  );
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json());

// ---- Health ---------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ---- GET /api/planet/:name ------------------------------------------------

app.get("/api/planet/:name", async (req, res) => {
  try {
    const planet = lookupPlanet(req.params.name);
    if (!planet) {
      return res.status(404).json({ error: "Planet not found in catalogue" });
    }

    let communityContributions = [];
    if (await dbAvailable()) {
      try {
        const result = await pool.query(
          `SELECT c.id, c.data_field, c.value, c.source_doi, c.methodology,
                  c.confidence, c.status, c.created_at, u.wallet_pubkey
           FROM contributions c
           JOIN users u ON u.id = c.user_id
           WHERE c.planet_name = $1
           ORDER BY c.created_at DESC`,
          [planet.name],
        );
        communityContributions = result.rows;
      } catch { /* empty */ }
    } else {
      communityContributions = memStore.contributions
        .filter(c => c.planet_name.toLowerCase() === planet.name.toLowerCase())
        .reverse();
    }

    const knownData = Object.fromEntries(
      Object.entries(planet).filter(
        ([key, val]) => val !== null && key !== "name",
      ),
    );

    return res.json({
      planet_name: planet.name,
      known_data: knownData,
      missing_fields: getMissingFields(planet),
      community_contributions: communityContributions,
    });
  } catch (err) {
    console.error("GET /api/planet/:name error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---- POST /api/contributions ----------------------------------------------

app.post("/api/contributions", async (req, res) => {
  try {
    const {
      planet_name,
      data_field,
      value,
      source_doi,
      methodology,
      confidence,
      wallet_pubkey,
    } = req.body;

    // Basic validation
    if (!planet_name || !data_field || value === undefined || !wallet_pubkey) {
      return res.status(400).json({
        error:
          "Missing required fields: planet_name, data_field, value, wallet_pubkey",
      });
    }

    if (await dbAvailable()) {
      const userResult = await pool.query(
        `INSERT INTO users (wallet_pubkey)
         VALUES ($1)
         ON CONFLICT (wallet_pubkey) DO UPDATE SET wallet_pubkey = EXCLUDED.wallet_pubkey
         RETURNING id`,
        [wallet_pubkey],
      );
      const userId = userResult.rows[0].id;

      const contribResult = await pool.query(
        `INSERT INTO contributions
           (user_id, planet_name, data_field, value, source_doi, methodology, confidence, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_review')
         RETURNING id, status`,
        [userId, planet_name, data_field, value, source_doi, methodology, confidence],
      );

      return res.status(201).json({
        id: contribResult.rows[0].id,
        status: contribResult.rows[0].status,
      });
    }

    // In-memory fallback
    let user = memStore.users.find(u => u.wallet_pubkey === wallet_pubkey);
    if (!user) {
      user = { id: memStore.nextUserId++, wallet_pubkey, display_name: null, total_contributions: 0, approved_contributions: 0, total_earned: 0 };
      memStore.users.push(user);
    }
    user.total_contributions++;

    const contrib = {
      id: memStore.nextContribId++,
      planet_name, data_field, value, source_doi, methodology, confidence,
      contributor_wallet: wallet_pubkey,
      status: 'pending_review',
      created_at: new Date().toISOString(),
    };
    memStore.contributions.push(contrib);

    return res.status(201).json({ id: contrib.id, status: contrib.status });
  } catch (err) {
    console.error("POST /api/contributions error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---- GET /api/contributions -----------------------------------------------

app.get("/api/contributions", async (req, res) => {
  try {
    const { planet, status } = req.query;

    let query = `
      SELECT c.id, c.planet_name, c.data_field, c.value, c.source_doi,
             c.methodology, c.confidence, c.status, c.created_at,
             u.wallet_pubkey
      FROM contributions c
      JOIN users u ON u.id = c.user_id
      WHERE 1=1`;
    const params = [];

    if (planet) {
      params.push(planet);
      query += ` AND c.planet_name = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND c.status = $${params.length}`;
    }

    query += " ORDER BY c.created_at DESC";

    const result = await pool.query(query, params);
    return res.json({ contributions: result.rows });
  } catch (err) {
    console.error("GET /api/contributions error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---- POST /api/reviews ----------------------------------------------------

app.post("/api/reviews", async (req, res) => {
  try {
    const { contribution_id, approved, reviewer_wallet, notes } = req.body;

    if (
      contribution_id === undefined ||
      approved === undefined ||
      !reviewer_wallet
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: contribution_id, approved, reviewer_wallet",
      });
    }

    if (await dbAvailable()) {
      await pool.query(
        `INSERT INTO users (wallet_pubkey) VALUES ($1) ON CONFLICT (wallet_pubkey) DO NOTHING`,
        [reviewer_wallet],
      );
      const reviewerResult = await pool.query("SELECT id FROM users WHERE wallet_pubkey = $1", [reviewer_wallet]);
      const reviewerId = reviewerResult.rows[0].id;

      const contribOwner = await pool.query(
        `SELECT u.wallet_pubkey FROM contributions c JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
        [contribution_id],
      );
      if (contribOwner.rows.length === 0) return res.status(404).json({ error: "Contribution not found" });
      if (contribOwner.rows[0].wallet_pubkey === reviewer_wallet) return res.status(403).json({ error: "Cannot review your own contribution" });

      await pool.query(`INSERT INTO reviews (contribution_id, reviewer_id, approved, notes) VALUES ($1, $2, $3, $4)`, [contribution_id, reviewerId, approved, notes]);

      const approvalCount = await pool.query(`SELECT COUNT(*) AS cnt FROM reviews WHERE contribution_id = $1 AND approved = true`, [contribution_id]);
      const rejectionCount = await pool.query(`SELECT COUNT(*) AS cnt FROM reviews WHERE contribution_id = $1 AND approved = false`, [contribution_id]);

      let newStatus = "pending_review";
      if (parseInt(approvalCount.rows[0].cnt, 10) >= 2) newStatus = "approved";
      else if (parseInt(rejectionCount.rows[0].cnt, 10) >= 2) newStatus = "rejected";

      if (newStatus !== "pending_review") {
        await pool.query("UPDATE contributions SET status = $1 WHERE id = $2", [newStatus, contribution_id]);
        if (newStatus === "approved") {
          await pool.query(`UPDATE users SET approved_contributions = approved_contributions + 1 WHERE id = (SELECT user_id FROM contributions WHERE id = $1)`, [contribution_id]);
        }
      }
      return res.json({ contribution_id, status: newStatus });
    }

    // In-memory fallback
    const contrib = memStore.contributions.find(c => c.id === contribution_id);
    if (!contrib) return res.status(404).json({ error: "Contribution not found" });
    if (contrib.contributor_wallet === reviewer_wallet) return res.status(403).json({ error: "Cannot review your own contribution" });

    memStore.reviews.push({ id: memStore.nextReviewId++, contribution_id, reviewer_wallet, approved, notes, created_at: new Date().toISOString() });

    const approvals = memStore.reviews.filter(r => r.contribution_id === contribution_id && r.approved).length;
    const rejections = memStore.reviews.filter(r => r.contribution_id === contribution_id && !r.approved).length;

    let newStatus = "pending_review";
    if (approvals >= 2) newStatus = "approved";
    else if (rejections >= 2) newStatus = "rejected";

    if (newStatus !== "pending_review") {
      contrib.status = newStatus;
      if (newStatus === "approved") {
        const user = memStore.users.find(u => u.wallet_pubkey === contrib.contributor_wallet);
        if (user) { user.approved_contributions++; user.total_earned += 10; }
      }
    }

    return res.json({ contribution_id, status: newStatus });
  } catch (err) {
    console.error("POST /api/reviews error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---- GET /api/leaderboard -------------------------------------------------

app.get("/api/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    if (await dbAvailable()) {
      const result = await pool.query(
        `SELECT wallet_pubkey, display_name, approved_contributions,
                reputation_score, created_at
         FROM users
         WHERE approved_contributions > 0
         ORDER BY approved_contributions DESC, reputation_score DESC
         LIMIT $1`,
        [limit],
      );
      return res.json(result.rows);
    }

    const leaders = [...memStore.users]
      .sort((a, b) => b.total_contributions - a.total_contributions)
      .slice(0, limit);
    return res.json(leaders);
  } catch (err) {
    console.error("GET /api/leaderboard error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---- GET /api/user/:wallet ------------------------------------------------

app.get("/api/user/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;

    const userResult = await pool.query(
      `SELECT id, wallet_pubkey, display_name, approved_contributions,
              reputation_score, created_at
       FROM users
       WHERE wallet_pubkey = $1`,
      [wallet],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    const contribResult = await pool.query(
      `SELECT id, planet_name, data_field, value, source_doi,
              methodology, confidence, status, created_at
       FROM contributions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.id],
    );

    return res.json({
      wallet_pubkey: user.wallet_pubkey,
      display_name: user.display_name,
      approved_contributions: user.approved_contributions,
      reputation_score: user.reputation_score,
      created_at: user.created_at,
      contributions: contribResult.rows,
    });
  } catch (err) {
    console.error("GET /api/user/:wallet error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Astrodex API listening on http://localhost:${PORT}`);
});
