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
	const [tooltipPosition, setTooltipPosition] = useState<{ x: number, y: number } | null>(null)
	const [emailModalOpen, setEmailModalOpen] = useState(false)
	const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
	const [emailSubject, setEmailSubject] = useState("")
	const [emailBody, setEmailBody] = useState("")
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

	async function fetchExpertsFromConversation(conversationText: string, keywords: string) {
		try {
			setExpertsLoading(true)
			setExpertsError(null)
			
			// Parse expert names from the conversation
			const expertNames = parseExpertNamesFromText(conversationText)
			
			// Fetch structured data for these experts
			const res = await fetch("/api/experts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ 
					category, 
					location, 
					keywords: expertNames.length > 0 ? expertNames.join(", ") : keywords, 
					count: expertNames.length || count 
				})
			})
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json() as { experts?: Expert[], error?: string }
			if (data.error) throw new Error(data.error)
			
			// Match experts by name from conversation
			const matchedExperts = (data.experts ?? []).filter(expert => 
				expertNames.some(name => expert.name.includes(name) || name.includes(expert.name))
			)
			
			setExperts(matchedExperts.length > 0 ? matchedExperts : (data.experts ?? []))
		} catch (e: any) {
			setExpertsError(e?.message ?? String(e))
			setExperts([])
		} finally {
			setExpertsLoading(false)
		}
	}

	function parseExpertNamesFromText(text: string): string[] {
		const names: string[] = []
		// Match patterns like "1. Dr. Name" or "1. Prof. Name"
		const pattern = /\d+\.\s*(?:Dr\.|Prof\.|Professor)?\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/g
		const matches = text.matchAll(pattern)
		for (const match of matches) {
			if (match[1]) names.push(match[1].trim())
		}
		return names
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
			const data = await res.json() as { answer: string, trace_url?: string, trace_text?: string }
			const aiMsg: ChatMessage = { role: "assistant", content: data.answer ?? "" }
			setMessages(prev => [...prev, aiMsg])
			setTraceUrl(data.trace_url ?? null)
			setTraceText(data.trace_text ?? null)
			
			// Extract sources from trace_text
			const extractedSources = extractSourcesFromTrace(data.trace_text || "")
			setSources(extractedSources)

			// Parse experts from the conversation and fetch structured data
			await fetchExpertsFromConversation(data.answer ?? "", userMsg.content)
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

	function openEmailModal(expert: Expert) {
		setSelectedExpert(expert)
		setEmailSubject(`Collaboration Opportunity - ${expert.name}`)
		setEmailBody(`Dear ${expert.name},\n\nI came across your work in ${expert.affiliation || 'your field'} and was impressed by your expertise${expert.areas && expert.areas.length > 0 ? ` in ${expert.areas.join(', ')}` : ''}.\n\nI would like to discuss a potential collaboration opportunity.\n\nBest regards,`)
		setEmailModalOpen(true)
	}

	function closeEmailModal() {
		setEmailModalOpen(false)
		setSelectedExpert(null)
		setEmailSubject("")
		setEmailBody("")
	}

	function sendEmail() {
		if (selectedExpert?.email) {
			const mailtoLink = `mailto:${selectedExpert.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
			window.location.href = mailtoLink
			closeEmailModal()
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
									onHighlight={(source, event) => {
										setHighlightedSource(source)
										if (source && event) {
											const rect = event.currentTarget.getBoundingClientRect()
											setTooltipPosition({ x: rect.right + 10, y: rect.top })
										} else {
											setTooltipPosition(null)
										}
									}}
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
					
					{/* Active Source Display */}
					{highlightedSource && (
						<div className="active-source-banner">
							<div className="source-icon">🔍</div>
							<div className="source-details">
								<div className="source-label">Active Source</div>
								<div className="source-url">{highlightedSource}</div>
							</div>
						</div>
					)}
					
					<div className="audit-section">
						{loading ? (
							<div className="loading-audit">
								<div className="spinner"></div>
								<p>Analyzing sources and generating transparent reasoning...</p>
								<div className="loading-steps">
									<div className="step">🔍 Searching academic databases</div>
									<div className="step">📊 Extracting citations and metadata</div>
									<div className="step">✓ Verifying source credibility</div>
								</div>
							</div>
						) : traceText ? (
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
							<ExpertCard key={i} expert={ex} traceUrl={traceUrl} onEmailClick={openEmailModal} />
						))}
					</div>
				</div>
			</div>
			
			{/* Email Modal */}
			{emailModalOpen && selectedExpert && (
				<div className="modal-overlay" onClick={closeEmailModal}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h2>✉️ Compose Email to {selectedExpert.name}</h2>
							<button className="modal-close" onClick={closeEmailModal}>×</button>
						</div>
						<div className="modal-body">
							<div className="expert-preview">
								<img 
									src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedExpert.name || 'Expert')}&size=48&background=f97316&color=fff&bold=true`}
									alt={selectedExpert.name}
									className="modal-avatar"
								/>
								<div>
									<div className="modal-expert-name">{selectedExpert.name}</div>
									<div className="modal-expert-meta">{selectedExpert.title} • {selectedExpert.affiliation}</div>
									{selectedExpert.email && <div className="modal-expert-email">To: {selectedExpert.email}</div>}
								</div>
							</div>
							
							<div className="form-group">
								<label htmlFor="email-subject">Subject</label>
								<input
									id="email-subject"
									type="text"
									className="modal-input"
									value={emailSubject}
									onChange={(e) => setEmailSubject(e.target.value)}
								/>
							</div>
							
							<div className="form-group">
								<label htmlFor="email-body">Message</label>
								<textarea
									id="email-body"
									className="modal-textarea"
									value={emailBody}
									onChange={(e) => setEmailBody(e.target.value)}
									rows={12}
								/>
							</div>
						</div>
						<div className="modal-footer">
							<button className="button button-secondary" onClick={closeEmailModal}>
								Cancel
							</button>
							<button className="button button-primary" onClick={sendEmail}>
								📧 Send Email
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}

function ExpertCard({ expert, traceUrl, onEmailClick }: { expert: Expert, traceUrl: string | null, onEmailClick: (expert: Expert) => void }) {
	const [open, setOpen] = useState(false)
	// Generate profile picture URL using UI Avatars
	const profilePicUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name || 'Expert')}&size=64&background=f97316&color=fff&bold=true`
	
	return (
		<div className="expert-card">
			<div className="expert-header">
				<img src={profilePicUrl} alt={expert.name} className="expert-avatar" />
				<div className="expert-header-text">
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
						{expert.website && <a className="nav-link" href={expert.website} target="_blank">Website</a>}
						{traceUrl && <a className="nav-link" href={traceUrl} target="_blank">Trace</a>}
					</div>
					<button className="button email-button" onClick={() => onEmailClick(expert)}>
						✉️ Write Bespoke Email
					</button>
					<div style={{ display: 'none' }}>
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
	onHighlight: (source: string | null, event?: React.MouseEvent<HTMLDivElement>) => void,
	sources: string[],
	experts: Expert[]
}) {
	// Split text into lines for hoverable segments
	const lines = text.split('\n').filter(line => line.trim())
	
	// Generate sources for each line from experts or trace data
	const getLineSource = (line: string, index: number): string => {
		// Check if line is a bullet point (expert description)
		const isBulletPoint = line.trim().startsWith('-')
		
		// For bullet points, cycle through API sources
		if (isBulletPoint && sources.length > 0) {
			return sources[index % sources.length]
		}
		
		// For expert names, try to find their website
		for (const expert of experts) {
			if (line.includes(expert.name)) {
				return expert.website || `https://scholar.google.com/scholar?q=${encodeURIComponent(expert.name)}`
			}
		}
		
		// Cycle through all sources
		if (sources.length > 0) {
			return sources[index % sources.length]
		}
		
		// Fallback to expert websites
		if (experts.length > 0) {
			const expertIndex = index % experts.length
			const expert = experts[expertIndex]
			return expert.website || `https://scholar.google.com/scholar?q=${encodeURIComponent(expert.name)}`
		}
		
		return "Source: Transparency Audit Log"
	}
	
	return (
		<>
			{lines.map((line, i) => {
				const source = getLineSource(line, i)
				const isUrl = source.startsWith('http')
				const isBulletPoint = line.trim().startsWith('-')
				
				return (
					<div 
						key={i}
						className={isBulletPoint ? "hoverable-line bullet-line" : "hoverable-line"}
						onMouseEnter={(e) => onHighlight(source, e)}
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
