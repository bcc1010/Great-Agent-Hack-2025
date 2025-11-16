"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type ChatMessage = { role: "user" | "assistant", content: string }
type Expert = {
	name: string
	title?: string
	affiliation?: string
	location?: string
	email?: string
	website?: string
	areas?: string[]
	summary?: string
}

export default function Page() {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [input, setInput] = useState("")
	const [loading, setLoading] = useState(false)
	const [traceUrl, setTraceUrl] = useState<string | null>(null)
	const listRef = useRef<HTMLDivElement>(null)

	// Experts search state on the same page
	const [category, setCategory] = useState("Energy")
	const [location, setLocation] = useState("Any")
	const [count, setCount] = useState(5)
	const [experts, setExperts] = useState<Expert[] | null>(null)
	const [expertsLoading, setExpertsLoading] = useState(false)
	const [expertsError, setExpertsError] = useState<string | null>(null)

	useEffect(() => {
		if (listRef.current) {
			listRef.current.scrollTop = listRef.current.scrollHeight
		}
	}, [messages])

	const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading])

	async function fetchExpertsFromQuery(keywords: string) {
		try {
			setExpertsLoading(true)
			setExpertsError(null)
			const res = await fetch("/api/experts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ category, location, keywords, count })
			})
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json() as { experts?: Expert[], error?: string }
			if (data.error) throw new Error(data.error)
			setExperts(data.experts ?? [])
		} catch (e: any) {
			setExpertsError(e?.message ?? String(e))
			setExperts([])
		} finally {
			setExpertsLoading(false)
		}
	}

	async function onSend() {
		if (!canSend) return
		const userMsg: ChatMessage = { role: "user", content: input.trim() }
		setMessages(prev => [...prev, userMsg])
		setInput("")
		setLoading(true)
		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: userMsg.content, history: messages })
			})
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json() as { answer: string, trace_url?: string }
			const aiMsg: ChatMessage = { role: "assistant", content: data.answer ?? "" }
			setMessages(prev => [...prev, aiMsg])
			setTraceUrl(data.trace_url ?? null)

			// Also populate Experts panel from the same query intent
			fetchExpertsFromQuery(userMsg.content)
		} catch (e: any) {
			const aiMsg: ChatMessage = { role: "assistant", content: `An error occurred: ${e?.message ?? String(e)}` }
			setMessages(prev => [...prev, aiMsg])
		} finally {
			setLoading(false)
		}
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			onSend()
		}
	}

	return (
		<>
			<div className="bg-blobs">
				<div className="blob orange" />
				<div className="blob blue" />
				<div className="blob yellow" />
				<div className="blob pink" />
				<div className="blob amber" />
			</div>
			<div className="topbar">
				<div className="topbar-inner">
					<div className="brand">
						<span className="pill">BotOrNot</span>
						<span>Know your source, know your truth</span>
					</div>
					<div className="subtitle">Transparent, governance-ready agent with auditable traces</div>
				</div>
			</div>
			<div className="container">
				<div className="card chat">
					<div className="header">Conversation</div>
				<div ref={listRef} className="messages">
					{messages.length === 0 && (
						<div className="muted">
								<p><strong>BotOrNot:</strong> Ask a question that requires live data. I will search with Valyu and provide a transparent, auditable answer.</p>
						</div>
					)}
					{messages.map((m, i) => (
						<div key={i} className={"bubble " + (m.role === "user" ? "user" : "assistant")}>
							{m.content}
						</div>
					))}
					{loading && (
						<div className="bubble assistant">Thinking…</div>
					)}
				</div>
				<div className="inputRow">
					<input
						className="input"
						placeholder="Ask a question that requires live data..."
						value={input}
						onChange={e => setInput(e.target.value)}
						onKeyDown={onKeyDown}
						disabled={loading}
					/>
					<button className="button" onClick={onSend} disabled={!canSend}>
							{loading ? "Working..." : "Submit Audit"}
					</button>
				</div>
				</div>
				<div className="card fill">
					<div className="header">Experts</div>
					<div className="controls">
						<select className="select" value={category} onChange={e => setCategory(e.target.value)}>
							<option>Energy</option>
							<option>Biotech</option>
							<option>AI</option>
							<option>Materials</option>
							<option>Semiconductors</option>
							<option>Aerospace</option>
							<option>Healthcare</option>
						</select>
						<select className="select" value={location} onChange={e => setLocation(e.target.value)}>
							<option>Any</option>
							<option>London</option>
							<option>United Kingdom</option>
							<option>United States</option>
							<option>Europe</option>
							<option>Asia</option>
						</select>
						<input className="text" style={{ width: 90 }} type="number" min={1} max={20} value={count} onChange={e => setCount(parseInt(e.target.value || "5", 10))} />
					</div>
					<div className="results">
						{expertsError && <div className="expert-card"><div className="expert-title">Error</div><div className="expert-meta">{expertsError}</div></div>}
						{!expertsError && experts && experts.length === 0 && <div className="muted">No experts found. Try different keywords or a broader location.</div>}
						{!expertsError && !experts && <div className="muted">Use the conversation or the controls above to generate experts. Results will appear here.</div>}
						{experts && experts.map((ex, i) => (
							<ExpertCard key={i} expert={ex} traceUrl={traceUrl} />
						))}
					</div>
				</div>
			</div>
		</>
	)
}

