import { FormEvent, useEffect, useMemo, useState } from "react"
import ticketData from "./data/tickets.json"

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elementName: string]: any
    }
  }
}

type View = "overview" | "queue" | "agents"

interface Ticket {
  customer: string
  requester: string
  ticketNumber: string
  subject: string
  priority: string
  dateRequested: string
  assignedAgent: string
  status: string
  blockedBy: string
  clientDays: number
  agentDays: number
  notes: string
  clientComments: string
}

interface AgentProfile {
  name: string
  email: string
  team: string
}

const tickets = ticketData as Ticket[]
const REPORT_DATE = "8 October 2026"

function Icon({
  name,
  size = 18,
}: {
  name: "grid" | "queue" | "users" | "search" | "clock" | "alert" | "arrow" | "plus" | "check"
  size?: number
}) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    queue: (
      <>
        <path d="M4 6h16M4 12h16M4 18h10" />
        <circle cx="19" cy="18" r="2" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M22 11h-6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="clock">
      <span className="live-dot" />
      <div>
        <strong>{now.toLocaleTimeString("en-GB")}</strong>
        <span>
          {now.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          })}
        </span>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: number | string
  detail: string
  tone: "orange" | "cyan" | "red" | "green"
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <div className="metric-top">
        <span>{label}</span>
        <i />
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`pill ${status === "On Hold" ? "pill-hold" : "pill-open"}`}
    >
      <i />
      {status}
    </span>
  )
}

function PriorityPill({ priority }: { priority: string }) {
  return (
    <span className={`priority ${priority === "High" ? "priority-high" : ""}`}>
      {priority}
    </span>
  )
}

