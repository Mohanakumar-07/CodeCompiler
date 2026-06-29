"""
Adds the 5 new problems to the database as test problems.
If a problem already exists, it is deleted and recreated to ensure all test cases are updated.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal
from models import User, Problem, TestCase
import datetime

def populate_problems():
    db = SessionLocal()
    
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        print("Admin user not found. Cannot populate problems.")
        sys.exit(1)
        
    now = datetime.datetime.utcnow()
    start = now - datetime.timedelta(minutes=5)
    end = now + datetime.timedelta(days=365)  # Active for a year
    
    problems_data = [
        {
            "title": "Unique Character Replacement",
            "description": (
                "You are given a string **S** consisting of lowercase English letters.\n\n"
                "In one operation, you may replace any character with any other lowercase English letter.\n\n"
                "Determine the **minimum number of replacements** required so that **every character in the string is unique**.\n\n"
                "If the string already contains only unique characters, print `0`.\n\n"
                "### Input Format\n"
                "A single string **S**.\n\n"
                "### Output Format\n"
                "Print a single integer representing the minimum number of replacements required.\n\n"
                "### Constraints\n"
                "* 1 ≤ |S| ≤ 10^5\n"
                "* S contains only lowercase English letters\n\n"
                "### Examples\n"
                "**Input**\n"
                "```text\n"
                "abca\n"
                "```\n"
                "**Output**\n"
                "```text\n"
                "1\n"
                "```"
            ),
            "topics": "strings, greedy, hash map",
            "difficulty": "easy",
            "test_cases": [
                {"input": "abca", "output": "1", "hidden": False},
                {"input": "aaaa", "output": "3", "hidden": False},
                {"input": "a", "output": "0", "hidden": True},
                {"input": "abcdef", "output": "0", "hidden": True},
                {"input": "aabbccddeeff", "output": "6", "hidden": True},
                {"input": "aaaaaaaaaa", "output": "9", "hidden": True},
            ]
        },
        {
            "title": "First Non-Repeating Character",
            "description": (
                "Given a string **S**, print the **first character** that appears exactly once.\n\n"
                "If no such character exists, print **-1**.\n\n"
                "### Input Format\n"
                "A single string **S**.\n\n"
                "### Output Format\n"
                "Print the first non-repeating character or `-1`.\n\n"
                "### Constraints\n"
                "* 1 ≤ |S| ≤ 10^5\n\n"
                "### Examples\n"
                "**Input**\n"
                "```text\n"
                "leetcode\n"
                "```\n"
                "**Output**\n"
                "```text\n"
                "l\n"
                "```"
            ),
            "topics": "strings, hash map",
            "difficulty": "easy",
            "test_cases": [
                {"input": "leetcode", "output": "l", "hidden": False},
                {"input": "aabbcc", "output": "-1", "hidden": False},
                {"input": "z", "output": "z", "hidden": True},
                {"input": "aabbccd", "output": "d", "hidden": True},
                {"input": "zzxxyyww", "output": "-1", "hidden": True},
                {"input": "abbccddeeff", "output": "a", "hidden": True},
            ]
        },
        {
            "title": "Longest Equal Prefix and Suffix",
            "description": (
                "Given a string **S**, find the length of the **longest prefix** that is also a **suffix**.\n\n"
                "The prefix must **not** be equal to the entire string.\n\n"
                "### Input Format\n"
                "A single string **S**.\n\n"
                "### Output Format\n"
                "Print the required length.\n\n"
                "### Constraints\n"
                "* 1 ≤ |S| ≤ 10^5\n\n"
                "### Examples\n"
                "**Input**\n"
                "```text\n"
                "abab\n"
                "```\n"
                "**Output**\n"
                "```text\n"
                "2\n"
                "```"
            ),
            "topics": "strings, string matching, kmp",
            "difficulty": "medium",
            "test_cases": [
                {"input": "abab", "output": "2", "hidden": False},
                {"input": "abcde", "output": "0", "hidden": False},
                {"input": "a", "output": "0", "hidden": True},
                {"input": "aaaaaa", "output": "5", "hidden": True},
                {"input": "abcab", "output": "2", "hidden": True},
                {"input": "xyzxyz", "output": "3", "hidden": True},
            ]
        },
        {
            "title": "Smallest Missing Positive",
            "description": (
                "Given an unsorted integer array, find the **smallest positive integer** that does not appear in the array.\n\n"
                "### Input Format\n"
                "First line contains **n**.\n"
                "Second line contains **n** space-separated integers.\n\n"
                "### Output Format\n"
                "Print the smallest missing positive integer.\n\n"
                "### Constraints\n"
                "* 1 ≤ n ≤ 10^5\n"
                "* -10^9 ≤ ai ≤ 10^9\n\n"
                "### Examples\n"
                "**Input**\n"
                "```text\n"
                "5\n"
                "1 2 0 4 5\n"
                "```\n"
                "**Output**\n"
                "```text\n"
                "3\n"
                "```"
            ),
            "topics": "arrays, hash set, cyclic sort",
            "difficulty": "hard",
            "test_cases": [
                {"input": "5\n1 2 0 4 5", "output": "3", "hidden": False},
                {"input": "4\n3 4 -1 1", "output": "2", "hidden": False},
                {"input": "5\n-5 -4 -3 -2 -1", "output": "1", "hidden": True},
                {"input": "5\n1 2 3 4 5", "output": "6", "hidden": True},
                {"input": "6\n1 1 2 2 3 3", "output": "4", "hidden": True},
                {"input": "5\n0 0 0 0 0", "output": "1", "hidden": True},
            ]
        },
        {
            "title": "Longest Alternating Subarray",
            "description": (
                "A subarray is called **alternating** if every pair of adjacent elements has different parity.\n\n"
                "Find the length of the **longest contiguous alternating subarray**.\n\n"
                "Parity:\n"
                "* Even → divisible by 2\n"
                "* Odd → not divisible by 2\n\n"
                "### Input Format\n"
                "First line contains **n**.\n"
                "Second line contains **n** integers.\n\n"
                "### Output Format\n"
                "Print the maximum length.\n\n"
                "### Constraints\n"
                "* 1 ≤ n ≤ 10^5\n\n"
                "### Examples\n"
                "**Input**\n"
                "```text\n"
                "6\n"
                "1 2 3 4 5 6\n"
                "```\n"
                "**Output**\n"
                "```text\n"
                "6\n"
                "```"
            ),
            "topics": "arrays, dynamic programming, sliding window",
            "difficulty": "medium",
            "test_cases": [
                {"input": "6\n1 2 3 4 5 6", "output": "6", "hidden": False},
                {"input": "7\n2 4 6 1 3 5 8", "output": "2", "hidden": False},
                {"input": "1\n9", "output": "1", "hidden": True},
                {"input": "6\n2 4 6 8 10 12", "output": "1", "hidden": True},
                {"input": "5\n1 3 5 7 9", "output": "1", "hidden": True},
                {"input": "10\n2 1 4 3 6 5 8 7 10 9", "output": "10", "hidden": True},
            ]
        }
    ]
    
    print("Populating database...")
    for p_data in problems_data:
        # Check if problem already exists and delete it (recreates with fresh inputs)
        existing = db.query(Problem).filter(Problem.title == p_data["title"]).first()
        if existing:
            print(f"  [x] Deleting existing problem: {p_data['title']}")
            db.delete(existing)
            db.flush()
            
        p = Problem(
            title=p_data["title"],
            description=p_data["description"],
            topics=p_data["topics"],
            mode="test",  # Set mode="test" as requested, so the admin can add them to tests later.
            difficulty=p_data["difficulty"],
            duration=60,  # default to 60 mins
            start_time=start,
            end_time=end,
            is_for_all=True,
            is_active=True,
            created_by=admin.id,
            tab_switch_detect=True,
            copy_paste_disable=True,
            f12_disable=True,
            fullscreen_required=False,
            window_switch_detect=False,
            block_paste=False,
        )
        db.add(p)
        db.flush()
        
        for i, tc in enumerate(p_data["test_cases"]):
            db.add(TestCase(
                problem_id=p.id,
                input_data=tc["input"],
                expected_output=tc["output"],
                is_hidden=tc["hidden"],
                order_index=i
            ))
        print(f"  [+] Added: {p_data['title']} ({len(p_data['test_cases'])} test cases)")
        
    db.commit()
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    populate_problems()
