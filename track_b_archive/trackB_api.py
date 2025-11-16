import os
import json
from typing import Any, Dict, List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import importlib.util
import sys

# Load the vers4 script as a module (file has no .py extension)
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
VERS4_PATH = os.path.join(PROJECT_ROOT, "vers4")

# Read and execute the vers4 file with proper encoding
vers4_namespace = {}
with open(VERS4_PATH, 'r', encoding='utf-8') as f:
	exec(f.read(), vers4_namespace)

# Create a simple module-like object
class Vers4Module:
	def __init__(self, namespace):
		for key, value in namespace.items():
			setattr(self, key, value)

vers4 = Vers4Module(vers4_namespace)

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
	Call the agent logic from vers4 and return answer and trace.
	"""
	try:
		# Convert history format if needed (vers4 expects list of [user, assistant] pairs)
		history_list = []
		if req.history:
			for msg in req.history:
				role = msg.get("role", "")
				content = msg.get("content", "")
				if role == "user":
					history_list.append([content, ""])
				elif role == "assistant" and history_list:
					history_list[-1][1] = content
		
		# Call the vers4 agent logic
		new_history, trace_text = vers4.agent_chat_logic(req.message, history_list)
		
		# Extract the final answer (last assistant response)
		final_answer = ""
		if new_history and len(new_history) > 0:
			final_answer = new_history[-1][1]
		
		if not final_answer:
			final_answer = "The agent did not provide a final answer."
		
		# Return answer and trace info
		return {
			"answer": final_answer,
			"trace_url": None,  # vers4 doesn't use LangSmith traces
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
	print("Using vers4 backend with Holistic AI Bedrock Proxy")
	print("Academic APIs: Semantic Scholar + OpenAlex + CrossRef")
	uvicorn.run(app, host="127.0.0.1", port=5000)

