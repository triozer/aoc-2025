// Day 6: Cephalopod Math Worksheet
// Vertical column math problems with + or * operators
// Part 1: Read horizontally, Part 2: Read columns right-to-left

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

interface ColumnInfo {
    colIndex: number // actual character position
    digits: number[]
    rows: number[] // which rows have digits
}

interface Problem {
    numbers: number[]
    operation: "+" | "*"
    columns: ColumnInfo[] // Enhanced column info with positions
    startCol: number
    endCol: number
}

interface Day6Props {
    worksheetInput: string
    part: "part1" | "part2"
    speed: number
    accentColor: string
    resultColor: string
    autoPlay: boolean
    playMode: "auto" | "step"
    showDebug: boolean
    font: CSSProperties
    style?: CSSProperties
}

type Phase =
    | "scanning"
    | "reading_rows"
    | "reading_columns"
    | "solving"
    | "complete"

// Event log types
type LogEntryType = "info" | "success" | "warning" | "error" | "step"

interface LogEntry {
    message: string
    type?: LogEntryType
    detail?: string
}

function parseWorksheet(input: string, mode: "part1" | "part2"): Problem[] {
    const lines = input.split("\n")
    const rows = lines.slice(0, -1)
    const lastLine = lines[lines.length - 1] || ""

    const problems: Problem[] = []
    let startPos = lastLine.length

    for (let i = lastLine.length - 1; i >= 0; i--) {
        const char = lastLine[i]

        if (char === "+" || char === "*") {
            const endPos = startPos
            const opPos = i

            if (mode === "part1") {
                // Part 1: Read each row as a number within the problem
                const numbers = rows
                    .map((line) => {
                        const segment = line.substring(opPos, endPos).trim()
                        return segment ? parseInt(segment, 10) : NaN
                    })
                    .filter((n) => !Number.isNaN(n))

                problems.unshift({
                    numbers,
                    operation: char as "+" | "*",
                    columns: [],
                    startCol: opPos,
                    endCol: endPos,
                })
            } else {
                // Part 2: Each column forms one number, read top-to-bottom
                const columns: ColumnInfo[] = []
                for (let col = opPos; col < endPos; col++) {
                    const columnDigits: number[] = []
                    const columnRows: number[] = []
                    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
                        const c = rows[rowIdx][col]
                        if (c && c !== " ") {
                            columnDigits.push(parseInt(c, 10))
                            columnRows.push(rowIdx)
                        }
                    }
                    if (columnDigits.length > 0) {
                        columns.push({
                            colIndex: col,
                            digits: columnDigits,
                            rows: columnRows,
                        })
                    }
                }

                const numbers = columns.map((col) =>
                    parseInt(col.digits.join(""), 10)
                )

                problems.unshift({
                    numbers,
                    operation: char as "+" | "*",
                    columns,
                    startCol: opPos,
                    endCol: endPos,
                })
            }

            startPos = opPos
            // Skip spaces
            while (i > 0 && lastLine[i - 1] === " ") i--
        }
    }

    return problems
}

