// Day 9: Movie Theater - Rectangle Finder
// Visualizes finding the largest rectangle with red tile corners

import {
    useEffect,
    useState,
    useMemo,
    useRef,
    startTransition,
    useCallback,
    type CSSProperties,
} from "react"
import { addPropertyControls, ControlType } from "framer"

interface Point {
    x: number
    y: number
}

interface Range {
    start: number
    end: number
}

interface HorizontalEdge {
    y: number
    x1: number
    x2: number
}

interface VerticalEdge {
    x: number
    y1: number
    y2: number
}

interface Day9Props {
    puzzleInput: string
    part: "part1" | "part2"
    speed: number
    accentColor: string
    resultColor: string
    autoPlay: boolean
    font: CSSProperties
    style?: CSSProperties
}

type Phase =
    | "collecting_pairs"
    | "building_polygon"
    | "scanning"
    | "checking"
    | "complete"

// Event log types
type LogEntryType = "info" | "success" | "warning" | "error" | "step"

interface LogEntry {
    message: string
    type?: LogEntryType
    detail?: string
}

// Parse points from input
function parsePoints(input: string): Point[] {
    return input
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
            const [x, y] = line.split(",").map(Number)
            return { x, y }
        })
        .filter((p) => !Number.isNaN(p.x) && !Number.isNaN(p.y))
}

// Calculate area of rectangle with inclusive coordinates
function area(p1: Point, p2: Point): number {
    return (Math.abs(p2.x - p1.x) + 1) * (Math.abs(p2.y - p1.y) + 1)
}

// Build polygon edges from points
function buildEdges(points: Point[]): {
    horizontal: HorizontalEdge[]
    vertical: VerticalEdge[]
} {
    const n = points.length
    const horizontal: HorizontalEdge[] = []
    const vertical: VerticalEdge[] = []

    for (let i = 0; i < n; i++) {
        const p1 = points[i]
        const p2 = points[(i + 1) % n]

        if (p1.y === p2.y) {
            horizontal.push({
                y: p1.y,
                x1: Math.min(p1.x, p2.x),
                x2: Math.max(p1.x, p2.x),
            })
        } else {
            vertical.push({
                x: p1.x,
                y1: Math.min(p1.y, p2.y),
                y2: Math.max(p1.y, p2.y),
            })
        }
    }

    return { horizontal, vertical }
}

// Get interior ranges at a given Y using scanline
function getInteriorAtY(y: number, verticalEdges: VerticalEdge[]): Range[] {
    const crossingXs = verticalEdges
        .filter((e) => e.y1 < y && e.y2 > y)
        .map((e) => e.x)
        .sort((a, b) => a - b)

    const ranges: Range[] = []
    for (let i = 0; i < crossingXs.length; i += 2) {
        if (i + 1 < crossingXs.length) {
            ranges.push({ start: crossingXs[i], end: crossingXs[i + 1] })
        }
    }
    return ranges
}

// Merge overlapping ranges
function mergeRanges(ranges: Range[]): Range[] {
    if (ranges.length === 0) return []
    const sorted = [...ranges].sort((a, b) => a.start - b.start)
    const merged: Range[] = []
    for (const r of sorted) {
        const last = merged[merged.length - 1]
        if (!last || last.end < r.start) {
            merged.push({ start: r.start, end: r.end })
        } else {
            last.end = Math.max(last.end, r.end)
        }
    }
    return merged
}

// Get coverage at Y considering vertices and horizontal edges
function getCoverageAtY(
    y: number,
    points: Point[],
    verticalEdges: VerticalEdge[],
    horizontalEdges: HorizontalEdge[],
    coverageCache: Map<number, Range[]>
): Range[] {
    const cached = coverageCache.get(y)
    if (cached) return cached

    const eps = 0.5
    const isAtVertex = points.some((p) => p.y === y)

    const coverage = isAtVertex
        ? mergeRanges([
              ...getInteriorAtY(y + eps, verticalEdges),
              ...getInteriorAtY(y - eps, verticalEdges),
              ...horizontalEdges
                  .filter((e) => e.y === y)
                  .map((e) => ({ start: e.x1, end: e.x2 })),
          ])
        : getInteriorAtY(y, verticalEdges)

    coverageCache.set(y, coverage)
    return coverage
}

// Check if a cell is inside the polygon (for visualization)
function isCellInPolygon(
    x: number,
    y: number,
    points: Point[],
    verticalEdges: VerticalEdge[],
    horizontalEdges: HorizontalEdge[],
    coverageCache: Map<number, Range[]>
): boolean {
    const coverage = getCoverageAtY(
        y,
        points,
        verticalEdges,
        horizontalEdges,
        coverageCache
    )
    return coverage.some((r) => r.start <= x && r.end >= x)
}

