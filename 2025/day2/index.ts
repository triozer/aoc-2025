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

function isInvalidId(num: number, maxRepetitions: number | undefined): boolean {
	const str = num.toString();
	const len = str.length;

	for (let patternLen = 1; patternLen <= len / 2; patternLen++) {
		if (len % patternLen !== 0) continue;

		const repetitions = len / patternLen;

		if (maxRepetitions !== undefined && repetitions !== maxRepetitions)
			continue;

		const pattern = str.slice(0, patternLen);
		if (pattern.repeat(repetitions) === str) {
			return true;
		}
	}

	return false;
}

function part1(input: string): number {
	const ranges = parseRanges(input);

	let sum = 0;
	for (const { start, end } of ranges) {
		for (let i = start; i <= end; i++) {
			if (isInvalidId(i, 2)) {
				sum += i;
			}
		}
	}

	return sum;
}

function part2(input: string): number {
	const ranges = parseRanges(input);

	let sum = 0;
	for (const { start, end } of ranges) {
		for (let i = start; i <= end; i++) {
			if (isInvalidId(i, undefined)) {
				sum += i;
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
