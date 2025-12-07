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

interface Day3Props {
    digits: string
    k: number
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

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function Day3Composed(props: Day3Props) {
    const {
        digits = "234234234234278",
        k = 12,
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

    const [customDigits, setCustomDigits] = useState(digits)
    const [customK, setCustomK] = useState(k)
    const [internalPlayMode, setInternalPlayMode] = useState<"auto" | "step">(playMode)

    const digitArray = useMemo(() => customDigits.split("").map(Number), [customDigits])
    const n = digitArray.length

    const [step, setStep] = useState(0)
    const [scannerPos, setScannerPos] = useState(-1)
    const [maxPos, setMaxPos] = useState(-1)
    const [result, setResult] = useState<number[]>([])
    const [chosenPositions, setChosenPositions] = useState<number[]>([])
    const [justChosen, setJustChosen] = useState(-1)
    const [isComplete, setIsComplete] = useState(false)
    const [eventLog, setEventLog] = useState<LogEntry[]>([])

    const baseSpeed = 1000 / speed

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
        startTransition(() => setCustomK(k))
    }, [k])

    useEffect(() => {
        startTransition(() => setInternalPlayMode(playMode))
    }, [playMode])

    const resetState = useCallback(() => {
        setStep(0)
        setResult([])
        setChosenPositions([])
        setScannerPos(-1)
        setMaxPos(-1)
        setJustChosen(-1)
        setIsComplete(false)
        setEventLog([{ message: `Selecting ${customK} digits`, type: "step" }])
    }, [customK])

    const handleRestart = () => {
        resetState()
        setHasStarted(true)
        setIsInView(true)
    }

    // Animation Logic (only when in view)
    useEffect(() => {
        if (!isInView || !autoPlay || internalPlayMode !== "auto") return
        if (step >= customK) {
            if (!isComplete) {
                setIsComplete(true)
                addLogEntry(`Complete! ${result.join("")}`, "success")
            }
            const timer = setTimeout(() => {
                startTransition(() => {
                    resetState()
                })
            }, baseSpeed * 3)
            return () => clearTimeout(timer)
        }

        const prevPos = step === 0 ? -1 : chosenPositions[step - 1]
        const start = prevPos + 1
        const end = n - customK + step

        if (start > end || start >= n) return

        // Find max in window
        let localMax = digitArray[start]
        let localMaxPos = start
        for (let i = start; i <= end && i < n; i++) {
            if (digitArray[i] > localMax) {
                localMax = digitArray[i]
                localMaxPos = i
            }
        }

        let scanPos = start
        const scanInterval = setInterval(() => {
            if (scanPos <= end && scanPos < n) {
                startTransition(() => {
                    setScannerPos(scanPos)
                    if (digitArray[scanPos] === localMax && scanPos === localMaxPos) {
                        setMaxPos(scanPos)
                    }
                })
                scanPos++
            } else {
                clearInterval(scanInterval)
                startTransition(() => {
                    setJustChosen(localMaxPos)
                    setScannerPos(localMaxPos)
                })
                setTimeout(() => {
                    startTransition(() => {
                        setResult((prev) => [...prev, localMax])
                        setChosenPositions((prev) => [...prev, localMaxPos])
                        setMaxPos(-1)
                        setStep((s) => s + 1)
                        addLogEntry(`Selected ${localMax}`, "success", `pos ${localMaxPos}`)
                    })
                    setTimeout(() => {
                        startTransition(() => setJustChosen(-1))
                    }, baseSpeed * 0.3)
                }, baseSpeed * 0.5)
            }
        }, baseSpeed * 0.15)

        return () => clearInterval(scanInterval)
    }, [step, autoPlay, customK, n, digitArray, chosenPositions, baseSpeed, isInView, internalPlayMode, addLogEntry, resetState, result, isComplete])

    const prevPos = step === 0 ? -1 : chosenPositions[step - 1]
    const start = prevPos + 1
    const end = n - customK + step
    const isScanning = scannerPos >= 0

