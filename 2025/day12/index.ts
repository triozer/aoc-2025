// https://rarewood.dev/aoc-2025/day-12
// https://adventofcode.com/2025/day/12

import { run } from "../../shared/timings";

interface Region {
  w: number;
  h: number;
  counts: number[];
}

function parseInput(inputText: string): {
  shapeArea: number[];
  regions: Region[];
} {
  const lines = inputText.split(/\r?\n/);

  const shapes = new Map<number, string[]>();
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]?.trim() ?? "";
    const m = line.match(/^(\d+):$/);
    if (!m) break;

    const idx = Number(m[1]);
    i += 1;

    const rows: string[] = [];
    while (i < lines.length && (lines[i]?.trim() ?? "") !== "") {
      rows.push(lines[i] ?? "");
      i += 1;
    }
    shapes.set(idx, rows);

    while (i < lines.length && (lines[i]?.trim() ?? "") === "") i += 1;
  }

  const shapeArea: number[] = [];
  const keys = [...shapes.keys()].sort((a, b) => a - b);
  for (const k of keys) {
    const rows = shapes.get(k) ?? [];
    let area = 0;
    for (const row of rows) {
      for (let j = 0; j < row.length; j++) {
        if (row[j] === "#") area += 1;
      }
    }
    shapeArea.push(area);
  }

  const regions: Region[] = [];
  while (i < lines.length) {
    const line = (lines[i]?.trim() ?? "").trim();
    i += 1;
    if (!line) continue;

    const m = line.match(/^(\d+)x(\d+):\s*(.*)$/);
    if (!m) continue;

    const w = Number(m[1]);
    const h = Number(m[2]);
    const countsText = (m[3] ?? "").trim();
    const counts = countsText ? countsText.split(/\s+/).map(Number) : [];
    regions.push({ w, h, counts });
  }

  return { shapeArea, regions };
}

function part1(inputText: string) {
  const { shapeArea, regions } = parseInput(inputText);

  let ok = 0;
  for (const { w, h, counts } of regions) {
    let presentArea = 0;
    const n = Math.min(counts.length, shapeArea.length);
    for (let j = 0; j < n; j++) {
      presentArea += (counts[j] ?? 0) * (shapeArea[j] ?? 0);
    }
    if (presentArea <= w * h) ok += 1;
  }

  return ok;
}

const exampleText = await Bun.file(`${import.meta.dir}/example.txt`).text();
const inputText = await Bun.file(`${import.meta.dir}/input.txt`).text();

run("Part 1 (example)", () => part1(exampleText), 3);
run("Part 1", () => part1(inputText));
