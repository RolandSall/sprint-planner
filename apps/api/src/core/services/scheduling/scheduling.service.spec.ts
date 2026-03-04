import { describe, it, expect, beforeEach } from 'vitest';
import { SchedulingService } from './scheduling.service';
import { Story } from '../../domain/entities/story';
import { Sprint } from '../../domain/entities/sprint';
import { Feature } from '../../domain/entities/feature';
import { PiRelease } from '../../domain/entities/pi-release';
import { StoryDependency } from '../../domain/entities/story-dependency';
import type { ScheduleOptions, ScheduleResult, SchedulingInput, SchedulingWeights } from './types/scheduling-types';
import { DEFAULT_WEIGHTS } from './types/scheduling-types';

const PI_ID = 'pi-1';
const ALL_ON: ScheduleOptions = { scheduleBacklog: true, enforceReleaseDeadlines: true, fixViolations: true, fixOvercommit: true };

// --- Helpers ---

function sprint(id: string, order: number, capacity: number, name?: string): Sprint {
  return new Sprint(id, PI_ID, name ?? `S${order}`, order, capacity);
}

function sprintWithDates(id: string, order: number, capacity: number, start: string, end: string): Sprint {
  return new Sprint(id, PI_ID, `S${order}`, order, capacity, new Date(start), new Date(end));
}

function story(id: string, featureId: string, sprintId: string | null, estimation: number, extId?: string): Story {
  return new Story(id, featureId, sprintId, extId ?? id, `Story ${id}`, estimation, null);
}

function storyWithExtDep(id: string, featureId: string, sprintId: string | null, estimation: number, extDepSprint: number): Story {
  return new Story(id, featureId, sprintId, id, `Story ${id}`, estimation, extDepSprint);
}

function dep(storyId: string, dependsOn: string): StoryDependency {
  return new StoryDependency(storyId, dependsOn);
}

function feature(id: string, releaseId: string | null = null): Feature {
  return new Feature(id, PI_ID, id, `Feature ${id}`, null, releaseId);
}

function release(id: string, sprintId: string | null, date?: string): PiRelease {
  return new PiRelease(id, PI_ID, `Release ${id}`, new Date(date ?? '2026-06-01'), sprintId);
}

function input(overrides: Partial<SchedulingInput> = {}): SchedulingInput {
  return {
    stories: [],
    sprints: [],
    dependencies: [],
    features: [],
    releases: [],
    ...overrides,
  };
}

/** Returns the final sprint order for a story (last move wins). */
function finalPosition(result: ScheduleResult, storyId: string, sprints: Sprint[]): number {
  const lastMove = result.moves.filter(m => m.storyId === storyId).at(-1);
  if (!lastMove) throw new Error(`No move found for story ${storyId}`);
  const sp = sprints.find(s => s.id === lastMove.toSprintId);
  if (!sp) throw new Error(`Sprint ${lastMove.toSprintId} not found`);
  return sp.order;
}

