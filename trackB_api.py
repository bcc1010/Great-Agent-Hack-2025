import os
import json
from typing import Any, Dict, List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import importlib.util
import sys

# Load the trackB2 script as a module (file has no .py extension)
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
TRACKB2_PATH = os.path.join(PROJECT_ROOT, "trackB2")

# Read and execute the trackB2 file with proper encoding
trackB2_namespace = {}
with open(TRACKB2_PATH, 'r', encoding='utf-8') as f:
	exec(f.read(), trackB2_namespace)

# Create a simple module-like object
class TrackB2Module:
	def __init__(self, namespace):
		for key, value in namespace.items():
			setattr(self, key, value)

trackB2 = TrackB2Module(trackB2_namespace)

# FastAPI app
app = FastAPI(title="Track B API")
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
	Call the agent logic from trackB2 and return answer and trace.
	"""
	try:
		# Convert history format if needed (trackB2 expects list of [user, assistant] pairs)
		history_list = []
		if req.history:
			for msg in req.history:
				role = msg.get("role", "")
				content = msg.get("content", "")
				if role == "user":
					history_list.append([content, ""])
				elif role == "assistant" and history_list:
					history_list[-1][1] = content
		
		# Call the trackB2 agent logic
		new_history, trace_text = trackB2.agent_chat_logic(req.message, history_list)
		
		# Extract the final answer (last assistant response)
		final_answer = ""
		if new_history and len(new_history) > 0:
			final_answer = new_history[-1][1]
		
		if not final_answer:
			final_answer = "The agent did not provide a final answer."
		
		# Return answer and trace info
		return {
			"answer": final_answer,
			"trace_url": None,  # trackB2 doesn't use LangSmith traces
			"trace_text": trace_text
		}
	except Exception as e:
		return {
			"answer": f"An error occurred: {e}",
			"trace_url": None,
			"trace_text": f"ERROR: {str(e)}"
		}

if __name__ == "__main__":
	import uvicorn
	print("Starting Track B API on http://127.0.0.1:5000")
	print("Using trackB2 backend with Holistic AI Bedrock Proxy")
	uvicorn.run(app, host="127.0.0.1", port=5000)