function ExpertCard({ expert, traceUrl }: { expert: Expert, traceUrl: string | null }) {
	const [open, setOpen] = useState(false)
	return (
		<div className="expert-card">
			<div className="expert-header">
				<div>
					<div className="expert-title has-source">
						{expert.name || "Unnamed expert"}
						<span className="tooltip">Source: {expert.website || expert.email || traceUrl || "See LangSmith trace"}</span>
					</div>
					<div className="expert-meta">
						<span className="has-source">
							{expert.title ? `${expert.title}` : "Title unknown"}
							<span className="tooltip">Source: {traceUrl || "LangSmith trace"}</span>
						</span>
						{" • "}
						<span className="has-source">
							{expert.affiliation || "Independent"}
							<span className="tooltip">Source: {expert.website || traceUrl || "LangSmith trace"}</span>
						</span>
						{expert.location ? <>{" • "}<span className="has-source">{expert.location}<span className="tooltip">Source: {traceUrl || "LangSmith trace"}</span></span></> : null}
					</div>
				</div>
				<button className="button" onClick={() => setOpen(o => !o)}>{open ? "Hide" : "View"}</button>
			</div>
			{open && (
				<div className="expert-body">
					{expert.summary && <div className="has-source">{expert.summary}<span className="tooltip">Source: {traceUrl || "LangSmith trace"}</span></div>}
					<div className="expert-meta has-source">
						{expert.areas && expert.areas.length > 0 ? `Areas: ${expert.areas.join(", ")}` : null}
						<span className="tooltip">Source: {traceUrl || "LangSmith trace"}</span>
					</div>
					<div className="row">
						{expert.email && <a className="nav-link" href={`mailto:${expert.email}`} target="_blank">Email</a>}
						{expert.website && <a className="nav-link" href={expert.website} target="_blank">Website</a>}
						{traceUrl && <a className="nav-link" href={traceUrl} target="_blank">Trace</a>}
					</div>
					<div>
						<div className="small muted">Tailor an email to this expert:</div>
						<textarea className="email-box" defaultValue={`Dear ${expert.name || "Expert"},

I’m working on a project${expert.areas && expert.areas.length ? ` in ${expert.areas.join(", ")}` : ""}${expert.affiliation ? ` and saw your work at ${expert.affiliation}` : ""}. I’d love to briefly connect to explore your perspective and potential collaboration.

Best regards,
Your Name`} />
					</div>
				</div>
			)}
		</div>
	)
}