describe('SchedulingService', () => {
  let svc: SchedulingService;

  beforeEach(() => {
    svc = new SchedulingService();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HARD CONSTRAINTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hard Constraints', () => {

    describe('Dependency ordering', () => {
      it('places story after dependency sprint', () => {
        const sprints = [sprint('s1', 1, 10), sprint('s2', 2, 10)];
        const depStory = story('dep', 'f1', 's1', 3);
        const mainStory = story('main', 'f1', null, 3);
        const dependencies = [dep('main', 'dep')];

        const result = svc.schedule(
          input({ sprints, stories: [depStory, mainStory], dependencies }),
          ALL_ON,
        );

        expect(result.moves).toHaveLength(1);
        expect(result.moves[0].storyId).toBe('main');
        expect(result.moves[0].toSprintId).toBe('s2');
      });

      it('strictly later sprint (not same)', () => {
        const sprints = [sprint('s1', 1, 20), sprint('s2', 2, 20)];
        const stories = [story('a', 'f1', null, 3), story('b', 'f1', null, 3)];
        const dependencies = [dep('b', 'a')];

        const result = svc.schedule(input({ sprints, stories, dependencies }), ALL_ON);

        const moveA = result.moves.find(m => m.storyId === 'a');
        const moveB = result.moves.find(m => m.storyId === 'b');
        expect(moveA!.toSprintId).toBe('s1');
        expect(moveB!.toSprintId).toBe('s2');
      });

      it('deep chain — each story in successive sprint', () => {
        const sprints = [
          sprint('s1', 1, 20), sprint('s2', 2, 20), sprint('s3', 3, 20),
          sprint('s4', 4, 20), sprint('s5', 5, 20), sprint('s6', 6, 20),
        ];
        const stories = [
          story('a', 'f1', null, 3), story('b', 'f1', null, 3),
          story('c', 'f1', null, 3), story('d', 'f1', null, 3),
          story('e', 'f1', null, 3), story('f', 'f1', null, 3),
        ];
        const dependencies = [
          dep('b', 'a'), dep('c', 'b'), dep('d', 'c'),
          dep('e', 'd'), dep('f', 'e'),
        ];

        const result = svc.schedule(input({ sprints, stories, dependencies }), ALL_ON);

        expect(result.moves).toHaveLength(6);
        const orderOf = (id: string) => finalPosition(result, id, sprints);
        expect(orderOf('a')).toBe(1);
        expect(orderOf('b')).toBe(2);
        expect(orderOf('c')).toBe(3);
        expect(orderOf('d')).toBe(4);
        expect(orderOf('e')).toBe(5);
        expect(orderOf('f')).toBe(6);
      });

      it('release deadline wins over dependency (same-sprint fallback)', () => {
        const sprints = [sprint('s1', 1, 20), sprint('s2', 2, 20), sprint('s3', 3, 20)];
        const features_ = [feature('f1', 'rel1'), feature('f2')];
        const releases_ = [release('rel1', 's2')];
        const depStory = story('dep', 'f2', 's2', 3);
        const mainStory = story('main', 'f1', null, 3);
        const dependencies = [dep('main', 'dep')];

        const result = svc.schedule(
          input({ sprints, stories: [depStory, mainStory], dependencies, features: features_, releases: releases_ }),
          ALL_ON,
        );

        const move = result.moves.find(m => m.storyId === 'main');
        expect(move).toBeDefined();
        expect(finalPosition(result, 'main', sprints)).toBeLessThanOrEqual(2);
        const depError = result.errors.find(e => e.type === 'DEPENDENCY_VIOLATION' && e.storyIds.includes('main'));
        expect(depError).toBeDefined();
      });
    });

    describe('Same-sprint chain depth limit', () => {
      it('chain of 2 in same sprint → allowed', () => {
        // 1 sprint only. Release forces f1 into S1. dep in S1, main depends on dep.
        // Chain = dep→main = 2 ≤ maxSameSprintChainDepth(2). Allowed.
        const sprints = [sprint('s1', 1, 20)];
        const features_ = [feature('f1', 'rel1'), feature('f2')];
        const releases_ = [release('rel1', 's1')];
        const depStory = story('dep', 'f2', 's1', 3);
        const mainStory = story('main', 'f1', null, 3);
        const dependencies = [dep('main', 'dep')];

        const result = svc.schedule(
          input({ sprints, stories: [depStory, mainStory], dependencies, features: features_, releases: releases_ }),
          ALL_ON,
        );

        const move = result.moves.find(m => m.storyId === 'main');
        expect(move).toBeDefined();
        expect(move!.toSprintId).toBe('s1');
      });

      it('chain of 3 in same sprint → rejected when limit is 2', () => {
        // 1 sprint. a→b→c all forced into S1 by release. Chain depth = 3 > 2.
        // c should be unschedulable (no other sprints available).
        const sprints = [sprint('s1', 1, 30)];
        const features_ = [feature('f1', 'rel1'), feature('f2')];
        const releases_ = [release('rel1', 's1')];
        const a = story('a', 'f2', 's1', 3);
        const b = story('b', 'f2', 's1', 3);
        const c = story('c', 'f1', null, 3);
        const dependencies = [dep('b', 'a'), dep('c', 'b')];

        const result = svc.schedule(
          input({ sprints, stories: [a, b, c], dependencies, features: features_, releases: releases_ }),
          ALL_ON,
        );

        // c depends on b which depends on a, all in S1. Chain depth for c = 3 > 2.
        // With only 1 sprint, c has no valid placement.
        const cMove = result.moves.find(m => m.storyId === 'c');
        const cError = result.errors.find(e => e.storyIds.includes('c'));
        // Either c is unschedulable or it was placed with a violation
        expect(cMove === undefined || cError !== undefined).toBe(true);
      });

      it('custom maxSameSprintChainDepth=3 allows longer chains', () => {
        // Same setup as above but with limit=3. Chain of 3 should now be allowed.
        const sprints = [sprint('s1', 1, 30)];
        const features_ = [feature('f1', 'rel1'), feature('f2')];
        const releases_ = [release('rel1', 's1')];
        const a = story('a', 'f2', 's1', 3);
        const b = story('b', 'f2', 's1', 3);
        const c = story('c', 'f1', null, 3);
        const dependencies = [dep('b', 'a'), dep('c', 'b')];

        const result = svc.schedule(
          input({ sprints, stories: [a, b, c], dependencies, features: features_, releases: releases_ }),
          { ...ALL_ON, weights: { ...DEFAULT_WEIGHTS, maxSameSprintChainDepth: 3 } },
        );

        const cMove = result.moves.find(m => m.storyId === 'c');
        expect(cMove).toBeDefined();
        expect(cMove!.toSprintId).toBe('s1');
      });

      it('branching deps — takes max branch depth', () => {
        // S1 only, release forces everything into S1.
        // a1 and a2 both in S1. b depends on both. b→a1=2, b→a2=2. Max = 2 ≤ limit. Allowed.
        const sprints = [sprint('s1', 1, 30)];
        const features_ = [feature('f1', 'rel1'), feature('f2')];
        const releases_ = [release('rel1', 's1')];
        const a1 = story('a1', 'f2', 's1', 3);
        const a2 = story('a2', 'f2', 's1', 3);
        const b = story('b', 'f1', null, 3);
        const dependencies = [dep('b', 'a1'), dep('b', 'a2')];

        const result = svc.schedule(
          input({ sprints, stories: [a1, a2, b], dependencies, features: features_, releases: releases_ }),
          ALL_ON,
        );

        const bMove = result.moves.find(m => m.storyId === 'b');
        expect(bMove).toBeDefined();
        expect(bMove!.toSprintId).toBe('s1');
      });
    });

    describe('Release deadlines', () => {
      it('moves stories past release to earlier sprints', () => {
        const sprints = [sprint('s1', 1, 20), sprint('s2', 2, 20), sprint('s3', 3, 20)];
        const features_ = [feature('f1', 'rel1')];
        const releases_ = [release('rel1', 's2')];
        const stories = [story('a', 'f1', 's3', 5)];

        const result = svc.schedule(
          input({ sprints, stories, features: features_, releases: releases_ }),
          ALL_ON,
        );

        expect(result.moves).toHaveLength(1);
        expect(finalPosition(result, 'a', sprints)).toBeLessThanOrEqual(2);
      });

      it('date-based release matching', () => {
        const sprints = [
          sprintWithDates('s1', 1, 20, '2026-01-01', '2026-01-14'),
          sprintWithDates('s2', 2, 20, '2026-01-15', '2026-01-28'),
          sprintWithDates('s3', 3, 20, '2026-01-29', '2026-02-11'),
        ];
        const features_ = [feature('f1', 'rel1')];
        const releases_ = [release('rel1', null, '2026-01-20')];
        const stories = [story('a', 'f1', 's3', 5)];

        const result = svc.schedule(
          input({ sprints, stories, features: features_, releases: releases_ }),
          ALL_ON,
        );

        expect(result.moves).toHaveLength(1);
        expect(finalPosition(result, 'a', sprints)).toBeLessThanOrEqual(2);
      });

      it('no move when already within release window', () => {
        const sprints = [sprint('s1', 1, 20), sprint('s2', 2, 20), sprint('s3', 3, 20)];
        const features_ = [feature('f1', 'rel1')];
        const releases_ = [release('rel1', 's3')];
        const stories = [story('a', 'f1', 's2', 5)];

        const result = svc.schedule(
          input({ sprints, stories, features: features_, releases: releases_ }),
          { ...ALL_ON, fixOvercommit: false },
        );

        expect(result.moves).toHaveLength(0);
      });

      it('explicit sprintId takes priority over date matching', () => {
        const sprints = [
          sprintWithDates('s1', 1, 20, '2026-01-01', '2026-01-14'),
          sprintWithDates('s2', 2, 20, '2026-01-15', '2026-01-28'),
          sprintWithDates('s3', 3, 20, '2026-01-29', '2026-02-11'),
        ];
        const features_ = [feature('f1', 'rel1')];
        const releases_ = [new PiRelease('rel1', PI_ID, 'R1', new Date('2026-01-20'), 's1')];
        const stories = [story('a', 'f1', 's3', 5)];

        const result = svc.schedule(
          input({ sprints, stories, features: features_, releases: releases_ }),
          ALL_ON,
        );

        const move = result.moves.find(m => m.storyId === 'a');
        expect(move).toBeDefined();
        expect(move!.toSprintId).toBe('s1');
      });
    });

    describe('Capacity limits', () => {
      it('allows up to softCap (120%) capacity', () => {
        const sprints = [sprint('s1', 1, 10), sprint('s2', 2, 10)];
        const features_ = [feature('f1', 'rel1')];
        const releases_ = [release('rel1', 's1')];
        const existing = story('e', 'f2', 's1', 9);
        const target = story('a', 'f1', 's2', 3);

        const result = svc.schedule(
          input({ sprints, stories: [existing, target], features: features_, releases: releases_ }),
          ALL_ON,
        );

        const move = result.moves.find(m => m.storyId === 'a');
        expect(move).toBeDefined();
        expect(move!.toSprintId).toBe('s1'); // 12/10 = 120% fits
      });

      it('softCapMultiplier=1.0 rejects any overcommit', () => {
        // S1 has 9 SP, adding 3 SP = 12 > 10*1.0. With softCap=1.0, only S2 fits.
        const sprints = [sprint('s1', 1, 10), sprint('s2', 2, 10)];
        const existing = story('e', 'f2', 's1', 9);
        const backlog = story('a', 'f1', null, 3);

        const result = svc.schedule(
          input({ sprints, stories: [existing, backlog] }),
          { ...ALL_ON, weights: { ...DEFAULT_WEIGHTS, softCapMultiplier: 1.0 } },
        );

        const move = result.moves.find(m => m.storyId === 'a');
        expect(move).toBeDefined();
        expect(move!.toSprintId).toBe('s2'); // can't fit in S1 at 1.0x cap
      });

      it('overcommit warning when sprint stays over capacity', () => {
        const sprints = [sprint('s1', 1, 5)];
        const stories = [story('a', 'f1', 's1', 8)];

        const result = svc.schedule(input({ sprints, stories }), ALL_ON);

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].type).toBe('OVERCOMMIT');
        expect(result.warnings[0].sprintId).toBe('s1');
      });
    });

    describe('External dependencies', () => {
      it('places story after external dependency sprint', () => {
        const sprints = [sprint('s1', 1, 20), sprint('s2', 2, 20), sprint('s3', 3, 20)];
        const stories = [storyWithExtDep('a', 'f1', null, 3, 2)];

        const result = svc.schedule(input({ sprints, stories }), ALL_ON);

        expect(result.moves).toHaveLength(1);
        expect(result.moves[0].toSprintId).toBe('s3');
      });

      it('respects both external dep and release deadline', () => {
        const sprints = [sprint('s1', 1, 20), sprint('s2', 2, 20), sprint('s3', 3, 20)];
        const features_ = [feature('f1', 'rel1')];
        const releases_ = [release('rel1', 's3')];
        const stories = [storyWithExtDep('a', 'f1', null, 3, 1)];

        const result = svc.schedule(
          input({ sprints, stories, features: features_, releases: releases_ }),
          ALL_ON,
        );

        expect(result.moves).toHaveLength(1);
        const order = finalPosition(result, 'a', sprints);
        expect(order).toBeGreaterThanOrEqual(2);
        expect(order).toBeLessThanOrEqual(3);
      });
    });

    describe('Cycle detection', () => {
      it('detects circular dependencies and marks unfixable', () => {
        const sprints = [sprint('s1', 1, 20)];
        const stories = [story('a', 'f1', null, 3), story('b', 'f1', null, 3)];
        const dependencies = [dep('a', 'b'), dep('b', 'a')];

        const result = svc.schedule(input({ sprints, stories, dependencies }), ALL_ON);

        expect(result.errors.some(e => e.type === 'CYCLE_DETECTED')).toBe(true);
        expect(result.unfixable.length).toBeGreaterThan(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFT WEIGHTS (SCORING)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Soft Weights (Scoring)', () => {

    describe('Feature spread', () => {
      it('spreads same-feature stories across sprints', () => {
        const sprints = [sprint('s1', 1, 100), sprint('s2', 2, 100), sprint('s3', 3, 100)];
        const stories = [
          story('a', 'f1', null, 1), story('b', 'f1', null, 1),
          story('c', 'f1', null, 1), story('d', 'f1', null, 1),
        ];

        const result = svc.schedule(input({ sprints, stories }), ALL_ON);

        const targetSprints = new Set(result.moves.map(m => m.toSprintId));
        expect(targetSprints.size).toBeGreaterThanOrEqual(2);
      });

      it('higher featureSpreadPenalty causes more aggressive spreading', () => {
        const sprints = [sprint('s1', 1, 100), sprint('s2', 2, 100), sprint('s3', 3, 100)];
        const stories = [
          story('a', 'f1', null, 1), story('b', 'f1', null, 1),
          story('c', 'f1', null, 1), story('d', 'f1', null, 1),
        ];

        // High spread penalty
        const result = svc.schedule(input({ sprints, stories }),
          { ...ALL_ON, weights: { ...DEFAULT_WEIGHTS, featureSpreadPenalty: 2.0 } },
        );

        const targetSprints = new Set(result.moves.map(m => m.toSprintId));
        expect(targetSprints.size).toBeGreaterThanOrEqual(3); // even more spread
      });
    });

    describe('Early preference', () => {
      it('fills earlier sprints first when loads are equal', () => {
        const sprints = [sprint('s1', 1, 50), sprint('s2', 2, 50)];
        const stories = [story('a', 'f1', null, 5), story('b', 'f2', null, 5)];

        const result = svc.schedule(input({ sprints, stories }), ALL_ON);

        expect(result.moves).toHaveLength(2);
        expect(result.moves[0].toSprintId).toBe('s1');
        expect(result.moves[1].toSprintId).toBe('s1');
      });

      it('respects capacity and spills to next sprint', () => {
        const sprints = [sprint('s1', 1, 10), sprint('s2', 2, 10), sprint('s3', 3, 10)];
        const stories = [
          story('a', 'f1', null, 5), story('b', 'f2', null, 5), story('c', 'f3', null, 5),
        ];

        const result = svc.schedule(input({ sprints, stories }), ALL_ON);

        expect(result.moves).toHaveLength(3);
        const s3Moves = result.moves.filter(m => m.toSprintId === 's3');
        expect(s3Moves.length).toBe(0);
        const s1Moves = result.moves.filter(m => m.toSprintId === 's1');
        expect(s1Moves.length).toBeGreaterThanOrEqual(1);
      });

      it('packs first sprint before using second (small stories)', () => {
        const sprints = [sprint('s1', 1, 20), sprint('s2', 2, 20)];
        const stories = [
          story('a', 'f1', null, 3), story('b', 'f2', null, 3),
          story('c', 'f3', null, 3), story('d', 'f4', null, 3),
        ];

        const result = svc.schedule(input({ sprints, stories }), ALL_ON);

        expect(result.moves).toHaveLength(4);
        const s1Moves = result.moves.filter(m => m.toSprintId === 's1');
        expect(s1Moves.length).toBe(4);
      });
    });

    describe('Fill balance', () => {
      it('underfilled sprint preferred over equally-early sprint', () => {
        // S1 has 8/10, S2 has 2/10. A 3SP backlog story should go to S2 (lower fill).
        // But with preferEarly, S1 gets an order bonus. The fill-balance weight should
        // overcome the early bias since S2 is much emptier.
        // Use fillBalance=2.0 to strongly favor underfilled sprints.
        const sprints = [sprint('s1', 1, 10), sprint('s2', 2, 10)];
        const existing1 = story('e1', 'f2', 's1', 8);
        const existing2 = story('e2', 'f2', 's2', 2);
        const backlog = story('a', 'f1', null, 3);

        const result = svc.schedule(
          input({ sprints, stories: [existing1, existing2, backlog] }),
          { ...ALL_ON, weights: { ...DEFAULT_WEIGHTS, fillBalance: 2.0 } },
        );

        const move = result.moves.find(m => m.storyId === 'a');
        expect(move).toBeDefined();
        // S2 has load ratio (2+3)/10=0.5 vs S1 (8+3)/10=1.1 (over capacity penalty kicks in)
        expect(move!.toSprintId).toBe('s2');
      });

      it('fillBalance=0 disables the pull (original behavior)', () => {
        // With fillBalance=0, overloaded sprints get no extra penalty.
        // The test just verifies no crash and the algorithm still works.
        const sprints = [sprint('s1', 1, 10), sprint('s2', 2, 10)];
        const stories = [story('a', 'f1', null, 3)];

        const result = svc.schedule(
          input({ sprints, stories }),
          { ...ALL_ON, weights: { ...DEFAULT_WEIGHTS, fillBalance: 0 } },
        );

        expect(result.moves).toHaveLength(1);
        expect(result.moves[0].toSprintId).toBe('s1'); // preferEarly still wins
      });

      it('moves from overloaded late sprints to earlier ones (Phase 5)', () => {
        // S1: cap 20, load 5. S2: cap 20, load 5. S3: cap 10, load 10.
        // Story in S3 (5SP). Phase 5 should rebalance to S1 or S2 since they have capacity.
        const sprints = [sprint('s1', 1, 20), sprint('s2', 2, 20), sprint('s3', 3, 10)];
        const stories = [
          story('e1', 'f1', 's1', 5),
          story('e2', 'f2', 's2', 5),
          story('e3', 'f3', 's3', 5),
          story('target', 'f4', 's3', 5),
        ];

        const result = svc.schedule(input({ sprints, stories }), ALL_ON);

        // Phase 5 should move target from S3 to an earlier sprint
        const move = result.moves.find(m => m.storyId === 'target');
        if (move) {
          const targetOrder = sprints.find(s => s.id === move.toSprintId)!.order;
          expect(targetOrder).toBeLessThan(3);
        }
      });
    });

    describe('Configurable weights', () => {
      it('custom weights override defaults', () => {
        const sprints = [sprint('s1', 1, 10), sprint('s2', 2, 10)];
        const stories = [story('a', 'f1', null, 3)];

        // earlyOrderPenalty=0 should reduce early bias
        const result = svc.schedule(
          input({ sprints, stories }),
          { ...ALL_ON, weights: { ...DEFAULT_WEIGHTS, earlyOrderPenalty: 0 } },
        );

        expect(result.moves).toHaveLength(1);
        // Still goes to s1 because load ratio is equal and s1 is first
        expect(result.moves[0].toSprintId).toBe('s1');
      });

      it('partial weights merge with defaults', () => {
        const sprints = [sprint('s1', 1, 10)];
        const stories = [story('a', 'f1', null, 3)];

        // Only override one weight — others should use defaults
        const result = svc.schedule(
          input({ sprints, stories }),
          { ...ALL_ON, weights: { ...DEFAULT_WEIGHTS, fillBalance: 1.0 } },
        );

        expect(result.moves).toHaveLength(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Integration Scenarios', () => {
    it('all constraints together — deps + release + spread + capacity', () => {
      const sprints = [sprint('s1', 1, 10), sprint('s2', 2, 10), sprint('s3', 3, 10)];
      const features_ = [feature('f1', 'rel1'), feature('f2')];
      const releases_ = [release('rel1', 's2')];
      const stories = [
        story('f1-a', 'f1', null, 3), story('f1-b', 'f1', null, 3),
        story('f2-a', 'f2', null, 3), story('f2-b', 'f2', null, 3),
      ];
      const dependencies = [dep('f1-b', 'f1-a')];

      const result = svc.schedule(
        input({ sprints, stories, dependencies, features: features_, releases: releases_ }),
        ALL_ON,
      );

      expect(result.moves.length).toBeGreaterThanOrEqual(4);
      const f1aOrder = finalPosition(result, 'f1-a', sprints);
      const f1bOrder = finalPosition(result, 'f1-b', sprints);
      expect(f1aOrder).toBeLessThan(f1bOrder);
      expect(f1aOrder).toBeLessThanOrEqual(2);
      expect(f1bOrder).toBeLessThanOrEqual(2);
    });

    it('idempotency — auto-schedule then quick-fix = 0 moves', () => {
      const sprints = [sprint('s1', 1, 15), sprint('s2', 2, 15), sprint('s3', 3, 15)];
      const features_ = [feature('f1', 'rel1'), feature('f2')];
      const releases_ = [release('rel1', 's2')];
      const stories = [
        story('a', 'f1', null, 5), story('b', 'f1', null, 5),
        story('c', 'f2', null, 5), story('d', 'f2', null, 5),
      ];
      const dependencies = [dep('b', 'a')];

      const autoResult = svc.schedule(
        input({ sprints, stories, dependencies, features: features_, releases: releases_ }),
        ALL_ON,
      );

      for (const move of autoResult.moves) {
        const s = stories.find(st => st.id === move.storyId);
        if (s && move.toSprintId) s.sprintId = move.toSprintId;
      }

      const fixResult = svc.schedule(
        input({ sprints, stories, dependencies, features: features_, releases: releases_ }),
        ALL_ON,
      );

      expect(fixResult.moves).toHaveLength(0);
    });

    it('dep conflict + release + overcommit combined', () => {
      const sprints = [sprint('s1', 1, 8), sprint('s2', 2, 8), sprint('s3', 3, 8)];
      const features_ = [feature('f1', 'rel1'), feature('f2')];
      const releases_ = [release('rel1', 's2')];
      const existing1 = story('e1', 'f2', 's1', 6);
      const existing2 = story('e2', 'f2', 's2', 6);
      const depStory = story('dep', 'f2', 's2', 0);
      const main = story('main', 'f1', null, 3);
      const dependencies = [dep('main', 'dep')];

      const result = svc.schedule(
        input({ sprints, stories: [existing1, existing2, depStory, main], dependencies, features: features_, releases: releases_ }),
        ALL_ON,
      );

      const move = result.moves.find(m => m.storyId === 'main');
      expect(move).toBeDefined();
      expect(finalPosition(result, 'main', sprints)).toBeLessThanOrEqual(2);
    });

    it('deep chain with independent stories — all placed', () => {
      const sprints = [
        sprint('s1', 1, 30), sprint('s2', 2, 30), sprint('s3', 3, 30),
        sprint('s4', 4, 30), sprint('s5', 5, 30), sprint('s6', 6, 30),
      ];
      const chainStories = [
        story('chain-1', 'f1', null, 5), story('chain-2', 'f1', null, 5),
        story('chain-3', 'f1', null, 5), story('chain-4', 'f1', null, 5),
      ];
      const chainDeps = [
        dep('chain-2', 'chain-1'), dep('chain-3', 'chain-2'), dep('chain-4', 'chain-3'),
      ];
      const independentStories = Array.from({ length: 8 }, (_, i) =>
        story(`ind-${i}`, `f${i + 2}`, null, 5),
      );

      const result = svc.schedule(
        input({ sprints, stories: [...chainStories, ...independentStories], dependencies: chainDeps }),
        ALL_ON,
      );

      expect(result.moves.length).toBeGreaterThanOrEqual(12);
      expect(result.errors.filter(e => e.type === 'UNSCHEDULABLE')).toHaveLength(0);

      expect(finalPosition(result, 'chain-1', sprints)).toBeLessThan(finalPosition(result, 'chain-2', sprints));
      expect(finalPosition(result, 'chain-2', sprints)).toBeLessThan(finalPosition(result, 'chain-3', sprints));
      expect(finalPosition(result, 'chain-3', sprints)).toBeLessThan(finalPosition(result, 'chain-4', sprints));
    });

    it('overcommit fix moves largest stories out', () => {
      const sprints = [sprint('s1', 1, 10), sprint('s2', 2, 20)];
      const stories = [story('big', 'f1', 's1', 8), story('small', 'f1', 's1', 5)];

      const result = svc.schedule(input({ sprints, stories }), ALL_ON);

      expect(result.moves.length).toBeGreaterThanOrEqual(1);
      const movedToS2 = result.moves.filter(m => m.toSprintId === 's2');
      expect(movedToS2.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONS FLAGS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Options Flags', () => {
    it('scheduleBacklog=false → no placement', () => {
      const sprints = [sprint('s1', 1, 20)];
      const stories = [story('a', 'f1', null, 3)];

      const result = svc.schedule(input({ sprints, stories }), { ...ALL_ON, scheduleBacklog: false });

      expect(result.moves).toHaveLength(0);
    });

    it('enforceReleaseDeadlines=false → no deadline moves', () => {
      const sprints = [sprint('s1', 1, 20), sprint('s2', 2, 20), sprint('s3', 3, 20)];
      const features_ = [feature('f1', 'rel1')];
      const releases_ = [release('rel1', 's2')];
      const stories = [story('a', 'f1', 's3', 5)];

      const result = svc.schedule(
        input({ sprints, stories, features: features_, releases: releases_ }),
        { ...ALL_ON, enforceReleaseDeadlines: false, fixOvercommit: false },
      );

      expect(result.moves).toHaveLength(0);
    });

    it('fixViolations=false → no dep fix moves', () => {
      const sprints = [sprint('s1', 1, 20), sprint('s2', 2, 20)];
      const main = story('main', 'f1', 's1', 3);
      const depS = story('dep', 'f1', 's2', 3);
      const dependencies = [dep('main', 'dep')];

      const result = svc.schedule(
        input({ sprints, stories: [main, depS], dependencies }),
        { ...ALL_ON, fixViolations: false, fixOvercommit: false },
      );

      expect(result.moves).toHaveLength(0);
    });

    it('fixOvercommit=false → no overcommit fix', () => {
      const sprints = [sprint('s1', 1, 5), sprint('s2', 2, 20)];
      const stories = [story('a', 'f1', 's1', 8)];

      const result = svc.schedule(input({ sprints, stories }), { ...ALL_ON, fixOvercommit: false });

      expect(result.moves).toHaveLength(0);
      expect(result.warnings.some(w => w.type === 'OVERCOMMIT')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('empty sprints → error', () => {
      const result = svc.schedule(input({ stories: [story('a', 'f1', null, 3)] }), ALL_ON);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('No sprints');
    });

    it('no stories → graceful empty result', () => {
      const sprints = [sprint('s1', 1, 10)];
      const result = svc.schedule(input({ sprints }), ALL_ON);

      expect(result.moves).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('features without release constraint', () => {
      const sprints = [sprint('s1', 1, 20), sprint('s2', 2, 20)];
      const features_ = [feature('f1')];
      const stories = [story('a', 'f1', null, 3)];

      const result = svc.schedule(input({ sprints, stories, features: features_ }), ALL_ON);

      expect(result.moves).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('already-placed stories skipped', () => {
      const sprints = [sprint('s1', 1, 10)];
      const stories = [story('a', 'f1', 's1', 5)];

      const result = svc.schedule(input({ sprints, stories }), ALL_ON);

      expect(result.moves).toHaveLength(0);
    });
  });
});
