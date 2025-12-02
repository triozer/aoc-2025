#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dayArg = process.argv[2];
const yearArg = process.argv[3];

if (!dayArg) {
	console.error(
		"❌ Please provide a day number: bun generate-day.ts <day> [year]",
	);
	process.exit(1);
}

const dayNumber = Number.parseInt(dayArg, 10);

if (Number.isNaN(dayNumber) || dayNumber < 1 || dayNumber > 25) {
	console.error("❌ Day must be a number between 1 and 25");
	process.exit(1);
}

const currentYear = new Date().getFullYear();
const year = yearArg ? Number.parseInt(yearArg, 10) : currentYear;

if (Number.isNaN(year) || year < 2015 || year > currentYear) {
	console.error(`❌ Year must be between 2015 and ${currentYear}`);
	process.exit(1);
}

const yearDir = join(import.meta.dir, `${year}`);
const dayDir = join(yearDir, `day${dayNumber}`);

if (existsSync(dayDir)) {
	console.error(`❌ ${year}/day${dayNumber} already exists!`);
	process.exit(1);
}

const session = process.env.SESSION;

async function fetchInput(): Promise<string> {
	if (!session) {
		console.warn("⚠️  SESSION not set, skipping input fetch");
		return "";
	}

	const url = `https://adventofcode.com/${year}/day/${dayNumber}/input`;

	const response = await fetch(url, {
		headers: {
			Cookie: `session=${session}`,
		},
	});

	if (!response.ok) {
		console.error(
			`❌ Failed to fetch input: ${response.status} ${response.statusText}`,
		);
		return "";
	}

	const input = await response.text();
	return input.trimEnd();
}

const indexTemplate = `import { run } from "../../shared/timings";

function part1(lines: string[]) {
	// TODO: Implement part 1
	return 0;
}

function part2(lines: string[]) {
	// TODO: Implement part 2
	return 0;
}

const example = (await Bun.file(\`\${import.meta.dir}/example.txt\`).text())
	.split("\\n")
	.map((line) => line.trim());

const input = (await Bun.file(\`\${import.meta.dir}/input.txt\`).text())
	.split("\\n")
	.map((line) => line.trim());

run("Part 1 (example)", () => part1(example) /*, expected */);
run("Part 1", () => part1(input) /*, expected */);

// run("Part 2 (example)", () => part2(example) /*, expected */);
// run("Part 2", () => part2(input) /*, expected */);
`;

const input = await fetchInput();

if (!existsSync(yearDir)) mkdirSync(yearDir);
mkdirSync(dayDir);
writeFileSync(join(dayDir, "index.ts"), indexTemplate);
writeFileSync(join(dayDir, "example.txt"), "");
writeFileSync(join(dayDir, "input.txt"), input);

console.log(`✨ Created ${year}/day${dayNumber}/`);
console.log(`   ├── index.ts`);
console.log(`   ├── example.txt`);
console.log(`   └── input.txt ${input ? "(fetched)" : "(empty)"}`);
console.log(`\n🚀 Run with: bun ${year}/day${dayNumber}/index.ts`);
