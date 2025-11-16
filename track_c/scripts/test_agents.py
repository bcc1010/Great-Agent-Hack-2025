"""
测试所有 agents 与数据集的脚本
"""
import pandas as pd
import requests
import time
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Base URL
base_url = "https://6ofr2p56t1.execute-api.us-east-1.amazonaws.com/prod"

# 数据文件路径
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")


def _send_request(row, base_url, agent, dataset_name):
    """发送单个 POST 请求并捕获时间和响应
    
    Returns:
        list: [question, time_taken, response_text, status_code, agent, dataset]
    """
    # 支持不同的列名（question 或 prompt）
    if 'question' in row.index:
        question = row['question']
    elif 'prompt' in row.index:
        question = row['prompt']
    else:
        question = ''
    
    start_time = time.time()
    try:
        response = requests.post(
            f"{base_url}/api/{agent}",
            json={"message": question},
            timeout=35,
        )
        time_taken = time.time() - start_time
        # Guard against non-JSON or missing key
        try:
            response_text = response.json().get("response", "")
        except ValueError:
            response_text = response.text
        status_code = response.status_code
    except Exception as exc:
        time_taken = time.time() - start_time
        response_text = f"ERROR: {exc}"
        status_code = -1

    return [question, time_taken, response_text, status_code, agent, dataset_name]


def test_agent_with_dataset(agent, dataset, dataset_name, base_url, max_workers=50):
    """测试单个 agent 与单个数据集，返回结果 DataFrame"""
    tmp_df = []
    
    # Use ThreadPoolExecutor to send requests in parallel
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks first
        futures = [
            executor.submit(_send_request, row, base_url, agent, dataset_name)
            for _, row in dataset.iterrows()
        ]

        # Collect results as they complete, while showing progress
        for future in tqdm(
            as_completed(futures), 
            total=len(futures), 
            desc=f"{agent} - {dataset_name}",
            leave=False
        ):
            result_row = future.result()
            tmp_df.append(result_row)

    save_df = pd.DataFrame(
        tmp_df, 
        columns=["question", "time_taken", "response", "status_code", "agent", "dataset"]
    )
    return save_df


def main():
    # 加载测试用例
    benign_df = pd.read_csv(os.path.join(DATA_DIR, 'benign_test_cases.csv'))
    harmful_df = pd.read_csv(os.path.join(DATA_DIR, 'harmful_test_cases.csv'))
    jailbreak_df = pd.read_csv(os.path.join(DATA_DIR, 'jailbreak_prompts.csv'))
    
    agents = ["elephant", "fox", "eagle", "ant", "wolf", "bear", "chameleon"]
    
    # 定义所有要测试的数据集
    datasets = {
        "benign": benign_df,
        "harmful": harmful_df,
        "jailbreak": jailbreak_df
    }
    
    # 用于收集所有结果
    all_results = []
    
    # 计算总任务数用于总体进度显示
    total_tasks = len(agents) * len(datasets)
    current_task = 0
    
    # 遍历所有 agent 和数据集组合
    for agent in tqdm(agents, desc="总体进度", position=0):
        for dataset_name, dataset in datasets.items():
            current_task += 1
            print(f"\n[{current_task}/{total_tasks}] 开始测试: {agent} - {dataset_name}")
            
            # 测试当前组合
            result_df = test_agent_with_dataset(agent, dataset, dataset_name, base_url)
            
            # 将结果添加到总结果列表
            all_results.append(result_df)
            print(f"✓ {agent} - {dataset_name} 测试完成")
    
    # 合并所有结果并保存到一个文件
    print("\n正在合并所有结果...")
    final_df = pd.concat(all_results, ignore_index=True)
    output_filename = os.path.join(DATA_DIR, "all_results.csv")
    final_df.to_csv(output_filename, index=False)
    print(f"✓ 所有结果已保存到: {output_filename}")
    print(f"  总计 {len(final_df)} 条记录")
    print("\n所有测试完成！")


if __name__ == "__main__":
    main()

