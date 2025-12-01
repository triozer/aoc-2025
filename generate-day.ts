#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dayArg = process.argv[2];

if (!dayArg) {
	console.error("❌ Please provide a day number: bun generate-day.ts <day>");
	process.exit(1);
}

const dayNumber = Number.parseInt(dayArg, 10);

if (Number.isNaN(dayNumber) || dayNumber < 1 || dayNumber > 25) {
	console.error("❌ Day must be a number between 1 and 25");
	process.exit(1);
}

const dayDir = join(import.meta.dir, `day${dayNumber}`);

if (existsSync(dayDir)) {
	console.error(`❌ day${dayNumber} already exists!`);
	process.exit(1);
}

const indexTemplate = `import { run } from "../shared/timings";

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

run("Part 1 (example)", () => part1(example));
run("Part 1", () => part1(input));

// run("Part 2 (example)", () => part2(example));
// run("Part 2", () => part2(input));
`;

mkdirSync(dayDir);
writeFileSync(join(dayDir, "index.ts"), indexTemplate);
writeFileSync(join(dayDir, "example.txt"), "");
writeFileSync(join(dayDir, "input.txt"), "");

console.log(`✨ Created day${dayNumber}/`);
console.log(`   ├── index.ts`);
console.log(`   ├── example.txt`);
console.log(`   └── input.txt`);
console.log(`\n🚀 Run with: bun day${dayNumber}/index.ts`);

