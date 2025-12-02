# 🎄 Advent of Code 2025

TypeScript solutions for [Advent of Code](https://adventofcode.com/) challenges, powered by [Bun](https://bun.sh).

## 🏆 Join the Private Leaderboard!

Want to compete and compare solutions? Join the private leaderboard:

**Code:** `1663489-c3aa9b4d`

To join:
1. Go to [Advent of Code Private Leaderboards](https://adventofcode.com/2025/leaderboard/private)
2. Enter the code above
3. Start competing! 🎯

## 🚀 Quick Start

### Install Dependencies

```bash
bun install
```

### Run a Solution

```bash
bun 2025/day1/index.ts
```

## 📁 Project Structure

```
aoc-2025/
├── 2025/
│   ├── day1/
│   │   ├── index.ts      # Solution code
│   │   ├── example.txt   # Example input from puzzle
│   │   └── input.txt     # Personal puzzle input
│   └── day2/
│       └── ...
├── shared/
│   └── timings.ts        # Utility for timing & validation
└── generate-day.ts       # Script to scaffold new days
```

## 🛠️ Generate a New Day

Quickly scaffold a new day's solution:

```bash
bun generate-day.ts <day> [year]
```

**Examples:**
```bash
# Generate day 3 for current year
bun generate-day.ts 3

# Generate day 15 for year 2024
bun generate-day.ts 15 2024
```

This creates:
- `index.ts` with template code
- `example.txt` for test input
- `input.txt` with your puzzle input (if SESSION is set)

### 🔑 Automatic Input Fetching

Set your session cookie to automatically fetch puzzle inputs:

```bash
export SESSION="your_session_cookie_here"
```

To find your session cookie:
1. Log in to [adventofcode.com](https://adventofcode.com)
2. Open browser DevTools (F12)
3. Go to Application/Storage → Cookies
4. Copy the value of the `session` cookie

## 🎯 Features

### Timing & Validation Utility

The `shared/timings.ts` module provides:
- **Performance measurement** - Track execution time
- **Result validation** - Compare against expected values
- **Colorized output** - Beautiful (🤓) console formatting
- **Timestamps** - Know exactly when each part runs

**Usage:**

```typescript
import { run } from "../../shared/timings";

// Basic usage
run("Part 1", () => part1(input));

// With expected value validation
run("Part 1 (example)", () => part1(example), 42);

// Async support
await runAsync("Part 2", async () => await part2(input), 123);
```

**Output example:**
```
12:34:56.789 ▶ Part 1 (example) starting...
12:34:56.791 ✓ Part 1 (example) finished in 1.23ms
  → 42 ✔ PASS

12:34:56.792 ▶ Part 1 starting...
12:34:56.845 ✓ Part 1 finished in 52.34ms
  → 1337
```

## 📝 Solution Template

Each generated day follows this structure:

```typescript
import { run } from "../../shared/timings";

function part1(lines: string[]) {
	// TODO: Implement part 1
	return 0;
}

function part2(lines: string[]) {
	// TODO: Implement part 2
	return 0;
}

const example = (await Bun.file(`${import.meta.dir}/example.txt`).text())
	.split("\n")
	.map((line) => line.trim());

const input = (await Bun.file(`${import.meta.dir}/input.txt`).text())
	.split("\n")
	.map((line) => line.trim());

run("Part 1 (example)", () => part1(example) /*, expected */);
run("Part 1", () => part1(input) /*, expected */);

// run("Part 2 (example)", () => part2(example) /*, expected */);
// run("Part 2", () => part2(input) /*, expected */);
```

## 🧹 Code Quality

This project uses [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check code
bun biome check .

# Fix issues
bun biome check --write .
```

## 📚 Resources

- [Advent of Code](https://adventofcode.com/)
- [Bun Documentation](https://bun.sh/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🎁 Happy Coding!

May your algorithms be efficient and your edge cases few! 🎅✨
