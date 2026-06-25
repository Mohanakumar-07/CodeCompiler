"""
Adds 4 Python String test problems (medium difficulty) to the database.
Run from the backend/ directory:
    py add_string_tests.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from database import Base, engine, SessionLocal
from models import User, Problem, TestCase, Exam, ExamProblem
import datetime

Base.metadata.create_all(bind=engine)
db = SessionLocal()

admin = db.query(User).filter(User.username == "admin").first()
if not admin:
    print("Admin user not found. Run seed.py first.")
    sys.exit(1)

now = datetime.datetime.utcnow()
start = now - datetime.timedelta(minutes=5)   # active right now
end   = now + datetime.timedelta(days=30)      # open for 30 days

PROBLEMS = [
    {
        "title": "Minimum Window Containing All Characters",
        "description": (
            "Given two strings S and T, find the **smallest substring of S** that contains "
            "all the characters of T (including duplicates). If no such substring exists, print `-1`.\n\n"
            "**Input:**\n"
            "- Line 1: String S\n"
            "- Line 2: String T\n\n"
            "**Output:** The minimum window substring, or `-1`.\n\n"
            "**Constraints:**\n"
            "- 1 ≤ |S|, |T| ≤ 10^5\n"
            "- Strings consist of uppercase and lowercase English letters\n\n"
            "**Examples:**\n"
            "```\n"
            "Input:  ADOBECODEBANC / ABC  →  Output: BANC\n"
            "Input:  a / a              →  Output: a\n"
            "Input:  a / aa             →  Output: -1\n"
            "```"
        ),
        "topics": "strings, sliding window, hash map",
        "difficulty": "medium",
        "test_cases": [
            {"input": "ADOBECODEBANC\nABC",    "output": "BANC",       "hidden": False},
            {"input": "a\na",                  "output": "a",           "hidden": False},
            {"input": "a\naa",                 "output": "-1",          "hidden": False},
            {"input": "thisisateststring\ntist","output": "tstri",      "hidden": True},
            {"input": "ABBACBAA\nAAB",         "output": "BAA",         "hidden": True},
            {"input": "AABZ\nZB",              "output": "AABZ",        "hidden": True},
            {"input": "GEEKSFORGEEKS\nEKS",    "output": "EKS",         "hidden": True},
        ],
    },
    {
        "title": "Longest Palindromic Substring",
        "description": (
            "Given a string, find the **longest substring that is a palindrome**. "
            "If there are multiple longest palindromic substrings of the same length, print any one of them.\n\n"
            "**Input:** A single string S\n\n"
            "**Output:** The longest palindromic substring.\n\n"
            "**Constraints:**\n"
            "- 1 ≤ |S| ≤ 1000\n"
            "- S consists of lowercase/uppercase English letters and digits\n\n"
            "**Examples:**\n"
            "```\n"
            "Input: babad     →  Output: bab  (or aba)\n"
            "Input: cbbd      →  Output: bb\n"
            "Input: racecar   →  Output: racecar\n"
            "```"
        ),
        "topics": "strings, dynamic programming, expand around center",
        "difficulty": "medium",
        "test_cases": [
            {"input": "babad",          "output": "bab",        "hidden": False},
            {"input": "cbbd",           "output": "bb",         "hidden": False},
            {"input": "forgeeksskeegfor","output": "geeksskeeg","hidden": False},
            {"input": "abacdfgdcaba",   "output": "aba",        "hidden": True},
            {"input": "racecarxyz",     "output": "racecar",    "hidden": True},
            {"input": "aacabdkacaa",    "output": "aca",        "hidden": True},
            {"input": "abcba",          "output": "abcba",      "hidden": True},
        ],
    },
    {
        "title": "Find All Anagram Positions",
        "description": (
            "Given strings S and P, find **all start indices** of P's anagrams in S. "
            "An anagram of P is any permutation of P's characters.\n\n"
            "Print the 0-based start indices in **ascending order**, one per line. "
            "If no anagrams exist, print `-1`.\n\n"
            "**Input:**\n"
            "- Line 1: String S\n"
            "- Line 2: String P\n\n"
            "**Output:** Start indices (one per line) or `-1`.\n\n"
            "**Constraints:**\n"
            "- 1 ≤ |S|, |P| ≤ 10^4\n"
            "- Strings consist of lowercase English letters\n\n"
            "**Examples:**\n"
            "```\n"
            "Input: cbaebabacd / abc  →  Output:\n"
            "0\n"
            "6\n\n"
            "Input: af / be           →  Output: -1\n"
            "```\n\n"
            "**Hint:** Use a sliding window of size |P| and compare character frequency maps."
        ),
        "topics": "strings, sliding window, hash map, frequency count",
        "difficulty": "medium",
        "test_cases": [
            {"input": "cbaebabacd\nabc",   "output": "0\n6",       "hidden": False},
            {"input": "abab\nab",          "output": "0\n1\n2",    "hidden": False},
            {"input": "af\nbe",            "output": "-1",          "hidden": False},
            {"input": "abaacbaab\naab",    "output": "1\n3\n6",    "hidden": True},
            {"input": "aaaaaaaaaa\naaa",   "output": "0\n1\n2\n3\n4\n5\n6\n7", "hidden": True},
            {"input": "baa\naa",           "output": "1",           "hidden": True},
            {"input": "xyz\nabc",          "output": "-1",          "hidden": True},
        ],
    },
    {
        "title": "Decode String",
        "description": (
            "Given an encoded string, decode it.\n\n"
            "The encoding rule is: `k[encoded_string]` means the `encoded_string` inside "
            "the brackets is repeated exactly `k` times. You may assume the input is always valid — "
            "no extra white spaces, square brackets are well-formed, etc. "
            "Furthermore, you may assume that the original data does not contain any digits and "
            "that all the digits in the input represent only repetition numbers.\n\n"
            "**Input:** A single encoded string.\n\n"
            "**Output:** The decoded string.\n\n"
            "**Constraints:**\n"
            "- 1 ≤ |s| ≤ 30\n"
            "- s consists of lowercase English letters, digits, and square brackets `[]`\n"
            "- k is guaranteed to be in range [1, 300]\n"
            "- There are no extra white spaces or unmatched brackets\n"
            "- Nesting is allowed: `2[a2[bc]]` → `abcbcabcbc`\n\n"
            "**Examples:**\n"
            "```\n"
            "Input: 3[a]2[bc]    →  Output: aaabcbc\n"
            "Input: 3[a2[c]]     →  Output: accaccacc\n"
            "Input: 2[abc]3[cd]ef→  Output: abcabccdcdcdef\n"
            "```\n\n"
            "**Hint:** Use a stack to handle nested encodings."
        ),
        "topics": "strings, stack, recursion",
        "difficulty": "medium",
        "test_cases": [
            {"input": "3[a]2[bc]",      "output": "aaabcbc",        "hidden": False},
            {"input": "3[a2[c]]",       "output": "accaccacc",      "hidden": False},
            {"input": "2[abc]3[cd]ef",  "output": "abcabccdcdcdef", "hidden": False},
            {"input": "10[a]",          "output": "aaaaaaaaaa",     "hidden": True},
            {"input": "2[a2[b3[c]]]",   "output": "abcccbcccabcccbccc", "hidden": True},
            {"input": "abc",            "output": "abc",            "hidden": True},
            {"input": "4[ab]",          "output": "abababab",       "hidden": True},
        ],
    },
]

print("\n== Adding Python String test problems ==")

added = 0
for p_data in PROBLEMS:
    existing = db.query(Problem).filter(Problem.title == p_data["title"]).first()
    if existing:
        print(f"  [skip] already exists: {p_data['title']}")
        continue

    p = Problem(
        title=p_data["title"],
        description=p_data["description"],
        topics=p_data["topics"],
        mode="test",
        difficulty=p_data["difficulty"],
        duration=90,           # 90-minute test window
        start_time=start,
        end_time=end,
        is_for_all=True,
        created_by=admin.id,
        tab_switch_detect=True,
        copy_paste_disable=True,
        f12_disable=True,
        fullscreen_required=False,
        window_switch_detect=False,
        block_paste=False,
        allowed_languages=["python"],
    )
    db.add(p)
    db.flush()

    for i, tc in enumerate(p_data["test_cases"]):
        db.add(TestCase(
            problem_id=p.id,
            input_data=tc["input"],
            expected_output=tc["output"],
            is_hidden=tc["hidden"],
            order_index=i,
        ))

    print(f"  [+] {p_data['title']}")
    added += 1

# ── Create the Exam ────────────────────────────────────────────────────────
exam_title = "Python String Test"
exam = db.query(Exam).filter(Exam.title == exam_title).first()
if exam:
    print(f"\nExam '{exam_title}' already exists. Re-linking problems...")
else:
    exam = Exam(
        title=exam_title,
        description="Comprehensive evaluation on Python string manipulation: sliding windows, palindromes, frequency maps, and string decoding.",
        duration=90,
        start_time=start,
        end_time=end,
        is_active=True,
        is_for_all=True,
        created_by=admin.id,
        tab_switch_detect=True,
        copy_paste_disable=True,
        f12_disable=True,
        fullscreen_required=False,
        window_switch_detect=False,
        block_paste=False,
    )
    db.add(exam)
    db.flush()
    print(f"\n[+] Created Exam: {exam_title}")

# Re-link the 4 problems to the exam in order
db.query(ExamProblem).filter(ExamProblem.exam_id == exam.id).delete()
# Get the problem IDs
db_probs = db.query(Problem).filter(Problem.title.in_([p["title"] for p in PROBLEMS])).all()
# Map title -> id
prob_map = {p.title: p.id for p in db_probs}
for i, p_data in enumerate(PROBLEMS):
    pid = prob_map.get(p_data["title"])
    if pid:
        db.add(ExamProblem(exam_id=exam.id, problem_id=pid, order_index=i))
        print(f"    -> Linked {p_data['title']} (Q{i+1})")

db.commit()
db.close()
print("\n=> Done! Added", added, "new test problem(s) and exam.")
