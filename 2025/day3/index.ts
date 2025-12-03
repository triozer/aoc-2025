// https://rarewood.dev/aoc-2025/day-3
// https://adventofcode.com/2025/day/3

import { run } from "../../shared/timings";

function solve(lines: string[], k: number): bigint {
	let total = 0n;

	for (const line of lines) {
		const digits = line.split("").map(Number);
		const n = digits.length;

		let result = "";
		let prevPos = -1;

		for (let i = 0; i < k; i++) {
			const startPos = prevPos + 1;
			const endPos = n - k + i;

			let maxDigit = -1;
			let maxPos = startPos;
			for (let j = startPos; j <= endPos; j++) {
				const digit = digits[j];
				if (digit === undefined || digit <= maxDigit) continue;
				maxDigit = digit;
				maxPos = j;
			}

			result += maxDigit.toString();
			prevPos = maxPos;
		}

		total += BigInt(result);
	}

	return total;
}

const example = (await Bun.file(`${import.meta.dir}/example.txt`).text())
	.split("\n")
	.map((line) => line.trim());

const input = (await Bun.file(`${import.meta.dir}/input.txt`).text())
	.split("\n")
	.map((line) => line.trim());

run("Part 1 (example)", () => solve(example, 2), 357n);
run("Part 1", () => solve(input, 2));

run("Part 2 (example)", () => solve(example, 12), 3121910778619n);
run("Part 2", () => solve(input, 12));
