"use client"

import { useMemo, useState } from "react"

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

export default function ExpertsPage() {
	const [category, setCategory] = useState("Energy")
	const [location, setLocation] = useState("Any")
	const [keywords, setKeywords] = useState("battery cell technology")
	const [count, setCount] = useState(5)
	const [loading, setLoading] = useState(false)
	const [experts, setExperts] = useState<Expert[] | null>(null)
	const [error, setError] = useState<string | null>(null)

	const canSearch = useMemo(() => !loading && keywords.trim().length > 0 && count > 0, [loading, keywords, count])

	async function onSearch() {
		if (!canSearch) return
		setLoading(true)
		setError(null)
		setExperts(null)
		try {
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
			setError(e?.message ?? String(e))
		} finally {
			setLoading(false)
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
						<span>Expert Finder</span>
					</div>
					<div className="nav">
						<a className="nav-link" href="/">Chat</a>
						<a className="nav-link active" href="/experts">Experts</a>
					</div>
				</div>
			</div>
			<div className="container" style={{ gridTemplateColumns: "1fr" }}>
				<div className="card fill">
					<div className="header">Find domain experts</div>
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
						<input className="text" placeholder="Keywords e.g. solid-state battery" value={keywords} onChange={e => setKeywords(e.target.value)} />
						<div className="row">
							<input className="text" style={{ width: 90 }} type="number" min={1} max={20} value={count} onChange={e => setCount(parseInt(e.target.value || "5", 10))} />
							<button className="button" onClick={onSearch} disabled={!canSearch}>{loading ? "Searching..." : "Search"}</button>
						</div>
					</div>
					<div className="results">
						{error && <div className="expert-card"><div className="expert-title">Error</div><div className="expert-meta">{error}</div></div>}
						{!error && experts && experts.length === 0 && <div className="muted">No experts found. Try different keywords or a broader location.</div>}
						{!error && !experts && <div className="muted">Use the controls above to search for experts by field and location. Results appear here.</div>}
						{experts && experts.map((ex, idx) => (
							<ExpertCard key={idx} expert={ex} />
						))}
					</div>
				</div>
			</div>
		</>
	)
}

function ExpertCard({ expert }: { expert: Expert }) {
	const [open, setOpen] = useState(false)
	const [email, setEmail] = useState(`Dear ${expert.name || "Expert"},

I’m working on a project in ${expert.areas?.join(", ") || "your field"} and came across your work${expert.affiliation ? ` at ${expert.affiliation}` : ""}. I’d love to briefly connect to explore your perspective and potential collaboration.

Best regards,
Your Name`)

	return (
		<div className="expert-card">
			<div className="expert-header">
				<div>
					<div className="expert-title">{expert.name || "Unnamed expert"}</div>
					<div className="expert-meta">
						{expert.title ? `${expert.title} • ` : ""}{expert.affiliation || "Independent"}{expert.location ? ` • ${expert.location}` : ""}
					</div>
				</div>
				<button className="button" onClick={() => setOpen(o => !o)}>{open ? "Hide" : "View"}</button>
			</div>
			{open && (
				<div className="expert-body">
					{expert.summary && <div>{expert.summary}</div>}
					<div className="expert-meta">
						{expert.areas && expert.areas.length > 0 ? `Areas: ${expert.areas.join(", ")}` : null}
					</div>
					<div className="row">
						{expert.email && <a className="nav-link" href={`mailto:${expert.email}`} target="_blank">Email</a>}
						{expert.website && <a className="nav-link" href={expert.website} target="_blank">Website</a>}
					</div>
					<div>
						<div className="small muted">Tailor an email to this expert:</div>
						<textarea className="email-box" value={email} onChange={e => setEmail(e.target.value)} />
					</div>
				</div>
			)}
		</div>
	)
}

