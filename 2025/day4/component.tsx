// Day 4: Paper Roll Grid - Forklift accessibility visualization
// Forklifts can access rolls with < 4 adjacent neighbors

import {
    useEffect,
    useState,
    useMemo,
    useRef,
    startTransition,
    useCallback,
    type CSSProperties,
} from "react"
import { motion } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

interface Day4Props {
    gridInput: string
    part: "part1" | "part2"
    speed: number
    accentColor: string
    autoPlay: boolean
    playMode: "auto" | "step"
    showDebug: boolean
    font: CSSProperties
    style?: CSSProperties
}

const EMPTY = "."
const FILLED = "@"

const adjacentOffsets = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
] as const

function parseGrid(input: string): string[][] {
    return input
        .trim()
        .split("\n")
        .map((line) => line.trim().split(""))
}

function getAdjacentCount(grid: string[][], x: number, y: number): number {
    const width = grid[0]?.length ?? 0
    const height = grid.length
    let count = 0
    for (const [dx, dy] of adjacentOffsets) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (grid[ny]?.[nx] === FILLED) count++
        }
    }
    return count
}

function findAccessible(grid: string[][]): [number, number][] {
    const accessible: [number, number][] = []
    const height = grid.length
    const width = grid[0]?.length ?? 0
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y]?.[x] === FILLED) {
                const neighbors = getAdjacentCount(grid, x, y)
                if (neighbors < 4) {
                    accessible.push([x, y])
                }
            }
        }
    }
    return accessible
}

type Phase =
    | "analyzing"
    | "round_scanning"
    | "highlight"
    | "remove"
    | "complete"

// Event Log types
type LogEntryType = "info" | "success" | "warning" | "error" | "step"

