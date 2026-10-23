import { useEffect, useMemo, useRef, useState } from "react"
import bundled from "../data/tickets.json"
import "./tv.css"

/* ============ EASY SETTINGS ============ */
const DAILY_GOAL = 20 // tickets the team should resolve per day
const MILESTONES = [0.25, 0.5, 0.75, 1] // Mario jumps when each is reached
const REFRESH_MS = 60_000 // how often the TV re-reads /tickets.json
const MESSAGES: Record<number, string> = {
  25: "QUARTER WAY!",
  50: "HALFWAY THERE!",
  75: "ALMOST THERE!",
  100: "GOAL CLEARED!",
}
const DEMO_AGENTS = ["Jeff Ngari", "Linda Luttah", "Sharon Muchiri", "Simon Kathembe"]
/* ======================================= */

interface Row {
  ticketNumber: string
  assignedAgent: string
  status: string
  resolvedAt?: string // "2026-10-12" or full ISO time; set when a ticket is resolved
}

const localDay = (d: Date) => d.toLocaleDateString("en-CA") // YYYY-MM-DD
const dayOf = (s: string) => (s.length === 10 ? s : localDay(new Date(s)))

// Original pixel-art plumber (Mario-style). Swap in your own sprite if you have a licence.
const ART = [
  "...RRRRR....", "..RRRRRRRRR.", "..BBBSSBS...", ".BSBSSSBSSS.",
  ".BSBBSSSBSSS", ".BBSSSSBBBB.", "...SSSSSSS..", "..RRURRRR...",
  ".RRRURRURRR.", "RRRRUUUURRRR", "SSRUYUUYURSS", "SSSUUUUUUSSS",
  "SSUUUUUUUUSS", "..UUU..UUU..", ".BBB....BBB.", "BBBB....BBBB",
]
const PAL: Record<string, string> = { R: "#e52521", S: "#ffc08a", B: "#6b3a1e", U: "#2b50c8", Y: "#ffd400" }

function Sprite() {
  return (
    <svg viewBox="0 0 12 16" shapeRendering="crispEdges" className="sprite">
      {ART.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={PAL[c]} />,
        ),
      )}
    </svg>
  )
}

export default function TvMode({ onExit }: { onExit: () => void }) {
  const demoOn = new URLSearchParams(location.search).get("demo") === "1"
  const [rows, setRows] = useState<Row[]>(bundled as Row[])
  const [demo, setDemo] = useState<Row[]>([])
  const [now, setNow] = useState(new Date())
  const [jump, setJump] = useState(0)
  const [hits, setHits] = useState<Record<number, number>>({})
  const [msg, setMsg] = useState("")

  // clock (also rolls the "day" over at midnight automatically)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // re-read the latest tickets.json every minute
  useEffect(() => {
    let live = true
    const load = () =>
      fetch(`${import.meta.env.BASE_URL}tickets.json?t=${Date.now()}`)
        .then((r) => r.json())
        .then((d) => live && Array.isArray(d) && setRows(d))
        .catch(() => {})
    const t = setInterval(load, REFRESH_MS)
    load()
    return () => {
      live = false
      clearInterval(t)
    }
  }, [])

  // remote keys: Back/Esc exits; in demo mode OK/Enter "resolves" a fake ticket
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit()
      if (demoOn && (e.key === "Enter" || e.key === " "))
        setDemo((d) => [
          ...d,
          {
            ticketNumber: `demo-${d.length}`,
            assignedAgent: DEMO_AGENTS[Math.floor(Math.random() * DEMO_AGENTS.length)],
            status: "Resolved",
            resolvedAt: new Date().toISOString(),
          },
        ])
    }
    addEventListener("keydown", on)
    return () => removeEventListener("keydown", on)
  }, [demoOn, onExit])

  const today = localDay(now)
  const done = useMemo(
    () => [...rows, ...demo].filter((r) => r.resolvedAt && dayOf(r.resolvedAt) === today),
    [rows, demo, today],
  )
  const open = rows.filter((r) => !r.resolvedAt && r.status !== "Resolved" && r.status !== "Closed").length
  const board = useMemo(() => {
    const m = new Map<string, number>()
    done.forEach((r) => m.set(r.assignedAgent, (m.get(r.assignedAgent) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [done])

  const count = done.length
  const pct = Math.min(count / DAILY_GOAL, 1)
  const prev = useRef(pct)

  // when a milestone is crossed: Mario runs there, then jumps and hits the block
  useEffect(() => {
    const before = prev.current
    prev.current = pct
    const crossed = MILESTONES.filter((m) => before < m && pct >= m)
    if (!crossed.length) return
    const last = Math.round(crossed[crossed.length - 1] * 100)
    const t1 = setTimeout(() => {
      setHits((h) => {
        const n = { ...h }
        crossed.forEach((c) => (n[Math.round(c * 100)] = (n[Math.round(c * 100)] ?? 0) + 1))
        return n
      })
      setJump((j) => j + 1)
      setMsg(MESSAGES[last])
    }, 1300)
    const t2 = setTimeout(() => setMsg(""), 7000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [pct])

  const top = board[0]

  return (
    <div className="tv">
      <header className="tv-head">
        <div>
          <span className="tv-eyebrow">TicketOps · Live</span>
          <h1>Daily Ticket Race</h1>
        </div>
        <div className="tv-clock">
          <strong>{now.toLocaleTimeString("en-GB")}</strong>
          <span>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
      </header>

      <section className="tv-stats">
        {[
          ["Resolved today", count],
          ["Daily goal", DAILY_GOAL],
          ["To go", Math.max(DAILY_GOAL - count, 0)],
          ["Still open", open],
        ].map(([label, value]) => (
          <div className="tv-stat" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="scene" aria-label="Daily progress">
        {msg && <div className="toast" key={msg + jump}>{msg}</div>}
        <div className="course">
          {MILESTONES.map((m) => {
            const p = Math.round(m * 100)
            return (
              <div className="mblock-wrap" style={{ left: `${p}%` }} key={p}>
                <span className="mpct">{p}%</span>
                <div className={`mblock ${hits[p] ? "used" : ""}`} key={hits[p] ?? 0}>
                  {p === 100 ? "🏁" : "?"}
                </div>
                {hits[p] && <i className="coin" key={`c${hits[p]}`} />}
              </div>
            )
          })}
          <div className="mario" style={{ left: `${pct * 100}%` }}>
            <div className={`mario-jump ${jump ? "go" : ""}`} key={jump}>
              <Sprite />
            </div>
          </div>
          <div className="ground" />
        </div>
      </section>

      <section className="board">
        <article className="champ">
          <span className="tv-eyebrow">👑 Top closer today</span>
          {top ? (
            <>
              <h2>{top[0]}</h2>
              <strong>{top[1]}</strong>
              <span>tickets resolved</span>
            </>
          ) : (
            <h2 className="muted">No tickets resolved yet. Be the first!</h2>
          )}
        </article>
        <article className="ranks">
          <h3>Leaderboard</h3>
          {board.slice(0, 5).map(([name, n], i) => (
            <div className="rank" key={name}>
              <b>{i + 1}</b>
              <span>{name}</span>
              <div className="rbar">
                <i style={{ width: `${(n / top[1]) * 100}%` }} />
              </div>
              <strong>{n}</strong>
            </div>
          ))}
        </article>
      </section>

      {demoOn && <div className="tv-demo">DEMO MODE · press OK / Enter to resolve a ticket</div>}
    </div>
  )
}
