// Day 8: Playground - 3D Junction Box Connections
// Visualizes connecting junction boxes to form circuits using Union-Find

import {
    useEffect,
    useState,
    useMemo,
    useRef,
    startTransition,
    useCallback,
    type CSSProperties,
} from "react"
import { motion, AnimatePresence } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

interface Point {
    x: number
    y: number
    z: number
    id: number
}

interface Edge {
    i: number
    j: number
    distance: number
}

interface Day8Props {
    puzzleInput: string
    part: "part1" | "part2"
    speed: number
    accentColor: string
    resultColor: string
    autoPlay: boolean
    k: number // Number of connections for part 1
    font: CSSProperties
    style?: CSSProperties
}

type Phase = "parsing" | "finding_pairs" | "connecting" | "complete"

// Event log types
type LogEntryType = "info" | "success" | "warning" | "error" | "step"

interface LogEntry {
    message: string
    type?: LogEntryType
    detail?: string
}

// Union-Find for tracking circuits
class UnionFind {
    parent: number[]
    rank: number[]
    sizes: number[]

    constructor(n: number) {
        this.parent = Array.from({ length: n }, (_, i) => i)
        this.rank = Array(n).fill(0)
        this.sizes = Array(n).fill(1)
    }

    find(x: number): number {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x])
        }
        return this.parent[x]
    }

    union(x: number, y: number): boolean {
        const rootX = this.find(x)
        const rootY = this.find(y)
        if (rootX === rootY) return false

        if (this.rank[rootX] < this.rank[rootY]) {
            this.parent[rootX] = rootY
            this.sizes[rootY] += this.sizes[rootX]
        } else if (this.rank[rootX] > this.rank[rootY]) {
            this.parent[rootY] = rootX
            this.sizes[rootX] += this.sizes[rootY]
        } else {
            this.parent[rootY] = rootX
            this.sizes[rootX] += this.sizes[rootY]
            this.rank[rootX]++
        }
        return true
    }

    getRoot(x: number): number {
        return this.find(x)
    }

    getSize(x: number): number {
        return this.sizes[this.find(x)]
    }

    componentCount(): number {
        const roots = new Set<number>()
        for (let i = 0; i < this.parent.length; i++) {
            roots.add(this.find(i))
        }
        return roots.size
    }

    componentSizes(): number[] {
        const sizes: number[] = []
        for (let i = 0; i < this.parent.length; i++) {
            if (this.parent[i] === i) sizes.push(this.sizes[i])
        }
        return sizes.sort((a, b) => b - a)
    }

    clone(): UnionFind {
        const uf = new UnionFind(this.parent.length)
        uf.parent = [...this.parent]
        uf.rank = [...this.rank]
        uf.sizes = [...this.sizes]
        return uf
    }
}

function squaredDistance(a: Point, b: Point): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = a.z - b.z
    return dx * dx + dy * dy + dz * dz
}

function parsePoints(input: string): Point[] {
    return input
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line, id) => {
            const [x, y, z] = line.split(",").map(Number)
            return { x, y, z, id }
        })
}

// Find K smallest pairs
function findKSmallestPairs(points: Point[], k: number): Edge[] {
    const n = points.length
    const allPairs: Edge[] = []

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            allPairs.push({ i, j, distance: squaredDistance(points[i], points[j]) })
        }
    }

    allPairs.sort((a, b) => a.distance - b.distance)
    return allPairs.slice(0, k)
}

// Prim's MST - returns edges in connection order
function findMSTEdges(points: Point[]): Edge[] {
    const n = points.length
    const inTree = new Array<boolean>(n).fill(false)
    const edges: Edge[] = []

    // Simple priority queue using array
    const pq: Edge[] = []
    const pushPQ = (e: Edge) => {
        pq.push(e)
        pq.sort((a, b) => a.distance - b.distance)
    }
    const popPQ = () => pq.shift()

    inTree[0] = true
    for (let j = 1; j < n; j++) {
        pushPQ({ i: 0, j, distance: squaredDistance(points[0], points[j]) })
    }

    while (edges.length < n - 1 && pq.length > 0) {
        const edge = popPQ()!
        if (inTree[edge.j]) continue

        inTree[edge.j] = true
        edges.push(edge)

        for (let j = 0; j < n; j++) {
            if (!inTree[j]) {
                pushPQ({
                    i: edge.j,
                    j,
                    distance: squaredDistance(points[edge.j], points[j]),
                })
            }
        }
    }

    return edges
}