interface LogEntry {
    message: string
    type?: LogEntryType
    detail?: string
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function Day4PaperRolls(props: Day4Props) {
    const {
        gridInput = `..@@.@@@@.
@@@.@.@.@@
@@@@@.@.@@
@.@@@@..@.
@@.@@@@.@@
.@@@@@@@.@
.@.@.@.@@@
@.@@@.@@@@
.@@@@@@@@.
@.@.@@@.@.`,
        part = "part1",
        speed = 1,
        accentColor = "#d946ef",
        autoPlay = true,
        playMode = "auto",
        showDebug = false,
        font,
    } = props

    // Standardized color tokens
    const theme = {
        bg: "transparent",
        cardBg: "#1f2937",
        text: "#1f2937",
        textInverse: "#f3f4f6",
        textMuted: "#9ca3af",
        border: "#e5e7eb",
        neutral: "#f3f4f6",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
    }

    const initialGrid = useMemo(() => parseGrid(gridInput), [gridInput])
    const [grid, setGrid] = useState<string[][]>(initialGrid)
    const [accessible, setAccessible] = useState<Set<string>>(new Set())
    const [removing, setRemoving] = useState<Set<string>>(new Set())
    const [totalRemoved, setTotalRemoved] = useState(0)
    const [removalRound, setRemovalRound] = useState(0)
    const [phase, setPhase] = useState<Phase>("analyzing")
    const [isComplete, setIsComplete] = useState(false)
    const [internalPlayMode, setInternalPlayMode] = useState(playMode)

    // Analyzing state (Part 1)
    const [analyzeIndex, setAnalyzeIndex] = useState(0)
    const [analyzingCell, setAnalyzingCell] = useState<string | null>(null)
    const [checkingNeighborIndex, setCheckingNeighborIndex] = useState(-1)
    const [checkingNeighbors, setCheckingNeighbors] = useState<Set<string>>(
        new Set()
    )
    const [neighborCount, setNeighborCount] = useState(0)

    // Round scanning state (Part 2)
    const [roundScanIndex, setRoundScanIndex] = useState(0)
    const [scanningCell, setScanningCell] = useState<string | null>(null)

    // Event Log state
    const [eventLog, setEventLog] = useState<LogEntry[]>([])
    const logContainerRef = useRef<HTMLDivElement>(null)

    // Auto-scroll event log
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop =
                logContainerRef.current.scrollHeight
        }
    }, [eventLog])

    // Event log helpers
    const addLogEntry = useCallback(
        (message: string, type: LogEntryType = "info", detail?: string) => {
            setEventLog((prev) => [...prev, { message, type, detail }])
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

    const baseSpeed = 1000 / speed
    const analyzeSpeed = 300 / speed // Slower to see neighbor checking
    const neighborCheckSpeed = 60 / speed // Speed for each neighbor check

    const height = initialGrid.length
    const width = initialGrid[0]?.length ?? 0

    // Pre-compute all roll positions
    const rollsSet = useMemo(() => {
        const set = new Set<string>()
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (initialGrid[y]?.[x] === FILLED) {
                    set.add(`${x},${y}`)
                }
            }
        }
        return set
    }, [initialGrid, height, width])

    // Get all roll positions for analyzing phase
    const allRolls = useMemo(() => {
        const rolls: [number, number][] = []
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (initialGrid[y]?.[x] === FILLED) {
                    rolls.push([x, y])
                }
            }
        }
        return rolls
    }, [initialGrid, height, width])

    useEffect(() => {
        startTransition(() => setInternalPlayMode(playMode))
    }, [playMode])

    // Reset when input changes
    const resetState = useCallback(() => {
        const newGrid = parseGrid(gridInput)
        const rollCount = newGrid.flat().filter((c) => c === FILLED).length

        if (part === "part2") {
            // Part 2: Start with round scanning animation
            startTransition(() => {
                setGrid(newGrid)
                setAccessible(new Set())
                setRemoving(new Set())
                setTotalRemoved(0)
                setRemovalRound(1)
                setPhase("round_scanning")
                setIsComplete(false)
                setAnalyzeIndex(0)
                setAnalyzingCell(null)
                setCheckingNeighborIndex(-1)
                setCheckingNeighbors(new Set())
                setNeighborCount(0)
                setRoundScanIndex(0)
                setScanningCell(null)
                setEventLog([
                    {
                        message: "Starting removal",
                        type: "step",
                        detail: `${rollCount} rolls`,
                    },
                    {
                        message: `Round 1: Scanning...`,
                        type: "info",
                    },
                ])
            })
        } else {
            // Part 1: Show analyzing phase
            startTransition(() => {
                setGrid(newGrid)
                setAccessible(new Set())
                setRemoving(new Set())
                setTotalRemoved(0)
                setRemovalRound(0)
                setPhase("analyzing")
                setIsComplete(false)
                setAnalyzeIndex(0)
                setAnalyzingCell(null)
                setCheckingNeighborIndex(-1)
                setCheckingNeighbors(new Set())
                setNeighborCount(0)
                setRoundScanIndex(0)
                setScanningCell(null)
                setEventLog([
                    {
                        message: "Starting analysis",
                        type: "step",
                        detail: `${rollCount} rolls`,
                    },
                ])
            })
        }
    }, [gridInput, part])

    const handleRestart = () => {
        resetState()
        setHasStarted(true)
        setIsInView(true)
    }

    useEffect(() => {
        resetState()
    }, [gridInput, part, resetState])

    // Start when in view
    const [isInView, setIsInView] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // IntersectionObserver to detect when component is in view
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

    // Analyzing animation with neighbor checking (only when in view)
    useEffect(() => {
        if (!isInView || phase !== "analyzing" || !autoPlay) return

        // All rolls analyzed
        if (analyzeIndex >= allRolls.length) {
            startTransition(() => {
                setAnalyzingCell(null)
                setCheckingNeighbors(new Set())
                setCheckingNeighborIndex(-1)
                setPhase(part === "part1" ? "complete" : "highlight")
                setEventLog((prev) => [
                    ...prev,
                    {
                        message: "Analysis complete",
                        type: "success",
                        detail: `${accessible.size} accessible`,
                    },
                    ...(part === "part2"
                        ? [
                              {
                                  message: "Starting removal phase",
                                  type: "step" as LogEntryType,
                              },
                          ]
                        : []),
                ])
            })
            return
        }

        const [x, y] = allRolls[analyzeIndex]
        const key = `${x},${y}`

        // Start checking this cell
        if (analyzingCell !== key) {
            startTransition(() => {
                setAnalyzingCell(key)
                setCheckingNeighborIndex(0)
                setCheckingNeighbors(new Set())
                setNeighborCount(0)
            })
            return
        }

        // Check neighbors one by one
        if (checkingNeighborIndex < adjacentOffsets.length) {
            const timer = setTimeout(() => {
                const [dx, dy] = adjacentOffsets[checkingNeighborIndex]
                const nx = x + dx
                const ny = y + dy
                const neighborKey = `${nx},${ny}`

                startTransition(() => {
                    setCheckingNeighbors((prev) =>
                        new Set(prev).add(neighborKey)
                    )
                    // Check if this neighbor is a filled roll
                    if (
                        nx >= 0 &&
                        nx < width &&
                        ny >= 0 &&
                        ny < height &&
                        initialGrid[ny]?.[nx] === FILLED
                    ) {
                        setNeighborCount((prev) => prev + 1)
                    }
                    setCheckingNeighborIndex((prev) => prev + 1)
                })
            }, neighborCheckSpeed)

            return () => clearTimeout(timer)
        }

        // All neighbors checked, determine if accessible
        const timer = setTimeout(() => {
            const isAccessibleRoll = neighborCount < 4
            startTransition(() => {
                if (isAccessibleRoll) {
                    setAccessible((prev) => new Set(prev).add(key))
                }
                setCheckingNeighbors(new Set())
                setCheckingNeighborIndex(-1)
                setAnalyzeIndex((prev) => prev + 1)
                setAnalyzingCell(null) // Reset to trigger next cell
                // Log the result
                setEventLog((prev) => [
                    ...prev,
                    {
                        message: `Roll (${x},${y})`,
                        type: isAccessibleRoll ? "success" : "info",
                        detail: `${neighborCount} neighbors`,
                    },
                ])
            })
        }, analyzeSpeed)

        return () => clearTimeout(timer)
    }, [
        phase,
        analyzeIndex,
        allRolls,
        initialGrid,
        autoPlay,
        analyzeSpeed,
        neighborCheckSpeed,
        part,
        analyzingCell,
        checkingNeighborIndex,
        neighborCount,
        width,
        height,
        isInView,
    ])

    // Get current rolls in grid (for round scanning)
    const currentRollsList = useMemo(() => {
        const rolls: [number, number][] = []
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (grid[y]?.[x] === FILLED) {
                    rolls.push([x, y])
                }
            }
        }
        return rolls
    }, [grid, height, width])

    // Part 2: Round scanning animation (fast scan to find accessible)
    const roundScanSpeed = 40 / speed
    // Part 2: Round scanning animation (only when in view)
    useEffect(() => {
        if (!isInView) return
        if (part !== "part2") return
        if (phase !== "round_scanning" || !autoPlay) return

        // All rolls scanned this round
        if (roundScanIndex >= currentRollsList.length) {
            startTransition(() => {
                setScanningCell(null)
                if (accessible.size > 0) {
                    setPhase("highlight")
                    setEventLog((prev) => [
                        ...prev,
                        {
                            message: `Found ${accessible.size} accessible`,
                            type: "success",
                        },
                    ])
                } else {
                    // No accessible rolls found - we're done
                    setIsComplete(true)
                    setPhase("complete")
                    setEventLog((prev) => [
                        ...prev,
                        {
                            message: "No accessible rolls found",
                            type: "success",
                            detail: `Total: ${totalRemoved}`,
                        },
                    ])
                }
            })
            return
        }

        const [x, y] = currentRollsList[roundScanIndex]
        const key = `${x},${y}`

        const timer = setTimeout(() => {
            const neighbors = getAdjacentCount(grid, x, y)
            startTransition(() => {
                setScanningCell(key)
                if (neighbors < 4) {
                    setAccessible((prev) => new Set(prev).add(key))
                }
                setRoundScanIndex((prev) => prev + 1)
            })
        }, roundScanSpeed)

        return () => clearTimeout(timer)
    }, [
        part,
        phase,
        autoPlay,
        roundScanIndex,
        currentRollsList,
        grid,
        roundScanSpeed,
        accessible.size,
        totalRemoved,
        isInView,
    ])

    // Part 2: Remove animation (only when in view)
    useEffect(() => {
        if (!isInView) return
        if (part === "part1") return
        if (phase !== "highlight" && phase !== "remove") return
        if (!autoPlay || internalPlayMode !== "auto" || isComplete) return

        const timer = setTimeout(
            () => {
                if (phase === "highlight") {
                    if (accessible.size > 0) {
                        startTransition(() => {
                            setRemoving(new Set(accessible))
                            setPhase("remove")
                            setEventLog((prev) => [
                                ...prev,
                                {
                                    message: `Removing ${accessible.size} rolls`,
                                    type: "warning",
                                },
                            ])
                        })
                    } else {
                        startTransition(() => {
                            setIsComplete(true)
                            setEventLog((prev) => [
                                ...prev,
                                {
                                    message: "No more accessible rolls",
                                    type: "success",
                                    detail: `Total: ${totalRemoved}`,
                                },
                            ])
                        })
                    }
                } else {
                    const removedCount = removing.size
                    const newTotal = totalRemoved + removedCount
                    const nextRound = removalRound + 1
                    startTransition(() => {
                        setGrid((prev) => {
                            const newGrid = prev.map((row) => [...row])
                            for (const key of removing) {
                                const [rx, ry] = key.split(",").map(Number)
                                if (newGrid[ry]) newGrid[ry][rx] = EMPTY
                            }
                            return newGrid
                        })
                        setTotalRemoved(newTotal)
                        setRemoving(new Set())
                        setAccessible(new Set()) // Reset for next scanning round
                        setRemovalRound(nextRound)
                        setRoundScanIndex(0) // Reset scan index
                        setScanningCell(null)
                        setPhase("round_scanning") // Go back to scanning
                        setEventLog((prev) => [
                            ...prev,
                            {
                                message: `Removed ${removedCount} rolls`,
                                type: "success",
                                detail: `${newTotal} total`,
                            },
                            {
                                message: `Round ${nextRound}: Scanning...`,
                                type: "info",
                            },
                        ])
                    })
                }
            },
            phase === "highlight" ? baseSpeed * 0.8 : baseSpeed * 0.4
        )

        return () => clearTimeout(timer)
    }, [
        part,
        autoPlay,
        internalPlayMode,
        phase,
        accessible,
        removing,
        isComplete,
        baseSpeed,
        grid,
        isInView,
    ])

    // Update accessible when grid changes in Part 2
    useEffect(() => {
        if (part !== "part2" || phase === "analyzing") return
        if (isComplete) return
        const acc = findAccessible(grid)
        const accSet = new Set(acc.map(([x, y]) => `${x},${y}`))
        startTransition(() => {
            setAccessible(accSet)
            if (accSet.size === 0 && phase === "highlight") {
                setIsComplete(true)
            }
        })
    }, [grid, isComplete, part, phase])

    // Log completion for Part 1
    useEffect(() => {
        if (part === "part1" && phase === "complete" && !isComplete) {
            startTransition(() => {
                setIsComplete(true)
                setEventLog((prev) => [
                    ...prev,
                    {
                        message: "Part 1 Complete!",
                        type: "success",
                        detail: `Answer: ${accessible.size}`,
                    },
                ])
            })
        }
    }, [part, phase, isComplete, accessible.size])

    const handleNextStep = () => {
        if (isComplete) {
            resetState()
            return
        }
        if (accessible.size === 0) return

        startTransition(() => {
            setGrid((prev) => {
                const newGrid = prev.map((row) => [...row])
                for (const key of accessible) {
                    const [x, y] = key.split(",").map(Number)
                    if (newGrid[y]) newGrid[y][x] = EMPTY
                }
                return newGrid
            })
            setTotalRemoved((prev) => prev + accessible.size)
        })
    }

    const totalRolls = useMemo(() => {
        return initialGrid.flat().filter((c) => c === FILLED).length
    }, [initialGrid])

    const currentRolls = useMemo(() => {
        return grid.flat().filter((c) => c === FILLED).length
    }, [grid])

    return (
        <div
            ref={containerRef}
            style={{
                ...props.style,
                backgroundColor: theme.bg,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px",
                overflow: "hidden",
                position: "relative",
                width: "100%",
                height: "100%",
                fontFamily: "inherit",
                color: theme.text,
            }}
        >
            {/* Main Content: Grid + Event Log - Two Columns */}
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
                {/* Grid Column */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                    }}
                >
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
                        Grid
                    </div>

                    {/* Stats Row */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            gap: "8px",
                            marginBottom: "12px",
                        }}
                    >
                        <div
                            style={{
                                padding: "8px 16px",
                                backgroundColor: theme.cardBg,
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                width: "1fr",
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
                                Neighbors Found
                            </span>
                            <span
                                style={{
                                    ...font,
                                    fontSize: "20px",
                                    fontWeight: "bold",
                                    color:
                                        neighborCount >= 4
                                            ? theme.error
                                            : theme.warning,
                                }}
                            >
                                {neighborCount}/8
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
                                width: "1fr",
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
                                Accessible (&lt;4)
                            </span>
                            <span
                                style={{
                                    ...font,
                                    fontSize: "20px",
                                    fontWeight: "bold",
                                    color: accentColor,
                                }}
                            >
                                {accessible.size}
                            </span>
                        </div>

                        {part === "part2" && (
                            <>
                                <div
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: theme.cardBg,
                                        borderRadius: "8px",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        width: "1fr",
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
                                        Round
                                    </span>
                                    <span
                                        style={{
                                            ...font,
                                            fontSize: "20px",
                                            fontWeight: "bold",
                                            color: theme.warning,
                                        }}
                                    >
                                        {removalRound}
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
                                        width: "1fr",
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
                                        Removed
                                    </span>
                                    <span
                                        style={{
                                            ...font,
                                            fontSize: "20px",
                                            fontWeight: "bold",
                                            color: theme.success,
                                        }}
                                    >
                                        {totalRemoved}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "stretch",
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: `repeat(${width}, 1fr)`,
                                gap: "1px",
                                backgroundColor: theme.cardBg,
                                padding: "12px",
                                borderRadius: "8px",
                                fontFamily: "monospace",
                                width: "100%",
                                aspectRatio: `${width} / ${height}`,
                            }}
                        >
                            {(phase === "analyzing" ? initialGrid : grid).map(
                                (row, y) =>
                                    row.map((cell, x) => {
                                        const key = `${x},${y}`
                                        const isRoll = rollsSet.has(key)
                                        const isAccessible = accessible.has(key)
                                        const isRemoving = removing.has(key)
                                        const isAnalyzing =
                                            analyzingCell === key
                                        const isBeingChecked =
                                            checkingNeighbors.has(key)
                                        const isScanning = scanningCell === key
                                        const isFilled = cell === FILLED

                                        // Determine cell state based on phase
                                        let textColor = theme.textMuted
                                        let opacity = 0.2
                                        let scale = 1
                                        let glow = "none"
                                        let fontWeight: "normal" | "bold" =
                                            "normal"

                                        if (phase === "analyzing") {
                                            if (isAnalyzing) {
                                                // Currently analyzing this cell
                                                textColor = theme.warning
                                                opacity = 1
                                                glow = `0 0 12px ${theme.warning}`
                                                scale = 1.3
                                                fontWeight = "bold"
                                            } else if (isBeingChecked) {
                                                // This cell is being checked as a neighbor
                                                if (isRoll) {
                                                    // It's a neighbor roll - highlight in red
                                                    textColor = theme.error
                                                    opacity = 1
                                                    glow = `0 0 8px #ef444480`
                                                    fontWeight = "bold"
                                                } else {
                                                    // Empty neighbor being checked
                                                    textColor = theme.success
                                                    opacity = 0.8
                                                }
                                            } else if (isRoll) {
                                                if (isAccessible) {
                                                    textColor = accentColor
                                                    opacity = 1
                                                    glow = `0 0 6px ${accentColor}40`
                                                    fontWeight = "bold"
                                                } else {
                                                    textColor =
                                                        theme.textInverse
                                                    opacity = 1
                                                }
                                            } else {
                                                textColor = theme.textMuted
                                                opacity = 0.3
                                            }
                                        } else if (phase === "round_scanning") {
                                            // Part 2: Fast scanning animation
                                            if (isScanning) {
                                                // Currently scanning this cell
                                                textColor = theme.warning
                                                opacity = 1
                                                glow = `0 0 10px ${theme.warning}`
                                                scale = 1.2
                                                fontWeight = "bold"
                                            } else if (isFilled) {
                                                if (isAccessible) {
                                                    // Already marked accessible this round
                                                    textColor = accentColor
                                                    opacity = 1
                                                    glow = `0 0 6px ${accentColor}40`
                                                    fontWeight = "bold"
                                                } else {
                                                    textColor =
                                                        theme.textInverse
                                                    opacity = 1
                                                }
                                            } else {
                                                textColor = theme.textMuted
                                                opacity = 0.3
                                            }
                                        } else {
                                            // highlight/remove/complete phase
                                            if (isRemoving) {
                                                scale = 0
                                            }
                                            if (isFilled) {
                                                textColor = isAccessible
                                                    ? accentColor
                                                    : theme.textInverse
                                                opacity = 1
                                                if (isAccessible) {
                                                    glow = `0 0 6px ${accentColor}40`
                                                    fontWeight = "bold"
                                                }
                                            } else {
                                                textColor = theme.textMuted
                                                opacity = 0.3
                                            }
                                        }

                                        return (
                                            <motion.div
                                                key={key}
                                                initial={false}
                                                animate={{
                                                    scale,
                                                    opacity,
                                                    color: textColor,
                                                }}
                                                transition={{ duration: 0.1 }}
                                                style={{
                                                    aspectRatio: "1",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize:
                                                        "clamp(8px, 2vw, 18px)",
                                                    fontWeight,
                                                    textShadow:
                                                        glow !== "none"
                                                            ? glow.replace(
                                                                  "box-shadow",
                                                                  ""
                                                              )
                                                            : "none",
                                                    borderRadius: "2px",
                                                    backgroundColor:
                                                        isAnalyzing ||
                                                        isBeingChecked ||
                                                        isScanning
                                                            ? `${textColor}20`
                                                            : "transparent",
                                                }}
                                            >
                                                {cell}
                                            </motion.div>
                                        )
                                    })
                            )}
                        </div>
                    </div>
                </div>

                {/* Event Log Panel - positioned to match left column height */}
                <div
                    style={{
                        position: "relative",
                    }}
                >
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
                                        fontSize: "11px",
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
                                            fontSize: "11px",
                                            fontFamily: "monospace",
                                            color: getLogColor(entry.type),
                                            marginBottom: "4px",
                                            display: "flex",
                                            gap: "6px",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <span style={{ opacity: 0.7 }}>
                                            {getLogPrefix(entry.type)}
                                        </span>
                                        <span style={{ flex: 1 }}>
                                            {entry.message}
                                        </span>
                                        {entry.detail && (
                                            <span
                                                style={{
                                                    color: theme.textMuted,
                                                    fontSize: "10px",
                                                    whiteSpace: "nowrap",
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
            <div style={{ marginTop: "16px", height: "40px" }}>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                    {/* Restart Button - Always visible */}
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

                    {part === "part2" &&
                        internalPlayMode === "step" &&
                        phase !== "analyzing" && (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                style={{
                                    ...font,
                                    fontSize: "12px",
                                    padding: "8px 20px",
                                    border: "none",
                                    borderRadius: "6px",
                                    background: accentColor,
                                    color: "white",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                }}
                            >
                                {isComplete ? "Reset" : "Remove Accessible"}
                            </button>
                        )}
                </div>

                {showDebug && (
                    <div
                        style={{
                            ...font,
                            fontSize: "11px",
                            color: theme.textMuted,
                            fontFamily: "monospace",
                        }}
                    >
                        Phase: {phase} | Grid: {width}x{height} | Rolls:{" "}
                        {rollsSet.size}
                    </div>
                )}
            </div>
        </div>
    )
}

addPropertyControls(Day4PaperRolls, {
    gridInput: {
        type: ControlType.String,
        title: "Grid",
        defaultValue: `..@@.@@@@.
@@@.@.@.@@
@@@@@.@.@@
@.@@@@..@.
@@.@@@@.@@
.@@@@@@@.@
.@.@.@.@@@
@.@@@.@@@@
.@@@@@@@@.
@.@.@@@.@.`,
        displayTextArea: true,
    },
    part: {
        type: ControlType.Enum,
        title: "Part",
        options: ["part1", "part2"],
        optionTitles: ["Part 1", "Part 2"],
        defaultValue: "part1",
        displaySegmentedControl: true,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        defaultValue: 1,
        min: 0.1,
        max: 5,
        step: 0.1,
    },
    playMode: {
        type: ControlType.Enum,
        title: "Play Mode",
        options: ["auto", "step"],
        optionTitles: ["Auto", "Manual"],
        defaultValue: "auto",
        displaySegmentedControl: true,
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#d946ef",
    },
    autoPlay: {
        type: ControlType.Boolean,
        title: "Auto Play",
        defaultValue: true,
        hidden: ({ part, playMode }) => playMode === "step",
    },
    showDebug: {
        type: ControlType.Boolean,
        title: "Debug",
        defaultValue: false,
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: "16px",
            fontFamily: "Inter",
        },
    },
})
