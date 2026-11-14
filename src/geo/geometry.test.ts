import { expect, it } from 'vitest';
import fixture from '../../public/data/genzano-demo.json';
import type { LngLat } from '../data/types';
import { areaHa, centroid, isUsableRing, pointInRing, simplifyRing } from './geometry';

const demo = fixture.field.outline.coordinates[0].slice(0, -1) as LngLat[];
const circle = Array.from({ length: 200 }, (_, i): LngLat => {
  const angle = i * 2 * Math.PI / 200;
  return [16 + 150 * Math.cos(angle) / (111195 * Math.cos(41 * Math.PI / 180)),
    41 + 150 * Math.sin(angle) / 111195];
});

it('measures the demo area independent of winding', () => {
  expect(areaHa(demo)).toBeGreaterThan(5.5);
  expect(areaHa(demo)).toBeLessThan(6.9);
  expect(areaHa([...demo].reverse())).toBeCloseTo(areaHa(demo), 8);
});
it('places the centroid inside and the specified point outside', () => {
  expect(pointInRing(centroid(demo), demo)).toBe(true);
  expect(pointInRing([16.07, 40.87], demo)).toBe(false);
});
it('simplifies a 150 m circle without losing more than 15% of its area', () => {
  const result = simplifyRing(circle);
  expect(result.length).toBeLessThanOrEqual(12);
  for (const point of result) for (const value of point) expect(value).toBe(Number(value.toFixed(5)));
  expect(Math.abs(areaHa(result) / areaHa(circle) - 1)).toBeLessThanOrEqual(0.15);
});
it.each([0, 1, 2, 8])('preserves the point count of a short trace of %i points', count => {
  expect(simplifyRing(circle.slice(0, count))).toHaveLength(count);
});
it('rejects lines and tiny scribbles but accepts the demo', () => {
  expect(isUsableRing(demo.slice(0, 2))).toBe(false);
  expect(isUsableRing([[0, 0], [5 / 111195, 0], [0, 5 / 111195]])).toBe(false);
  expect(isUsableRing([[0, 0], [0, 1], [0, 2]])).toBe(false);
  expect(isUsableRing(demo)).toBe(true);
});
