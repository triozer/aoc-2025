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
	const width = lines[0]?.length ?? 0;
	const height = lines.length;

	const key = (x: number, y: number) => y * width + x;
	const fromKey = (k: number) => [k % width, Math.floor(k / width)] as const;

	const filled = new Set<number>();
	const neighborCount = new Map<number, number>();
	const candidates = new Set<number>();

	for (let y = 0; y < height; y++) {
		const line = lines[y];
		if (!line) continue;
		for (let x = 0; x < width; x++) {
			if (line[x] === FILLED) filled.add(key(x, y));
		}
	}

	for (const k of filled) {
		const [x, y] = fromKey(k);
		let count = 0;
		for (const [dx, dy] of adjacentPositions) {
			const nx = x + dx;
			const ny = y + dy;
			if (
				nx >= 0 &&
				nx < width &&
				ny >= 0 &&
				ny < height &&
				filled.has(key(nx, ny))
			) {
				count++;
			}
		}
		neighborCount.set(k, count);
		if (count < 4) candidates.add(k);
	}

	let count = 0;
	while (candidates.size > 0) {
		const toRemove = [...candidates];
		candidates.clear();

		for (const k of toRemove) {
			filled.delete(k);
			neighborCount.delete(k);
		}

		for (const k of toRemove) {
			const [x, y] = fromKey(k);

			for (const [dx, dy] of adjacentPositions) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
					const nk = key(nx, ny);
					if (filled.has(nk)) {
						const newCount = (neighborCount.get(nk) ?? 0) - 1;
						neighborCount.set(nk, newCount);
						if (newCount < 4) candidates.add(nk);
					}
				}
			}
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
