// https://rarewood.dev/aoc-2025/day-2

import { run } from "../../shared/timings";

interface Range {
	start: number;
	end: number;
}

function parseRanges(input: string): Range[] {
	const ranges: Range[] = [];
	for (const range of input.split(",")) {
		if (!range) continue;
		const [start, end] = range.split("-").map(Number);
		if (start === undefined || end === undefined) continue;
		ranges.push({ start, end });
	}
	return ranges;
}

const MAX_DIGITS = 16;
const MAX_PATTERN_LENGTH = 8;

const POWERS_OF_10: number[] = new Array(MAX_DIGITS);
POWERS_OF_10[0] = 1;
for (let i = 1; i < MAX_DIGITS; i++) {
	const prev = POWERS_OF_10[i - 1];
	if (prev === undefined) continue;
	POWERS_OF_10[i] = prev * 10;
}

const PATTERN_MULTIPLIERS: number[][] = Array.from(
	{ length: MAX_PATTERN_LENGTH + 1 },
	() => new Array(MAX_DIGITS + 1).fill(0),
);

for (
	let patternLength = 1;
	patternLength <= MAX_PATTERN_LENGTH;
	patternLength++
) {
	const maxRepetitions = Math.floor(MAX_DIGITS / patternLength);
	for (let repetitions = 2; repetitions <= maxRepetitions; repetitions++) {
		let multiplier = 0;
		for (let i = 0; i < repetitions; i++) {
			const power = POWERS_OF_10[patternLength * i];
			if (power === undefined) continue;
			multiplier += power;
		}

		const pattern = PATTERN_MULTIPLIERS[patternLength];
		if (pattern === undefined) continue;
		pattern[repetitions] = multiplier;
	}
}

function countDigits(num: number): number {
	if (num < 10) return 1;
	if (num < 100) return 2;
	if (num < 1000) return 3;
	if (num < 10000) return 4;
	if (num < 100000) return 5;
	if (num < 1000000) return 6;
	if (num < 10000000) return 7;
	if (num < 100000000) return 8;
	if (num < 1000000000) return 9;
	if (num < 10000000000) return 10;
	if (num < 100000000000) return 11;
	if (num < 1000000000000) return 12;
	return 13;
}

function isRepeatingPattern(
	num: number,
	exactRepetitions: number | undefined,
): boolean {
	const totalDigits = countDigits(num);

	const maxPatternLength = totalDigits >> 1;

	for (
		let patternLength = 1;
		patternLength <= maxPatternLength;
		patternLength++
	) {
		if (totalDigits % patternLength !== 0) continue;

		const repetitions = totalDigits / patternLength;

		if (exactRepetitions !== undefined && repetitions !== exactRepetitions)
			continue;

		const pattern = PATTERN_MULTIPLIERS[patternLength];
		if (pattern === undefined) continue;
		const multiplier = pattern[repetitions];
		if (multiplier === undefined) continue;

		if (num % multiplier === 0) {
			const pattern = num / multiplier;

			const minPatternValue = POWERS_OF_10[patternLength - 1];
			if (minPatternValue === undefined) continue;
			const maxPatternValue = POWERS_OF_10[patternLength];
			if (maxPatternValue === undefined) continue;

			if (pattern >= minPatternValue && pattern < maxPatternValue) {
				return true;
			}
		}
	}

	return false;
}

function part1(input: string): number {
	const ranges = parseRanges(input);

	let sum = 0;
	for (const { start, end } of ranges) {
		for (let id = start; id <= end; id++) {
			if (isRepeatingPattern(id, 2)) {
				sum += id;
			}
		}
	}

	return sum;
}

function part2(input: string): number {
	const ranges = parseRanges(input);

	let sum = 0;
	for (const { start, end } of ranges) {
		for (let id = start; id <= end; id++) {
			if (isRepeatingPattern(id, undefined)) {
				sum += id;
			}
		}
	}

	return sum;
}

const example = await Bun.file(`${import.meta.dir}/example.txt`).text();
const input = await Bun.file(`${import.meta.dir}/input.txt`).text();

run("Part 1 (example)", () => part1(example), 1227775554);
run("Part 1", () => part1(input));

run("Part 2 (example)", () => part2(example), 4174379265);
run("Part 2", () => part2(input));
