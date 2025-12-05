// https://rarewood.dev/aoc-2025/day-5
// https://adventofcode.com/2025/day/5

import { run } from "../../shared/timings";

interface Range {
	start: number;
	end: number;
}

function parseRanges(input: string): Range[] {
	const ranges: Range[] = [];
	for (const line of input.split("\n")) {
		const [start, end] = line.split("-").map(Number);
		if (start === undefined || end === undefined) continue;
		ranges.push({ start, end });
	}
	return ranges;
}

function isInAnyRange(id: number, ranges: Range[]): boolean {
	for (const range of ranges) {
		if (id >= range.start && id <= range.end) return true;
	}
	return false;
}

function part1(input: string) {
	const [rawRanges, ingredients] = input.split("\n\n");
	if (!rawRanges || !ingredients) return 0;

	const ranges = parseRanges(rawRanges);
	let freshIngredients = 0;

	for (const ingredient of ingredients.split("\n")) {
		if (isInAnyRange(Number(ingredient), ranges)) {
			freshIngredients++;
		}
	}

	return freshIngredients;
}

function mergeRanges(ranges: Range[]): Range[] {
	if (ranges.length === 0) return [];

	const sorted = [...ranges].sort((a, b) => a.start - b.start);
	const first = sorted[0];
	if (!first) return [];

	const merged: Range[] = [first];

	for (let i = 1; i < sorted.length; i++) {
		const current = sorted[i];
		const last = merged[merged.length - 1];
		if (!current || !last) continue;

		if (current.start <= last.end + 1) {
			last.end = Math.max(last.end, current.end);
		} else {
			merged.push(current);
		}
	}

	return merged;
}

function part2(input: string) {
	const [rawRanges] = input.split("\n\n");
	if (!rawRanges) return 0;

	const ranges = parseRanges(rawRanges);
	const merged = mergeRanges(ranges);

	let count = 0;
	for (const range of merged) {
		count += range.end - range.start + 1;
	}

	return count;
}

const example = await Bun.file(`${import.meta.dir}/example.txt`).text();
const input = await Bun.file(`${import.meta.dir}/input.txt`).text();

run("Part 1 (example)", () => part1(example), 3);
run("Part 1", () => part1(input));

run("Part 2 (example)", () => part2(example), 14);
run("Part 2", () => part2(input));
