// https://rarewood.dev/aoc-2025/day-7
// https://adventofcode.com/2025/day/7

import { run } from "../../shared/timings";

const START = "S";
const SPLITTER = "^";

function part1(grid: string[][]) {
	const height = grid.length;
	const width = grid[0]?.length ?? 0;

	let startCol = -1;
	for (let col = 0; col < width; col++) {
		if (grid[0]?.[col] === START) {
			startCol = col;
			break;
		}
	}

	let activeBeams = new Set<number>();
	activeBeams.add(startCol);

	let splits = 0;

	for (let row = 1; row < height; row++) {
		const newBeams = new Set<number>();

		for (const col of activeBeams) {
			if (col < 0 || col >= width) continue;
			if (grid[row]?.[col] !== SPLITTER) {
				newBeams.add(col);
				continue;
			}

			splits++;
			if (col - 1 >= 0) newBeams.add(col - 1);
			if (col + 1 < width) newBeams.add(col + 1);
		}

		activeBeams = newBeams;
	}

	return splits;
}

function part2(grid: string[][]) {
	const height = grid.length;
	const width = grid[0]?.length ?? 0;

	let startCol = -1;
	for (let col = 0; col < width; col++) {
		if (grid[0]?.[col] === START) {
			startCol = col;
			break;
		}
	}

	let particles = new Map<number, number>();
	particles.set(startCol, 1);

	for (let row = 1; row < height; row++) {
		const newParticles = new Map<number, number>();

		for (const [col, count] of particles) {
			if (grid[row]?.[col] !== SPLITTER) {
				newParticles.set(col, (newParticles.get(col) ?? 0) + count);
				continue;
			}

			if (col - 1 >= 0) {
				newParticles.set(col - 1, (newParticles.get(col - 1) ?? 0) + count);
			}
			if (col + 1 < width) {
				newParticles.set(col + 1, (newParticles.get(col + 1) ?? 0) + count);
			}
		}

		particles = newParticles;
	}

	let totalTimelines = 0;
	for (const count of particles.values()) {
		totalTimelines += count;
	}

	return totalTimelines;
}

const example = (await Bun.file(`${import.meta.dir}/example.txt`).text())
	.split("\n")
	.map((line) => line.trim().split(""));

const input = (await Bun.file(`${import.meta.dir}/input.txt`).text())
	.split("\n")
	.map((line) => line.trim().split(""));

run("Part 1 (example)", () => part1(example), 21);
run("Part 1", () => part1(input));

run("Part 2 (example)", () => part2(example), 40);
run("Part 2", () => part2(input));
