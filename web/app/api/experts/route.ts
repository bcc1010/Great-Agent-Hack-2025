"use server"

import { NextRequest } from "next/server"

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

export async function POST(req: NextRequest) {
	try {
		const { category, location, keywords, count } = await req.json()
		const backend = process.env.PY_BACKEND_URL || "http://127.0.0.1:5000"

		const prompt = `
You are an expert-matching assistant. Based on the following filters:
- Category/industry: ${category}
- Location filter: ${location}
- Keywords: ${keywords}
- Count: ${count}

Return ONLY valid JSON array named "experts" with objects containing:
name, title, affiliation, location, email, website, areas (array of strings), summary.
Example:
{"experts":[{"name":"...", "title":"...", "affiliation":"...", "location":"...", "email":"", "website":"", "areas":["a","b"], "summary":"..."}]}
No commentary outside JSON.
`

		const res = await fetch(`${backend}/chat`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message: prompt, history: [] })
		})
		if (!res.ok) {
			return new Response(JSON.stringify({ error: `Backend error HTTP ${res.status}` }), { status: 200 })
		}
		const data = await res.json() as { answer?: string }
		const text = data.answer || ""

		// Attempt to parse JSON directly or extract a JSON block
		let experts: Expert[] = []
		try {
			// If entire string is JSON
			const parsed = JSON.parse(text)
			if (parsed && Array.isArray(parsed.experts)) {
				experts = parsed.experts
			}
		} catch {
			// Find first JSON block
			const match = text.match(/\{[\s\S]*\}/)
			if (match) {
				try {
					const parsed = JSON.parse(match[0])
					if (parsed && Array.isArray(parsed.experts)) {
						experts = parsed.experts
					}
				} catch { /* ignore */ }
			}
		}
		// Fallback: empty list with message
		return new Response(JSON.stringify({ experts }), { status: 200, headers: { "Content-Type": "application/json" } })
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 200 })
	}
}

