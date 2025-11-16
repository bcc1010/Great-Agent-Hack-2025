import os
import json
from typing import Any, Dict, List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import importlib.util
import sys

# Load the existing trackB script as a module (file has no .py extension)
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
TRACKB_PATH = os.path.join(PROJECT_ROOT, "trackB")
spec = importlib.util.spec_from_file_location("trackB_module", TRACKB_PATH)
if spec is None or spec.loader is None:
	raise RuntimeError("Unable to load trackB module from path.")
trackB = importlib.util.module_from_spec(spec)
sys.modules["trackB_module"] = trackB
spec.loader.exec_module(trackB)

# FastAPI app
app = FastAPI(title="BotOrNot TrackB API")
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

class ChatRequest(BaseModel):
	message: str
	history: Optional[List[Dict[str, Any]]] = None

@app.post("/chat")
async def chat(req: ChatRequest):
	"""
	Call the agent graph from trackB and return answer and trace url.
	"""
	trace_url: Optional[str] = None
	final_answer: str = ""
	try:
		response_chunks: List[str] = []
		for chunk in trackB.agent_graph.stream({"messages": [trackB.HumanMessage(content=req.message)]}, stream_mode="values"):
			final_message = chunk["messages"][-1]
			if hasattr(final_message, "config") and trace_url is None:
				run_id = final_message.config["run_id"]
				trace_url = f"https://smith.langchain.com/public/runs/{run_id}"
			if getattr(final_message, "type", None) == "ai":
				response_chunks.append(getattr(final_message, "content", ""))
		final_answer = "".join(response_chunks)
		if not final_answer:
			final_answer = "The agent did not provide a final answer. Check the trace."
		if trace_url is None:
			trace_url = "[LangSmith Trace not available. Check API Key.]"
		return {"answer": final_answer, "trace_url": trace_url}
	except Exception as e:
		return {"answer": f"An error occurred: {e}", "trace_url": "[LangSmith Trace not available. Error occurred before trace could be captured.]"}

if __name__ == "__main__":
	import uvicorn
	print("Starting TrackB API on http://127.0.0.1:5000")
	uvicorn.run(app, host="127.0.0.1", port=5000)

