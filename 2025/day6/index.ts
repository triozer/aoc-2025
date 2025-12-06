// https://rarewood.dev/aoc-2025/day-6
// https://adventofcode.com/2025/day/6

import { run } from "../../shared/timings";

const operations = {
	"+": {
		initial: 0,
		operation: (a: number, b: number) => a + b,
	},
	"*": {
		initial: 1,
		operation: (a: number, b: number) => a * b,
	},
} as const;

type Operation = keyof typeof operations;
function isOperation(operation: string): operation is Operation {
	return operation in operations;
}

type Problem = {
	numbers: number[];
	operation: "+" | "*";
};

type GetColumn = (lines: string[], start: number, length: number) => number[];

function solve(problems: Problem[]) {
	let sum = 0;
	for (const problem of problems) {
		const { operation, initial } = operations[problem.operation];
		const result = problem.numbers.reduce(
			(acc, val) => operation(acc, val),
			initial,
		);
		sum += result;
	}
	return sum;
}

function parseInput(text: string, getColumn: GetColumn): Problem[] {
	const lines = text.split("\n").filter((line) => line.length > 0);

	const rows = lines.flatMap((line) =>
		line.split(/\(\d+\)\s+\(\d+\)/).filter((token) => token.length > 0),
	);

	const lastLine = rows.pop();
	if (lastLine === undefined) throw new Error("No last line found");

	const problems: Problem[] = [];
	let currentLength = 0;
	for (let i = lastLine.length - 1; i >= 0; i--) {
		const char = lastLine[i];
		currentLength++;
		if (char === undefined || !isOperation(char)) continue;

		problems.push({
			numbers: getColumn(rows, i, currentLength),
			operation: char,
		});

		// Skip the next character because it is a space
		i--;
		currentLength = 0;
	}

	return problems;
}

const part1: GetColumn = (lines, start, length) => {
	return lines.map((line) => Number(line.substring(start, start + length)));
};

const part2: GetColumn = (lines, start, length) => {
	const numbers: number[] = [];

	// Each column forms one number, read top-to-bottom
	for (let col = start; col < start + length; col++) {
		let digitString = "";
		for (const line of lines) {
			const char = line[col];
			if (char === " ") continue;
			digitString += char;
		}
		numbers.push(Number(digitString));
	}
	return numbers;
};

const example = await Bun.file(`${import.meta.dir}/example.txt`).text();
const input = await Bun.file(`${import.meta.dir}/input.txt`).text();

run("Part 1 (example)", () => solve(parseInput(example, part1)), 4277556);
run("Part 1", () => solve(parseInput(input, part1)));

run("Part 2 (example)", () => solve(parseInput(example, part2)), 3263827);
run("Part 2", () => solve(parseInput(input, part2)));
