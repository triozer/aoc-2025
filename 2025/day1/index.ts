import { run } from "../../shared/timings";

const start = 0;
const end = 99;
const range = end - start + 1;

function part1(lines: string[]) {
	let dial = 50;
	let zeroCount = 0;

	for (const line of lines) {
		const sign = line[0] === "L" ? -1 : 1;
		const distance = Number.parseInt(line.slice(1), 10);

		dial = (((dial + sign * distance) % range) + range) % range;

		if (dial === 0) {
			zeroCount++;
		}
	}

	return zeroCount;
}

function part2(lines: string[]) {
	let dial = 50;
	let zeroCount = 0;

	for (const line of lines) {
		const direction = line[0];
		const distance = Number.parseInt(line.slice(1), 10);

		const firstZero =
			dial === 0 ? range : direction === "L" ? dial : range - dial;

		if (distance >= firstZero) {
			zeroCount += Math.floor((distance - firstZero) / range) + 1;
		}

		const sign = direction === "L" ? -1 : 1;
		dial = (((dial + sign * distance) % range) + range) % range;
	}

	return zeroCount;
}

const example = (await Bun.file(`${import.meta.dir}/example.txt`).text())
	.split("\n")
	.map((line) => line.trim());

const input = (await Bun.file(`${import.meta.dir}/input.txt`).text())
	.split("\n")
	.map((line) => line.trim());

run("Part 1 (example)", () => part1(example), 3);
run("Part 1", () => part1(input));

run("Part 2 (example)", () => part2(example), 6);
run("Part 2", () => part2(input));
