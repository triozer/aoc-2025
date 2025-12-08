const colors = {
	dim: "\x1b[2m",
	reset: "\x1b[0m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	magenta: "\x1b[35m",
	red: "\x1b[31m",
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

function checkResult<T>(result: T, expected?: T): string {
	if (expected === undefined) return "";
	const passed = result === expected;
	if (passed) {
		return ` ${colors.green}✔ PASS${colors.reset}`;
	}
	return ` ${colors.red}✘ FAIL${colors.reset} ${colors.dim}(expected: ${expected})${colors.reset}`;
}

export function run<T>(name: string, fn: () => T, expected?: T, runs = 3): T {
	console.log(
		`${timestamp()} ${colors.cyan}▶${colors.reset} ${colors.bold}${name}${colors.reset} starting (x${runs})...`,
	);

	const durations: number[] = [];
	let result: T;

	for (let i = 0; i < runs; i++) {
		const start = performance.now();
		result = fn();
		durations.push(performance.now() - start);
	}

	const min = Math.min(...durations);
	const max = Math.max(...durations);
	const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

	console.log(
		`${timestamp()} ${colors.green}✓${colors.reset} ${colors.bold}${name}${colors.reset} avg: ${formatDuration(avg)} ${colors.dim}(min: ${formatDuration(min)}${colors.dim}, max: ${formatDuration(max)}${colors.dim})${colors.reset}`,
	);
	console.log(
		`  ${colors.dim}→${colors.reset} ${result!}${checkResult(result!, expected)}\n`,
	);

	return result!;
}
