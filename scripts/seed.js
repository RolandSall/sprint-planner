#!/usr/bin/env node
/**
 * Seed script — creates "Platform Team / Q1 2026" demo data if it doesn't exist.
 * Idempotent: skips insertion if the team already has a PI named "Platform PI Q1 2026".
 * Run: node scripts/seed.js
 * Requires: DATABASE_URL env var (same as the API).
 */
'use strict';
const { Client } = require('pg');
const crypto = require('crypto');

const uuid = () => crypto.randomUUID();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // ── Guard: skip if already seeded ──────────────────────────────────────
    const existing = await client.query(
      `SELECT p.id FROM pis p
       JOIN teams t ON t.id = p.team_id
       WHERE t.name = 'Platform Team' AND p.name = 'Platform PI Q1 2026'
       LIMIT 1`
    );
    if (existing.rows.length > 0) {
      console.log('[seed] Already seeded — skipping.');
      console.log(`PI_ID=${existing.rows[0].id}`);
      return;
    }

    console.log('[seed] Seeding demo data…');

    // ── Team ──────────────────────────────────────────────────────────────
    const teamId = uuid();
    await client.query(
      `INSERT INTO teams (id, name) VALUES ($1, $2)`,
      [teamId, 'Platform Team']
    );

    // ── PI ────────────────────────────────────────────────────────────────
    const piId = uuid();
    await client.query(
      `INSERT INTO pis (id, team_id, name, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [piId, teamId, 'Platform PI Q1 2026', '2026-03-04', '2026-05-25']
    );

    // ── Releases ──────────────────────────────────────────────────────────
    const rel1Id = uuid();
    const rel2Id = uuid();
    await client.query(
      `INSERT INTO pi_releases (id, pi_id, name, date) VALUES ($1,$2,$3,$4),($5,$6,$7,$8)`,
      [rel1Id, piId, 'Release 1', '2026-03-30',
       rel2Id, piId, 'Release 2', '2026-04-27']
    );

    // ── Sprints (6 × 2-week, 20 SP capacity) ─────────────────────────────
    const sprints = [
      { name: 'S1', order: 1, start: '2026-03-04', end: '2026-03-17' },
      { name: 'S2', order: 2, start: '2026-03-18', end: '2026-03-30' },
      { name: 'S3', order: 3, start: '2026-03-31', end: '2026-04-13' },
      { name: 'S4', order: 4, start: '2026-04-14', end: '2026-04-27' },
      { name: 'S5', order: 5, start: '2026-04-28', end: '2026-05-11' },
      { name: 'S6', order: 6, start: '2026-05-12', end: '2026-05-25' },
    ];
    const sprintIds = {};
    for (const s of sprints) {
      sprintIds[s.name] = uuid();
      await client.query(
        `INSERT INTO sprints (id, pi_id, name, "order", capacity, start_date, end_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [sprintIds[s.name], piId, s.name, s.order, 20, s.start, s.end]
      );
    }

    console.log('[seed] Done! Team: Platform Team, PI: Platform PI Q1 2026');
    console.log(`[seed]   6 sprints, 2 releases`);
    console.log(`PI_ID=${piId}`);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('[seed] ERROR:', err.message);
  process.exit(1);
});
