// https://rarewood.dev/aoc-2025/day-9
// https://adventofcode.com/2025/day/9

import { run } from "../../shared/timings";

interface Point {
	x: number;
	y: number;
}

function area(p1: Point, p2: Point): number {
	return (Math.abs(p2.x - p1.x) + 1) * (Math.abs(p2.y - p1.y) + 1);
}

function part1(points: Point[]) {
	let maxArea = 0;

	for (let i = 0; i < points.length; i++) {
		for (let j = i + 1; j < points.length; j++) {
			const p1 = points[i];
			const p2 = points[j];
			if (p1 === undefined || p2 === undefined) continue;

			const currentArea = area(p1, p2);
			if (currentArea > maxArea) {
				maxArea = currentArea;
			}
		}
	}

	return maxArea;
}

interface Range {
	start: number;
	end: number;
}

interface HorizontalEdge {
	y: number;
	x1: number;
	x2: number;
}

interface VerticalEdge {
	x: number;
	y1: number;
	y2: number;
}

function getInteriorAtY(y: number, verticalEdges: VerticalEdge[]): Range[] {
	const crossingXs = verticalEdges
		.filter((e) => e.y1 < y && e.y2 > y)
		.map((e) => e.x)
		.sort((a, b) => a - b);

	const ranges: Range[] = [];
	for (let i = 0; i < crossingXs.length; i += 2) {
		if (i + 1 < crossingXs.length) {
			const x1 = crossingXs[i];
			const x2 = crossingXs[i + 1];
			if (x1 === undefined || x2 === undefined) continue;
			ranges.push({ start: x1, end: x2 });
		}
	}
	return ranges;
}

function mergeRanges(ranges: Range[]): Range[] {
	if (ranges.length === 0) return [];
	ranges.sort((a, b) => a.start - b.start);
	const merged: Range[] = [];
	for (const r of ranges) {
		const last = merged[merged.length - 1];
		if (!last || last.end < r.start) {
			merged.push({ start: r.start, end: r.end });
		} else {
			last.end = Math.max(last.end, r.end);
		}
	}
	return merged;
}

function getCoverageAtY(
	y: number,
	points: Point[],
	verticalEdges: VerticalEdge[],
	horizontalEdges: HorizontalEdge[],
	coverageCache: Map<number, Range[]>,
): Range[] {
	const cached = coverageCache.get(y);
	if (cached) return cached;

	const eps = 0.5;
	const isAtVertex = points.some((p) => p.y === y);

	const coverage = isAtVertex
		? mergeRanges([
				...getInteriorAtY(y + eps, verticalEdges),
				...getInteriorAtY(y - eps, verticalEdges),
				...horizontalEdges
					.filter((e) => e.y === y)
					.map((e) => ({ start: e.x1, end: e.x2 })),
			])
		: getInteriorAtY(y, verticalEdges);

	coverageCache.set(y, coverage);
	return coverage;
}

function lowerBound(arr: number[], target: number): number {
	let lo = 0;
	let hi = arr.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		const midValue = arr[mid];
		if (midValue === undefined) continue;
		if (midValue < target) lo = mid + 1;
		else hi = mid;
	}
	return lo;
}

function isRectangleValid(
	p1: Point,
	p2: Point,
	ySamples: number[],
	points: Point[],
	verticalEdges: VerticalEdge[],
	horizontalEdges: HorizontalEdge[],
	coverageCache: Map<number, Range[]>,
): boolean {
	const minX = Math.min(p1.x, p2.x);
	const maxX = Math.max(p1.x, p2.x);
	const minY = Math.min(p1.y, p2.y);
	const maxY = Math.max(p1.y, p2.y);

	// Slice the precomputed y-levels that intersect this rectangle
	const startIdx = lowerBound(ySamples, minY);
	for (let i = startIdx; i < ySamples.length && ySamples[i] <= maxY; i++) {
		const coverage = getCoverageAtY(
			ySamples[i],
			points,
			verticalEdges,
			horizontalEdges,
			coverageCache,
		);
		const isCovered = coverage.some((r) => r.start <= minX && r.end >= maxX);
		if (!isCovered) return false;
	}

	return true;
}

function part2(points: Point[]) {
	const n = points.length;

	const horizontalEdges: HorizontalEdge[] = [];
	const verticalEdges: VerticalEdge[] = [];

	for (let i = 0; i < n; i++) {
		const p1 = points[i];
		const p2 = points[(i + 1) % n];
		if (p1 === undefined || p2 === undefined) continue;

		if (p1.y === p2.y) {
			horizontalEdges.push({
				y: p1.y,
				x1: Math.min(p1.x, p2.x),
				x2: Math.max(p1.x, p2.x),
			});
		} else {
			verticalEdges.push({
				x: p1.x,
				y1: Math.min(p1.y, p2.y),
				y2: Math.max(p1.y, p2.y),
			});
		}
	}

	// Precompute the y-levels we need to inspect: every vertex y plus midpoints
	// between consecutive distinct y's. Any maximal rectangle will have its top
	// or bottom on one of these levels.
	const uniqueY = Array.from(new Set(points.map((p) => p.y))).sort(
		(a, b) => a - b,
	);
	const ySamples: number[] = [];
	for (let i = 0; i < uniqueY.length; i++) {
		const y = uniqueY[i];
		if (y === undefined) continue;
		ySamples.push(y);
		if (i + 1 < uniqueY.length) {
			const nextY = uniqueY[i + 1];
			if (nextY === undefined) continue;
			ySamples.push((y + nextY) / 2);
		}
	}

	const coverageCache = new Map<number, Range[]>();

	let maxArea = 0;
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const p1 = points[i];
			const p2 = points[j];
			if (p1 === undefined || p2 === undefined) continue;
			if (
				isRectangleValid(
					p1,
					p2,
					ySamples,
					points,
					verticalEdges,
					horizontalEdges,
					coverageCache,
				)
			) {
				const a = area(p1, p2);
				if (a > maxArea) maxArea = a;
			}
		}
	}

	return maxArea;
}

function parsePoints(lines: string[]): Point[] {
	return lines
		.map((line) => {
			const [x, y] = line.split(",").map(Number);
			if (x === undefined || y === undefined) return null;
			return { x, y };
		})
		.filter((point) => point !== null);
}

const example = (await Bun.file(`${import.meta.dir}/example.txt`).text())
	.split("\n")
	.map((line) => line.trim());

const input = (await Bun.file(`${import.meta.dir}/input.txt`).text())
	.split("\n")
	.map((line) => line.trim());

run("Part 1 (example)", () => part1(parsePoints(example)), 50);
run("Part 1", () => part1(parsePoints(input)));

run("Part 2 (example)", () => part2(parsePoints(example)), 24);
run("Part 2", () => part2(parsePoints(input)));