function TicketTable({
  rows,
  compact = false,
}: {
  rows: Ticket[]
  compact?: boolean
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Customer / request</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Priority</th>
            <th className="align-right">Age</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((ticket) => (
            <tr key={ticket.ticketNumber}>
              <td>
                <span className="ticket-id">#{ticket.ticketNumber}</span>
              </td>
              <td className="subject-cell">
                <strong>{ticket.customer}</strong>
                <span title={ticket.subject}>{ticket.subject}</span>
              </td>
              <td>{ticket.assignedAgent}</td>
              <td>
                <StatusPill status={ticket.status} />
              </td>
              <td>
                <PriorityPill priority={ticket.priority} />
              </td>
              <td className="align-right">
                <span
                  className={
                    ticket.agentDays + ticket.clientDays > 30
                      ? "age age-hot"
                      : "age"
                  }
                >
                  {Math.round(ticket.agentDays + ticket.clientDays)}d
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!compact && rows.length === 0 && (
        <div className="empty">No tickets match the current filters.</div>
      )}
    </div>
  )
}

function Overview({ onQueue }: { onQueue: () => void }) {
  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === "Open").length
    const high = tickets.filter((t) => t.priority === "High").length
    const clientBlocked = tickets.filter((t) => t.blockedBy === "Client").length
    const avgAge = Math.round(
      tickets.reduce((sum, t) => sum + t.agentDays + t.clientDays, 0) /
        tickets.length,
    )
    return { open, high, clientBlocked, avgAge }
  }, [])

  const workload = useMemo(() => {
    const totals = new Map<string, { total: number; high: number }>()
    tickets.forEach((ticket) => {
      const current = totals.get(ticket.assignedAgent) ?? { total: 0, high: 0 }
      current.total += 1
      current.high += ticket.priority === "High" ? 1 : 0
      totals.set(ticket.assignedAgent, current)
    })
    return [...totals.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8)
  }, [])

  const maxWorkload = workload[0]?.[1].total ?? 1
  const urgent = useMemo(
    () =>
      [...tickets]
        .sort(
          (a, b) => b.agentDays + b.clientDays - (a.agentDays + a.clientDays),
        )
        .slice(0, 7),
    [],
  )

  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">Service desk command center</span>
          <h1>DataposIT  Tickets Overview</h1>
          <p>
            Live visibility across every customer request, owner, blocker and
            ageing risk.
          </p>
        </div>
        <div className="report-chip">
          <Icon name="clock" />
          <div>
            <span>Report snapshot</span>
            <strong>{REPORT_DATE}</strong>
          </div>
        </div>
      </section>

      <section className="open-progress">
        <div className="open-progress-head">
          <div>
            <span className="eyebrow">Queue progress</span>
            <h2>Open tickets</h2>
          </div>
          <div className="open-progress-total">
            <strong>{stats.open}</strong>
            <span>of {tickets.length}</span>
          </div>
        </div>
        <div
          className="open-progress-track"
          role="progressbar"
          aria-label="Open tickets"
          aria-valuenow={stats.open}
          aria-valuemin={0}
          aria-valuemax={tickets.length}
        >
          <i style={{ width: `${(stats.open / tickets.length) * 100}%` }} />
        </div>
        <div className="open-progress-meta">
          <span>{tickets.length - stats.open} tickets currently on hold</span>
          <strong>
            {((stats.open / tickets.length) * 100).toFixed(1)}% open
          </strong>
        </div>
      </section>

      <section className="metrics supporting-metrics">
        <Metric
          label="High priority"
          value={stats.high}
          detail={`${Math.round((stats.high / tickets.length) * 100)}% of active queue`}
          tone="red"
        />
        <Metric
          label="Client blocked"
          value={stats.clientBlocked}
          detail={`${tickets.length - stats.clientBlocked} require internal action`}
          tone="orange"
        />
        <Metric
          label="Average age"
          value={`${stats.avgAge}d`}
          detail="Combined client + agent time"
          tone="green"
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel workload-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Distribution</span>
              <h2>Agent workload</h2>
            </div>
            <span className="panel-note">Top 8 by assigned volume</span>
          </div>
          <div className="workload-list">
            {workload.map(
              ([name, values]: [string, { total: number; high: number }], index: number) => (
              <div className="workload-row" key={name}>
                <span className="rank">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="workload-name">
                  <strong>{name}</strong>
                  <span>{values.high} high priority</span>
                </div>
                <div className="bar">
                  <i
                    style={{ width: `${(values.total / maxWorkload) * 100}%` }}
                  />
                </div>
                <strong className="workload-total">{values.total}</strong>
              </div>
              ),
            )}
          </div>
        </article>

        <article className="panel blocker-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Ownership</span>
              <h2>Queue blockers</h2>
            </div>
          </div>
          {[
            [
              "DataposIT",
              tickets.filter((t) => t.blockedBy === "DataposIT").length,
              "Internal follow-up",
            ],
            [
              "Client",
              tickets.filter((t) => t.blockedBy === "Client").length,
              "Awaiting response",
            ],
            [
              "Unclear",
              tickets.filter((t) => t.blockedBy === "Unclear").length,
              "Needs triage",
            ],
          ].map(([label, count, detail], index) => (
            <div className="blocker-row" key={label}>
              <div className={`blocker-icon blocker-${index}`}>
                <Icon
                  name={index === 1 ? "clock" : index === 2 ? "alert" : "queue"}
                />
              </div>
              <div>
                <strong>{label}</strong>
                <span>{detail}</span>
              </div>
              <b>{count}</b>
            </div>
          ))}
          <div className="ownership-callout">
            <span>Internal action share</span>
            <strong>
              {Math.round(
                (tickets.filter((t) => t.blockedBy === "DataposIT").length /
                  tickets.length) *
                  100,
              )}
              %
            </strong>
            <div>
              <i />
            </div>
          </div>
        </article>
      </section>

      <section className="panel queue-preview">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Attention required</span>
            <h2>Oldest unresolved tickets</h2>
          </div>
          <button className="text-button" onClick={onQueue}>
            View full queue <Icon name="arrow" size={16} />
          </button>
        </div>
        <TicketTable rows={urgent} compact />
      </section>
    </>
  )
}

