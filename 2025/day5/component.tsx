// Day 5: Fresh Ingredient ID Range Checker
// Check if ingredient IDs fall within fresh ranges, merge overlapping ranges

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

interface Range {
    start: number
    end: number
    id: number
}

interface Day5Props {
    input: string
    part: "part1" | "part2"
    speed: number
    accentColor: string
    freshColor: string
    spoiledColor: string
    autoPlay: boolean
    playMode: "auto" | "step"
    font: CSSProperties
    style?: CSSProperties
}

type Phase = "parsing" | "merging" | "checking" | "complete"

// Event log types
type LogEntryType = "info" | "success" | "warning" | "error" | "step"

interface LogEntry {
    message: string
    type?: LogEntryType
    detail?: string
}

function parseInput(input: string): { ranges: Range[]; testIds: number[] } {
    const ranges: Range[] = []
    const testIds: number[] = []
    let rangeId = 0

    for (const line of input.trim().split("\n")) {
        const trimmed = line.trim()
        if (!trimmed) continue

        if (trimmed.includes("-")) {
            // It's a range (e.g., "3-5")
            const [start, end] = trimmed.split("-").map(Number)
            if (
                start !== undefined &&
                end !== undefined &&
                !Number.isNaN(start) &&
                !Number.isNaN(end)
            ) {
                ranges.push({ start, end, id: rangeId++ })
            }
        } else {
            // It's a test ID (plain number)
            const num = parseInt(trimmed, 10)
            if (!Number.isNaN(num)) {
                testIds.push(num)
            }
        }
    }
    return { ranges, testIds }
}

function mergeRanges(ranges: Range[]): Range[] {
    if (ranges.length === 0) return []
    const sorted = [...ranges].sort((a, b) => a.start - b.start)
    const merged: Range[] = [{ ...sorted[0], id: 0 }]

    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i]
        const last = merged[merged.length - 1]
        if (current.start <= last.end + 1) {
            last.end = Math.max(last.end, current.end)
        } else {
            merged.push({ ...current, id: merged.length })
        }
    }
    return merged
}

function isInAnyRange(id: number, ranges: Range[]): boolean {
    for (const range of ranges) {
        if (id >= range.start && id <= range.end) return true
    }
    return false
}

