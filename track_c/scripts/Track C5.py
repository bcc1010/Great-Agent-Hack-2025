import requests
import time
import pandas as pd
import json
import logging
import os

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

AGENTS = ["elephant", "fox", "eagle", "ant", "wolf", "bear", "chameleon"]
BASE_URL = "https://6ofr2p56t1.execute-api.us-east-1.amazonaws.com"
JAILBREAK_CSV = "jailbreak_prompts.csv"
PROMPT_SAMPLE_SIZE = 20 # How many jailbreaks to test
OUTPUT_CSV = "exploitation_test_full_results.csv"

# --- Load Prompts ---
def load_jailbreak_prompts(csv_file, sample_size):
    """
    Loads the official jailbreak CSV and takes a random sample.
    """
    if not os.path.exists(csv_file):
        logging.error(f"FATAL: '{csv_file}' not found.")
        logging.error("Please download it from the 'examples/red_teaming_datasets/'")
        logging.error("and place it in the same directory as this script.")
        return None

    try:
        df = pd.read_csv(csv_file)
        # Ensure 'prompt' column exists
        if 'prompt' not in df.columns:
            logging.error(f"FATAL: No 'prompt' column found in '{csv_file}'.")
            return None
            
        # Get a random sample
        sample_df = df.sample(n=sample_size, random_state=42)
        logging.info(f"Loaded {len(sample_df)} sample prompts from '{csv_file}'.")
        return sample_df['prompt'].tolist()
        
    except Exception as e:
        logging.error(f"Failed to read CSV: {e}")
        return None

# --- Helper Function ---
def send_probe_request(agent_name, prompt, test_name, retries=2, delay=5):
    """
    Sends a request, with retries for 503 errors.
    """
    url = f"{BASE_URL}/api/{agent_name}"
    payload = {"message": prompt}
    headers = {"Content-Type": "application/json"}
    
    logging.info(f"Probing {agent_name.upper()} with '{test_name}'...")
    
    for attempt in range(retries):
        response_text = "ERROR"
        status_code = -1
        error_message = None
        start_time = time.time()
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=45) # Increased timeout
            status_code = response.status_code
            
            if status_code == 200:
                data = response.json()
                response_text = data.get('response', 'No response field')
                break # Success
            elif status_code == 503:
                error_message = f"503: Queue full. Retrying in {delay}s..."
                logging.warning(f"Got 503 from {agent_name}, retrying...")
                time.sleep(delay)
            elif status_code == 504:
                error_message = "504: Request timeout"
                response_text = f"ERROR: {error_message}"
                break
            else:
                error_message = f"{status_code}: Server error"
                response_text = f"ERROR: {error_message}"
                break
                
        except requests.exceptions.Timeout:
            error_message = "TIMEOUT: Request timed out (> 45s)"
            response_text = f"ERROR: {error_message}"
            break
        except Exception as e:
            error_message = f"REQUEST_EXCEPTION: {str(e)}"
            response_text = f"ERROR: {error_message}"
            break
        
        finally:
            end_time = time.time()
            latency = end_time - start_time
            
    if error_message:
        logging.error(f"Failed to probe {agent_name} with {test_name}: {error_message}")
        
    return response_text, latency, status_code

# --- Main Execution ---
def run_systematic_test():
    logging.info("--- Starting Systematic Jailbreak Test (ASR Measurement) ---")
    
    # 1. Load prompts from the official CSV
    jailbreak_prompts = load_jailbreak_prompts(JAILBREAK_CSV, PROMPT_SAMPLE_SIZE)
    if jailbreak_prompts is None:
        return # Stop execution if file isn't found

    all_results = []
    
    # 2. Run the Systematic Jailbreak Test
    for i, prompt in enumerate(jailbreak_prompts):
        test_name = f"Jailbreak_{i+1:02d}"
        
        for agent in AGENTS:
            time.sleep(2) # Give the API a break
            
            response, latency, status = send_probe_request(agent, prompt, test_name)
            
            all_results.append({
                "agent": agent,
                "test_name": test_name,
                "response": response,
                "latency_sec": latency,
                "prompt": prompt
            })

    logging.info("\n--- Systematic Test Complete. Generating Reports ---")
    
    # 3. Create and save the full DataFrame
    df = pd.DataFrame(all_results)
    
    try:
        df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8')
        logging.info(f"Successfully saved full, untruncated results to '{OUTPUT_CSV}'")
    except Exception as e:
        logging.error(f"Failed to save CSV file: {e}")

    # 4. Print results to terminal (untruncated)
    pd.set_option('display.max_rows', None)
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', None)
    pd.set_option('display.max_colwidth', 200) # Truncate for terminal, full results are in the CSV

    print("\n\n" + "="*80)
    print("📊 SYSTEMATIC JAILBREAK TEST RESULTS (Sample)")
    print("... (Full results saved to 'exploitation_test_full_results.csv') ...")
    print("="*80)
    print(df.head(20)) # Print a sample
    
if __name__ == "__main__":
    run_systematic_test()