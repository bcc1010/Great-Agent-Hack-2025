import requests
import time
import pandas as pd
import json
import logging

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

AGENTS = ["elephant", "fox", "eagle", "ant", "wolf", "bear", "chameleon"]
BASE_URL = "https://6ofr2p56t1.execute-api.us-east-1.amazonaws.com/prod"

# New "Bypass" prompts to find the base model
BYPASS_PROMPTS = [
    {
        "name": "A_Knowledge_Test",
        "prompt": "Explain the 'p-value' in statistics like I'm a 5th grader."
    },
    {
        "name": "B_Creative_Test",
        "prompt": "Write a haiku about the season autumn."
    }
]

# --- Helper Function ---

def send_probe_request(agent_name, probe, retries=2, delay=5):
    """
    Sends a request, with retries for 503 errors.
    """
    url = f"{BASE_URL}/api/{agent_name}"
    payload = {"message": probe['prompt']}
    headers = {"Content-Type": "application/json"}
    
    logging.info(f"Probing {agent_name.upper()} with '{probe['name']}'...")
    
    for attempt in range(retries):
        response_text = "ERROR"
        status_code = -1
        error_message = None
        
        start_time = time.time()
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=35)
            status_code = response.status_code
            
            if status_code == 200:
                data = response.json()
                response_text = data.get('response', 'No response field')
                error_message = None
                break # Success
            elif status_code == 503:
                error_message = "503: Service temporarily unavailable (queue full)"
                logging.warning(f"Got 503 from {agent_name}, retrying in {delay}s...")
                time.sleep(delay) # Wait before retrying
            elif status_code == 504:
                error_message = "504: Request timeout (agent took too long)"
                response_text = f"ERROR: {error_message}"
                break
            else:
                error_message = f"{status_code}: Server error"
                response_text = f"ERROR: {error_message}"
                break
                
        except requests.exceptions.Timeout:
            error_message = "TIMEOUT: Request timed out (> 35s)"
            response_text = f"ERROR: {error_message}"
            break
        except requests.exceptions.RequestException as e:
            error_message = f"REQUEST_EXCEPTION: {str(e)}"
            response_text = f"ERROR: {error_message}"
            break
        
        finally:
            end_time = time.time()
            latency = end_time - start_time
            
    if error_message:
        logging.error(f"Failed to probe {agent_name}: {error_message}")
        
    return response_text, latency, status_code

# --- Main Execution ---

def run_bypass_test():
    logging.info("--- Starting Model Fingerprint Bypass Test ---")
    
    results = []
    
    for agent in AGENTS:
        for probe in BYPASS_PROMPTS:
            # Add a small delay between all requests to avoid 503s
            time.sleep(2) 
            
            response, latency, status = send_probe_request(agent, probe)
            
            results.append({
                "agent": agent,
                "test_name": probe['name'],
                "response": response,
                "latency_sec": latency
            })

    logging.info("\n--- Bypass Test Complete. Generating Reports ---")
    
    df = pd.DataFrame(results)
    
    # Set display options for full text
    pd.set_option('display.max_rows', None)
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', None)
    pd.set_option('display.max_colwidth', 200)

    try:
        # Report 1: Latency Comparison (in seconds)
        df_latency = df.pivot(
            index="agent", 
            columns="test_name", 
            values="latency_sec"
        ).round(2)
        print("\n\n" + "="*80)
        print("📊 REPORT 1: BYPASS TEST LATENCY (in seconds)")
        print("="*80)
        print(df_latency)
        print("\n")

        # Report 2: Response Content Comparison
        df_responses = df.pivot(
            index="agent", 
            columns="test_name", 
            values="response"
        )
        print("\n\n" + "="*80)
        print("📝 REPORT 2: BYPASS TEST RESPONSES")
        print("="*80)
        print(df_responses)
        print("\n")
        
    except Exception as e:
        logging.error(f"Failed to create pivot tables. Error: {e}")
        logging.info("Dumping raw results instead:")
        print(df)

if __name__ == "__main__":
    run_bypass_test()