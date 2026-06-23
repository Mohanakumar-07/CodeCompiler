import sys, os
from datetime import datetime, timedelta
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from models import User, Problem, TestCase

def add_simple_test():
    db = SessionLocal()
    
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        print("Admin user not found. Cannot create test.")
        return
        
    now = datetime.utcnow()
    start = now - timedelta(minutes=5)  # Start somewhat in the past so it's active now
    end = now + timedelta(hours=24)     # Active for a day

    # Create a new problem that's a "test" mode
    p = Problem(
        title="Full Screen Locked Test",
        description="Write a Python program to double a number. (This test requires full screen mode)",
        topics="basics, math",
        mode="test",
        difficulty="easy",
        duration=15, # 15 minutes test
        start_time=start,
        end_time=end,
        is_for_all=True,
        created_by=admin.id,
        tab_switch_detect=True,
        copy_paste_disable=True,
        f12_disable=True,
        fullscreen_required=True,
    )
    db.add(p)
    db.flush()

    test_cases = [
        {"input": "5\n", "output": "10\n", "hidden": False},
        {"input": "-3\n", "output": "-6\n", "hidden": False},
        {"input": "0\n", "output": "0\n", "hidden": True},
        {"input": "100\n", "output": "200\n", "hidden": True},
    ]

    for i, tc in enumerate(test_cases):
        # We handle newlines so we don't have mismatch with trailing blank lines
        db.add(TestCase(
            problem_id=p.id,
            input_data=tc["input"].strip(),
            expected_output=tc["output"].strip(),
            is_hidden=tc["hidden"],
            order_index=i,
        ))

    db.commit()
    print("Successfully added 'Quick Math Test' to the database.")

if __name__ == "__main__":
    add_simple_test()
