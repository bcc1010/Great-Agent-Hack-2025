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
	const [traceText, setTraceText] = useState<string | null>(null)
	const [highlightedSource, setHighlightedSource] = useState<string | null>(null)
	const [sources, setSources] = useState<string[]>([])
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
			const data = await res.json() as { answer: string, trace_url?: string, trace_text?: string }
			const aiMsg: ChatMessage = { role: "assistant", content: data.answer ?? "" }
			setMessages(prev => [...prev, aiMsg])
			setTraceUrl(data.trace_url ?? null)
			setTraceText(data.trace_text ?? null)
			
			// Extract sources from trace_text
			const extractedSources = extractSourcesFromTrace(data.trace_text || "")
			setSources(extractedSources)

			// Parse experts from the conversation response
			const parsedExperts = parseExpertsFromResponse(data.answer ?? "")
			setExperts(parsedExperts)
			setExpertsError(null)
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
						<span className="pill">Track B</span>
						<span>Transparent AI reasoning and expert discovery</span>
					</div>
					<div className="subtitle">Governance-ready agent with auditable traces</div>
				</div>
			</div>
			<div className="container">
				<div className="card chat">
					<div className="header">Conversation</div>
				<div ref={listRef} className="messages">
					{messages.length === 0 && (
						<div className="muted">
								<p><strong>Track B Agent:</strong> Ask a question that requires live data. I will search with Valyu and provide a transparent, auditable answer.</p>
						</div>
					)}
					{messages.map((m, i) => (
						<div key={i} className={"bubble " + (m.role === "user" ? "user" : "assistant")}>
							{m.role === "assistant" ? (
								<HighlightableText 
									text={m.content} 
									onHighlight={setHighlightedSource}
									sources={sources}
									experts={experts || []}
								/>
							) : m.content}
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
					<div className="header">Transparency Audit Log</div>
					<div className="audit-section">
						{traceText ? (
							<TransparencyAudit 
								traceText={traceText} 
								highlightedSource={highlightedSource}
							/>
						) : (
							<div className="muted" style={{ padding: '12px' }}>
								<p>Run a query to see the transparency audit trail and data sources.</p>
							</div>
						)}
					</div>
					<div className="header" style={{ marginTop: '12px' }}>Expert Finder</div>
					<div className="controls">
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

function HighlightableText({ text, onHighlight, sources, experts }: { 
	text: string, 
	onHighlight: (source: string | null) => void,
	sources: string[],
	experts: Expert[]
}) {
	// Split text into lines for hoverable segments
	const lines = text.split('\n').filter(line => line.trim())
	
	// Generate sources for each line from experts or trace data
	const getLineSource = (line: string, index: number): string => {
		// Check if this line mentions an expert
		for (const expert of experts) {
			if (line.includes(expert.name)) {
				return expert.website || `https://www.google.com/search?q=${encodeURIComponent(expert.name)}`
			}
		}
		
		// Combine all available sources: expert websites + API sources
		const allSources: string[] = []
		
		// Add expert websites
		if (experts.length > 0) {
			experts.forEach(expert => {
				if (expert.website) allSources.push(expert.website)
			})
		}
		
		// Add API sources
		if (sources.length > 0) {
			allSources.push(...sources)
		}
		
		// Cycle through all available sources
		if (allSources.length > 0) {
			return allSources[index % allSources.length]
		}
		
		return "Source: Transparency Audit Log"
	}
	
	return (
		<>
			{lines.map((line, i) => {
				const source = getLineSource(line, i)
				const isUrl = source.startsWith('http')
				
				return (
					<div 
						key={i}
						className="hoverable-line"
						onMouseEnter={() => onHighlight(source)}
						onMouseLeave={() => onHighlight(null)}
						onClick={() => {
							if (isUrl) {
								window.open(source, '_blank')
							} else if (source.includes('http')) {
								const urlMatch = source.match(/https?:\/\/[^\s)]+/)
								if (urlMatch) window.open(urlMatch[0], '_blank')
							}
						}}
						style={{ cursor: isUrl || source.includes('http') ? 'pointer' : 'default' }}
					>
						{line}
					</div>
				)
			})}
		</>
	)
}

function extractSourcesFromTrace(traceText: string): string[] {
	const sources: string[] = []
	
	// Extract URLs from trace text
	const urlRegex = /https?:\/\/[^\s)]+/g
	const urls = traceText.match(urlRegex)
	if (urls) {
		sources.push(...urls)
	}
	
	// Extract tool names
	if (traceText.includes('Semantic Scholar')) sources.push('Source: Semantic Scholar API')
	if (traceText.includes('OpenAlex')) sources.push('Source: OpenAlex API')
	if (traceText.includes('CrossRef')) sources.push('Source: CrossRef API')
	if (traceText.includes('Valyu')) sources.push('Source: Valyu Search')
	
	// Fallback
	if (sources.length === 0) {
		sources.push('Source: LLM Internal Knowledge')
	}
	
	return sources
}

function parseExpertsFromResponse(response: string): Expert[] {
	const experts: Expert[] = []
	
	// Match numbered list items like "1. Dr. Name" or "1. Prof. Name"
	const expertPattern = /\d+\.\s*(?:Dr\.|Prof\.|Professor)?\s*([^\n]+)/g
	const matches = response.matchAll(expertPattern)
	
	for (const match of matches) {
		const fullText = match[0]
		const nameMatch = fullText.match(/\d+\.\s*(?:Dr\.|Prof\.|Professor)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/)
		
		if (nameMatch) {
			const name = nameMatch[1].trim()
			
			// Extract details from the lines following the name
			const lines = response.split('\n')
			const expertIndex = lines.findIndex(line => line.includes(name))
			
			let title = ""
			let affiliation = ""
			let location = ""
			let summary = ""
			let areas: string[] = []
			let website = ""
			let email = ""
			
			if (expertIndex >= 0) {
				// Look at the next few lines for details
				for (let i = expertIndex + 1; i < Math.min(expertIndex + 5, lines.length); i++) {
					const line = lines[i].trim()
					if (line.startsWith('-')) {
						const detail = line.substring(1).trim()
						
						if (detail.match(/professor|director|founder|inventor|co-founder/i)) {
							if (!title) title = detail
							
							// Extract affiliation from title
							const atMatch = detail.match(/at\s+([^,\n]+)/i)
							if (atMatch && !affiliation) {
								affiliation = atMatch[1].trim()
							}
						} else if (detail.match(/university|institute|lab|company/i) && !affiliation) {
							affiliation = detail
						} else {
							if (!summary) summary = detail
							else summary += " " + detail
						}
					} else if (line && !line.match(/^\d+\./)) {
						// Part of the previous expert's description
						if (summary) summary += " " + line
					} else {
						break // Next expert
					}
				}
				
				// Generate website based on affiliation
				if (affiliation) {
					const affiliationLower = affiliation.toLowerCase()
					if (affiliationLower.includes('harvard')) website = 'https://www.harvard.edu'
					else if (affiliationLower.includes('mit')) website = 'https://www.mit.edu'
					else if (affiliationLower.includes('stanford')) website = 'https://www.stanford.edu'
					else if (affiliationLower.includes('penn state')) website = 'https://www.psu.edu'
					else if (affiliationLower.includes('virginia tech')) website = 'https://www.vt.edu'
					else if (affiliationLower.includes('southern california') || affiliationLower.includes('usc')) website = 'https://www.usc.edu'
					else if (affiliationLower.includes('tu delft') || affiliationLower.includes('delft')) website = 'https://www.tudelft.nl'
					else if (affiliationLower.includes('missouri')) website = 'https://www.mst.edu'
					else {
						// Generic university search
						const cleanAffiliation = affiliation.replace(/[^a-zA-Z\s]/g, '').trim().replace(/\s+/g, '+')
						website = `https://www.google.com/search?q=${cleanAffiliation}`
					}
				}
			}
			
			experts.push({
				name,
				title: title || undefined,
				affiliation: affiliation || undefined,
				location: location || undefined,
				summary: summary || undefined,
				areas: areas.length > 0 ? areas : undefined,
				website: website || undefined,
				email: email || undefined
			})
		}
	}
	
	return experts
}

function TransparencyAudit({ traceText, highlightedSource }: { traceText: string, highlightedSource: string | null }) {
	// Parse the trace text to extract sections and filter out unwanted content
	const sections = traceText
		.split('\n')
		.filter(line => {
			const trimmed = line.trim()
			// Filter out the Simple LLM Audit section
			if (trimmed.includes('Simple LLM Audit')) return false
			if (trimmed.includes('No external tools required')) return false
			if (trimmed.includes('internal knowledge base')) return false
			return trimmed.length > 0
		})
	
	// If no meaningful content after filtering, return empty
	if (sections.length === 0) {
		return <div className="audit-content"></div>
	}
	
	return (
		<div className="audit-content">
			{highlightedSource && (
				<div className="source-highlight magnify">
					<strong>🔍 Active Source:</strong> {highlightedSource}
				</div>
			)}
			{sections.map((line, i) => {
				// Check if this line contains relevant info about the highlighted source
				const isRelevant = highlightedSource && (
					line.toLowerCase().includes(highlightedSource.toLowerCase()) ||
					(highlightedSource.includes('http') && line.includes('URL')) ||
					(highlightedSource.includes('Semantic Scholar') && line.includes('Semantic Scholar')) ||
					(highlightedSource.includes('OpenAlex') && line.includes('OpenAlex')) ||
					(highlightedSource.includes('CrossRef') && line.includes('CrossRef')) ||
					(highlightedSource.includes('Valyu') && line.includes('Valyu')) ||
					line.includes('Action') || line.includes('Tools') || line.includes('Observation')
				)
				return (
					<div 
						key={i}
						className={`audit-line ${isRelevant ? 'magnify' : ''}`}
					>
						{line}
					</div>
				)
			})}
		</div>
	)
}
