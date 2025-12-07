// Day 7: Tachyon Beam Splitter
// Beam enters at S, travels down, splits at ^ into left/right beams
// Part 1: Count splits, Part 2: Count timelines (paths)

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

interface Beam {
    col: number
    count: number
    id: string
}

interface Day7Props {
    gridInput: string
    mode: "splits" | "timelines"
    speed: number
    accentColor: string
    autoPlay: boolean
    playMode: "auto" | "step"
    font: CSSProperties
    style?: CSSProperties
}

type LogEntryType = "info" | "success" | "warning" | "error" | "step"

interface LogEntry {
    message: string
    type?: LogEntryType
    detail?: string
}

const START = "S"
const SPLITTER = "^"

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

function parseGrid(input: string): string[][] {
    return input
        .trim()
        .split("\n")
        .map((line) => line.split(""))
}

function findStart(grid: string[][]): number {
    const firstRow = grid[0] || []
    return firstRow.findIndex((c) => c === START)
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function Day7BeamSplitter(props: Day7Props) {
    const {
        gridInput = `.......S.......
...............
.......^.......
...............
......^.^......
...............
.....^.^.^.....
...............
....^.^...^....
...............
...^.^...^.^...
...............
..^...^.....^..
...............
.^.^.^.^.^...^.
...............`,
        mode = "splits",
        speed = 1,
        accentColor = "#d946ef",
        autoPlay = true,
        playMode = "auto",
        font,
    } = props

    // Start when in view
    const [isInView, setIsInView] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const logContainerRef = useRef<HTMLDivElement>(null)

    const grid = useMemo(() => parseGrid(gridInput), [gridInput])
    const startCol = useMemo(() => findStart(grid), [grid])
    const height = grid.length
    const width = grid[0]?.length ?? 0

    const [currentRow, setCurrentRow] = useState(0)
    const [beams, setBeams] = useState<Beam[]>([
        { col: startCol, count: 1, id: "start" },
    ])
    const [beamTrails, setBeamTrails] = useState<Map<string, number>>(new Map())
    const [splitCount, setSplitCount] = useState(0)
    const [timelineCount, setTimelineCount] = useState(1)
    const [isComplete, setIsComplete] = useState(false)
    const [internalPlayMode, setInternalPlayMode] = useState(playMode)
    const [eventLog, setEventLog] = useState<LogEntry[]>([])

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

    const baseSpeed = 150 / speed

    // Auto-scroll event log
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop =
                logContainerRef.current.scrollHeight
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

    useEffect(() => {
        startTransition(() => setInternalPlayMode(playMode))
    }, [playMode])

    // Reset when inputs change
    useEffect(() => {
        const start = findStart(parseGrid(gridInput))
        startTransition(() => {
            setCurrentRow(0)
            setBeams([{ col: start, count: 1, id: "start" }])
            setBeamTrails(new Map())
            setSplitCount(0)
            setTimelineCount(1)
            setIsComplete(false)
            setEventLog([
                {
                    message: `Beam enters at column ${start}`,
                    type: "step",
                },
            ])
        })
    }, [gridInput, mode])

    // Step function
    const doStep = useCallback(() => {
        if (currentRow >= height - 1) {
            startTransition(() => {
                setIsComplete(true)
                addLogEntry(
                    `Complete!`,
                    "success",
                    mode === "splits"
                        ? `${splitCount} splits`
                        : `${timelineCount} timelines`
                )
            })
            return
        }

        const nextRow = currentRow + 1
        const newBeams = new Map<number, number>()
        let newSplits = 0
        const newTrails = new Map(beamTrails)

        for (const beam of beams) {
            // Add trail for current position with timeline count
            const trailKey = `${currentRow},${beam.col}`
            newTrails.set(trailKey, (newTrails.get(trailKey) ?? 0) + beam.count)

            // Check if we hit a splitter
            if (grid[nextRow]?.[beam.col] === SPLITTER) {
                newSplits++
                // Split left
                if (beam.col - 1 >= 0) {
                    const key = beam.col - 1
                    newBeams.set(key, (newBeams.get(key) ?? 0) + beam.count)
                }
                // Split right
                if (beam.col + 1 < width) {
                    const key = beam.col + 1
                    newBeams.set(key, (newBeams.get(key) ?? 0) + beam.count)
                }
            } else {
                // Continue straight
                newBeams.set(
                    beam.col,
                    (newBeams.get(beam.col) ?? 0) + beam.count
                )
            }
        }

        const beamArray: Beam[] = Array.from(newBeams.entries()).map(
            ([col, count], i) => ({
                col,
                count,
                id: `${nextRow}-${col}-${i}`,
            })
        )

        const totalTimelines = beamArray.reduce((sum, b) => sum + b.count, 0)

        startTransition(() => {
            setCurrentRow(nextRow)
            setBeams(beamArray)
            setBeamTrails(newTrails)
            setSplitCount((prev) => prev + newSplits)
            setTimelineCount(totalTimelines)

            if (newSplits > 0) {
                if (mode === "timelines") {
                    addLogEntry(
                        `Row ${nextRow}: ${newSplits} split${newSplits > 1 ? "s" : ""}`,
                        "warning",
                        `${totalTimelines} timelines`
                    )
                } else {
                    addLogEntry(
                        `Row ${nextRow}: ${newSplits} split${newSplits > 1 ? "s" : ""}`,
                        "warning",
                        `${beamArray.length} beams`
                    )
                }
            } else if (nextRow % 2 === 0) {
                addLogEntry(`Row ${nextRow}: passing through`, "info")
            }
        })
    }, [
        currentRow,
        beams,
        grid,
        height,
        width,
        beamTrails,
        addLogEntry,
        mode,
        splitCount,
        timelineCount,
    ])

    // Auto-play animation (only when in view)
    useEffect(() => {
        if (!isInView || !autoPlay || internalPlayMode !== "auto" || isComplete) return

        const timer = setTimeout(doStep, baseSpeed)
        return () => clearTimeout(timer)
    }, [isInView, autoPlay, internalPlayMode, isComplete, baseSpeed, doStep])

    const resetState = useCallback(() => {
        const start = findStart(grid)
        startTransition(() => {
            setCurrentRow(0)
            setBeams([{ col: start, count: 1, id: "start" }])
            setBeamTrails(new Map())
            setSplitCount(0)
            setTimelineCount(1)
            setIsComplete(false)
            setEventLog([
                {
                    message: `Beam enters at column ${start}`,
                    type: "step",
                },
            ])
        })
    }, [grid])

    const handleRestart = () => {
        resetState()
        setHasStarted(true)
        setIsInView(true)
    }

    const handleNextStep = () => {
        if (isComplete) {
            resetState()
            return
        }
        doStep()
    }

    // Build ASCII display
    const renderAsciiGrid = () => {
        const beamsByCol = new Map(beams.map((b) => [b.col, b]))

        return grid.map((row, y) => {
            const chars = row.map((cell, x) => {
                const key = `${y},${x}`
                const trailCount = beamTrails.get(key)
                const hasTrail = trailCount !== undefined
                const activeBeam =
                    y === currentRow ? beamsByCol.get(x) : undefined
                const hasActiveBeam = activeBeam !== undefined

                let char: string | React.ReactNode = cell
                let color = theme.textMuted

                if (cell === START) {
                    color = accentColor
                } else if (cell === SPLITTER) {
                    color = theme.warning
                } else if (hasActiveBeam) {
                    char = "│"
                    color = theme.success
                } else if (hasTrail) {
                    char = "│"
                    color = `${theme.success}80`
                }

                return (
                    <span
                        key={x}
                        style={{
                            color,
                            textShadow:
                                hasActiveBeam || cell === START
                                    ? `0 0 8px ${color}`
                                    : undefined,
                        }}
                    >
                        {char}
                    </span>
                )
            })

            // Show timeline counts at end of row for part 2
            const getRowTimelines = () => {
                if (mode !== "timelines") return null
                if (y === currentRow) {
                    return beams.reduce((sum, b) => sum + b.count, 0)
                }
                // Sum up all trail counts for this row
                let rowSum = 0
                for (let x = 0; x < width; x++) {
                    const count = beamTrails.get(`${y},${x}`)
                    if (count) rowSum += count
                }
                return rowSum > 0 ? rowSum : null
            }
            const rowTimelines = getRowTimelines()

            return (
                <div
                    key={y}
                    style={{
                        display: "flex",
                        backgroundColor:
                            y === currentRow
                                ? `${accentColor}15`
                                : "transparent",
                    }}
                >
                    {chars}
                    {rowTimelines !== null && (
                        <span
                            style={{
                                color: accentColor,
                                marginLeft: "8px",
                                fontSize: "0.85em",
                                opacity: 0.9,
                            }}
                        >
                            ×
                            {rowTimelines > 999999
                                ? `${(rowTimelines / 1e6).toFixed(1)}M`
                                : rowTimelines > 999
                                  ? `${(rowTimelines / 1e3).toFixed(1)}K`
                                  : rowTimelines}
                        </span>
                    )}
                </div>
            )
        })
    }

    // Stat card component
    const StatCard = ({
        label,
        value,
        color,
        span,
    }: {
        label: string
        value: string | number
        color?: string
        span?: number
    }) => (
        <div
            style={{
                padding: "8px 16px",
                backgroundColor: theme.cardBg,
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: "80px",
                width: "100%",
                gridColumn: span ? `span ${span}` : undefined,
            }}
        >
            <span
                style={{
                    ...font,
                    fontSize: "10px",
                    color: theme.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                }}
            >
                {label}
            </span>
            <span
                style={{
                    ...font,
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: color || accentColor,
                }}
            >
                {value}
            </span>
        </div>
    )

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
                {/* Left Column - Grid */}
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
                        Tachyon Manifold
                    </div>

                    {/* Stats Row */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "12px",
                            marginBottom: "12px",
                            width: "100%",
                        }}
                    >
                        <StatCard
                            label="Row"
                            value={`${currentRow + 1}/${height}`}
                        />
                        <StatCard
                            label="Beams"
                            value={beams.length}
                            color={theme.success}
                        />
                        <StatCard
                            label="Splits"
                            value={splitCount}
                            color={theme.warning}
                            span={mode === "splits" ? 2 : undefined}
                        />
                        {mode === "timelines" && (
                            <StatCard
                                label="Timelines"
                                value={
                                    timelineCount > 999999
                                        ? `${(timelineCount / 1e6).toFixed(1)}M`
                                        : timelineCount
                                }
                                color={accentColor}
                            />
                        )}
                    </div>

                    {/* ASCII Grid */}
                    <div
                        style={{
                            ...font,
                            flex: 1,
                            backgroundColor: theme.cardBg,
                            padding: "16px",
                            borderRadius: "8px",
                            border: `1px solid ${theme.border}20`,
                            fontFamily: "monospace",
                            fontSize: "14px",
                            lineHeight: "1.2",
                            whiteSpace: "pre",
                            overflow: "auto",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <div>{renderAsciiGrid()}</div>
                    </div>

                    {/* Controls */}
                    <div
                        style={{
                            display: "flex",
                            gap: "10px",
                            marginTop: "12px",
                            justifyContent: "center",
                        }}
                    >
                        {/* Restart Button - Always visible */}
                        <button
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

                        {internalPlayMode === "step" && (
                            <button
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
                                {isComplete ? "Reset" : "Next Row"}
                            </button>
                        )}
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
                                    Waiting for beam...
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
        </div>
    )
}

addPropertyControls(Day7BeamSplitter, {
    gridInput: {
        type: ControlType.String,
        title: "Grid",
        defaultValue: `.......S.......
...............
.......^.......
...............
......^.^......
...............
.....^.^.^.....
...............
....^.^...^....
...............
...^.^...^.^...
...............
..^...^.....^..
...............
.^.^.^.^.^...^.
...............`,
        displayTextArea: true,
    },
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["splits", "timelines"],
        optionTitles: ["Part 1", "Part 2"],
        defaultValue: "timelines",
        displaySegmentedControl: true,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        defaultValue: 1,
        min: 0.1,
        max: 10,
        step: 0.1,
    },
    playMode: {
        type: ControlType.Enum,
        title: "Play",
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
        hidden: ({ playMode }) => playMode === "step",
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
