# Great-Agent-Hack-2025

## Track B Frontend (Next.js) + Python API

This repository now includes a Next.js 14 frontend that pairs with the existing `trackB` agent. A small FastAPI server (`trackB_api.py`) exposes the agent over HTTP so the frontend can call it.

### Prerequisites
- Node.js 18+
- Python 3.10+
- Your AWS/Valyu/Env keys set as expected by `trackB` (see its code for variable names)

### 1) Start the Python backend
In one terminal:

```bash
pip install fastapi uvicorn gradio boto3 langgraph langchain-core langchain-aws langchain-valyu python-dotenv
python trackB_api.py
```

This will start an API at `http://127.0.0.1:5000/chat`.

If you prefer the original Gradio app, you can still run:
```bash
python trackB
```
(But the Next.js frontend expects the FastAPI endpoint by default.)

### 2) Start the Next.js frontend
In another terminal:

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`. The UI provides:
- A chat panel to send prompts to the agent.
- A transparency panel that links to the LangSmith trace.

To point the frontend to a different backend URL, set the environment variable before running:
```bash
set PY_BACKEND_URL=http://127.0.0.1:5001   # PowerShell: $env:PY_BACKEND_URL="http://127.0.0.1:5001"
npm run dev
```

### Notes
- The backend loads `trackB` directly from the file (no `.py` extension) using `importlib`. Keep the filename as-is.
- Ensure your environment variables are available to `trackB` (see lines 15-31 for `.env` mappings).