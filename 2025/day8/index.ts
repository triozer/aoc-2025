import { run } from "../../shared/timings";

interface Point {
	x: number;
	y: number;
	z: number;
}

function squaredDistance(a: Point, b: Point): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return dx * dx + dy * dy + dz * dz;
}

// Union-Find data structure for tracking connected components
class UnionFind {
	private parent: number[];
	private rank: number[];
	private sizes: number[];

	constructor(n: number) {
		this.parent = Array.from({ length: n }, (_, i) => i);
		this.rank = Array(n).fill(0);
		this.sizes = Array(n).fill(1);
	}

	find(x: number): number {
		if (this.parent[x] !== x) {
			this.parent[x] = this.find(this.parent[x]);
		}
		return this.parent[x];
	}

	union(x: number, y: number): boolean {
		const rootX = this.find(x);
		const rootY = this.find(y);
		if (rootX === rootY) return false;

		if (this.rank[rootX] < this.rank[rootY]) {
			this.parent[rootX] = rootY;
			this.sizes[rootY] += this.sizes[rootX];
		} else if (this.rank[rootX] > this.rank[rootY]) {
			this.parent[rootY] = rootX;
			this.sizes[rootX] += this.sizes[rootY];
		} else {
			this.parent[rootY] = rootX;
			this.sizes[rootX] += this.sizes[rootY];
			this.rank[rootX]++;
		}
		return true;
	}

	componentSizes(): number[] {
		const sizes: number[] = [];
		for (let i = 0; i < this.parent.length; i++) {
			if (this.parent[i] === i) sizes.push(this.sizes[i]);
		}
		return sizes.sort((a, b) => b - a);
	}
}

interface Pair {
	i: number;
	j: number;
	distance: number;
}

// Max-heap to keep track of K smallest pairs
class BoundedMaxHeap<T extends { distance: number }> {
	private heap: T[] = [];
	private capacity: number;

	constructor(capacity: number) {
		this.capacity = capacity;
	}

	push(item: T) {
		if (this.heap.length < this.capacity) {
			this.heap.push(item);
			this.up(this.heap.length - 1);
		} else if (item.distance < this.heap[0].distance) {
			this.heap[0] = item;
			this.down(0);
		}
	}

	pairs(): T[] {
		return [...this.heap].sort((a, b) => a.distance - b.distance);
	}

	private up(idx: number) {
		while (idx > 0) {
			const parent = (idx - 1) >> 1;
			if (this.heap[parent].distance >= this.heap[idx].distance) break;
			[this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
			idx = parent;
		}
	}

	private down(idx: number) {
		while (true) {
			const left = (idx << 1) + 1;
			const right = left + 1;
			let largest = idx;

			if (
				left < this.heap.length &&
				this.heap[left].distance > this.heap[largest].distance
			) {
				largest = left;
			}
			if (
				right < this.heap.length &&
				this.heap[right].distance > this.heap[largest].distance
			) {
				largest = right;
			}
			if (largest === idx) break;

			[this.heap[largest], this.heap[idx]] = [
				this.heap[idx],
				this.heap[largest],
			];
			idx = largest;
		}
	}
}

function part1(points: Point[], k: number) {
	const n = points.length;

	const heap = new BoundedMaxHeap<Pair>(k);
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			heap.push({ i, j, distance: squaredDistance(points[i], points[j]) });
		}
	}

	const uf = new UnionFind(n);
	for (const { i, j } of heap.pairs()) {
		uf.union(i, j);
	}

	const sizes = uf.componentSizes();
	return sizes[0] * sizes[1] * sizes[2];
}

class MinHeap<T extends { distance: number }> {
	private heap: T[] = [];

	push(item: T) {
		this.heap.push(item);
		this.up(this.heap.length - 1);
	}

	pop(): T | undefined {
		if (this.heap.length === 0) return undefined;
		const result = this.heap[0];
		const last = this.heap.pop();
		if (last && this.heap.length > 0) {
			this.heap[0] = last;
			this.down(0);
		}
		return result;
	}

	get size() {
		return this.heap.length;
	}

	private up(i: number) {
		while (i > 0) {
			const parent = (i - 1) >> 1;
			if (this.heap[parent].distance <= this.heap[i].distance) break;
			[this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
			i = parent;
		}
	}

	private down(i: number) {
		while (true) {
			const left = (i << 1) + 1;
			const right = left + 1;
			let smallest = i;

			if (
				left < this.heap.length &&
				this.heap[left].distance < this.heap[smallest].distance
			) {
				smallest = left;
			}
			if (
				right < this.heap.length &&
				this.heap[right].distance < this.heap[smallest].distance
			) {
				smallest = right;
			}
			if (smallest === i) break;

			[this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
			i = smallest;
		}
	}
}
function part2(points: Point[]) {
	const n = points.length;
	const inTree = new Array<boolean>(n).fill(false);
	const heap = new MinHeap<Pair>();

	inTree[0] = true;
	let treeSize = 1;
	for (let j = 1; j < n; j++) {
		heap.push({ i: 0, j, distance: squaredDistance(points[0], points[j]) });
	}

	let lastFrom = 0;
	let lastTo = 0;

	while (treeSize < n && heap.size > 0) {
		const edge = heap.pop()!;
		if (inTree[edge.j]) continue;

		inTree[edge.j] = true;
		treeSize++;
		lastFrom = edge.i;
		lastTo = edge.j;

		for (let j = 0; j < n; j++) {
			if (!inTree[j]) {
				heap.push({
					i: edge.j,
					j,
					distance: squaredDistance(points[edge.j], points[j]),
				});
			}
		}
	}

	return points[lastFrom].x * points[lastTo].x;
}

function parsePoints(lines: string[]): Point[] {
	const points: Point[] = [];
	for (const line of lines) {
		const [x, y, z] = line.split(",").map(Number);
		if (x === undefined || y === undefined || z === undefined) continue;
		points.push({ x, y, z });
	}
	return points;
}

const example = (await Bun.file(`${import.meta.dir}/example.txt`).text())
	.split("\n")
	.map((line) => line.trim());

const input = (await Bun.file(`${import.meta.dir}/input.txt`).text())
	.split("\n")
	.map((line) => line.trim());

run("Part 1 (example)", () => part1(parsePoints(example), 10), 40);
run("Part 1", () => part1(parsePoints(input), 1000));

run("Part 2 (example)", () => part2(parsePoints(example)), 25272);
run("Part 2", () => part2(parsePoints(input)));
