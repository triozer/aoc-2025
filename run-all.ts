import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const year = process.argv[2];

if (!year) {
	console.error("Usage: bun shared/run-all <year>");
	console.error("Example: bun shared/run-all 2025");
	process.exit(1);
}

const yearDir = join(import.meta.dir, ".", year);
const days = readdirSync(yearDir)
	.filter((d) => d.startsWith("day"))
	.sort(
		(a, b) => Number.parseInt(a.slice(3), 10) - Number.parseInt(b.slice(3), 10),
	);

console.log(
	`\n🎄 Running ${days.length} days for ${year}\n${"─".repeat(40)}\n`,
);

for (const day of days) {
	const optimizedPath = join(yearDir, day, "optimized.ts");
	const indexPath = join(yearDir, day, "index.ts");
	const scriptPath = existsSync(optimizedPath) ? optimizedPath : indexPath;
	const label = existsSync(optimizedPath) ? `${day} (optimized)` : day;

	console.log(`${"─".repeat(40)}\n🎄 Running ${label}\n${"─".repeat(40)}\n`);
	await import(scriptPath);
}

console.log(`${"─".repeat(40)}\n🎄 All ${days.length} days complete!\n`);
