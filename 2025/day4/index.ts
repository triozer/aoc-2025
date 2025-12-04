// https://rarewood.dev/aoc-2025/day-4
// https://adventofcode.com/2025/day/4

import { run } from "../../shared/timings";

const EMPTY = ".";
const FILLED = "@";

const adjacentPositions = [
	// top left
	[-1, -1],
	// top
	[0, -1],
	// top right
	[1, -1],
	// left
	[-1, 0],
	// right
	[1, 0],
	// bottom left
	[-1, 1],
	// bottom
	[0, 1],
	// bottom right
	[1, 1],
] satisfies [number, number][];

const getAdjacentCount = ({
	grid,
	width,
	height,
	x,
	y,
}: {
	grid: string[][];
	width: number;
	height: number;
	x: number;
	y: number;
}) => {
	return adjacentPositions.reduce((count, [dx, dy]) => {
		const newX = x + dx;
		const newY = y + dy;

		if (newX < 0 || newX >= width || newY < 0 || newY >= height) return count;

		const cell = grid[newY]?.[newX];
		if (cell === FILLED) return count + 1;
		return count;
	}, 0);
};

function part1(lines: string[]) {
	const grid = lines.map((line) => line.split(""));
	const width = grid[0]?.length ?? 0;
	const height = grid.length;

	let count = 0;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const cell = grid[y]?.[x];
			if (cell !== FILLED) continue;

			const adjacentRolls = getAdjacentCount({ grid, width, height, x, y });
			if (adjacentRolls < 4) count++;
		}
	}
	return count;
}

function part2(lines: string[]) {
	const grid = lines.map((line) => line.split(""));
	const width = grid[0]?.length ?? 0;
	const height = grid.length;

	let count = 0;
	while (true) {
		const toRemove: [number, number][] = [];

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const cell = grid[y]?.[x];
				if (cell !== FILLED) continue;

				const adjacentRolls = getAdjacentCount({ grid, width, height, x, y });
				if (adjacentRolls < 4) toRemove.push([x, y]);
			}
		}

		if (toRemove.length === 0) break;

		for (const [x, y] of toRemove) {
			const line = grid[y];
			if (line) line[x] = EMPTY;
		}

		count += toRemove.length;
	}
	return count;
}

const example = (await Bun.file(`${import.meta.dir}/example.txt`).text())
	.split("\n")
	.map((line) => line.trim());

const input = (await Bun.file(`${import.meta.dir}/input.txt`).text())
	.split("\n")
	.map((line) => line.trim());

run("Part 1 (example)", () => part1(example), 13);
run("Part 1", () => part1(input));

run("Part 2 (example)", () => part2(example), 43);
run("Part 2", () => part2(input));