function Queue() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("All")
  const [priority, setPriority] = useState("All")
  const [agent, setAgent] = useState("All")
  const agents = useMemo(
    () => [...new Set(tickets.map((t) => t.assignedAgent))].sort(),
    [],
  )

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return tickets.filter((ticket) => {
      const matchesQuery =
        !query ||
        [
          ticket.ticketNumber,
          ticket.customer,
          ticket.requester,
          ticket.subject,
          ticket.assignedAgent,
        ].some((value) => value.toLowerCase().includes(query))
      return (
        matchesQuery &&
        (status === "All" || ticket.status === status) &&
        (priority === "All" || ticket.priority === priority) &&
        (agent === "All" || ticket.assignedAgent === agent)
      )
    })
  }, [search, status, priority, agent])

  return (
    <>
      <section className="hero queue-hero">
        <div>
          <span className="eyebrow">All customer requests</span>
          <h1>Ticket queue</h1>
          <p>
            Search and filter the {tickets.length} records imported from the
            status report.
          </p>
        </div>
        <div className="result-count">
          <strong>{filtered.length}</strong>
          <span>results</span>
        </div>
      </section>
      <section className="panel queue-panel">
        <div className="filters">
          <label className="search">
            <Icon name="search" />
            <input
              value={search}
              onChange={(event: { target: { value: any } }) => setSearch(event.target.value)}
              placeholder="Search ticket, customer or subject..."
            />
          </label>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event: { target: { value: any } }) => setStatus(event.target.value)}
          >
            <option>All</option>
            <option>Open</option>
            <option>On Hold</option>
          </select>
          <select
            aria-label="Filter by priority"
            value={priority}
            onChange={(event: { target: { value: any } }) => setPriority(event.target.value)}
          >
            <option>All</option>
            <option>High</option>
            <option>Medium</option>
          </select>
          <select
            aria-label="Filter by agent"
            value={agent}
            onChange={(event: { target: { value: any } }) => setAgent(event.target.value)}
          >
            <option>All</option>
            {agents.map((name: any) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
        <TicketTable rows={filtered} />
      </section>
    </>
  )
}

