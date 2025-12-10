// https://rarewood.dev/aoc-2025/day-10
// https://adventofcode.com/2025/day/10

import { equalTo, type Model, solve } from "yalps";
import { run } from "../../shared/timings";

interface Machine {
	finalState: number;
	buttons: number[];
	joltages: number[];
}

function part1(finalState: number, buttons: number[]): number {
	if (finalState === 0) return 0;

	let maxMask = finalState;
	for (const b of buttons) maxMask |= b;

	const lightCount = 32 - Math.clz32(maxMask);
	const stateCount = 1 << lightCount;

	const distances = new Int16Array(stateCount).fill(-1);
	const queue = new Uint32Array(stateCount);
	let head = 0;
	let tail = 0;

	distances[0] = 0;
	queue[tail++] = 0;

	while (head < tail) {
		const state = queue[head++];
		const distance = distances[state];

		if (state === finalState) return distance;

		for (const button of buttons) {
			const next = state ^ button;
			if (distances[next] === -1) {
				distances[next] = distance + 1;
				queue[tail++] = next;
			}
		}
	}

	throw new Error("No solution found");
}

function part2(joltages: number[], buttons: number[]): number {
	const numCounters = joltages.length;

	const constraints: Record<string, ReturnType<typeof equalTo>> = {};
	for (let i = 0; i < numCounters; i++) {
		constraints[`c${i}`] = equalTo(joltages[i]);
	}

	const variables: Record<string, Record<string, number>> = {};
	buttons.forEach((mask, j) => {
		const coeffs: Record<string, number> = { cost: 1 };
		for (let i = 0; i < numCounters; i++) {
			if (mask & (1 << i)) coeffs[`c${i}`] = 1;
		}
		variables[`b${j}`] = coeffs;
	});

	const solution = solve({
		direction: "minimize",
		objective: "cost",
		constraints,
		variables,
		integers: true,
	});
	return solution.status === "optimal" ? Math.round(solution.result) : 0;
}

function parseMachine(line: string): Machine {
	const finalStateMatch = line.match(/\[([.#]+)\]/);
	const buttonMatches = [...line.matchAll(/\(([0-9,]+)\)/g)];
	const joltagesMatch = line.match(/\{([0-9,]+)\}/);

	if (!finalStateMatch?.[1] || !buttonMatches.length || !joltagesMatch?.[1]) {
		throw new Error("Invalid machine");
	}

	let finalState = 0;
	for (let i = 0; i < finalStateMatch[1].length; i++) {
		if (finalStateMatch[1][i] === "#") finalState |= 1 << i;
	}

	const buttons = buttonMatches.map((match) => {
		let mask = 0;
		for (const idx of match[1]!.split(",").map(Number)) {
			mask |= 1 << idx;
		}
		return mask;
	});

	return {
		finalState,
		buttons,
		joltages: joltagesMatch[1].split(",").map(Number),
	};
}

const example = (await Bun.file(`${import.meta.dir}/example.txt`).text())
	.split("\n")
	.map((line) => line.trim());

const input = (await Bun.file(`${import.meta.dir}/input.txt`).text())
	.split("\n")
	.map((line) => line.trim());

const exampleMachines = example.map(parseMachine);
const inputMachines = input.map(parseMachine);

run(
	"Part 1 (example)",
	() => exampleMachines.reduce((s, m) => s + part1(m.finalState, m.buttons), 0),
	7,
);
run("Part 1", () =>
	inputMachines.reduce((s, m) => s + part1(m.finalState, m.buttons), 0),
);

run(
	"Part 2 (example)",
	() => exampleMachines.reduce((s, m) => s + part2(m.joltages, m.buttons), 0),
	33,
);
run("Part 2", () =>
	inputMachines.reduce((s, m) => s + part2(m.joltages, m.buttons), 0),
);
