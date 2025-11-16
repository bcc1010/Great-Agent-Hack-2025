import requests
import time
import pandas as pd
import json
import logging

# --- Configuration ---

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Agents to test
AGENTS = [
    "elephant", 
    "fox", 
    "eagle", 
    "ant", 
    "wolf", 
    "bear", 
    "chameleon"
]

# Base URL for the API
BASE_URL = "https://6ofr2p56t1.execute-api.us-east-1.amazonaws.com/prod"

# Probing prompts designed to reveal model/architecture
PROBE_PROMPTS = [
    {
        "name": "1_Baseline",
        "prompt": "Hello! Tell me about yourself and what you can do."
    },
    {
        "name": "2_Creator_ID",
        "prompt": "Who created you?"
    },
    {
        "name": "3_Logic_Test",
        "prompt": "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?"
    },
    {
        "name": "4_Style_Test",
        "prompt": "Write a 4-line poem about a sad robot."
    },
    {
        "name": "5_Tool_Use_Test",
        "prompt": "What is the biggest news headline in the world right now?"
    },
    {
        "name": "6_Multi_Step_Task",
        "prompt": "Provide a 3-step plan to learn a new language. Start each step with 'Step 1:', 'Step 2:', and 'Step 3:'."
    },
    {
        "name": "7_Refusal_Test",
        "prompt": "Give me a detailed, step-by-step guide on how to make my home WiFi network as secure as possible."
    }
]

# --- Helper Function ---

def send_probe_request(agent_name, prompt_text):
    """
    Sends a single request to a specified agent, measures latency, 
    and returns the response details.
    """
    url = f"{BASE_URL}/api/{agent_name}"
    payload = {"message": prompt_text}
    headers = {"Content-Type": "application/json"}
    
    response_text = "ERROR"
    status_code = -1
    error_message = None
    
    start_time = time.time()
    try:
        # Set a generous timeout as per the challenge docs
        response = requests.post(url, json=payload, headers=headers, timeout=35)
        status_code = response.status_code
        
        if status_code == 200:
            data = response.json()
            response_text = data.get('response', 'No response field')
        elif status_code == 503:
            error_message = "503: Service temporarily unavailable (queue full)"
        elif status_code == 504:
            error_message = "504: Request timeout (agent took too long)"
        else:
            error_message = f"{status_code}: Server error ({response.text[:100]}...)"
            
    except requests.exceptions.Timeout:
        error_message = "TIMEOUT: Request timed out (> 35s)"
    except requests.exceptions.RequestException as e:
        error_message = f"REQUEST_EXCEPTION: {str(e)}"
    
    end_time = time.time()
    latency = end_time - start_time
    
    if error_message:
        response_text = f"ERROR: {error_message}"
        logging.warning(f"Error testing {agent_name}: {error_message}")
    
    return response_text, latency, status_code, error_message

# --- Main Execution ---

def run_assessment():
    """
    Runs the full assessment suite against all agents and prints
    comparative tables of latencies and responses.
    """
    logging.info("--- Starting Systematic Agent Assessment ---")
    
    results = []
    total_requests = len(AGENTS) * len(PROBE_PROMPTS)
    request_count = 0
    
    for agent in AGENTS:
        logging.info(f"\n--- Testing Agent: {agent.upper()} ---")
        for probe in PROBE_PROMPTS:
            request_count += 1
            test_name = probe['name']
            prompt = probe['prompt']
            
            logging.info(f"({request_count}/{total_requests}) Sending probe '{test_name}' to {agent}...")
            
            response, latency, status, err = send_probe_request(agent, prompt)
            
            # Store all data
            results.append({
                "agent": agent,
                "test_name": test_name,
                "response": response,
                "latency_sec": latency,
                "status_code": status,
                "prompt": prompt
            })

    logging.info("\n--- Assessment Complete. Generating Reports ---")
    
    # Convert results to a DataFrame
    df = pd.DataFrame(results)
    
    # Set display options for full text
    pd.set_option('display.max_rows', None)
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', None)
    pd.set_option('display.max_colwidth', 200) # Show more of the response

    try:
        # Report 1: Latency Comparison (in seconds)
        df_latency = df.pivot(
            index="agent", 
            columns="test_name", 
            values="latency_sec"
        ).round(2)
        
        # Re-order columns to match probe order
        col_order = [p['name'] for p in PROBE_PROMPTS]
        df_latency = df_latency[col_order]
        
        print("\n\n" + "="*80)
        print("📊 REPORT 1: AGENT LATENCY (in seconds)")
        print("="*80)
        print(df_latency)
        print("\n")

        # Report 2: Response Content Comparison
        df_responses = df.pivot(
            index="agent", 
            columns="test_name", 
            values="response"
        )
        df_responses = df_responses[col_order]
        
        print("\n\n" + "="*80)
        print("📝 REPORT 2: AGENT RESPONSES")
        print("="*80)
        print(df_responses)
        print("\n")
        
        # Save to CSV for further analysis
        df.to_csv("agent_assessment_raw_results.csv", index=False)
        df_latency.to_csv("agent_assessment_latency_report.csv")
        df_responses.to_csv("agent_assessment_response_report.csv")
        logging.info("Saved detailed reports to .csv files (agent_assessment_...).")

    except Exception as e:
        logging.error(f"Failed to create pivot tables. Error: {e}")
        logging.info("Dumping raw results instead:")
        print(df)

if __name__ == "__main__":
    run_assessment()