function calculate(numbers: number[], op: "+" | "*"): number {
    if (op === "+") {
        return numbers.reduce((a, b) => a + b, 0)
    }
    return numbers.reduce((a, b) => a * b, 1)
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function Day6MathWorksheet(props: Day6Props) {
    const {
        worksheetInput = `123 328  51 64 
 45 64  387 23 
  6 98  215 314
*   +   *   +  `,
        part = "part1",
        speed = 1,
        accentColor = "#6366f1",
        resultColor = "#22c55e",
        autoPlay = true,
        playMode = "auto",
        showDebug = false,
        font,
    } = props

    // Standardized color tokens
    const theme = {
        // Backgrounds
        bg: "transparent",
        cardBg: "#1f2937",
        surfaceBg: "#374151",
        // Text
        text: "#1f2937",
        textInverse: "#f3f4f6",
        textMuted: "#9ca3af",
        // Borders
        border: "#e5e7eb",
        // State Colors
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        // Neutrals
        neutral: "#f3f4f6",
        neutralDark: "#374151",
    }

    // Start when in view
    const [isInView, setIsInView] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const worksheetColRef = useRef<HTMLDivElement>(null)
    const [worksheetWidth, setWorksheetWidth] = useState(500)

    const lines = useMemo(() => worksheetInput.split("\n"), [worksheetInput])
    const lastLine = lines[lines.length - 1] || ""
    const problems = useMemo(
        () => parseWorksheet(worksheetInput, part),
        [worksheetInput, part]
    )

    // Phase state
    const [phase, setPhase] = useState<Phase>("scanning")

    // Scanning state
    const [scanIndex, setScanIndex] = useState(lastLine.length)
    const [foundProblems, setFoundProblems] = useState<number[]>([])

    // Solving state
    const [currentProblem, setCurrentProblem] = useState(-1)
    const [results, setResults] = useState<number[]>([])
    const [isComplete, setIsComplete] = useState(false)
    const [internalPlayMode, setInternalPlayMode] = useState(playMode)

    // Column reading state (for Part 2)
    const [currentColumnIdx, setCurrentColumnIdx] = useState(-1)
    const [currentDigitIdx, setCurrentDigitIdx] = useState(-1)
    const [revealedNumbers, setRevealedNumbers] = useState<number[]>([])

    // Row reading state (for Part 1)
    const [currentRowIdx, setCurrentRowIdx] = useState(-1)
    const [rowScanPosition, setRowScanPosition] = useState(-1) // char position scanning left to right

    // Event log state
    const [eventLog, setEventLog] = useState<LogEntry[]>([])
    const logContainerRef = useRef<HTMLDivElement>(null)

    // Auto-scroll event log to bottom
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop =
                logContainerRef.current.scrollHeight
        }
    }, [eventLog])

    // Helper to add log entries
    const addLogEntry = useCallback(
        (message: string, type: LogEntryType = "info", detail?: string) => {
            setEventLog((prev) => [...prev, { message, type, detail }])
        },
        []
    )

    // Get color based on entry type
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

    // Get prefix icon/symbol based on type
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

    const scanSpeed = 50 / speed
    const solveSpeed = 800 / speed
    const columnSpeed = 150 / speed // Speed for column digit reading
    const digitSpeed = 100 / speed // Speed for each digit in column
    const rowScanSpeed = 30 / speed // Speed for row character scanning
    const rowSpeed = 300 / speed // Delay between rows

    useEffect(() => {
        if (!worksheetColRef.current) return
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setWorksheetWidth(entry.contentRect.width)
            }
        })
        observer.observe(worksheetColRef.current)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        startTransition(() => setInternalPlayMode(playMode))
    }, [playMode])

    // Reset when inputs change
    const resetState = useCallback(() => {
        startTransition(() => {
            setPhase("scanning")
            setScanIndex(lastLine.length)
            setFoundProblems([])
            setCurrentProblem(-1)
            setResults([])
            setIsComplete(false)
            setCurrentColumnIdx(-1)
            setCurrentDigitIdx(-1)
            setRevealedNumbers([])
            setCurrentRowIdx(-1)
            setRowScanPosition(-1)
            setEventLog([
                {
                    message: `Starting ${part === "part1" ? "Row" : "Column"} Mode`,
                    type: "step",
                },
                { message: "Scanning for operators...", type: "info" },
            ])
        })
    }, [lastLine.length, part])

    const handleRestart = () => {
        resetState()
        setHasStarted(true)
        setIsInView(true)
    }

    useEffect(() => {
        resetState()
    }, [worksheetInput, part, resetState])

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

    // Scanning animation (only when in view)
    useEffect(() => {
        if (!isInView || phase !== "scanning" || !autoPlay) return

        if (scanIndex < 0) {
            startTransition(() => {
                addLogEntry(
                    `Found ${problems.length} problems`,
                    "success",
                    `${problems.filter((p) => p.operation === "+").length}+ / ${problems.filter((p) => p.operation === "*").length}*`
                )
                if (part === "part2") {
                    addLogEntry("Reading columns top-to-bottom", "step")
                    addLogEntry(`Problem 1/${problems.length}`, "step")
                    setPhase("reading_columns")
                    setCurrentProblem(0)
                    setCurrentColumnIdx(0)
                    setCurrentDigitIdx(0)
                    setRevealedNumbers([])
                } else {
                    // Part 1: Start reading rows
                    addLogEntry("Reading rows left-to-right", "step")
                    addLogEntry(`Problem 1/${problems.length}`, "step")
                    setPhase("reading_rows")
                    setCurrentProblem(0)
                    setCurrentRowIdx(0)
                    setRowScanPosition(problems[0]?.startCol ?? 0)
                    setRevealedNumbers([])
                }
            })
            return
        }

        const timer = setTimeout(() => {
            const char = lastLine[scanIndex]

            startTransition(() => {
                if (char === "+" || char === "*") {
                    setFoundProblems((prev) => [scanIndex, ...prev])
                    addLogEntry(
                        `Found operator "${char}"`,
                        "info",
                        `col ${scanIndex}`
                    )
                }
                setScanIndex((prev) => prev - 1)
            })
        }, scanSpeed)

        return () => clearTimeout(timer)
    }, [
        phase,
        scanIndex,
        lastLine,
        autoPlay,
        scanSpeed,
        isInView,
        part,
        problems,
        addLogEntry,
    ])

    // Row reading animation (for Part 1 - only when in view)
    useEffect(() => {
        if (!isInView) return
        if (
            phase !== "reading_rows" ||
            !autoPlay ||
            internalPlayMode !== "auto"
        )
            return
        if (currentProblem < 0 || currentProblem >= problems.length) return

        const problem = problems[currentProblem]
        const dataRows = lines.slice(0, -1) // All rows except last (operator line)

        // Check if we've finished all rows for this problem
        if (currentRowIdx >= dataRows.length) {
            // Calculate result and move to next problem
            const result = calculate(problem.numbers, problem.operation)
            startTransition(() => {
                const equation = problem.numbers.join(` ${problem.operation} `)
                addLogEntry(
                    `${equation} = ${result.toLocaleString()}`,
                    "success",
                    `P${currentProblem + 1}`
                )
                setResults((prev) => [...prev, result])
                setRevealedNumbers([])

                const nextProblem = currentProblem + 1
                if (nextProblem >= problems.length) {
                    setIsComplete(true)
                    setPhase("complete")
                    addLogEntry("All problems solved!", "success")
                } else {
                    addLogEntry(
                        `Problem ${nextProblem + 1}/${problems.length}`,
                        "step"
                    )
                    setCurrentProblem(nextProblem)
                    setCurrentRowIdx(0)
                    setRowScanPosition(problems[nextProblem]?.startCol ?? 0)
                }
            })
            return
        }

        // Get the segment for this row
        const rowLine = dataRows[currentRowIdx] || ""
        const segment = rowLine.substring(problem.startCol, problem.endCol)
        const trimmedSegment = segment.trim()

        // If this row has no content for this problem, skip to next row
        const hasContent = trimmedSegment && trimmedSegment.length > 0
        if (!hasContent) {
            startTransition(() => {
                setCurrentRowIdx((prev) => prev + 1)
                setRowScanPosition(problem.startCol)
            })
            return
        }

        // Find the last digit position in this row's segment
        let lastDigitPos = problem.startCol
        for (let i = problem.endCol - 1; i >= problem.startCol; i--) {
            if (rowLine[i] && rowLine[i] !== " ") {
                lastDigitPos = i + 1 // End position (exclusive)
                break
            }
        }

        // Initialize scan position if not set
        if (rowScanPosition < problem.startCol) {
            startTransition(() => {
                setRowScanPosition(problem.startCol)
            })
            return
        }

        // Scan until we pass the last digit
        if (rowScanPosition >= lastDigitPos) {
            // Row scan complete - pause then add number and move to next row
            const num = parseInt(trimmedSegment, 10)
            const timer = setTimeout(() => {
                startTransition(() => {
                    if (!Number.isNaN(num)) {
                        addLogEntry(
                            `Read: ${num}`,
                            "info",
                            `row ${currentRowIdx + 1}`
                        )
                        setRevealedNumbers((prev) => [...prev, num])
                    }
                    setCurrentRowIdx((prev) => prev + 1)
                    setRowScanPosition(problem.startCol)
                })
            }, rowScanSpeed * 5) // Pause at end of row
            return () => clearTimeout(timer)
        }

        // Animate scanning across the row (until last digit)
        const timer = setTimeout(() => {
            startTransition(() => {
                setRowScanPosition((prev) => prev + 1)
            })
        }, rowScanSpeed)

        return () => clearTimeout(timer)
    }, [
        phase,
        autoPlay,
        internalPlayMode,
        currentProblem,
        currentRowIdx,
        rowScanPosition,
        problems,
        lines,
        rowScanSpeed,
        addLogEntry,
        isInView,
    ])

    // Column reading animation (for Part 2 - only when in view)
    useEffect(() => {
        if (!isInView) return
        if (
            phase !== "reading_columns" ||
            !autoPlay ||
            internalPlayMode !== "auto"
        )
            return
        if (currentProblem < 0 || currentProblem >= problems.length) return

        const problem = problems[currentProblem]

        // Check if we've finished all columns in this problem
        if (currentColumnIdx >= problem.columns.length) {
            // Calculate result and move to next problem
            const result = calculate(problem.numbers, problem.operation)
            startTransition(() => {
                const equation = problem.numbers.join(` ${problem.operation} `)
                addLogEntry(
                    `${equation} = ${result.toLocaleString()}`,
                    "success",
                    `P${currentProblem + 1}`
                )
                setResults((prev) => [...prev, result])
                setRevealedNumbers([])

                const nextProblem = currentProblem + 1
                if (nextProblem >= problems.length) {
                    setIsComplete(true)
                    setPhase("complete")
                    addLogEntry("All problems solved!", "success")
                } else {
                    addLogEntry(
                        `Problem ${nextProblem + 1}/${problems.length}`,
                        "step"
                    )
                    setCurrentProblem(nextProblem)
                    setCurrentColumnIdx(0)
                    setCurrentDigitIdx(0)
                }
            })
            return
        }

        const column = problem.columns[currentColumnIdx]

        // Check if we've finished all digits in this column
        if (currentDigitIdx >= column.digits.length) {
            // Column complete - add the formed number
            const formedNumber = parseInt(column.digits.join(""), 10)
            startTransition(() => {
                addLogEntry(
                    `Column → ${formedNumber}`,
                    "info",
                    `col ${currentColumnIdx + 1}`
                )
                setRevealedNumbers((prev) => [...prev, formedNumber])
                setCurrentColumnIdx((prev) => prev + 1)
                setCurrentDigitIdx(0)
            })
            return
        }

        // Animate to next digit
        const timer = setTimeout(() => {
            startTransition(() => {
                setCurrentDigitIdx((prev) => prev + 1)
            })
        }, digitSpeed)

        return () => clearTimeout(timer)
    }, [
        phase,
        autoPlay,
        internalPlayMode,
        currentProblem,
        currentColumnIdx,
        currentDigitIdx,
        problems,
        digitSpeed,
        addLogEntry,
        isInView,
    ])

    // Solving animation (Part 1 only - only when in view)
    useEffect(() => {
        if (!isInView) return
        if (phase !== "solving" || !autoPlay || internalPlayMode !== "auto")
            return
        if (isComplete) return

        const timer = setTimeout(() => {
            const nextIndex = currentProblem + 1
            if (nextIndex >= problems.length) {
                startTransition(() => {
                    setIsComplete(true)
                    setPhase("complete")
                })
                return
            }

            const problem = problems[nextIndex]
            const result = calculate(problem.numbers, problem.operation)

            startTransition(() => {
                setCurrentProblem(nextIndex)
                setResults((prev) => [...prev, result])
            })
        }, solveSpeed)

        return () => clearTimeout(timer)
    }, [
        phase,
        autoPlay,
        internalPlayMode,
        currentProblem,
        problems,
        isComplete,
        solveSpeed,
        isInView,
    ])

    const handleNextStep = () => {
        if (isComplete) {
            resetState()
            return
        }

        const nextIndex = currentProblem + 1
        if (nextIndex >= problems.length) {
            startTransition(() => {
                setIsComplete(true)
                setPhase("complete")
            })
            return
        }

        const problem = problems[nextIndex]
        const result = calculate(problem.numbers, problem.operation)

        startTransition(() => {
            setCurrentProblem(nextIndex)
            setResults((prev) => [...prev, result])
        })
    }

    const grandTotal = results.reduce((a, b) => a + b, 0)

    // Calculate charWidth to fill the available width (accounting for 16px padding on each side = 32px)
    const charWidth = (worksheetWidth - 32) / (lines[0]?.length || 20)
    // Line height = fontSize * CSS line-height multiplier = (charWidth * 0.7) * 1.4
    const lineHeight = charWidth * 0.7 * 1.4

    const getPhaseLabel = () => {
        switch (phase) {
            case "scanning":
                return "Scanning for Operators..."
            case "reading_rows":
                return "Reading Rows..."
            case "reading_columns":
                return "Reading Columns..."
            case "solving":
                return "Solving Problems..."
            case "complete":
                return "Complete"
            default:
                return ""
        }
    }

    // Find which problem (if any) a column belongs to
    const getProblemForCol = (col: number): number => {
        for (let i = 0; i < problems.length; i++) {
            if (col >= problems[i].startCol && col < problems[i].endCol) {
                return i
            }
        }
        return -1
    }

    // Check if column is revealed (scanned past)
    const isColRevealed = (col: number): boolean => {
        return col > scanIndex
    }

    // Check if a specific cell is being read (Part 2 - column reading)
    const isCellBeingReadCol = (col: number, row: number): boolean => {
        if (phase !== "reading_columns" || currentProblem < 0) return false
        const problem = problems[currentProblem]

        // Check all columns in the current problem
        for (let colIdx = 0; colIdx < problem.columns.length; colIdx++) {
            const column = problem.columns[colIdx]
            if (column.colIndex !== col) continue

            const digitRowIndex = column.rows.indexOf(row)
            if (digitRowIndex === -1) continue

            // For completed columns (before currentColumnIdx), all digits are read
            if (colIdx < currentColumnIdx) {
                return true
            }
            // For current column, only digits up to and including currentDigitIdx are read
            if (colIdx === currentColumnIdx && digitRowIndex < currentDigitIdx) {
                return true
            }
        }
        return false
    }

    // Check if a cell is the current scan target (Part 2)
    const isCellColScanTarget = (col: number, row: number): boolean => {
        if (phase !== "reading_columns" || currentProblem < 0) return false
        const problem = problems[currentProblem]
        if (currentColumnIdx >= problem.columns.length) return false

        const column = problem.columns[currentColumnIdx]
        if (column.colIndex !== col) return false

        const targetRow = column.rows[currentDigitIdx]
        return row === targetRow
    }

    // Check if a column is the active scanning column (Part 2)
    const isActiveColumn = (col: number): boolean => {
        if (phase !== "reading_columns" || currentProblem < 0) return false
        const problem = problems[currentProblem]
        if (currentColumnIdx >= problem.columns.length) return false
        return problem.columns[currentColumnIdx].colIndex === col
    }

    // Get actual digit bounds for a row in a problem
    const getRowDigitBounds = (
        problemIdx: number,
        rowIdx: number
    ): { start: number; end: number } | null => {
        if (problemIdx < 0 || problemIdx >= problems.length) return null
        const problem = problems[problemIdx]
        const dataRows = lines.slice(0, -1)
        const rowLine = dataRows[rowIdx] || ""

        let start = -1
        let end = -1
        for (let i = problem.startCol; i < problem.endCol; i++) {
            if (rowLine[i] && rowLine[i] !== " ") {
                if (start === -1) start = i
                end = i + 1
            }
        }
        if (start === -1) return null
        return { start, end }
    }

    // Check if a cell is being read in row mode (Part 1)
    const isCellBeingReadRow = (col: number, row: number): boolean => {
        if (phase !== "reading_rows" || currentProblem < 0) return false
        const problem = problems[currentProblem]
        if (row !== currentRowIdx) return false
        // Cell is scanned if it's within problem bounds and before scan position
        return col >= problem.startCol && col < rowScanPosition
    }

    // Check if a cell is the current scan target in row mode (Part 1)
    const isCellRowScanTarget = (col: number, row: number): boolean => {
        if (phase !== "reading_rows" || currentProblem < 0) return false
        const problem = problems[currentProblem]
        return (
            row === currentRowIdx &&
            col === rowScanPosition &&
            col >= problem.startCol &&
            col < problem.endCol
        )
    }

    // Check if a row is the active scanning row (Part 1)
    const isActiveRow = (row: number): boolean => {
        if (phase !== "reading_rows" || currentProblem < 0) return false
        return row === currentRowIdx
    }

    // Get the current building number string for row reading (Part 1)
    const getBuildingRowNumber = (): string => {
        if (phase !== "reading_rows" || currentProblem < 0) return ""
        const problem = problems[currentProblem]
        const dataRows = lines.slice(0, -1)
        if (currentRowIdx >= dataRows.length) return ""

        const rowLine = dataRows[currentRowIdx] || ""
        const scannedPart = rowLine.substring(problem.startCol, rowScanPosition)
        return scannedPart.trim()
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
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    width: "100%",
                    minHeight: 0,
                }}
            >
                {/* Left Column - Worksheet Display */}
                <div
                    ref={worksheetColRef}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                        minWidth: 0,
                        overflow: "hidden",
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
                        Worksheet
                    </div>

                    {/* Stats Row */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            gap: "8px",
                            marginBottom: "8px",
                        }}
                    >
                        {/* Problem Progress */}
                        <div
                            style={{
                                padding: "8px 16px",
                                backgroundColor: theme.cardBg,
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                flex: 1,
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
                                Problem
                            </span>
                            <span
                                style={{
                                    ...font,
                                    fontSize: "20px",
                                    fontWeight: "bold",
                                    color:
                                        phase === "scanning"
                                            ? theme.textMuted
                                            : accentColor,
                                }}
                            >
                                {phase === "scanning"
                                    ? `0/${problems.length}`
                                    : `${Math.min(currentProblem + 1, problems.length)}/${problems.length}`}
                            </span>
                        </div>

                        {/* Solved */}
                        <div
                            style={{
                                padding: "8px 16px",
                                backgroundColor: theme.cardBg,
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                flex: 1,
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
                                Solved
                            </span>
                            <span
                                style={{
                                    ...font,
                                    fontSize: "20px",
                                    fontWeight: "bold",
                                    color: theme.success,
                                }}
                            >
                                {results.length}
                            </span>
                        </div>
                    </div>

                    {/* Total/Answer Row */}
                    <div
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
                            {phase === "complete" ? "Answer" : "Total"}
                        </span>
                        <span
                            style={{
                                ...font,
                                fontSize: "24px",
                                fontWeight: "bold",
                                color: resultColor,
                            }}
                        >
                            {grandTotal.toLocaleString()}
                        </span>
                    </div>

                    {/* Raw Worksheet with Scan Line */}
                    <div
                        style={{
                            fontFamily: "monospace",
                            fontSize: `${charWidth * 0.7}px`,
                            lineHeight: 1.4,
                            backgroundColor: theme.cardBg,
                            padding: "16px",
                            borderRadius: "8px",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        {/* Horizontal scan line effect */}
                        {phase === "scanning" && scanIndex >= 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    bottom: 0,
                                    left: `${16 + scanIndex * charWidth}px`,
                                    width: "2px",
                                    background: `linear-gradient(to bottom, transparent, ${theme.success}, ${theme.success}, transparent)`,
                                    boxShadow: `0 0 10px ${theme.success}, 0 0 20px ${theme.success}`,
                                    zIndex: 10,
                                }}
                            />
                        )}

                        {/* Row highlight for Part 1 reading */}
                        {phase === "reading_rows" &&
                            currentProblem >= 0 &&
                            currentRowIdx >= 0 &&
                            currentRowIdx < lines.length - 1 &&
                            (() => {
                                const bounds = getRowDigitBounds(
                                    currentProblem,
                                    currentRowIdx
                                )
                                if (!bounds) return null
                                return (
                                    <>
                                        {/* Row background highlight - only covers actual digits */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            style={{
                                                position: "absolute",
                                                top: `${16 + currentRowIdx * lineHeight}px`,
                                                left: `${16 + bounds.start * charWidth}px`,
                                                width: `${(bounds.end - bounds.start) * charWidth}px`,
                                                height: `${lineHeight}px`,
                                                background: `${accentColor}15`,
                                                borderTop: `2px solid ${accentColor}`,
                                                borderBottom: `2px solid ${accentColor}`,
                                                boxShadow: `0 0 15px ${accentColor}40`,
                                                zIndex: 5,
                                            }}
                                        />
                                        {/* Vertical scan line moving left to right */}
                                        {rowScanPosition >= bounds.start && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                style={{
                                                    position: "absolute",
                                                    top: `${16 + currentRowIdx * lineHeight}px`,
                                                    left: `${16 + rowScanPosition * charWidth}px`,
                                                    width: "2px",
                                                    height: `${lineHeight}px`,
                                                    background: `linear-gradient(to right, ${accentColor}, ${accentColor})`,
                                                    boxShadow: `0 0 10px ${accentColor}, 0 0 20px ${accentColor}`,
                                                    zIndex: 15,
                                                }}
                                            />
                                        )}
                                    </>
                                )
                            })()}

                        {/* Column highlight for Part 2 reading */}
                        {phase === "reading_columns" &&
                            currentProblem >= 0 &&
                            currentColumnIdx <
                                (problems[currentProblem]?.columns.length ||
                                    0) && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{
                                        position: "absolute",
                                        top: 16,
                                        left: `${16 + (problems[currentProblem]?.columns[currentColumnIdx]?.colIndex || 0) * charWidth}px`,
                                        width: `${charWidth}px`,
                                        height: `${(lines.length - 1) * lineHeight}px`,
                                        background: `${accentColor}20`,
                                        borderLeft: `2px solid ${accentColor}`,
                                        borderRight: `2px solid ${accentColor}`,
                                        boxShadow: `0 0 15px ${accentColor}40`,
                                        zIndex: 5,
                                    }}
                                />
                            )}

                        {/* Unscanned overlay (dims unscanned area) */}
                        {phase === "scanning" && (
                            <motion.div
                                animate={{
                                    width: `${Math.max(0, scanIndex + 1) * charWidth}px`,
                                }}
                                transition={{ duration: 0.05 }}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    bottom: 0,
                                    left: 16,
                                    background: "rgba(0,0,0,0.4)",
                                    zIndex: 5,
                                    pointerEvents: "none",
                                }}
                            />
                        )}

                        {lines.map((line, lineIdx) => (
                            <div key={lineIdx} style={{ display: "flex" }}>
                                {line.split("").map((char, charIdx) => {
                                    const isOperator =
                                        char === "+" || char === "*"
                                    const isLastLine =
                                        lineIdx === lines.length - 1
                                    const isScanning = phase === "scanning"
                                    const isScanCursor =
                                        isScanning && charIdx === scanIndex
                                    const isRevealed = isColRevealed(charIdx)
                                    const isFoundOperator =
                                        isLastLine &&
                                        foundProblems.includes(charIdx)

                                    // Row reading highlights (Part 1)
                                    const isBeingReadRow = isCellBeingReadRow(
                                        charIdx,
                                        lineIdx
                                    )
                                    const isRowScanTarget = isCellRowScanTarget(
                                        charIdx,
                                        lineIdx
                                    )
                                    const isInActiveRow =
                                        isActiveRow(lineIdx) && !isLastLine

                                    // Column reading highlights (Part 2)
                                    const isBeingReadCol = isCellBeingReadCol(
                                        charIdx,
                                        lineIdx
                                    )
                                    const isColScanTarget = isCellColScanTarget(
                                        charIdx,
                                        lineIdx
                                    )
                                    const isInActiveCol =
                                        isActiveColumn(charIdx) && !isLastLine

                                    // Highlight current problem being solved
                                    const problemIdx = getProblemForCol(charIdx)
                                    const isCurrentProblem =
                                        (phase === "solving" ||
                                            phase === "reading_rows" ||
                                            phase === "reading_columns") &&
                                        problemIdx === currentProblem
                                    const isSolvedProblem =
                                        phase !== "scanning" &&
                                        problemIdx !== -1 &&
                                        problemIdx < currentProblem

                                    let color = theme.textInverse
                                    let fontWeight: "normal" | "bold" = "normal"
                                    let bgColor = "transparent"
                                    let opacity = 1
                                    let scale = 1

                                    if (isScanning) {
                                        if (!isRevealed && !isScanCursor) {
                                            opacity = 0.2
                                            color = theme.textMuted
                                        } else if (isScanCursor) {
                                            color = theme.success
                                            fontWeight = "bold"
                                            bgColor = `${theme.success}30`
                                        } else if (isFoundOperator) {
                                            color = theme.warning
                                            fontWeight = "bold"
                                        } else if (isRevealed) {
                                            color = theme.textInverse
                                        }
                                    } else if (phase === "reading_rows") {
                                        if (isRowScanTarget) {
                                            // Currently scanning this character
                                            color = accentColor
                                            fontWeight = "bold"
                                            bgColor = `${accentColor}50`
                                            scale = 1.3
                                        } else if (isBeingReadRow) {
                                            // Already scanned character in current row
                                            color = resultColor
                                            fontWeight = "bold"
                                        } else if (isInActiveRow) {
                                            // Part of active row but not yet scanned
                                            color = theme.textInverse
                                            opacity = 0.5
                                        } else if (isSolvedProblem) {
                                            color = theme.textMuted
                                            opacity = 0.4
                                        } else if (isCurrentProblem) {
                                            color = accentColor
                                            opacity = 0.7
                                        } else if (isOperator) {
                                            color = resultColor
                                        }
                                    } else if (phase === "reading_columns") {
                                        if (isColScanTarget) {
                                            // Currently scanning this digit
                                            color = accentColor
                                            fontWeight = "bold"
                                            bgColor = `${accentColor}50`
                                            scale = 1.3
                                        } else if (isBeingReadCol) {
                                            // Already scanned digit
                                            color = resultColor
                                            fontWeight = "bold"
                                        } else if (isInActiveCol) {
                                            // Part of active column but not yet scanned
                                            color = theme.textInverse
                                            opacity = 0.5
                                        } else if (isSolvedProblem) {
                                            color = theme.textMuted
                                            opacity = 0.4
                                        } else if (isCurrentProblem) {
                                            color = accentColor
                                            opacity = 0.7
                                        } else if (isOperator) {
                                            color = resultColor
                                        }
                                    } else {
                                        // Default / complete phase
                                        if (phase === "complete") {
                                            // Show all text clearly when complete
                                            color = theme.textInverse
                                            if (isOperator) {
                                                color = resultColor
                                                fontWeight = "bold"
                                            }
                                        } else if (isCurrentProblem) {
                                            color = accentColor
                                            fontWeight = "bold"
                                            if (isOperator) {
                                                color = resultColor
                                            }
                                        } else if (isSolvedProblem) {
                                            color = theme.textMuted
                                        } else if (isOperator) {
                                            color = resultColor
                                        }
                                    }

                                    return (
                                        <motion.span
                                            key={charIdx}
                                            animate={{
                                                color,
                                                fontWeight,
                                                backgroundColor: bgColor,
                                                opacity,
                                                scale,
                                            }}
                                            transition={{ duration: 0.1 }}
                                            style={{
                                                width: `${charWidth}px`,
                                                textAlign: "center",
                                                display: "inline-block",
                                                borderRadius: "2px",
                                                position: "relative",
                                                zIndex:
                                                    isRowScanTarget ||
                                                    isColScanTarget
                                                        ? 20
                                                        : 6,
                                            }}
                                        >
                                            {char === " " ? "\u00A0" : char}
                                        </motion.span>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column - Event Log */}
                <div
                    style={{
                        position: "relative",
                        minWidth: 0,
                        overflow: "hidden",
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

                    {internalPlayMode === "step" && phase === "solving" && (
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
                            {isComplete ? "Reset" : "Solve Next"}
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
                        Phase: {phase} | Problem: {currentProblem} | Row:{" "}
                        {currentRowIdx} | Col: {currentColumnIdx} | Digit:{" "}
                        {currentDigitIdx}
                    </div>
                )}
            </div>
        </div>
    )
}

addPropertyControls(Day6MathWorksheet, {
    worksheetInput: {
        type: ControlType.String,
        title: "Worksheet",
        defaultValue: `123 328  51 64 
 45 64  387 23 
  6 98  215 314
*   +   *   +  `,
        displayTextArea: true,
    },
    part: {
        type: ControlType.Enum,
        title: "Part",
        options: ["part1", "part2"],
        optionTitles: ["Part 1 (Row)", "Part 2 (Column)"],
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
        title: "Play",
        options: ["auto", "step"],
        optionTitles: ["Auto", "Manual"],
        defaultValue: "auto",
        displaySegmentedControl: true,
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#6366f1",
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
        hidden: ({ playMode }) => playMode === "step",
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