// Check if rectangle is entirely within polygon
function isRectangleValid(
    p1: Point,
    p2: Point,
    ySamples: number[],
    points: Point[],
    verticalEdges: VerticalEdge[],
    horizontalEdges: HorizontalEdge[],
    coverageCache: Map<number, Range[]>
): boolean {
    const minX = Math.min(p1.x, p2.x)
    const maxX = Math.max(p1.x, p2.x)
    const minY = Math.min(p1.y, p2.y)
    const maxY = Math.max(p1.y, p2.y)

    for (const y of ySamples) {
        if (y < minY || y > maxY) continue
        const coverage = getCoverageAtY(
            y,
            points,
            verticalEdges,
            horizontalEdges,
            coverageCache
        )
        const isCovered = coverage.some((r) => r.start <= minX && r.end >= maxX)
        if (!isCovered) return false
    }

    return true
}

// Generate all pairs for testing
function generatePairs(n: number): [number, number][] {
    const pairs: [number, number][] = []
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            pairs.push([i, j])
        }
    }
    return pairs
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function Day9MovieTheater(props: Day9Props) {
    const {
        puzzleInput,
        part = "part1",
        speed = 1,
        accentColor = "#d946ef",
        resultColor = "#22c55e",
        autoPlay = true,
        font,
    } = props

    // Standardized color tokens
    const theme = {
        bg: "transparent",
        cardBg: "#1f2937",
        surfaceBg: "#374151",
        text: "#1f2937",
        textInverse: "#f3f4f6",
        textMuted: "#9ca3af",
        border: "#e5e7eb",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        neutral: "#f3f4f6",
        neutralDark: "#374151",
        red: "#ef4444",
        green: "#22c55e",
    }

    // Start when in view
    const [isInView, setIsInView] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const logContainerRef = useRef<HTMLDivElement>(null)

    // Parse points
    const points = useMemo(() => parsePoints(puzzleInput), [puzzleInput])

    // Calculate bounds
    const bounds = useMemo(() => {
        if (points.length === 0) return { minX: 0, maxX: 10, minY: 0, maxY: 10 }
        let minX = Infinity,
            maxX = -Infinity
        let minY = Infinity,
            maxY = -Infinity
        for (const p of points) {
            minX = Math.min(minX, p.x)
            maxX = Math.max(maxX, p.x)
            minY = Math.min(minY, p.y)
            maxY = Math.max(maxY, p.y)
        }
        return { minX, maxX, minY, maxY }
    }, [points])

    // Build edges for part 2
    const { horizontal: horizontalEdges, vertical: verticalEdges } = useMemo(
        () => buildEdges(points),
        [points]
    )

    // Build Y samples for part 2
    const ySamples = useMemo((): number[] => {
        const yValues = points.map((p) => p.y)
        const uniqueY = [...new Set(yValues)].sort((a, b) => a - b)
        const samples: number[] = []
        for (let i = 0; i < uniqueY.length; i++) {
            const y = uniqueY[i]
            if (y === undefined) continue
            samples.push(y)
            if (i + 1 < uniqueY.length) {
                const nextY = uniqueY[i + 1]
                if (nextY === undefined) continue
                samples.push((y + nextY) / 2)
            }
        }
        return samples
    }, [points])

    // Coverage cache for part 2
    const coverageCache = useRef(new Map<number, Range[]>())

    // Pre-compute polygon interior for visualization
    const polygonInterior = useMemo(() => {
        if (part !== "part2") return new Set<string>()
        const interior = new Set<string>()
        coverageCache.current.clear()

        for (let y = bounds.minY; y <= bounds.maxY; y++) {
            for (let x = bounds.minX; x <= bounds.maxX; x++) {
                if (
                    isCellInPolygon(
                        x,
                        y,
                        points,
                        verticalEdges,
                        horizontalEdges,
                        coverageCache.current
                    )
                ) {
                    interior.add(`${x},${y}`)
                }
            }
        }
        return interior
    }, [points, bounds, part, verticalEdges, horizontalEdges])

    // Generate pairs to test
    const allPairs = useMemo(
        () => generatePairs(points.length),
        [points.length]
    )

    // Animation state
    const [phase, setPhase] = useState<Phase>(
        part === "part2" ? "building_polygon" : "collecting_pairs"
    )
    const [currentEdgeIndex, setCurrentEdgeIndex] = useState(0)
    const [collectingFromPoint, setCollectingFromPoint] = useState(0)
    const [collectedPairsCount, setCollectedPairsCount] = useState(0)
    const [currentPairIndex, setCurrentPairIndex] = useState(0)
    const [testedPairs, setTestedPairs] = useState(0)
    const [validPairs, setValidPairs] = useState(0)
    const [bestRectangle, setBestRectangle] = useState<{
        p1: Point
        p2: Point
        area: number
    } | null>(null)
    const [currentRectangle, setCurrentRectangle] = useState<{
        p1: Point
        p2: Point
    } | null>(null)
    const [isCurrentValid, setIsCurrentValid] = useState<boolean | null>(null)

    // Event log state
    const [eventLog, setEventLog] = useState<LogEntry[]>([])

    // Auto-scroll event log
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop =
                logContainerRef.current.scrollHeight
        }
    }, [eventLog])

    const addLogEntry = useCallback(
        (message: string, type: LogEntryType = "info", detail?: string) => {
            setEventLog((prev) => [
                ...prev.slice(-100),
                { message, type, detail },
            ])
        },
        []
    )

    const getLogColor = (type: LogEntryType = "info") => {
        switch (type) {
            case "success":
                return theme.success
            case "warning":
                return theme.warning
            case "error":
                return theme.error
            case "step":
                return accentColor
            default:
                return theme.textMuted
        }
    }

    const getLogPrefix = (type: LogEntryType = "info") => {
        switch (type) {
            case "success":
                return "✓"
            case "warning":
                return "!"
            case "error":
                return "✗"
            case "step":
                return "→"
            default:
                return "•"
        }
    }

    // Speed for animation (faster for large datasets)
    const stepSpeed = Math.max(5, 150 / speed)
    const edgeSpeed = Math.max(50, 300 / speed)
    // Use batch size 1 for detailed logging
    const batchSize = 1

    // Reset state
    const resetState = useCallback(() => {
        startTransition(() => {
            setPhase(part === "part2" ? "building_polygon" : "collecting_pairs")
            setCurrentEdgeIndex(0)
            setCollectingFromPoint(0)
            setCollectedPairsCount(0)
            setCurrentPairIndex(0)
            setTestedPairs(0)
            setValidPairs(0)
            setBestRectangle(null)
            setCurrentRectangle(null)
            setIsCurrentValid(null)
            coverageCache.current.clear()

            if (part === "part2") {
                setEventLog([
                    {
                        message: `Day 9: Movie Theater - Part 2`,
                        type: "step",
                    },
                    {
                        message: `Loaded ${points.length} red tiles`,
                        type: "info",
                    },
                    {
                        message: `Building polygon (${points.length} edges)...`,
                        type: "step",
                    },
                ])
            } else {
                setEventLog([
                    {
                        message: `Day 9: Movie Theater - Part 1`,
                        type: "step",
                    },
                    {
                        message: `Loaded ${points.length} red tiles`,
                        type: "info",
                    },
                    {
                        message: `Collecting pairs...`,
                        type: "step",
                    },
                ])
            }
        })
    }, [points.length, part])

    const handleRestart = () => {
        resetState()
        setHasStarted(true)
        setIsInView(true)
    }

    useEffect(() => {
        resetState()
    }, [puzzleInput, part, resetState])

    // IntersectionObserver
    useEffect(() => {
        if (!containerRef.current) return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasStarted) {
                    setIsInView(true)
                    setHasStarted(true)
                }
            },
            { threshold: 0.3 }
        )
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [hasStarted])

    // Collecting pairs animation (Part 1 only)
    useEffect(() => {
        if (!isInView || phase !== "collecting_pairs" || !autoPlay) return

        if (collectingFromPoint >= points.length - 1) {
            // Done collecting pairs
            addLogEntry(`Collected ${allPairs.length} pairs!`, "success")
            addLogEntry(`Testing pairs...`, "step")
            setPhase("scanning")
            return
        }

        const timer = setTimeout(() => {
            startTransition(() => {
                const fromPoint = points[collectingFromPoint]
                const pairsFromThis = points.length - 1 - collectingFromPoint

                addLogEntry(
                    `Point #${collectingFromPoint + 1} (${fromPoint.x},${fromPoint.y})`,
                    "info",
                    `+${pairsFromThis} pairs`
                )

                setCollectedPairsCount((prev) => prev + pairsFromThis)
                setCollectingFromPoint((prev) => prev + 1)
            })
        }, edgeSpeed)

        return () => clearTimeout(timer)
    }, [
        isInView,
        phase,
        autoPlay,
        collectingFromPoint,
        points,
        edgeSpeed,
        allPairs.length,
        addLogEntry,
    ])

    // Polygon building animation (Part 2 only)
    useEffect(() => {
        if (!isInView || phase !== "building_polygon" || !autoPlay) return
        if (currentEdgeIndex >= points.length) {
            // Done building polygon, transition to scanning
            addLogEntry("Polygon complete!", "success")
            addLogEntry(`Interior: ${polygonInterior.size} green tiles`, "info")
            addLogEntry(`Testing ${allPairs.length} pairs...`, "step")
            setPhase("scanning")
            return
        }

        const timer = setTimeout(() => {
            startTransition(() => {
                const p1 = points[currentEdgeIndex]
                const p2 = points[(currentEdgeIndex + 1) % points.length]
                const edgeType = p1.y === p2.y ? "horizontal" : "vertical"
                addLogEntry(
                    `Edge ${currentEdgeIndex + 1}: (${p1.x},${p1.y}) → (${p2.x},${p2.y})`,
                    "info",
                    edgeType
                )
                setCurrentEdgeIndex((prev) => prev + 1)
            })
        }, edgeSpeed)

        return () => clearTimeout(timer)
    }, [
        isInView,
        phase,
        autoPlay,
        currentEdgeIndex,
        points,
        edgeSpeed,
        polygonInterior.size,
        allPairs.length,
        addLogEntry,
    ])

    // Main animation loop
    useEffect(() => {
        if (!isInView || phase !== "scanning" || !autoPlay) return
        if (currentPairIndex >= allPairs.length) {
            setPhase("complete")
            addLogEntry("Scan complete!", "success")
            if (part === "part2") {
                addLogEntry(
                    `Cache: ${coverageCache.current.size} Y-levels stored`,
                    "info"
                )
            }
            if (bestRectangle) {
                addLogEntry(
                    `Best: (${bestRectangle.p1.x},${bestRectangle.p1.y}) ↔ (${bestRectangle.p2.x},${bestRectangle.p2.y})`,
                    "success"
                )
                addLogEntry(`Max area: ${bestRectangle.area}`, "success")
            }
            return
        }

        const timer = setTimeout(() => {
            startTransition(() => {
                let newBest = bestRectangle
                let newValidCount = validPairs
                let lastRect: { p1: Point; p2: Point } | null = null
                let lastValid: boolean | null = null

                // Process a batch of pairs
                for (
                    let b = 0;
                    b < batchSize && currentPairIndex + b < allPairs.length;
                    b++
                ) {
                    const pairNum = currentPairIndex + b + 1
                    const [i, j] = allPairs[currentPairIndex + b]
                    const p1 = points[i]
                    const p2 = points[j]

                    lastRect = { p1, p2 }
                    const rectArea = area(p1, p2)

                    // Log the pair being tested
                    addLogEntry(
                        `#${pairNum}: (${p1.x},${p1.y}) ↔ (${p2.x},${p2.y})`,
                        "step",
                        `area=${rectArea}`
                    )

                    let isValid = true
                    if (part === "part1") {
                        // Part 1: all pairs are valid, just check if it's the best
                        addLogEntry(`  Checking area...`, "info")
                    }
                    if (part === "part2") {
                        // Check rectangle validity with detailed logging
                        const minX = Math.min(p1.x, p2.x)
                        const maxX = Math.max(p1.x, p2.x)
                        const minY = Math.min(p1.y, p2.y)
                        const maxY = Math.max(p1.y, p2.y)

                        let failedAtY: number | null = null
                        const cacheHits: number[] = []
                        const cacheMisses: number[] = []

                        for (const y of ySamples) {
                            if (y < minY || y > maxY) continue

                            // Check if this Y was cached
                            const wasCached =
                                coverageCache.current.has(y)
                            if (wasCached) {
                                cacheHits.push(y)
                            } else {
                                cacheMisses.push(y)
                            }

                            const coverage = getCoverageAtY(
                                y,
                                points,
                                verticalEdges,
                                horizontalEdges,
                                coverageCache.current
                            )
                            const isCovered = coverage.some(
                                (r) => r.start <= minX && r.end >= maxX
                            )
                            if (!isCovered) {
                                failedAtY = y
                                isValid = false
                                break
                            }
                        }

                        if (cacheHits.length > 0) {
                            addLogEntry(
                                `  Cache hits: ${cacheHits.length} Y-levels`,
                                "info"
                            )
                        }
                        if (cacheMisses.length > 0) {
                            addLogEntry(
                                `  Computed: ${cacheMisses.length} Y-levels`,
                                "info"
                            )
                        }

                        if (!isValid && failedAtY !== null) {
                            addLogEntry(
                                `  Invalid: not covered at Y=${failedAtY}`,
                                "error"
                            )
                        } else if (isValid) {
                            addLogEntry(
                                `  Valid: all ${cacheHits.length + cacheMisses.length} Y-levels covered`,
                                "success"
                            )
                        }
                    }

                    lastValid = isValid

                    if (isValid) {
                        newValidCount++
                        if (!newBest || rectArea > newBest.area) {
                            newBest = { p1, p2, area: rectArea }
                            addLogEntry(
                                `  ★ New best! area=${rectArea}`,
                                "success"
                            )
                        }
                    }
                }

                setCurrentRectangle(lastRect)
                setIsCurrentValid(lastValid)
                setTestedPairs((prev) => prev + batchSize)
                setValidPairs(newValidCount)
                setBestRectangle(newBest)
                setCurrentPairIndex((prev) => prev + batchSize)
            })
        }, stepSpeed)

        return () => clearTimeout(timer)
    }, [
        isInView,
        phase,
        autoPlay,
        currentPairIndex,
        allPairs,
        points,
        part,
        stepSpeed,
        batchSize,
        bestRectangle,
        validPairs,
        ySamples,
        verticalEdges,
        horizontalEdges,
        addLogEntry,
    ])

    // Grid dimensions for visualization (with +1 padding on each side)
    const padding = 1
    const gridWidth = bounds.maxX - bounds.minX + 1 + padding * 2
    const gridHeight = bounds.maxY - bounds.minY + 1 + padding * 2
    const gridMinX = bounds.minX - padding
    const gridMinY = bounds.minY - padding

    // Check if a point is red
    const redPoints = useMemo(() => {
        const set = new Set<string>()
        for (const p of points) {
            set.add(`${p.x},${p.y}`)
        }
        return set
    }, [points])

    return (
        <div
            ref={containerRef}
            style={{
                ...props.style,
                backgroundColor: theme.bg,
                display: "flex",
                flexDirection: "column",
                padding: "20px",
                overflow: "hidden",
                width: "100%",
                height: "100%",
                fontFamily: "inherit",
                color: theme.text,
            }}
        >
            {/* Two-Column Layout */}
            <div
                style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "1fr 280px",
                    gap: "24px",
                    width: "100%",
                    minHeight: 0,
                }}
            >
                {/* Left Column - Grid Visualization */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                    }}
                >
                    {/* Section Title */}
                    <div
                        style={{
                            fontSize: "10px",
                            fontWeight: "bold",
                            color: theme.textMuted,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            marginBottom: "8px",
                        }}
                    >
                        {phase === "building_polygon"
                            ? "Building Polygon"
                            : phase === "collecting_pairs"
                              ? "Collecting Pairs"
                              : "Tile Grid"}
                    </div>

                    {/* Stats Row */}
                    <div
                        style={{
                            display: "flex",
                            gap: "12px",
                            marginBottom: "12px",
                            flexWrap: "wrap",
                        }}
                    >
                        {/* Red Tiles */}
                        <div
                            style={{
                                padding: "8px 16px",
                                backgroundColor: theme.cardBg,
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                minWidth: "70px",
                            }}
                        >
                            <span
                                style={{
                                    ...font,
                                    fontSize: "10px",
                                    color: theme.textMuted,
                                    textTransform: "uppercase",
                                }}
                            >
                                Red Tiles
                            </span>
                            <span
                                style={{
                                    ...font,
                                    fontSize: "18px",
                                    fontWeight: "bold",
                                    color: theme.red,
                                }}
                            >
                                {points.length}
                            </span>
                        </div>

                        {/* Collecting stats (Part 1, collecting phase) */}
                        {part === "part1" && phase === "collecting_pairs" && (
                            <>
                                <div
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: theme.cardBg,
                                        borderRadius: "8px",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        minWidth: "70px",
                                    }}
                                >
                                    <span
                                        style={{
                                            ...font,
                                            fontSize: "10px",
                                            color: theme.textMuted,
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        Point
                                    </span>
                                    <span
                                        style={{
                                            ...font,
                                            fontSize: "18px",
                                            fontWeight: "bold",
                                            color: accentColor,
                                        }}
                                    >
                                        {collectingFromPoint}/{points.length}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: theme.cardBg,
                                        borderRadius: "8px",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        minWidth: "70px",
                                    }}
                                >
                                    <span
                                        style={{
                                            ...font,
                                            fontSize: "10px",
                                            color: theme.textMuted,
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        Pairs
                                    </span>
                                    <span
                                        style={{
                                            ...font,
                                            fontSize: "18px",
                                            fontWeight: "bold",
                                            color: theme.success,
                                        }}
                                    >
                                        {collectedPairsCount}
                                    </span>
                                </div>
                            </>
                        )}

                        {/* Pairs Tested (hide during building/collecting phase) */}
                        {phase !== "building_polygon" &&
                            phase !== "collecting_pairs" && (
                                <div
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: theme.cardBg,
                                        borderRadius: "8px",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        minWidth: "70px",
                                    }}
                                >
                                    <span
                                        style={{
                                            ...font,
                                            fontSize: "10px",
                                            color: theme.textMuted,
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        Tested
                                    </span>
                                    <span
                                        style={{
                                            ...font,
                                            fontSize: "18px",
                                            fontWeight: "bold",
                                            color: accentColor,
                                        }}
                                    >
                                        {Math.min(testedPairs, allPairs.length)}
                                        /{allPairs.length}
                                    </span>
                                </div>
                            )}

                        {/* Edges (Part 2, building phase) */}
                        {part === "part2" && phase === "building_polygon" && (
                            <div
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: theme.cardBg,
                                    borderRadius: "8px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    minWidth: "70px",
                                }}
                            >
                                <span
                                    style={{
                                        ...font,
                                        fontSize: "10px",
                                        color: theme.textMuted,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Edges
                                </span>
                                <span
                                    style={{
                                        ...font,
                                        fontSize: "18px",
                                        fontWeight: "bold",
                                        color: theme.green,
                                    }}
                                >
                                    {currentEdgeIndex}/{points.length}
                                </span>
                            </div>
                        )}

                        {/* Valid (Part 2 only) */}
                        {part === "part2" && phase !== "building_polygon" && (
                            <div
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: theme.cardBg,
                                    borderRadius: "8px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    minWidth: "70px",
                                }}
                            >
                                <span
                                    style={{
                                        ...font,
                                        fontSize: "10px",
                                        color: theme.textMuted,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Valid
                                </span>
                                <span
                                    style={{
                                        ...font,
                                        fontSize: "18px",
                                        fontWeight: "bold",
                                        color: theme.success,
                                    }}
                                >
                                    {validPairs}
                                </span>
                            </div>
                        )}

                        {/* Best Area (hide during building/collecting phase) */}
                        {phase !== "building_polygon" &&
                            phase !== "collecting_pairs" && (
                                <div
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: theme.cardBg,
                                        borderRadius: "8px",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        minWidth: "90px",
                                    }}
                                >
                                    <span
                                        style={{
                                            ...font,
                                            fontSize: "10px",
                                            color: theme.textMuted,
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        Max Area
                                    </span>
                                    <span
                                        style={{
                                            ...font,
                                            fontSize: "18px",
                                            fontWeight: "bold",
                                            color: resultColor,
                                        }}
                                    >
                                        {bestRectangle?.area ?? "—"}
                                    </span>
                                </div>
                            )}
                    </div>

                    {/* ASCII Grid Visualization */}
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: theme.cardBg,
                            borderRadius: "8px",
                            padding: "16px",
                            overflow: "auto",
                            minHeight: "300px",
                        }}
                    >
                        <pre
                            style={{
                                ...font,
                                fontSize: Math.max(
                                    8,
                                    Math.min(
                                        14,
                                        300 / Math.max(gridWidth, gridHeight)
                                    )
                                ),
                                fontFamily: "monospace",
                                lineHeight: 1.1,
                                margin: 0,
                                letterSpacing: "0.1em",
                            }}
                        >
                            {Array.from({ length: gridHeight }).map(
                                (_, row) => {
                                    const rowChars = Array.from({
                                        length: gridWidth,
                                    }).map((_, col) => {
                                        const x = gridMinX + col
                                        const y = gridMinY + row
                                        const key = `${x},${y}`
                                        const isRed = redPoints.has(key)

                                        // Check if on a visible edge (for building phase)
                                        let isOnEdge = false
                                        if (part === "part2") {
                                            const edgesToShow =
                                                phase === "building_polygon"
                                                    ? currentEdgeIndex
                                                    : points.length
                                            for (
                                                let i = 0;
                                                i < edgesToShow;
                                                i++
                                            ) {
                                                const p1 = points[i]
                                                const p2 =
                                                    points[
                                                        (i + 1) % points.length
                                                    ]
                                                // Check if (x,y) is on edge from p1 to p2
                                                if (
                                                    p1.y === p2.y &&
                                                    y === p1.y
                                                ) {
                                                    // Horizontal edge
                                                    const minX = Math.min(
                                                        p1.x,
                                                        p2.x
                                                    )
                                                    const maxX = Math.max(
                                                        p1.x,
                                                        p2.x
                                                    )
                                                    if (
                                                        x >= minX &&
                                                        x <= maxX
                                                    ) {
                                                        isOnEdge = true
                                                        break
                                                    }
                                                } else if (
                                                    p1.x === p2.x &&
                                                    x === p1.x
                                                ) {
                                                    // Vertical edge
                                                    const minY = Math.min(
                                                        p1.y,
                                                        p2.y
                                                    )
                                                    const maxY = Math.max(
                                                        p1.y,
                                                        p2.y
                                                    )
                                                    if (
                                                        y >= minY &&
                                                        y <= maxY
                                                    ) {
                                                        isOnEdge = true
                                                        break
                                                    }
                                                }
                                            }
                                        }

                                        // Show interior only after polygon is built
                                        const showInterior =
                                            phase !== "building_polygon"
                                        const isGreen =
                                            part === "part2" &&
                                            showInterior &&
                                            !isRed &&
                                            !isOnEdge &&
                                            polygonInterior.has(key)

                                        // Check if this is the current collecting point (Part 1)
                                        const isCollectingPoint =
                                            phase === "collecting_pairs" &&
                                            collectingFromPoint <
                                                points.length &&
                                            points[collectingFromPoint]?.x ===
                                                x &&
                                            points[collectingFromPoint]?.y === y

                                        // Check if this is a point we're pairing with (future points)
                                        const isPairingTarget =
                                            phase === "collecting_pairs" &&
                                            collectingFromPoint <
                                                points.length &&
                                            points.some(
                                                (p, idx) =>
                                                    idx > collectingFromPoint &&
                                                    p.x === x &&
                                                    p.y === y
                                            )

                                        // Check if in best rectangle (show as O when complete)
                                        const inBestRect =
                                            bestRectangle &&
                                            phase === "complete" &&
                                            x >=
                                                Math.min(
                                                    bestRectangle.p1.x,
                                                    bestRectangle.p2.x
                                                ) &&
                                            x <=
                                                Math.max(
                                                    bestRectangle.p1.x,
                                                    bestRectangle.p2.x
                                                ) &&
                                            y >=
                                                Math.min(
                                                    bestRectangle.p1.y,
                                                    bestRectangle.p2.y
                                                ) &&
                                            y <=
                                                Math.max(
                                                    bestRectangle.p1.y,
                                                    bestRectangle.p2.y
                                                )

                                        // Check if in current rectangle being tested
                                        const inCurrentRect =
                                            currentRectangle &&
                                            phase === "scanning" &&
                                            x >=
                                                Math.min(
                                                    currentRectangle.p1.x,
                                                    currentRectangle.p2.x
                                                ) &&
                                            x <=
                                                Math.max(
                                                    currentRectangle.p1.x,
                                                    currentRectangle.p2.x
                                                ) &&
                                            y >=
                                                Math.min(
                                                    currentRectangle.p1.y,
                                                    currentRectangle.p2.y
                                                ) &&
                                            y <=
                                                Math.max(
                                                    currentRectangle.p1.y,
                                                    currentRectangle.p2.y
                                                )

                                        // When complete with best rect, gray out tiles outside it
                                        const isOutsideBestRect =
                                            phase === "complete" &&
                                            bestRectangle &&
                                            !(
                                                x >=
                                                    Math.min(
                                                        bestRectangle.p1.x,
                                                        bestRectangle.p2.x
                                                    ) &&
                                                x <=
                                                    Math.max(
                                                        bestRectangle.p1.x,
                                                        bestRectangle.p2.x
                                                    ) &&
                                                y >=
                                                    Math.min(
                                                        bestRectangle.p1.y,
                                                        bestRectangle.p2.y
                                                    ) &&
                                                y <=
                                                    Math.max(
                                                        bestRectangle.p1.y,
                                                        bestRectangle.p2.y
                                                    )
                                            )

                                        // Determine character and color
                                        let char = "."
                                        let color = theme.textMuted

                                        // Glow effect for best rectangle
                                        let glow: string | undefined

                                        if (inBestRect) {
                                            char = "O"
                                            color = resultColor
                                            glow = `0 0 8px ${resultColor}, 0 0 12px ${resultColor}`
                                        } else if (inCurrentRect) {
                                            char = "o"
                                            color = isCurrentValid
                                                ? accentColor
                                                : theme.warning
                                        } else if (isCollectingPoint) {
                                            char = "@"
                                            color = accentColor
                                        } else if (isPairingTarget) {
                                            char = "+"
                                            color = theme.warning
                                        } else if (isRed) {
                                            char = "#"
                                            // Gray out red tiles outside best rect when complete
                                            color = isOutsideBestRect
                                                ? theme.textMuted
                                                : theme.red
                                        } else if (isOnEdge) {
                                            char = "X"
                                            // Gray out edges outside best rect when complete
                                            color = isOutsideBestRect
                                                ? theme.textMuted
                                                : theme.green
                                        } else if (isGreen) {
                                            char = "X"
                                            // Gray out interior outside best rect when complete
                                            color = isOutsideBestRect
                                                ? theme.textMuted
                                                : theme.green
                                        }

                                        return (
                                            <span
                                                key={key}
                                                style={{
                                                    ...font,
                                                    color,
                                                    textShadow: glow,
                                                }}
                                            >
                                                {char}
                                            </span>
                                        )
                                    })

                                    return <div key={row}>{rowChars}</div>
                                }
                            )}
                        </pre>
                    </div>
                </div>

                {/* Right Column - Event Log */}
                <div style={{ position: "relative" }}>
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                        }}
                    >
                        {/* Event Log Title */}
                        <div
                            style={{
                                fontSize: "10px",
                                fontWeight: "bold",
                                color: theme.textMuted,
                                letterSpacing: "0.05em",
                                textTransform: "uppercase",
                                marginBottom: "8px",
                            }}
                        >
                            Event Log
                        </div>

                        {/* Scrollable Log Container */}
                        <div
                            ref={logContainerRef}
                            style={{
                                flex: 1,
                                padding: "12px",
                                backgroundColor: theme.cardBg,
                                borderRadius: "8px",
                                border: `1px solid ${theme.border}20`,
                                overflowY: "auto",
                                minHeight: 0,
                            }}
                        >
                            {eventLog.length === 0 ? (
                                <div
                                    style={{
                                        ...font,
                                        fontSize: "12px",
                                        color: theme.textMuted,
                                        fontStyle: "italic",
                                    }}
                                >
                                    Waiting for events...
                                </div>
                            ) : (
                                eventLog.map((entry, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            ...font,
                                            fontSize: "12px",
                                            fontFamily: "monospace",
                                            color: getLogColor(entry.type),
                                            marginBottom: "4px",
                                            display: "flex",
                                            gap: "8px",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <span style={{ opacity: 0.7 }}>
                                            {getLogPrefix(entry.type)}
                                        </span>
                                        <span>{entry.message}</span>
                                        {entry.detail && (
                                            <span
                                                style={{
                                                    color: theme.textMuted,
                                                    marginLeft: "auto",
                                                    fontSize: "11px",
                                                }}
                                            >
                                                {entry.detail}
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div
                style={{
                    marginTop: "16px",
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <button
                    type="button"
                    onClick={handleRestart}
                    style={{
                        ...font,
                        fontSize: "12px",
                        padding: "8px 16px",
                        border: `1px solid ${theme.border}`,
                        borderRadius: "6px",
                        background: theme.cardBg,
                        color: theme.textInverse,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}
                >
                    <span style={{ fontSize: "14px" }}>↻</span>
                    Restart
                </button>
            </div>
        </div>
    )
}

addPropertyControls(Day9MovieTheater, {
    puzzleInput: {
        type: ControlType.String,
        title: "Input",
        defaultValue: `7,1
11,1
11,7
9,7
9,5
2,5
2,3
7,3`,
        displayTextArea: true,
    },
    part: {
        type: ControlType.Enum,
        title: "Part",
        options: ["part1", "part2"],
        optionTitles: ["Part 1", "Part 2"],
        defaultValue: "part2",
        displaySegmentedControl: true,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        defaultValue: 1,
        min: 0.1,
        max: 20,
        step: 0.1,
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#d946ef",
    },
    resultColor: {
        type: ControlType.Color,
        title: "Result",
        defaultValue: "#22c55e",
    },
    autoPlay: {
        type: ControlType.Boolean,
        title: "Auto Play",
        defaultValue: true,
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "monospace",
        defaultValue: {
            fontSize: "14px",
            fontFamily: "JetBrains Mono, monospace",
        },
    },
})
