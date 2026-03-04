#!/usr/bin/env node
// Idempotent seed script — creates team, PI, sprints, and optional releases.
// Usage: DATABASE_URL=... node scripts/seed.js [--scenario=default|easy|medium|complex]
//
// Outputs PI_ID=<uuid> for downstream use (e.g., CSV import in dev.sh).

const { Client } = require('pg');
const crypto = require('crypto');

const uuid = () => crypto.randomUUID();

const SCENARIO = (process.argv.find(a => a.startsWith('--scenario=')) || '--scenario=default')
  .split('=')[1];

const TEAM_NAME = 'Platform Team';
const PI_NAME = `Platform PI Q1 2026`;

// Scenario-specific configuration
const SCENARIOS = {
  default: {
    sprintCount: 6,
    sprintCapacity: 20,
    releases: [],
  },
  easy: {
    sprintCount: 4,
    sprintCapacity: 10,
    releases: [{ name: 'Release 1.0', sprintOrder: 3 }],
  },
  medium: {
    sprintCount: 5,
    sprintCapacity: 15,
    releases: [
      { name: 'Release 1.0', sprintOrder: 3 },
      { name: 'Release 2.0', sprintOrder: 5 },
    ],
  },
  complex: {
    sprintCount: 6,
    sprintCapacity: 20,
    releases: [
      { name: 'Alpha Release', sprintOrder: 2 },
      { name: 'Beta Release', sprintOrder: 4 },
      { name: 'GA Release', sprintOrder: 6 },
    ],
  },
};

async function main() {
  const config = SCENARIOS[SCENARIO];
  if (!config) {
    console.error(`[seed] Unknown scenario: ${SCENARIO}. Use: default, easy, medium, complex`);
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // --- Team (idempotent) ---
    let teamRow = (await client.query(`SELECT id FROM teams WHERE name = $1`, [TEAM_NAME])).rows[0];
    if (!teamRow) {
      const teamId = uuid();
      await client.query(`INSERT INTO teams (id, name) VALUES ($1, $2)`, [teamId, TEAM_NAME]);
      teamRow = { id: teamId };
      console.log(`[seed] Created team: ${TEAM_NAME} (${teamId})`);
    } else {
      console.log(`[seed] Team exists: ${TEAM_NAME} (${teamRow.id})`);
    }

    // --- PI (idempotent) ---
    let piRow = (await client.query(
      `SELECT id FROM pis WHERE team_id = $1 AND name = $2`, [teamRow.id, PI_NAME]
    )).rows[0];
    if (!piRow) {
      const piId = uuid();
      await client.query(
        `INSERT INTO pis (id, team_id, name, start_date, end_date) VALUES ($1, $2, $3, $4, $5)`,
        [piId, teamRow.id, PI_NAME, '2026-01-05', '2026-04-10'],
      );
      piRow = { id: piId };
      console.log(`[seed] Created PI: ${PI_NAME} (${piId})`);
    } else {
      console.log(`[seed] PI exists: ${PI_NAME} (${piRow.id})`);
    }
    const piId = piRow.id;

    // --- Sprints (idempotent) ---
    const existingSprints = (await client.query(
      `SELECT id, "order" FROM sprints WHERE pi_id = $1`, [piId]
    )).rows;

    const sprintIds = {};
    const startDate = new Date('2026-01-05');

    for (let i = 1; i <= config.sprintCount; i++) {
      const existing = existingSprints.find(s => s.order === i);
      if (existing) {
        sprintIds[i] = existing.id;
        continue;
      }
      const sid = uuid();
      const sStart = new Date(startDate);
      sStart.setDate(sStart.getDate() + (i - 1) * 14);
      const sEnd = new Date(sStart);
      sEnd.setDate(sEnd.getDate() + 13);

      await client.query(
        `INSERT INTO sprints (id, pi_id, name, "order", capacity, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sid, piId, `S${i}`, i, config.sprintCapacity, sStart.toISOString().slice(0, 10), sEnd.toISOString().slice(0, 10)],
      );
      sprintIds[i] = sid;
      console.log(`[seed] Created sprint S${i} (cap=${config.sprintCapacity}, ${sStart.toISOString().slice(0, 10)} — ${sEnd.toISOString().slice(0, 10)})`);
    }

    // --- Releases (idempotent) ---
    for (const rel of config.releases) {
      const sprintId = sprintIds[rel.sprintOrder];
      if (!sprintId) continue;

      const existingRel = (await client.query(
        `SELECT id FROM pi_releases WHERE pi_id = $1 AND name = $2`, [piId, rel.name]
      )).rows[0];

      if (!existingRel) {
        const relId = uuid();
        // Release date = end of the target sprint
        const sprintEnd = new Date(startDate);
        sprintEnd.setDate(sprintEnd.getDate() + (rel.sprintOrder - 1) * 14 + 13);
        await client.query(
          `INSERT INTO pi_releases (id, pi_id, name, date, sprint_id) VALUES ($1, $2, $3, $4, $5)`,
          [relId, piId, rel.name, sprintEnd.toISOString().slice(0, 10), sprintId],
        );
        console.log(`[seed] Created release: ${rel.name} → S${rel.sprintOrder}`);
      }
    }

    console.log(`PI_ID=${piId}`);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(`[seed] ERROR: ${err.message}`);
  process.exit(1);
});
