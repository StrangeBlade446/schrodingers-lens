import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addPointerStroke,
  computeBrushRadius,
  computeInkOpacity,
  DEFAULT_INK_CONFIG,
  getChoreographedSweepPoint,
  interpolateStrokeSegment,
  spawnInkDroplets,
  stepInkState,
  type InkEngineState,
} from './inkPhysics';

test('computeBrushRadius stays within configured bounds across speeds', () => {
  const slow = computeBrushRadius(0, DEFAULT_INK_CONFIG);
  const medium = computeBrushRadius(45, DEFAULT_INK_CONFIG);
  const fast = computeBrushRadius(200, DEFAULT_INK_CONFIG);

  assert.ok(slow >= DEFAULT_INK_CONFIG.minRadius && slow <= DEFAULT_INK_CONFIG.maxRadius);
  assert.ok(medium >= DEFAULT_INK_CONFIG.minRadius && medium <= DEFAULT_INK_CONFIG.maxRadius);
  assert.ok(fast >= DEFAULT_INK_CONFIG.minRadius && fast <= DEFAULT_INK_CONFIG.maxRadius);
  assert.ok(medium > slow, 'medium movement should bloom wider than stationary point');
});

test('interpolateStrokeSegment fills fast pointer jumps smoothly', () => {
  const shortPts = interpolateStrokeSegment({ x: 0, y: 0 }, { x: 10, y: 0 }, 18);
  assert.equal(shortPts.length, 1);
  assert.deepEqual(shortPts[0], { x: 10, y: 0 });

  const longPts = interpolateStrokeSegment({ x: 0, y: 0 }, { x: 180, y: 0 }, 18);
  assert.equal(longPts.length, 10);
  assert.deepEqual(longPts[longPts.length - 1], { x: 180, y: 0 });
});

test('spawnInkDroplets only triggers above velocity threshold', () => {
  const slowDrops = spawnInkDroplets(1, 200, 200, 2, 1, 1000);
  assert.equal(slowDrops.length, 0);

  const fastDrops = spawnInkDroplets(1, 200, 200, 35, -12, 1000);
  assert.equal(fastDrops.length, 2);
  assert.ok(fastDrops[0].radius >= 3 && fastDrops[0].radius <= 10);
});

test('stepInkState blooms newly created blobs and prunes expired marks', () => {
  const initial: InkEngineState = { blobs: [], droplets: [], nextId: 1 };
  const afterStroke = addPointerStroke(
    initial,
    { x: 100, y: 200 },
    { x: 180, y: 220 },
    1000,
    DEFAULT_INK_CONFIG
  );

  assert.ok(afterStroke.blobs.length > 0, 'stroke should generate blobs');
  const firstBlobInitialRadius = afterStroke.blobs[0].currentRadius;

  const bloomed = stepInkState(afterStroke, 16, 1300, DEFAULT_INK_CONFIG);
  assert.ok(
    bloomed.blobs[0].currentRadius > firstBlobInitialRadius,
    'blob radius should expand during bloom window'
  );

  const expired = stepInkState(bloomed, 16, 20000, DEFAULT_INK_CONFIG);
  assert.equal(expired.blobs.length, 0, 'blobs older than TTL should be pruned');
  assert.equal(expired.droplets.length, 0, 'droplets older than TTL should be pruned');
});

test('computeInkOpacity holds vivid before fading smoothly to zero', () => {
  assert.equal(computeInkOpacity(100, 10000), 1);
  assert.equal(computeInkOpacity(6000, 10000), 1);
  const lateFade = computeInkOpacity(9000, 10000);
  assert.ok(lateFade > 0 && lateFade < 1);
  assert.equal(computeInkOpacity(10000, 10000), 0);
});

test('getChoreographedSweepPoint stays strictly inside viewport bounds', () => {
  for (let p = 0; p <= 1; p += 0.1) {
    const pt = getChoreographedSweepPoint(p, 1440, 900);
    assert.ok(pt.x > 0 && pt.x < 1440);
    assert.ok(pt.y > 0 && pt.y < 900);
  }
});