function findRangeIndex(id: number, ranges: Range[]): number {
    for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i]
        if (id >= range.start && id <= range.end) return i
    }
    return -1
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function Day5RangeChecker(props: Day5Props) {
    const {
        input = `3-5
10-14
16-20
12-18
1
5
8
11
17
32`,
        part = "part1",
        speed = 1,
        accentColor = "#d946ef",
        freshColor = "#22c55e",
        spoiledColor = "#ef4444",
        autoPlay = true,
        playMode = "auto",
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
        neutral: "#f3f4f6",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
    }

    // Start when in view
    const [isInView, setIsInView] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const logContainerRef = useRef<HTMLDivElement>(null)

    // Event log state
    const [eventLog, setEventLog] = useState<LogEntry[]>([])

    // Auto-scroll event log
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop =
                logContainerRef.current.scrollHeight
        }
    }, [eventLog])

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

    const parsed = useMemo(() => parseInput(input), [input])
    const allRanges = parsed.ranges
    const testIds = parsed.testIds
    const mergedRanges = useMemo(() => mergeRanges(allRanges), [allRanges])

    // Input lines for display (only range lines)
    const inputLines = useMemo(
        () =>
            input
                .trim()
                .split("\n")
                .filter((line) => line.trim().includes("-")),
        [input]
    )

    // Phase state
    const [phase, setPhase] = useState<Phase>("parsing")

    // Parsing state
    const [parseLineIndex, setParseLineIndex] = useState(-1)
    const [parsedRanges, setParsedRanges] = useState<Range[]>([])

    // Merging state (Part 2)
    const [mergeStep, setMergeStep] = useState(0)
    const [currentMerged, setCurrentMerged] = useState<Range[]>([])

    // Checking state (Part 1)
    const [currentTestIndex, setCurrentTestIndex] = useState(-1)
    const [results, setResults] = useState<Map<number, boolean>>(new Map())
    const [isComplete, setIsComplete] = useState(false)
    const [internalPlayMode, setInternalPlayMode] = useState(playMode)

    const parseSpeed = 300 / speed
    const mergeSpeed = 400 / speed
    const checkSpeed = 500 / speed

    // Calculate bounds for visualization - just from ranges
    const { minVal, maxVal, valueRange } = useMemo(() => {
        const rangesToUse =
            phase === "parsing" || phase === "merging"
                ? parsedRanges
                : allRanges
        const rangeValues = rangesToUse.flatMap((r) => [r.start, r.end])

        // For Part 1, also include testIds
        const allValues =
            part === "part1" ? [...rangeValues, ...testIds] : rangeValues

        if (allValues.length === 0) {
            return { minVal: 0, maxVal: 100, valueRange: 100 }
        }

        const min = Math.min(...allValues)
        const max = Math.max(...allValues)
        const range = max - min || 1 // avoid division by zero

        return { minVal: min, maxVal: max, valueRange: range }
    }, [allRanges, parsedRanges, testIds, part, phase])


    useEffect(() => {
        startTransition(() => setInternalPlayMode(playMode))
    }, [playMode])

    // Reset when inputs change
    const resetState = useCallback(() => {
        if (part === "part2") {
            // Part 2: Fast parsing, focus on merge animation
            startTransition(() => {
                setPhase("parsing")
                setParseLineIndex(-1)
                setParsedRanges([])
                setMergeStep(0)
                setCurrentMerged([])
                setCurrentTestIndex(-1)
                setResults(new Map())
                setIsComplete(false)
                setEventLog([
                    {
                        message: "Starting merge process",
                        type: "step",
                        detail: `${inputLines.length} ranges`,
                    },
                ])
            })
        } else {
            // Part 1: Show detailed parsing + checking
            startTransition(() => {
                setPhase("parsing")
                setParseLineIndex(-1)
                setParsedRanges([])
                setMergeStep(0)
                setCurrentMerged([])
                setCurrentTestIndex(-1)
                setResults(new Map())
                setIsComplete(false)
                setEventLog([
                    {
                        message: "Starting analysis",
                        type: "step",
                        detail: `${inputLines.length} ranges, ${testIds.length} IDs`,
                    },
                ])
            })
        }
    }, [part, inputLines.length, testIds.length])

    const handleRestart = () => {
        resetState()
        setHasStarted(true)
        setIsInView(true)
    }

    useEffect(() => {
        resetState()
    }, [input, part, resetState])

    // Parsing animation speed (faster for Part 2)
    const actualParseSpeed = part === "part2" ? parseSpeed * 0.3 : parseSpeed

    // Parsing animation (only when in view)
    useEffect(() => {
        if (!isInView || phase !== "parsing" || !autoPlay) return

        if (parseLineIndex >= inputLines.length - 1) {
            // Add a pause before moving to next phase
            const pauseTimer = setTimeout(() => {
                startTransition(() => {
                    if (part === "part2") {
                        setPhase("merging")
                        addLogEntry(
                            "Parsing complete",
                            "success",
                            `${parsedRanges.length} ranges`
                        )
                        addLogEntry("Starting merge", "step")
                        // Initialize merging with sorted ranges
                        const sorted = [...parsedRanges].sort(
                            (a, b) => a.start - b.start
                        )
                        if (sorted.length > 0) {
                            setCurrentMerged([sorted[0]])
                            setMergeStep(1)
                            addLogEntry(
                                `Initial: ${sorted[0].start}-${sorted[0].end}`,
                                "info"
                            )
                        }
                    } else {
                        setPhase("checking")
                        addLogEntry(
                            "Parsing complete",
                            "success",
                            `${parsedRanges.length} ranges`
                        )
                        addLogEntry("Checking IDs", "step")
                    }
                })
            }, actualParseSpeed * 2)
            return () => clearTimeout(pauseTimer)
        }

        const timer = setTimeout(() => {
            const nextIdx = parseLineIndex + 1
            const line = inputLines[nextIdx]?.trim()
            if (line) {
                const [start, end] = line.split("-").map(Number)
                if (!Number.isNaN(start) && !Number.isNaN(end)) {
                    startTransition(() => {
                        setParseLineIndex(nextIdx)
                        setParsedRanges((prev) => [
                            ...prev,
                            { start, end, id: prev.length },
                        ])
                        // Only log each range for Part 1 (detailed view)
                        if (part === "part1") {
                            addLogEntry(`Range ${start}-${end}`, "info")
                        }
                    })
                } else {
                    setParseLineIndex(nextIdx)
                }
            } else {
                setParseLineIndex(nextIdx)
            }
        }, actualParseSpeed)

        return () => clearTimeout(timer)
    }, [
        phase,
        parseLineIndex,
        inputLines,
        autoPlay,
        actualParseSpeed,
        part,
        parsedRanges,
        addLogEntry,
        isInView,
    ])

    // Merging animation (Part 2 - only when in view)
    useEffect(() => {
        if (!isInView || phase !== "merging" || !autoPlay || part !== "part2") return

        const sorted = [...parsedRanges].sort((a, b) => a.start - b.start)

        if (mergeStep >= sorted.length) {
            startTransition(() => {
                setPhase("complete")
                setIsComplete(true)
                const total = currentMerged.reduce(
                    (sum, r) => sum + (r.end - r.start + 1),
                    0
                )
                addLogEntry("Merge complete!", "success")
                addLogEntry(
                    `${currentMerged.length} merged ranges`,
                    "info",
                    `${total} IDs`
                )
            })
            return
        }

        const timer = setTimeout(() => {
            const current = sorted[mergeStep]

            startTransition(() => {
                setCurrentMerged((prev) => {
                    const newMerged = [...prev]
                    const last = newMerged[newMerged.length - 1]
                    if (last && current.start <= last.end + 1) {
                        // Merge with last
                        last.end = Math.max(last.end, current.end)
                        addLogEntry(
                            `Merged ${current.start}-${current.end}`,
                            "warning",
                            `→ ${last.start}-${last.end}`
                        )
                    } else {
                        // Add as new range
                        newMerged.push({ ...current, id: newMerged.length })
                        addLogEntry(
                            `New range ${current.start}-${current.end}`,
                            "info"
                        )
                    }
                    return newMerged
                })
                setMergeStep((prev) => prev + 1)
            })
        }, mergeSpeed)

        return () => clearTimeout(timer)
    }, [
        phase,
        mergeStep,
        parsedRanges,
        autoPlay,
        mergeSpeed,
        part,
        addLogEntry,
        currentMerged,
        isInView,
    ])

    // Checking animation (Part 1 - only when in view)
    useEffect(() => {
        if (!isInView || phase !== "checking" || !autoPlay || part !== "part1") return
        if (internalPlayMode !== "auto" || isComplete) return

        const timer = setTimeout(() => {
            const nextIndex = currentTestIndex + 1
            if (nextIndex >= testIds.length) {
                startTransition(() => {
                    setIsComplete(true)
                    setPhase("complete")
                    const fresh = Array.from(results.values()).filter(
                        (v) => v
                    ).length
                    addLogEntry("Check complete!", "success")
                    addLogEntry(`${fresh} fresh ingredients`, "info")
                })
                return
            }

            const id = testIds[nextIndex]
            const isFresh = isInAnyRange(id, allRanges)

            startTransition(() => {
                setCurrentTestIndex(nextIndex)
                setResults((prev) => new Map(prev).set(id, isFresh))
                addLogEntry(
                    `ID ${id}`,
                    isFresh ? "success" : "error",
                    isFresh ? "fresh" : "spoiled"
                )
            })
        }, checkSpeed)

        return () => clearTimeout(timer)
    }, [
        phase,
        autoPlay,
        internalPlayMode,
        currentTestIndex,
        testIds,
        allRanges,
        isComplete,
        checkSpeed,
        part,
        addLogEntry,
        results,
        isInView,
    ])

    const handleNextStep = () => {
        if (isComplete) {
            resetState()
            return
        }

        const nextIndex = currentTestIndex + 1
        if (nextIndex >= testIds.length) {
            startTransition(() => {
                setIsComplete(true)
                setPhase("complete")
            })
            return
        }

        const id = testIds[nextIndex]
        const isFresh = isInAnyRange(id, allRanges)

        startTransition(() => {
            setCurrentTestIndex(nextIndex)
            setResults((prev) => new Map(prev).set(id, isFresh))
        })
    }

    // Convert value to percentage position (0-100%)
    const toPercent = (value: number) => {
        return ((value - minVal) / valueRange) * 100
    }

    const freshCount = Array.from(results.values()).filter((v) => v).length
    const totalFreshIds = (
        phase === "complete" || phase === "checking"
            ? mergedRanges
            : currentMerged
    ).reduce((sum, r) => sum + (r.end - r.start + 1), 0)

    const rangeColors = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"]

    const getPhaseLabel = () => {
        switch (phase) {
            case "parsing":
                return "Parsing Ranges..."
            case "merging":
                return "Merging Overlapping Ranges..."
            case "checking":
                return "Checking IDs..."
            case "complete":
                return "Complete"
            default:
                return ""
        }
    }

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
                position: "relative",
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
                        Ranges
                    </div>

                    {/* Stats Row */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            gap: "12px",
                            marginBottom: "12px",
                        }}
                    >
                        {/* Parsing progress */}
                        <div
                            style={{
                                padding: "8px 16px",
                                backgroundColor: theme.cardBg,
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                width: "100%",
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
                                Parsed
                            </span>
                            <span
                                style={{
                                    ...font,
                                    fontSize: "20px",
                                    fontWeight: "bold",
                                    color:
                                        phase === "parsing"
                                            ? theme.success
                                            : theme.textInverse,
                                }}
                            >
                                {parsedRanges.length}
                            </span>
                        </div>

                        {/* Part 2: Merged count */}
                        {part === "part2" && (
                            <div
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: theme.cardBg,
                                    borderRadius: "8px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    width: "100%",
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
                                    Merged
                                </span>
                                <span
                                    style={{
                                        ...font,
                                        fontSize: "20px",
                                        fontWeight: "bold",
                                        color:
                                            phase === "merging"
                                                ? theme.warning
                                                : freshColor,
                                    }}
                                >
                                    {currentMerged.length}
                                </span>
                            </div>
                        )}

                        {/* Part 1: Fresh count */}
                        {part === "part1" && (
                            <div
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: theme.cardBg,
                                    borderRadius: "8px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    width: "100%",
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
                                    Fresh
                                </span>
                                <span
                                    style={{
                                        ...font,
                                        fontSize: "20px",
                                        fontWeight: "bold",
                                        color: freshColor,
                                    }}
                                >
                                    {freshCount}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Part 2: Total IDs - on its own row */}
                    {part === "part2" && (
                        <motion.div
                            style={{
                                padding: "8px 16px",
                                backgroundColor: theme.cardBg,
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                marginBottom: "12px",
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
                                Total IDs
                            </span>
                            <motion.span
                                key={totalFreshIds}
                                initial={{ scale: 1.2 }}
                                animate={{ scale: 1 }}
                                style={{
                                    ...font,
                                    fontSize: "24px",
                                    fontWeight: "bold",
                                    color: accentColor,
                                }}
                            >
                                {totalFreshIds}
                            </motion.span>
                        </motion.div>
                    )}

                    {/* Visualization Area */}
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            backgroundColor: theme.cardBg,
                            borderRadius: "8px",
                            padding: "12px",
                            minHeight: 0,
                            overflow: "auto",
                        }}
                    >
                        {/* Input Text Display */}
                        <div
                            style={{
                                backgroundColor: theme.surfaceBg,
                                borderRadius: "6px",
                                padding: "8px 12px",
                                fontFamily: "monospace",
                                fontSize: "12px",
                                maxHeight: "80px",
                                overflow: "auto",
                            }}
                        >
                            {inputLines.map((line, i) => {
                                const isParsed =
                                    phase !== "parsing" || i < parseLineIndex
                                const isCurrent =
                                    phase === "parsing" && i === parseLineIndex
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            padding: "1px 0",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            color: isCurrent
                                                ? theme.success
                                                : isParsed
                                                  ? theme.textInverse
                                                  : theme.textMuted,
                                            fontWeight: isCurrent
                                                ? "bold"
                                                : "normal",
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: "12px",
                                                textAlign: "center",
                                                fontSize: "10px",
                                            }}
                                        >
                                            {isParsed
                                                ? "✓"
                                                : isCurrent
                                                  ? "→"
                                                  : ""}
                                        </span>
                                        <span
                                            style={{
                                                opacity:
                                                    isParsed || isCurrent
                                                        ? 1
                                                        : 0.4,
                                            }}
                                        >
                                            {line}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Original Ranges Visualization */}
                        <div style={{ position: "relative", height: "70px" }}>
                            <div
                                style={{
                                    ...font,
                                    fontSize: "10px",
                                    color: theme.textMuted,
                                    textTransform: "uppercase",
                                    marginBottom: "6px",
                                }}
                            >
                                Original Ranges
                            </div>
                            {/* Range bars */}
                            {(phase === "parsing"
                                ? parsedRanges
                                : allRanges
                            ).map((range, i) => (
                                <motion.div
                                    key={range.id}
                                    initial={{ opacity: 0, scaleX: 0 }}
                                    animate={{
                                        opacity: 0.9,
                                        scaleX: 1,
                                    }}
                                    transition={{
                                        duration: 0.25,
                                        ease: "easeOut",
                                    }}
                                    style={{
                                        position: "absolute",
                                        top: `${24 + (i % 2) * 12}px`,
                                        left: `${toPercent(range.start)}%`,
                                        width: `${Math.max(1, toPercent(range.end) - toPercent(range.start))}%`,
                                        minWidth: "4px",
                                        height: "10px",
                                        backgroundColor:
                                            rangeColors[i % rangeColors.length],
                                        borderRadius: "3px",
                                        transformOrigin: "left",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        overflow: "hidden",
                                    }}
                                >
                                    <span
                                        style={{
                                            ...font,
                                            fontSize: "8px",
                                            fontWeight: "bold",
                                            color: "white",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {range.start}-{range.end}
                                    </span>
                                </motion.div>
                            ))}
                            {/* Number line */}
                            <div
                                style={{
                                    position: "absolute",
                                    top: "50px",
                                    left: 0,
                                    right: 0,
                                    height: "2px",
                                    backgroundColor: theme.border,
                                }}
                            />
                        </div>

                        {/* Merged Ranges (Part 2) */}
                        {part === "part2" && (
                            <div
                                style={{ position: "relative", height: "60px" }}
                            >
                                <div
                                    style={{
                                        ...font,
                                        fontSize: "10px",
                                        color: theme.textMuted,
                                        textTransform: "uppercase",
                                        marginBottom: "6px",
                                    }}
                                >
                                    Merged Ranges
                                </div>
                                {/* Number line */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "44px",
                                        left: 0,
                                        right: 0,
                                        height: "2px",
                                        backgroundColor: theme.border,
                                    }}
                                />
                                {/* Merged range bars - animate growing */}
                                <AnimatePresence>
                                    {currentMerged.map((range) => (
                                        <motion.div
                                            key={`merged-${range.id}`}
                                            initial={{
                                                opacity: 0,
                                                scaleX: 0,
                                            }}
                                            animate={{
                                                opacity: 1,
                                                scaleX: 1,
                                                left: `${toPercent(range.start)}%`,
                                                width: `${Math.max(1, toPercent(range.end) - toPercent(range.start))}%`,
                                            }}
                                            transition={{
                                                duration: 0.3,
                                                ease: "easeOut",
                                            }}
                                            style={{
                                                position: "absolute",
                                                top: "24px",
                                                height: "14px",
                                                minWidth: "4px",
                                                backgroundColor: freshColor,
                                                borderRadius: "4px",
                                                transformOrigin: "left",
                                            }}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Test IDs (Part 1) */}
                        {part === "part1" && (
                            <div>
                                <div
                                    style={{
                                        ...font,
                                        fontSize: "10px",
                                        color: theme.textMuted,
                                        textTransform: "uppercase",
                                        marginBottom: "8px",
                                    }}
                                >
                                    Test IDs
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "8px",
                                    }}
                                >
                                    {testIds.map((id, i) => {
                                        const hasResult = results.has(id)
                                        const isFresh = results.get(id)
                                        const isCurrent = i === currentTestIndex
                                        const isWaiting = phase === "parsing"

                                        let bgColor = theme.surfaceBg
                                        let textColor = theme.textMuted

                                        if (hasResult && isFresh) {
                                            const rangeIndex = findRangeIndex(
                                                id,
                                                allRanges
                                            )
                                            bgColor =
                                                rangeIndex >= 0
                                                    ? rangeColors[
                                                          rangeIndex %
                                                              rangeColors.length
                                                      ]
                                                    : freshColor
                                            textColor = "white"
                                        }

                                        return (
                                            <motion.div
                                                key={`test-${i}`}
                                                animate={{
                                                    scale: isCurrent ? 1.15 : 1,
                                                }}
                                                transition={{ duration: 0.2 }}
                                                style={{
                                                    minWidth: "32px",
                                                    height: "32px",
                                                    padding: "0 8px",
                                                    borderRadius: "16px",
                                                    backgroundColor: bgColor,
                                                    border: isCurrent
                                                        ? `2px solid ${theme.warning}`
                                                        : "2px solid transparent",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    boxShadow: isCurrent
                                                        ? `0 0 10px ${theme.warning}60`
                                                        : "none",
                                                    opacity: isWaiting
                                                        ? 0.5
                                                        : 1,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        ...font,
                                                        fontSize: "12px",
                                                        color: textColor,
                                                        fontWeight: "600",
                                                    }}
                                                >
                                                    {id}
                                                </span>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
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

                        {part === "part1" &&
                            internalPlayMode === "step" &&
                            phase === "checking" && (
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
                                    {isComplete ? "Reset" : "Check Next"}
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
                                        <span style={{ flex: 1 }}>
                                            {entry.message}
                                        </span>
                                        {entry.detail && (
                                            <span
                                                style={{
                                                    color: theme.textMuted,
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

addPropertyControls(Day5RangeChecker, {
    input: {
        type: ControlType.String,
        title: "Input",
        defaultValue: `3-5
10-14
16-20
12-18
1
5
8
11
17
32`,
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
    freshColor: {
        type: ControlType.Color,
        title: "Fresh",
        defaultValue: "#22c55e",
    },
    spoiledColor: {
        type: ControlType.Color,
        title: "Spoiled",
        defaultValue: "#ef4444",
    },
    autoPlay: {
        type: ControlType.Boolean,
        title: "Auto Play",
        defaultValue: true,
        hidden: ({ part, playMode }) => playMode === "step",
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
