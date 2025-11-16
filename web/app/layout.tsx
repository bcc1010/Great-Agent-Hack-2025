"use client"

import "./globals.css"
import { ReactNode } from "react"

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<title>Track B - Transparent AI Agent</title>
				<meta name="description" content="A governance-ready agent design with auditable traces and expert discovery" />
			</head>
			<body>{children}</body>
		</html>
	)
}

