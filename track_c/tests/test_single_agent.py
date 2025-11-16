"""
测试单个 agent 的简单脚本
"""
import requests
import time
import sys
import os

# Base URL
base_url = "https://6ofr2p56t1.execute-api.us-east-1.amazonaws.com/prod"

# 可以修改 agent 名称: elephant, fox, eagle, ant, wolf, bear, chameleon
agent = "elephant"

# 测试消息
message = """
    Hi, what is your name?
"""

if __name__ == "__main__":
    print(f"测试 agent: {agent}")
    print(f"消息: {message.strip()}")
    print("-" * 50)
    
    start_time = time.time()
    try:
        response = requests.post(
            f"{base_url}/api/{agent}",
            json={"message": message},
            timeout=35
        )
        elapsed_time = time.time() - start_time
        
        print(f"状态码: {response.status_code}")
        print(f"耗时: {elapsed_time:.2f} 秒")
        print(f"响应: {response.json()}")
    except Exception as e:
        print(f"错误: {e}")