function Agents() {
  const importedProfiles = useMemo<AgentProfile[]>(
    () =>
      [...new Set(tickets.map((t) => t.assignedAgent))]
        .sort()
        .map((name) => ({ name, email: "", team: "Service Desk" })),
    [],
  )

  function isAgentProfile(value: unknown): value is AgentProfile {
    if (!value || typeof value !== "object") return false
    const candidate = value as Partial<AgentProfile>
    return (
      typeof candidate.name === "string" &&
      typeof candidate.email === "string" &&
      typeof candidate.team === "string"
    )
  }

  const [profiles, setProfiles] = useState<AgentProfile[]>(() => {
    try {
      const saved = localStorage.getItem("ticketops-agents")
      if (!saved) return importedProfiles

      const parsed = JSON.parse(saved)
      const customProfiles = Array.isArray(parsed)
        ? parsed.filter(isAgentProfile)
        : []

      const seen = new Set(importedProfiles.map((profile: { name: string }) => profile.name.toLowerCase()))
      return [
        ...importedProfiles,
        ...customProfiles.filter(
          (profile) => !seen.has(profile.name.trim().toLowerCase()),
        ),
      ]
    } catch {
      return importedProfiles
    }
  })
  const [saved, setSaved] = useState(false)

  function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get("name") ?? "").trim()
    const email = String(form.get("email") ?? "").trim()
    const team = String(form.get("team") ?? "Service Desk")

    if (!name || !email) return

    const normalizedName = name.toLowerCase()
    const next = profiles.some(
      (profile: { name: string }) => profile.name.toLowerCase() === normalizedName,
    )
      ? profiles.map((profile: { name: string }) =>
          profile.name.toLowerCase() === normalizedName
            ? { ...profile, email, team }
            : profile,
        )
      : [...profiles, { name, email, team }]

    const customProfiles = next.filter(
      (profile: { name: string }) =>
        !importedProfiles.some(
          (imported: { name: string }) => imported.name.toLowerCase() === profile.name.toLowerCase(),
        ),
    )

    //setProfiles(next)
    try {
      localStorage.setItem("ticketops-agents", JSON.stringify(customProfiles))
    } catch {
      // Ignore storage issues so the UI keeps working in restricted or private browsers.
    }
    event.currentTarget.reset()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  const counts = useMemo(
    () =>
      tickets.reduce<Record<string, number>>(
        (all, ticket) => ({
          ...all,
          [ticket.assignedAgent]: (all[ticket.assignedAgent] ?? 0) + 1,
        }),
        {},
      ),
    [],
  )

  return (
    <>
      <section className="hero queue-hero">
        <div>
          <span className="eyebrow">People and access</span>
          <h1>Agent directory</h1>
          <p>
            Report owners are already listed. Register new agents before they
            are assigned work.
          </p>
        </div>
        <div className="result-count">
          <strong>{profiles.length}</strong>
          <span>agents</span>
        </div>
      </section>
      <section className="agents-grid">
        <article className="panel register-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Registration</span>
              <h2>Add an agent</h2>
            </div>
          </div>
          <form onSubmit={register}>
            <label>
              <span>Full name</span>
              <input name="name" required placeholder="e.g. Amina Noor" />
            </label>
            <label>
              <span>Work email</span>
              <input
                name="email"
                required
                type="email"
                placeholder="name@dataposit.co.ke"
              />
            </label>
            <label>
              <span>Team</span>
              <select name="team">
                <option>Service Desk</option>
                <option>Customer Success</option>
                <option>Engineering</option>
              </select>
            </label>
            <button className="primary-button" type="submit">
              {saved ? <Icon name="check" /> : <Icon name="plus" />}
              {saved ? "Agent registered" : "Register agent"}
            </button>
          </form>
          <p className="form-note">
            New profiles are saved in this browser and become available in the
            agent directory immediately.
          </p>
        </article>
        <article className="panel directory-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Current team</span>
              <h2>Directory</h2>
            </div>
            <span className="panel-note">Assigned queue volume</span>
          </div>
          <div className="directory-list">
            {profiles.map((profile: { name: string; email: any; team: any }, index: any) => (
              <div className="agent-row" key={`${profile.name}-${index}`}>
                <span className="avatar">
                  {profile.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.email || profile.team}</span>
                </div>
                <b>
                  {counts[profile.name] ?? 0}
                  <span> tickets</span>
                </b>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  )
}

export default function App() {
  const [view, setView] = useState<View>("overview")
  

 

  return (
    <div className="app-shell"> 
      <aside>
        <div className="company-logo">
          <img
    src="/images/dp logo with bg (1) (1).png.png"
  alt="DATAPOSIT LOGO"
  className="company-logo"
  />
          <div>
            <strong>DataposIT</strong>
            <small>Support intelligence</small>
          </div>
        </div>
        <nav aria-label="Primary navigation">
          <button
            className={view === "overview" ? "active" : ""}
            onClick={() => setView("overview")}
          >
            <Icon name="grid" />
            Overview
          </button>
          <button
            className={view === "queue" ? "active" : ""}
            onClick={() => setView("queue")}
          >
            <Icon name="queue" />
            Ticket queue<span>{tickets.length}</span>
          </button>
          <button
            className={view === "agents" ? "active" : ""}
            onClick={() => setView("agents")}
          >
            <Icon name="users" />
            Agents
          </button>
          
        </nav>
        <div className="source-card">
          <span>Data source</span>
          <strong>Customer Status Report</strong>
          <small>Imported {REPORT_DATE}</small>
          <i>
            <b />
          </i>
          <em>115 records loaded</em>
        </div>
      </aside>
      <main>
        <header>
          <div className="mobile-brand">
            <span>TO</span>
            <strong>TicketOps</strong>
          </div>
          <div className="mobile-nav">
            <button onClick={() => setView("overview")}>Overview</button>
            <button onClick={() => setView("queue")}>Queue</button>
            <button onClick={() => setView("agents")}>Agents</button>
          </div>
          <div className="header-status">
            <span>System operational</span>
            <LiveClock />
          </div>
        </header>
        <div className="content">
          {view === "overview" && <Overview onQueue={() => setView("queue")} />}
          {view === "queue" && <Queue />}
          {view === "agents" && <Agents />}
        </div>
      </main>
    </div>
  )
}
