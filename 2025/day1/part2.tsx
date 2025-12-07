// Turn this into a Framer Component

import {
    useState,
    useEffect,
    useRef,
    startTransition,
    type CSSProperties,
} from "react"
import { addPropertyControls, ControlType } from "framer"

class DialLogic {
    range: number
    startPosition: number
    currentPosition: number
    zeroCount: number

    constructor(range = 100, startPosition = 50) {
        this.range = parseInt(String(range), 10)
        this.startPosition = parseInt(String(startPosition), 10)

        if (isNaN(this.range) || this.range < 1) this.range = 100
        if (isNaN(this.startPosition)) this.startPosition = 50

        this.currentPosition =
            ((this.startPosition % this.range) + this.range) % this.range
        this.zeroCount = 0
    }

    left(distance: number) {
        const dist = parseInt(String(distance), 10) || 0

        // Count zero crossings
        if (dist > 0) {
            if (this.currentPosition === 0) {
                // Starting at 0, need full rotation to cross again
                const firstZero = this.range
                if (dist >= firstZero) {
                    this.zeroCount +=
                        Math.floor((dist - firstZero) / this.range) + 1
                }
            } else {
                // Distance to first zero when going left
                const firstZero = this.currentPosition
                if (dist >= firstZero) {
                    this.zeroCount +=
                        Math.floor((dist - firstZero) / this.range) + 1
                }
            }
        }

        this.currentPosition =
            (((this.currentPosition - dist) % this.range) + this.range) %
            this.range
        return this.currentPosition
    }

    right(distance: number) {
        const dist = parseInt(String(distance), 10) || 0

        // Count zero crossings
        if (dist > 0) {
            if (this.currentPosition === 0) {
                // Starting at 0, need full rotation to cross again
                const firstZero = this.range
                if (dist >= firstZero) {
                    this.zeroCount +=
                        Math.floor((dist - firstZero) / this.range) + 1
                }
            } else {
                // Distance to first zero when going right
                const firstZero = this.range - this.currentPosition
                if (dist >= firstZero) {
                    this.zeroCount +=
                        Math.floor((dist - firstZero) / this.range) + 1
                }
            }
        }

        this.currentPosition =
            (((this.currentPosition + dist) % this.range) + this.range) %
            this.range
        return this.currentPosition
    }

    reset() {
        this.currentPosition =
            ((this.startPosition % this.range) + this.range) % this.range
        this.zeroCount = 0
        return this.currentPosition
    }

    getPosition() {
        return this.currentPosition
    }

    getZeroCount() {
        return this.zeroCount
    }
}

