const colors = {
	dim: "\x1b[2m",
	reset: "\x1b[0m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	magenta: "\x1b[35m",
	bold: "\x1b[1m",
};

function timestamp(): string {
	const now = new Date();
	const time = now.toLocaleTimeString("en-US", {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
	const ms = now.getMilliseconds().toString().padStart(3, "0");
	return `${colors.dim}${time}.${ms}${colors.reset}`;
}

function formatDuration(ms: number): string {
	if (ms < 1) {
		return `${colors.green}${(ms * 1000).toFixed(0)}µs${colors.reset}`;
	}
	if (ms < 1000) {
		return `${colors.green}${ms.toFixed(2)}ms${colors.reset}`;
	}
	if (ms < 60000) {
		return `${colors.yellow}${(ms / 1000).toFixed(2)}s${colors.reset}`;
	}
	return `${colors.magenta}${(ms / 60000).toFixed(2)}m${colors.reset}`;
}

export function run<T>(name: string, fn: () => T): T {
	console.log(`${timestamp()} ${colors.cyan}▶${colors.reset} ${colors.bold}${name}${colors.reset} starting...`);

	const start = performance.now();
	const result = fn();
	const duration = performance.now() - start;

	console.log(
		`${timestamp()} ${colors.green}✓${colors.reset} ${colors.bold}${name}${colors.reset} finished in ${formatDuration(duration)}`,
	);
	console.log(`  ${colors.dim}→${colors.reset} ${result}\n`);

	return result;
}

export async function runAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
	console.log(`${timestamp()} ${colors.cyan}▶${colors.reset} ${colors.bold}${name}${colors.reset} starting...`);

	const start = performance.now();
	const result = await fn();
	const duration = performance.now() - start;

	console.log(
		`${timestamp()} ${colors.green}✓${colors.reset} ${colors.bold}${name}${colors.reset} finished in ${formatDuration(duration)}`,
	);
	console.log(`  ${colors.dim}→${colors.reset} ${result}\n`);

	return result;
}

