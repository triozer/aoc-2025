# AOC 2025 - Day 3

## The Problem

You have banks of batteries, each represented as a line of digits. You need to turn on exactly **k** batteries to produce the largest possible joltage. The joltage is the number formed by the digits of the batteries you turn on, **in their original order** (no rearranging!).

## Summary

| Part  | Question                              | Strategy                                                |
| ----- | ------------------------------------- | ------------------------------------------------------- |
| **1** | Largest joltage with **2** batteries  | Try each position as first digit, pair with max after   |
| **2** | Largest joltage with **12** batteries | Greedy selection: pick max digit in valid range, repeat |

### Part 1: Pick 2 Batteries

**Goal:** Find the two digits (in order) that form the largest 2-digit number.

#### The Tricky Part

The key insight is that we can't just find the two largest digits - we must respect the **ordering constraint**.

Consider `818181911112111`:
- The largest digits are `9` and `8`
- But the `9` is at position 6, and there's no `8` **after** it
- The best digit after `9` is `2` (at position 11)
- So the answer is `92`, not `98`!

#### The Solution

Try **every position** as the first digit, pair it with the maximum digit that comes after:

```typescript
for (let i = 0; i < digits.length - 1; i++) {
    const max = Math.max(...digits.slice(i + 1));
    const joltage = digits[i] * 10 + max;
    maxJoltage = Math.max(maxJoltage, joltage);
}
```

For Part 1, I just went with the simplest approach that works. It's O(n²) but n is small, so who cares? 🏎️💨

### Part 2: Pick 12 Batteries

Now we need to select **12** digits. The brute-force approach (try all combinations) would be astronomical. Time for a smarter strategy!

#### The Greedy Insight 💡

To maximize a number, we want the **leftmost digits to be as large as possible**. This suggests a greedy approach:

1. For the **1st** digit: pick the max from a range that leaves 11 digits remaining
2. For the **2nd** digit: pick the max from positions after our 1st pick, leaving 10 remaining
3. ...and so on

#### The Valid Range

If we have `n` digits and need to pick `k`, when choosing the `i`-th digit (0-indexed):
- **Start:** right after our previous pick (`prevPos + 1`)
- **End:** position `n - k + i` (must leave enough digits for remaining picks)

```
String: 234234234234278 (n=15, k=12)
                      
Pick 1: Search [0, 3]  → Find '4' at index 2
Pick 2: Search [3, 4]  → Find '3' at index 4  
Pick 3: Search [5, 5]  → Find '4' at index 5
...continues...
Result: 434234234278 ✓
```

#### The Code

```typescript
for (let i = 0; i < k; i++) {
    const startPos = prevPos + 1;
    const endPos = n - k + i;

    let maxDigit = -1;
    let maxPos = startPos;
    for (let j = startPos; j <= endPos; j++) {
        if (digits[j] > maxDigit) {
            maxDigit = digits[j];
            maxPos = j;
        }
    }

    result += maxDigit.toString();
    prevPos = maxPos;
}
```

#### Why BigInt?

12-digit numbers like `987654321111` exceed JavaScript's safe integer limit (`Number.MAX_SAFE_INTEGER` ≈ 9 quadrillion). We use `BigInt` to avoid precision loss when summing.

### The Refactor: One Function to Rule Them All

Since both parts use the same greedy algorithm (just with different `k` values), I unified them into a single `solve(lines, k)` function:

```typescript
function solve(lines: string[], k: number): bigint {
    let total = 0n;

    for (const line of lines) {
        const digits = line.split("").map(Number);
        const n = digits.length;

        let result = "";
        let prevPos = -1;

        for (let i = 0; i < k; i++) {
            const startPos = prevPos + 1;
            const endPos = n - k + i;

            let maxDigit = -1;
            let maxPos = startPos;
            for (let j = startPos; j <= endPos; j++) {
                const digit = digits[j];
                if (digit === undefined || digit <= maxDigit) continue;
                maxDigit = digit;
                maxPos = j;
            }

            result += maxDigit.toString();
            prevPos = maxPos;
        }

        total += BigInt(result);
    }

    return total;
}

// Part 1: k=2, Part 2: k=12
run("Part 1", () => solve(input, 2));
run("Part 2", () => solve(input, 12));
```

Clean, simple, and works for any `k`! 🎯