interface DialAppProps {
    range: number
    startPosition: number
    distanceInput: number
    backgroundColor: string
    dialColor: string
    accentColor: string
    textColor: string
    font: CSSProperties
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function Day1_2(props: DialAppProps) {
    const {
        range = 100,
        startPosition = 50,
        distanceInput = 10,
        backgroundColor = "#F8FAFC",
        dialColor = "#1E293B",
        accentColor = "#6366F1",
        textColor = "#1E293B",
        font,
    } = props

    const [config, setConfig] = useState({ range, startPosition })
    const [distance, setDistance] = useState(distanceInput)

    const dialRef = useRef(new DialLogic(config.range, config.startPosition))
    const containerRef = useRef<HTMLDivElement>(null)
    const [dialSize, setDialSize] = useState(320)

    const [dialState, setDialState] = useState({
        position: 50,
        zeroCount: 0,
        lastAction: "Initialized",
        rotation: -(50 / 100) * 360,
    })

    const [eventLog, setEventLog] = useState<string[]>([])

    useEffect(() => {
        const updateDialSize = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth
                const containerHeight = containerRef.current.offsetHeight
                const maxSize = Math.min(containerWidth, containerHeight - 200)
                const newSize = Math.max(200, Math.min(320, maxSize))
                startTransition(() => setDialSize(newSize))
            }
        }

        updateDialSize()
        window.addEventListener("resize", updateDialSize)
        return () => window.removeEventListener("resize", updateDialSize)
    }, [])

    useEffect(() => {
        startTransition(() => {
            setConfig({ range, startPosition })
        })
    }, [range, startPosition])

    useEffect(() => {
        startTransition(() => {
            setDistance(distanceInput)
        })
    }, [distanceInput])

    useEffect(() => {
        dialRef.current = new DialLogic(config.range, config.startPosition)

        const startPos = dialRef.current.getPosition()
        const initialRotation = -(startPos / config.range) * 360

        startTransition(() => {
            setDialState({
                position: startPos,
                zeroCount: 0,
                lastAction: "Config Updated",
                rotation: initialRotation,
            })
        })
    }, [config])

    const syncState = (action: string, newRotation: number) => {
        startTransition(() => {
            setDialState({
                position: dialRef.current.getPosition(),
                zeroCount: dialRef.current.getZeroCount(),
                lastAction: action,
                rotation: newRotation,
            })
        })
    }

    const handleLeft = () => {
        dialRef.current.left(distance)
        const rotationChange = (distance / config.range) * 360
        const newRotation = dialState.rotation + rotationChange
        const action = `L${distance}`
        syncState(action, newRotation)
        startTransition(() => {
            setEventLog((prev) => [...prev, action])
        })
    }

    const handleRight = () => {
        dialRef.current.right(distance)
        const rotationChange = (distance / config.range) * 360
        const newRotation = dialState.rotation - rotationChange
        const action = `R${distance}`
        syncState(action, newRotation)
        startTransition(() => {
            setEventLog((prev) => [...prev, action])
        })
    }

    const handleReset = () => {
        const newPos = dialRef.current.reset()
        const newRotation = -(newPos / config.range) * 360

        startTransition(() => {
            setDialState({
                position: newPos,
                zeroCount: 0,
                lastAction: "Reset",
                rotation: newRotation,
            })
            setEventLog([])
        })
    }

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#FFFFFF",
                color: textColor,
                padding: "24px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
                position: "relative",
                overflow: "hidden",
                borderRadius: "24px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                border: "1px solid #F1F5F9",
                ...font,
            }}
        >
            {/* LEFT COLUMN: Visualizer */}
            <div
                ref={containerRef}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: "0",
                        left: "0",
                        fontSize: "10px",
                        fontWeight: "bold",
                        color: "#94A3B8",
                        letterSpacing: "0.05em",
                    }}
                >
                    VISUALIZER
                </div>

                {/* Reset button - top right of visualizer */}
                <button
                    onClick={handleReset}
                    style={{
                        position: "absolute",
                        top: "0",
                        right: "0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        backgroundColor: dialColor,
                        color: "#FFFFFF",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        ...font,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#0F172A"
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = dialColor
                    }}
                >
                    <span>Reset</span>
                </button>

                <div
                    style={{
                        position: "relative",
                        width: `${dialSize}px`,
                        height: `${dialSize}px`,
                        marginBottom: "20px",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: "0",
                            left: "50%",
                            transform: "translateX(-50%) translateY(-8px)",
                            zIndex: 20,
                            width: "0",
                            height: "0",
                            borderLeft: "10px solid transparent",
                            borderRight: "10px solid transparent",
                            borderTop: `15px solid ${accentColor}`,
                            filter: "drop-shadow(0 4px 3px rgba(0, 0, 0, 0.07))",
                        }}
                    />

                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            border: `8px solid ${dialColor}`,
                            backgroundColor: dialColor,
                            position: "relative",
                            boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
                            transition: "transform 0.5s ease-out",
                            transform: `rotate(${dialState.rotation}deg)`,
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                inset: "16px",
                                borderRadius: "50%",
                                border: "2px dashed rgba(71, 85, 105, 0.5)",
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                inset: "48px",
                                borderRadius: "50%",
                                backgroundColor: "#334155",
                                boxShadow:
                                    "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        />

                        {Array.from({ length: 12 }).map((_, i) => {
                            const deg = i * 30
                            const val = Math.round((i / 12) * config.range)
                            const labelFontSize = Math.max(
                                8,
                                dialSize * 0.03125
                            )
                            const labelDistance = dialSize * 0.0625
                            return (
                                <div
                                    key={i}
                                    style={{
                                        position: "absolute",
                                        top: "0",
                                        left: "50%",
                                        width: "2px",
                                        height: "100%",
                                        transform: `translateX(-50%) rotate(${deg}deg)`,
                                        pointerEvents: "none",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "2px",
                                            height: "12px",
                                            backgroundColor: "#94A3B8",
                                            position: "absolute",
                                            top: "4px",
                                        }}
                                    />
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: `${labelDistance}px`,
                                            left: "50%",
                                            transform: `translateX(-50%) rotate(-${deg}deg)`,
                                            fontSize: `${labelFontSize}px`,
                                            fontFamily: "monospace",
                                            color: "#94A3B8",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {val % config.range}
                                    </div>
                                </div>
                            )
                        })}

                        <div
                            style={{
                                position: "absolute",
                                top: "0",
                                left: "50%",
                                width: "4px",
                                height: "16px",
                                transform: "translateX(-50%)",
                                backgroundColor: accentColor,
                                zIndex: 10,
                            }}
                        />
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                        width: "100%",
                        marginBottom: "16px",
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#F8FAFC",
                            padding: "12px",
                            borderRadius: "12px",
                            border: "1px solid #E2E8F0",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                color: "#64748B",
                                marginBottom: "4px",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    textTransform: "uppercase",
                                }}
                            >
                                Position
                            </span>
                        </div>
                        <span
                            style={{
                                fontSize: "20px",
                                fontWeight: "bold",
                                color: textColor,
                            }}
                        >
                            {dialState.position}
                        </span>
                    </div>
                    <div
                        style={{
                            padding: "12px",
                            borderRadius: "12px",
                            border: `1px solid ${dialState.zeroCount > 0 ? "#BBF7D0" : "#E2E8F0"}`,
                            backgroundColor:
                                dialState.zeroCount > 0 ? "#F0FDF4" : "#F8FAFC",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            transition: "all 0.3s",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                color:
                                    dialState.zeroCount > 0
                                        ? "#16A34A"
                                        : "#64748B",
                                marginBottom: "4px",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    textTransform: "uppercase",
                                }}
                            >
                                Zero Lands
                            </span>
                        </div>
                        <span
                            style={{
                                fontSize: "20px",
                                fontWeight: "bold",
                                color:
                                    dialState.zeroCount > 0
                                        ? "#16A34A"
                                        : textColor,
                            }}
                        >
                            {dialState.zeroCount}
                        </span>
                    </div>
                </div>

                {/* Operations section */}
                <div
                    style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                    }}
                >
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: "10px",
                                fontWeight: "600",
                                color: "#64748B",
                                marginBottom: "6px",
                                textTransform: "uppercase",
                                textAlign: "center",
                            }}
                        >
                            Move Distance
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={distance}
                            onChange={(e) =>
                                startTransition(() =>
                                    setDistance(parseInt(e.target.value) || 0)
                                )
                            }
                            style={{
                                width: "100%",
                                backgroundColor: "#F8FAFC",
                                border: "1px solid #CBD5E1",
                                borderRadius: "8px",
                                padding: "8px",
                                fontSize: "14px",
                                fontFamily: "monospace",
                                outline: "none",
                                textAlign: "center",
                            }}
                            onFocus={(e) =>
                                (e.target.style.boxShadow = `0 0 0 2px ${accentColor}`)
                            }
                            onBlur={(e) => (e.target.style.boxShadow = "none")}
                        />
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "10px",
                        }}
                    >
                        <button
                            onClick={handleLeft}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "12px",
                                borderRadius: "12px",
                                border: "2px solid #E2E8F0",
                                backgroundColor: "#FFFFFF",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                ...font,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = accentColor
                                e.currentTarget.style.backgroundColor = `${accentColor}0D`
                                e.currentTarget.style.transform = "scale(1.02)"
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "#E2E8F0"
                                e.currentTarget.style.backgroundColor =
                                    "#FFFFFF"
                                e.currentTarget.style.transform = "scale(1)"
                            }}
                        >
                            <span
                                style={{
                                    fontWeight: "bold",
                                    color: "#334155",
                                    fontSize: "14px",
                                }}
                            >
                                Left
                            </span>
                        </button>

                        <button
                            onClick={handleRight}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "12px",
                                borderRadius: "12px",
                                border: "2px solid #E2E8F0",
                                backgroundColor: "#FFFFFF",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                ...font,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = accentColor
                                e.currentTarget.style.backgroundColor = `${accentColor}0D`
                                e.currentTarget.style.transform = "scale(1.02)"
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "#E2E8F0"
                                e.currentTarget.style.backgroundColor =
                                    "#FFFFFF"
                                e.currentTarget.style.transform = "scale(1)"
                            }}
                        >
                            <span
                                style={{
                                    fontWeight: "bold",
                                    color: "#334155",
                                    fontSize: "14px",
                                }}
                            >
                                Right
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Event Log */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                }}
            >
                <div
                    style={{
                        fontSize: "10px",
                        fontWeight: "bold",
                        color: "#94A3B8",
                        letterSpacing: "0.05em",
                        marginBottom: "12px",
                    }}
                >
                    EVENT LOG
                </div>
                <pre
                    style={{
                        flex: 1,
                        padding: "12px",
                        backgroundColor: `rgba(99, 102, 241, 0.05)`,
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        color: accentColor,
                        border: `1px solid rgba(99, 102, 241, 0.2)`,
                        overflowY: "auto",
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                    }}
                >
                    {eventLog.length > 0
                        ? eventLog.join("\n")
                        : "No actions yet"}
                </pre>
            </div>
        </div>
    )
}

addPropertyControls(Day1_2, {
    range: {
        type: ControlType.Number,
        title: "Range",
        defaultValue: 100,
        min: 1,
        step: 1,
    },
    startPosition: {
        type: ControlType.Number,
        title: "Start Position",
        defaultValue: 50,
        step: 1,
    },
    distanceInput: {
        type: ControlType.Number,
        title: "Move Distance",
        defaultValue: 10,
        min: 0,
        step: 1,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#F8FAFC",
    },
    dialColor: {
        type: ControlType.Color,
        title: "Dial Color",
        defaultValue: "#1E293B",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent Color",
        defaultValue: "#6366F1",
    },
    textColor: {
        type: ControlType.Color,
        title: "Text Color",
        defaultValue: "#1E293B",
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: "15px",
            variant: "Medium",
            letterSpacing: "-0.01em",
            lineHeight: "1.3em",
        },
    },
})
