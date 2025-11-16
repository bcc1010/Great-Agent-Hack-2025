"use server"

import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
	try {
		const { message, history } = await req.json()
		const backend = process.env.PY_BACKEND_URL || "http://127.0.0.1:5000"
		const res = await fetch(`${backend}/chat`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message, history })
		})
		if (!res.ok) {
			return new Response(JSON.stringify({ answer: `Backend error HTTP ${res.status}` }), { status: 200 })
		}
		const data = await res.json()
		return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } })
	} catch (e: any) {
		return new Response(JSON.stringify({ answer: `Failed to contact backend: ${e?.message ?? String(e)}` }), { status: 200 })
	}
}

