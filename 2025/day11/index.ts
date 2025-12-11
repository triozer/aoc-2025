// https://rarewood.dev/aoc-2025/day-11
// https://adventofcode.com/2025/day/11

import { run } from "../../shared/timings";

const YOU = "you";
const OUT = "out";
const SVR = "svr";
const DAC = "dac";
const FFT = "fft";

type Cache = Map<string, number>;
type Devices = Map<string, string[]>;

function countPaths(devices: Devices, current: string, cache: Cache): number {
	if (current === OUT) return 1;

	const currentTarget = cache.get(current);
	if (currentTarget !== undefined) return currentTarget;

	const outputs = devices.get(current);
	if (!outputs) return 0;

	let total = 0;
	for (const next of outputs) {
		total += countPaths(devices, next, cache);
	}

	cache.set(current, total);
	return total;
}

function part1(devices: Devices) {
	const cache: Cache = new Map();
	return countPaths(devices, YOU, cache);
}

function countPathsWithRequired(
	devices: Devices,
	current: string,
	visitedDac: boolean,
	visitedFft: boolean,
	cache: Cache,
): number {
	if (current === DAC) visitedDac = true;
	if (current === FFT) visitedFft = true;

	if (current === OUT) {
		return visitedDac && visitedFft ? 1 : 0;
	}

	const key = `${current}:${visitedDac}:${visitedFft}`;
	const currentTarget = cache.get(key);
	if (currentTarget !== undefined) return currentTarget;

	const outputs = devices.get(current);
	if (!outputs) return 0;

	let total = 0;
	for (const next of outputs) {
		total += countPathsWithRequired(
			devices,
			next,
			visitedDac,
			visitedFft,
			cache,
		);
	}

	cache.set(key, total);
	return total;
}

function part2(devices: Devices) {
	const cache: Cache = new Map();
	return countPathsWithRequired(devices, SVR, false, false, cache);
}

function parseGraph(lines: string[]): Devices {
	const devices: Devices = new Map();
	for (const line of lines) {
		const [device, outputs] = line.split(": ").map((s) => s.trim());
		if (!device || !outputs) continue;
		devices.set(device, outputs.split(" "));
	}
	return devices;
}
const example = (await Bun.file(`${import.meta.dir}/example.txt`).text())
	.split("\n")
	.map((line) => line.trim());

const example2 = (await Bun.file(`${import.meta.dir}/example2.txt`).text())
	.split("\n")
	.map((line) => line.trim());

const input = (await Bun.file(`${import.meta.dir}/input.txt`).text())
	.split("\n")
	.map((line) => line.trim());

run("Part 1 (example)", () => part1(parseGraph(example)), 5);
run("Part 1", () => part1(parseGraph(input)));

run("Part 2 (example)", () => part2(parseGraph(example2)), 2);
run("Part 2", () => part2(parseGraph(input)));
