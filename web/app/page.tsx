"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type ChatMessage = { role: "user" | "assistant", content: string }

export default function Page() {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [input, setInput] = useState("")
	const [loading, setLoading] = useState(false)
	const [traceUrl, setTraceUrl] = useState<string | null>(null)
	const listRef = useRef<HTMLDivElement>(null)

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
			const data = await res.json() as { answer: string, trace_url?: string }
			const aiMsg: ChatMessage = { role: "assistant", content: data.answer ?? "" }
			setMessages(prev => [...prev, aiMsg])
			setTraceUrl(data.trace_url ?? null)
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
			</div>
			<div className="topbar">
				<div className="topbar-inner">
					<div className="brand">
						<span className="pill">BotOrNot</span>
						<span>Know your source, know your truth</span>
					</div>
					<div className="subtitle">A transparent, governance-ready agent with auditable traces</div>
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
					<div className="header">Transparency Audit</div>
					<div className="auditBody">
						<p className="muted small">This log reveals the agent's process to ensure trust and verifiability.</p>
						<ul>
							<li><strong>Core LLM:</strong> AWS Claude 3 Haiku</li>
							<li><strong>Tool:</strong> Valyu AI Search</li>
							<li><strong>Framework:</strong> LangGraph, Boto3 client</li>
						</ul>
						<hr />
						{traceUrl ? (
							<p>
								Full interactive trace:{" "}
								<a href={traceUrl} target="_blank" rel="noreferrer">Open LangSmith Trace</a>
							</p>
						) : (
							<p className="muted">Run a prompt to see the agent trace link.</p>
						)}
					</div>
				</div>
			</div>
		</>
	)
}