// Project 3D point to 2D using simple isometric-like projection
function project3Dto2D(
    point: Point,
    bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number },
    width: number,
    height: number,
    padding: number
): { x: number; y: number; depth: number } {
    // Normalize to 0-1
    const nx = (point.x - bounds.minX) / (bounds.maxX - bounds.minX || 1)
    const ny = (point.y - bounds.minY) / (bounds.maxY - bounds.minY || 1)
    const nz = (point.z - bounds.minZ) / (bounds.maxZ - bounds.minZ || 1)

    // Simple isometric projection
    const projX = nx * 0.8 + nz * 0.2
    const projY = ny * 0.8 - nz * 0.15

    return {
        x: padding + projX * (width - 2 * padding),
        y: padding + projY * (height - 2 * padding),
        depth: nz,
    }
}

// Generate a color based on component root
function getCircuitColor(root: number, totalPoints: number, accentColor: string): string {
    const hue = (root * 137.508) % 360 // Golden angle for good distribution
    return `hsl(${hue}, 70%, 55%)`
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function Day8Playground(props: Day8Props) {
    const {
        puzzleInput,
        part = "part1",
        speed = 1,
        accentColor = "#d946ef",
        resultColor = "#22c55e",
        autoPlay = true,
        k = 10,
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
    }

    // Start when in view
    const [isInView, setIsInView] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLDivElement>(null)
    const logContainerRef = useRef<HTMLDivElement>(null)

    // Canvas dimensions
    const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 })

    // Parse points
    const points = useMemo(() => parsePoints(puzzleInput), [puzzleInput])

    // Calculate bounds
    const bounds = useMemo(() => {
        if (points.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1 }
        let minX = Infinity, maxX = -Infinity
        let minY = Infinity, maxY = -Infinity
        let minZ = Infinity, maxZ = -Infinity
        for (const p of points) {
            minX = Math.min(minX, p.x)
            maxX = Math.max(maxX, p.x)
            minY = Math.min(minY, p.y)
            maxY = Math.max(maxY, p.y)
            minZ = Math.min(minZ, p.z)
            maxZ = Math.max(maxZ, p.z)
        }
        return { minX, maxX, minY, maxY, minZ, maxZ }
    }, [points])

    // Pre-compute all edges
    const allEdges = useMemo(() => {
        if (part === "part1") {
            return findKSmallestPairs(points, k)
        } else {
            return findMSTEdges(points)
        }
    }, [points, part, k])

    // Phase state
    const [phase, setPhase] = useState<Phase>("parsing")
    const [currentEdgeIndex, setCurrentEdgeIndex] = useState(-1)
    const [connectedEdges, setConnectedEdges] = useState<Edge[]>([])
    const [unionFind, setUnionFind] = useState<UnionFind>(() => new UnionFind(points.length))
    const [lastMergeInfo, setLastMergeInfo] = useState<string | null>(null)
    const [highlightedPoints, setHighlightedPoints] = useState<Set<number>>(new Set())
    const [result, setResult] = useState<number | null>(null)
    const [lastEdge, setLastEdge] = useState<Edge | null>(null)

    // Event log state
    const [eventLog, setEventLog] = useState<LogEntry[]>([])

    // Auto-scroll event log
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
        }
    }, [eventLog])

    const addLogEntry = useCallback(
        (message: string, type: LogEntryType = "info", detail?: string) => {
            setEventLog((prev) => [...prev, { message, type, detail }])
        },
        []
    )

    const getLogColor = (type: LogEntryType = "info") => {
        switch (type) {
            case "success": return theme.success
            case "warning": return theme.warning
            case "error": return theme.error
            case "step": return accentColor
            default: return theme.textMuted
        }
    }

    const getLogPrefix = (type: LogEntryType = "info") => {
        switch (type) {
            case "success": return "✓"
            case "warning": return "!"
            case "error": return "✗"
            case "step": return "→"
            default: return "•"
        }
    }

    const connectSpeed = part === "part1" 
        ? Math.max(10, 300 / speed) 
        : Math.max(5, 150 / speed)

    // Resize observer
    useEffect(() => {
        if (!canvasRef.current) return
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const size = Math.min(entry.contentRect.width, entry.contentRect.height)
                setCanvasSize({ width: entry.contentRect.width, height: size })
            }
        })
        observer.observe(canvasRef.current)
        return () => observer.disconnect()
    }, [])

    // Reset state
    const resetState = useCallback(() => {
        startTransition(() => {
            setPhase("parsing")
            setCurrentEdgeIndex(-1)
            setConnectedEdges([])
            setUnionFind(new UnionFind(points.length))
            setLastMergeInfo(null)
            setHighlightedPoints(new Set())
            setResult(null)
            setLastEdge(null)
            setEventLog([
                { message: `Day 8: Playground - ${part === "part1" ? "Part 1" : "Part 2"}`, type: "step" },
                { message: `Loaded ${points.length} junction boxes`, type: "info" },
            ])

            // Start connecting after short delay
            setTimeout(() => {
                startTransition(() => {
                    if (part === "part1") {
                        addLogEntry(`Finding ${k} closest pairs...`, "step")
                    } else {
                        addLogEntry("Building minimum spanning tree...", "step")
                    }
                    setPhase("connecting")
                    setCurrentEdgeIndex(0)
                })
            }, 500 / speed)
        })
    }, [points.length, part, k, speed, addLogEntry])

    const handleRestart = () => {
        resetState()
        setHasStarted(true)
        setIsInView(true)
    }

    useEffect(() => {
        resetState()
    }, [puzzleInput, part, k, resetState])

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

    // Connection animation
    useEffect(() => {
        if (!isInView || phase !== "connecting" || !autoPlay) return
        if (currentEdgeIndex < 0 || currentEdgeIndex >= allEdges.length) return

        const timer = setTimeout(() => {
            const edge = allEdges[currentEdgeIndex]
            const newUF = unionFind.clone()
            const merged = newUF.union(edge.i, edge.j)

            startTransition(() => {
                if (merged) {
                    setConnectedEdges((prev) => [...prev, edge])
                    setUnionFind(newUF)
                    setHighlightedPoints(new Set([edge.i, edge.j]))
                    
                    const newSize = newUF.getSize(edge.i)
                    const componentCount = newUF.componentCount()
                    const p1 = points[edge.i]
                    const p2 = points[edge.j]
                    const dist = Math.sqrt(edge.distance).toFixed(0)
                    
                    // Log each connection with coordinates
                    addLogEntry(
                        `#${currentEdgeIndex + 1}: (${p1.x},${p1.y},${p1.z}) ↔ (${p2.x},${p2.y},${p2.z})`,
                        "info",
                        `d=${dist}`
                    )
                    
                    // Log circuit merge info
                    if (newSize > 1) {
                        addLogEntry(
                            `Circuit merged → size ${newSize}`,
                            "success",
                            `${componentCount} remaining`
                        )
                    }
                    
                    setLastMergeInfo(`Circuit merged → size ${newSize}`)
                } else {
                    const p1 = points[edge.i]
                    const p2 = points[edge.j]
                    addLogEntry(
                        `#${currentEdgeIndex + 1}: Already connected!`,
                        "warning",
                        `(${p1.x},${p1.y},${p1.z}) ↔ (${p2.x},${p2.y},${p2.z})`
                    )
                    setLastMergeInfo("Already connected!")
                }

                const nextIndex = currentEdgeIndex + 1

                // Check if done
                if (part === "part1" && nextIndex >= allEdges.length) {
                    // Part 1 complete
                    const sizes = newUF.componentSizes()
                    const answer = sizes[0] * sizes[1] * sizes[2]
                    setResult(answer)
                    setPhase("complete")
                    addLogEntry("All connections made!", "success")
                    addLogEntry(
                        `Top 3 circuits: ${sizes[0]}, ${sizes[1]}, ${sizes[2]}`,
                        "success"
                    )
                    addLogEntry(`Answer: ${answer.toLocaleString()}`, "success")
                } else if (part === "part2" && newUF.componentCount() === 1) {
                    // Part 2 complete - all in one circuit
                    const lastP1 = points[edge.i]
                    const lastP2 = points[edge.j]
                    const answer = lastP1.x * lastP2.x
                    setResult(answer)
                    setLastEdge(edge)
                    setPhase("complete")
                    addLogEntry("All boxes connected!", "success")
                    addLogEntry(
                        `Last connection: (${lastP1.x},${lastP1.y},${lastP1.z}) ↔ (${lastP2.x},${lastP2.y},${lastP2.z})`,
                        "info"
                    )
                    addLogEntry(`X coordinates: ${lastP1.x} × ${lastP2.x}`, "info")
                    addLogEntry(`Answer: ${answer.toLocaleString()}`, "success")
                } else {
                    setCurrentEdgeIndex(nextIndex)
                }
            })
        }, connectSpeed)

        return () => clearTimeout(timer)
    }, [
        isInView,
        phase,
        autoPlay,
        currentEdgeIndex,
        allEdges,
        unionFind,
        points,
        part,
        connectSpeed,
        addLogEntry,
    ])

    // Clear highlight after a delay
    useEffect(() => {
        if (highlightedPoints.size === 0) return
        const timer = setTimeout(() => {
            setHighlightedPoints(new Set())
        }, 200)
        return () => clearTimeout(timer)
    }, [highlightedPoints])

    // Get circuit sizes for display
    const circuitSizes = useMemo(() => unionFind.componentSizes(), [unionFind])
    const circuitCount = useMemo(() => unionFind.componentCount(), [unionFind])

    // Project all points
    const projectedPoints = useMemo(() => {
        return points.map((p) =>
            project3Dto2D(p, bounds, canvasSize.width, canvasSize.height, 30)
        )
    }, [points, bounds, canvasSize])

    // Point size based on number of points
    const pointSize = Math.max(2, Math.min(8, 400 / Math.sqrt(points.length)))

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
                {/* Left Column - Visualization */}
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
                        Junction Boxes (3D → 2D Projection)
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
                        {/* Points */}
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
                            <span style={{ ...font, fontSize: "10px", color: theme.textMuted, textTransform: "uppercase" }}>
                                Boxes
                            </span>
                            <span style={{ ...font, fontSize: "18px", fontWeight: "bold", color: theme.textInverse }}>
                                {points.length}
                            </span>
                        </div>

                        {/* Connections */}
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
                            <span style={{ ...font, fontSize: "10px", color: theme.textMuted, textTransform: "uppercase" }}>
                                Connections
                            </span>
                            <span style={{ ...font, fontSize: "18px", fontWeight: "bold", color: accentColor }}>
                                {connectedEdges.length}
                                {part === "part1" && `/${k}`}
                            </span>
                        </div>

                        {/* Circuits */}
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
                            <span style={{ ...font, fontSize: "10px", color: theme.textMuted, textTransform: "uppercase" }}>
                                Circuits
                            </span>
                            <span style={{ ...font, fontSize: "18px", fontWeight: "bold", color: theme.warning }}>
                                {circuitCount}
                            </span>
                        </div>
                    </div>

                <div
                        style={{
                            display: "flex",
                            gap: "12px",
                            marginBottom: "12px",
                            flexWrap: "wrap",
                        }}
                    >


                        {/* Top Circuit Sizes */}
                        <div
                            style={{
                                padding: "8px 16px",
                                backgroundColor: theme.cardBg,
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                flex: 1,
                                minWidth: "70px",
                            }}
                        >
                            <span style={{ ...font, fontSize: "10px", color: theme.textMuted, textTransform: "uppercase" }}>
                                Top 3 Sizes
                            </span>
                            <span style={{ ...font, fontSize: "16px", fontWeight: "bold", color: theme.success, margin: "auto 0" }}>
                                {circuitSizes.slice(0, 3).join(" × ") || "—"}
                            </span>
                        </div>
                    
                        <div
                            style={{
                                padding: "12px 16px",
                                backgroundColor: theme.cardBg,
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                minWidth: "70px",
                            }}
                        >
                            <span style={{ ...font, fontSize: "12px", color: theme.textMuted, textTransform: "uppercase" }}>
                                {part === "part1" ? "Product of Top 3" : "X₁ × X₂"}
                            </span>
                            <span style={{ ...font, fontSize: "24px", fontWeight: "bold", color: resultColor }}>
                                {circuitSizes.slice(0, 3).reduce((acc, size) => acc * size, 1).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* 3D Visualization Canvas */}
                    <div
                        ref={canvasRef}
                        style={{
                            flex: 1,
                            backgroundColor: theme.cardBg,
                            borderRadius: "8px",
                            position: "relative",
                            overflow: "hidden",
                            minHeight: "300px",
                        }}
                    >
                        {/* SVG for edges */}
                        <svg
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                pointerEvents: "none",
                            }}
                        >
                            {connectedEdges.map((edge, idx) => {
                                const p1 = projectedPoints[edge.i]
                                const p2 = projectedPoints[edge.j]
                                if (!p1 || !p2) return null
                                
                                const root = unionFind.getRoot(edge.i)
                                const color = getCircuitColor(root, points.length, accentColor)
                                const isLast = part === "part2" && lastEdge && 
                                    edge.i === lastEdge.i && edge.j === lastEdge.j

                                return (
                                    <motion.line
                                        key={`${edge.i}-${edge.j}`}
                                        x1={p1.x}
                                        y1={p1.y}
                                        x2={p2.x}
                                        y2={p2.y}
                                        stroke={isLast ? resultColor : color}
                                        strokeWidth={isLast ? 3 : 1.5}
                                        strokeOpacity={0.7}
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.2 }}
                                    />
                                )
                            })}
                        </svg>

                        {/* Points */}
                        {projectedPoints.map((proj, idx) => {
                            const root = unionFind.getRoot(idx)
                            const color = connectedEdges.length > 0
                                ? getCircuitColor(root, points.length, accentColor)
                                : theme.textMuted
                            const isHighlighted = highlightedPoints.has(idx)
                            const isLastPair = lastEdge && (idx === lastEdge.i || idx === lastEdge.j)
                            const depthScale = 0.5 + proj.depth * 0.5

                            return (
                                <motion.div
                                    key={idx}
                                    style={{
                                        position: "absolute",
                                        left: proj.x,
                                        top: proj.y,
                                        width: pointSize * depthScale,
                                        height: pointSize * depthScale,
                                        borderRadius: "50%",
                                        backgroundColor: isLastPair ? resultColor : color,
                                        transform: "translate(-50%, -50%)",
                                        boxShadow: isHighlighted || isLastPair
                                            ? `0 0 ${isLastPair ? 15 : 10}px ${isLastPair ? resultColor : accentColor}`
                                            : "none",
                                        zIndex: isHighlighted || isLastPair ? 10 : Math.floor(proj.depth * 5),
                                    }}
                                    animate={{
                                        scale: isHighlighted ? 2 : 1,
                                    }}
                                    transition={{ duration: 0.15 }}
                                />
                            )
                        })}
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
                                <div style={{ ...font, fontSize: "12px", color: theme.textMuted, fontStyle: "italic" }}>
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
                                        <span style={{ opacity: 0.7 }}>{getLogPrefix(entry.type)}</span>
                                        <span>{entry.message}</span>
                                        {entry.detail && (
                                            <span style={{ color: theme.textMuted, marginLeft: "auto", fontSize: "11px" }}>
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
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
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

addPropertyControls(Day8Playground, {
    puzzleInput: {
        type: ControlType.String,
        title: "Input",
        defaultValue: `162,817,812
57,618,57
906,360,560
592,479,940
352,342,300
466,668,158
542,29,236
431,825,988
739,650,466
52,470,668
216,146,977
819,987,18
117,168,530
805,96,715
346,949,466
970,615,88
941,993,340
862,61,35
984,92,344
425,690,689`,
        displayTextArea: true,
    },
    part: {
        type: ControlType.Enum,
        title: "Part",
        options: ["part1", "part2"],
        optionTitles: ["Part 1 (K Pairs)", "Part 2 (MST)"],
        defaultValue: "part1",
        displaySegmentedControl: true,
    },
    k: {
        type: ControlType.Number,
        title: "K (Pairs)",
        defaultValue: 10,
        min: 1,
        max: 1000,
        step: 1,
        hidden: ({ part }) => part !== "part1",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        defaultValue: 1,
        min: 0.1,
        max: 10,
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