    const handleNextStep = () => {
        if (step >= customK) {
            resetState()
            return
        }
        const prevPos = step === 0 ? -1 : chosenPositions[step - 1]
        const start = prevPos + 1
        const end = n - customK + step
        if (start > end || start >= n) return

        let localMax = digitArray[start]
        let localMaxPos = start
        for (let i = start; i <= end && i < n; i++) {
            if (digitArray[i] > localMax) {
                localMax = digitArray[i]
                localMaxPos = i
            }
        }

        addLogEntry(`Selected ${localMax}`, "success", `pos ${localMaxPos}`)

        startTransition(() => {
            setScannerPos(localMaxPos)
            setMaxPos(localMaxPos)
            setJustChosen(localMaxPos)
            setResult((prev) => [...prev, localMax])
            setChosenPositions((prev) => [...prev, localMaxPos])
        })
        setTimeout(() => {
            startTransition(() => {
                setJustChosen(-1)
                setMaxPos(-1)
                setStep((s) => s + 1)
            })
        }, baseSpeed * 0.5)
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

    // Calculate digit sizing
    const digitWidth = 28
    const digitGap = 4
    const digitsTotalWidth = n * digitWidth + (n - 1) * digitGap

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
                        Battery Bank
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
                        <StatCard label="Step" value={`${Math.min(step + 1, customK)}/${customK}`} />
                        <StatCard
                            label="Selected"
                            value={result.length}
                            color={theme.success}
                        />
                    </div>

                    {/* Main Visualization */}
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
                            overflow: "auto",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "24px",
                        }}
                    >
                        {/* Digit Sequence */}
                        <div
                            style={{
                                position: "relative",
                                display: "flex",
                                justifyContent: "center",
                                padding: "12px 0",
                                width: "100%",
                            }}
                        >
                            {/* Window highlight bar */}
                            <AnimatePresence>
                                {step < customK && start < n && end >= start && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.2 }}
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: `calc(50% - ${digitsTotalWidth / 2}px + ${start * (digitWidth + digitGap)}px)`,
                                            width: `${(end - start + 1) * digitWidth + (end - start) * digitGap}px`,
                                            height: "100%",
                                            backgroundColor: accentColor,
                                            borderRadius: 6,
                                            zIndex: 0,
                                        }}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Scanner bar */}
                            {scannerPos >= 0 && scannerPos < n && (
                                <motion.div
                                    key={`scanner-${scannerPos}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.5 }}
                                    exit={{ opacity: 0 }}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: `calc(50% - ${digitsTotalWidth / 2}px + ${scannerPos * (digitWidth + digitGap)}px)`,
                                        width: `${digitWidth}px`,
                                        height: "100%",
                                        backgroundColor: accentColor,
                                        borderRadius: 4,
                                        zIndex: 1,
                                    }}
                                />
                            )}

                            {/* Digits */}
                            <div
                                style={{
                                    display: "flex",
                                    gap: `${digitGap}px`,
                                    position: "relative",
                                    zIndex: 2,
                                }}
                            >
                                {digitArray.map((digit, i) => {
                                    const isChosen = chosenPositions.includes(i)
                                    const isDimmed = step < customK && (i < start || i > end)
                                    const isCurrentMax = i === maxPos && isScanning
                                    const isJustChosen = i === justChosen

                                    return (
                                        <motion.div
                                            key={i}
                                            animate={{
                                                y: isJustChosen ? -6 : 0,
                                                scale: isJustChosen ? 1.2 : isCurrentMax ? 1.1 : 1,
                                                opacity: isDimmed ? 0.2 : isChosen ? 0.3 : 1,
                                            }}
                                            style={{
                                                ...font,
                                                fontSize: "18px",
                                                fontWeight: 700,
                                                width: `${digitWidth}px`,
                                                textAlign: "center",
                                                fontFamily: "monospace",
                                                color:
                                                    isCurrentMax || isJustChosen
                                                        ? accentColor
                                                        : theme.textInverse,
                                            }}
                                        >
                                            {digit}
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Constructed ID */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "8px",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    color: theme.textMuted,
                                    letterSpacing: "0.05em",
                                    textTransform: "uppercase",
                                }}
                            >
                                Constructed ID
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    gap: "4px",
                                    padding: "12px 16px",
                                    backgroundColor: theme.surfaceBg,
                                    borderRadius: "6px",
                                }}
                            >
                                {Array.from({ length: customK }).map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: "20px",
                                            height: "28px",
                                            borderBottom:
                                                i < result.length
                                                    ? `2px solid ${accentColor}`
                                                    : `2px solid ${theme.textMuted}40`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <AnimatePresence>
                                            {i < result.length && (
                                                <motion.div
                                                    initial={{ y: -8, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    style={{
                                                        ...font,
                                                        fontSize: "14px",
                                                        fontWeight: "bold",
                                                        color: theme.textInverse,
                                                        fontFamily: "monospace",
                                                    }}
                                                >
                                                    {result[i]}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>
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
                                {isComplete ? "Reset" : "Next Step"}
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
                                    Waiting...
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

addPropertyControls(Day3Composed, {
    digits: {
        type: ControlType.String,
        title: "Digits",
        defaultValue: "234234234234278",
    },
    k: {
        type: ControlType.Number,
        title: "K Length",
        defaultValue: 12,
        min: 1,
        max: 15,
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
        title: "Mode",
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
        defaultValue: {
            fontSize: "16px",
            fontFamily: "Inter",
        },
    },
})
