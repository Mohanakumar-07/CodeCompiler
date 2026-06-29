"""
Multi-language code runner — executes student code in a temporary sandbox.

Supports Python, C, C++ and Java by shelling out to the system toolchains
(``python3`` / ``gcc`` / ``g++`` / ``javac``+``java``). The SAME code path runs
locally and on Render — the Dockerfile installs all four toolchains.

Sandboxing:
  • POSIX (Linux/Render): ``resource`` rlimits (address space, CPU, file size,
    nproc) applied in a preexec_fn, plus a wall-clock SIGKILL timer.
  • Windows / fallback: wall-clock timeout only.

Public API (kept stable for the rest of the app):
  _normalize(text)
  _limit_preexec()
  compile_code(code, language, tmpdir, force_unbuffered=False) -> (run_argv, error)
  run_once(run_argv, input_data, time_limit) -> {status, output, time_ms, mem_kb}
  judge_submission(code, language, test_cases, time_limit) -> verdict dict
  memcheck(code, language, input_data, time_limit) -> code-check dict
  detect_runtimes() -> {lang: {available, label, version}}
"""
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    import resource  # POSIX only
except ImportError:
    resource = None

PYTHON = sys.executable or "python3"

# Hard ceilings per process.
_MEM_BYTES = 768 * 1024 * 1024
_CPU_SECS = 8
_FSIZE_BYTES = 16 * 1024 * 1024
_NPROC = 128
_MAX_OUTPUT = 64 * 1024
_COMPILE_TIMEOUT = 25.0

# On Windows a compiled binary needs the .exe suffix.
_EXE = "sol.exe" if os.name == "nt" else "sol"

DEFAULT_LANGUAGES = ("python", "c", "cpp", "java")

# Per-language configuration. {src}/{exe}/{dir} are substituted at runtime.
LANGS = {
    "python": {
        "label": "Python 3", "source": "solution.py", "monaco": "python",
        "compile": None,
        "run": ["{python}", "-u", "{src}"],
        "probe": ["{python}", "--version"],
    },
    "c": {
        "label": "C (gcc)", "source": "solution.c", "monaco": "c",
        "compile": ["gcc", "{src}", "-O2", "-o", "{exe}", "-lm"],
        "run": ["{exe}"],
        "probe": ["gcc", "--version"],
    },
    "cpp": {
        "label": "C++ (g++)", "source": "solution.cpp", "monaco": "cpp",
        "compile": ["g++", "{src}", "-O2", "-std=c++17", "-o", "{exe}"],
        "run": ["{exe}"],
        "probe": ["g++", "--version"],
    },
    "java": {
        # Student code MUST declare `public class Main` (standard judge convention).
        "label": "Java", "source": "Main.java", "monaco": "java",
        "compile": ["javac", "{src}"],
        "run": ["java", "-cp", "{dir}", "Main"],
        "probe": ["javac", "-version"],
    },
}


def _subst(args, *, src="", exe="", tmpdir=""):
    out = []
    for a in args:
        out.append(
            a.replace("{python}", PYTHON).replace("{src}", src)
             .replace("{exe}", exe).replace("{dir}", tmpdir)
        )
    return out


def _limit_preexec():
    """Return a preexec_fn applying rlimits, or None on Windows."""
    if resource is None:
        return None

    def _apply():
        for res, val in (
            (resource.RLIMIT_AS, _MEM_BYTES),
            (resource.RLIMIT_CPU, _CPU_SECS),
            (resource.RLIMIT_FSIZE, _FSIZE_BYTES),
            (getattr(resource, "RLIMIT_NPROC", None), _NPROC),
        ):
            if res is None:
                continue
            try:
                resource.setrlimit(res, (val, val))
            except Exception:
                pass

    return _apply


def _normalize(output: str) -> str:
    """Strip trailing whitespace from each line and trim the whole block."""
    return "\n".join(line.rstrip() for line in (output or "").strip().splitlines())


def normalize_language(language: Optional[str]) -> str:
    lang = (language or "python").lower()
    aliases = {"c++": "cpp", "cxx": "cpp", "py": "python", "python3": "python"}
    lang = aliases.get(lang, lang)
    return lang if lang in LANGS else "python"


# ──────────────────────────── Compile ──────────────────────────────────────

def _friendly_py_syntax(exc: SyntaxError) -> str:
    line = exc.lineno or 0
    msg = exc.msg or "invalid syntax"
    text = (exc.text or "").rstrip("\n")
    caret = ""
    if text:
        stripped = text.strip()
        caret = "\n    " + stripped
        if exc.offset:
            indent = len(text) - len(text.lstrip())
            caret += "\n    " + " " * max(0, (exc.offset - 1) - indent) + "^"
    kind = type(exc).__name__
    return f"{kind}: {msg} (line {line}){caret}"


def compile_code(code: str, language: str, tmpdir: str,
                 force_unbuffered: bool = False) -> Tuple[Optional[List[str]], str]:
    """
    Write source to tmpdir and compile if the language needs it.

    Returns (run_argv, error). On a compile/syntax error, run_argv is None and
    error holds a friendly message. ``force_unbuffered`` is accepted for API
    parity with the old runner (Python always runs with -u).
    """
    language = normalize_language(language)
    cfg = LANGS[language]
    src = os.path.join(tmpdir, cfg["source"])
    with open(src, "w", encoding="utf-8") as f:
        f.write(code or "")

    exe = os.path.join(tmpdir, _EXE)
    run_argv = _subst(cfg["run"], src=src, exe=exe, tmpdir=tmpdir)

    if language == "python":
        try:
            compile(code or "", cfg["source"], "exec")
        except SyntaxError as e:
            logger.info(f"Syntax error in submission: {e}")
            return None, _friendly_py_syntax(e)
        except Exception as e:  # noqa: BLE001
            return None, f"{type(e).__name__}: {e}"
        return run_argv, ""

    compile_argv = _subst(cfg["compile"], src=src, exe=exe, tmpdir=tmpdir)
    try:
        proc = subprocess.run(compile_argv, capture_output=True, text=True,
                              timeout=_COMPILE_TIMEOUT, cwd=tmpdir)
    except FileNotFoundError:
        return None, (f"Compiler for {cfg['label']} is not installed on this server "
                      f"(missing: {compile_argv[0]}).")
    except subprocess.TimeoutExpired:
        return None, "Compilation timed out."

    if proc.returncode != 0:
        msg = (proc.stderr or proc.stdout or "Compilation failed").strip()
        msg = msg.replace(tmpdir + os.sep, "").replace(tmpdir, "")
        return None, msg[:4000]
    return run_argv, ""


# ──────────────────────────── Run one ──────────────────────────────────────

def run_once(run_argv, input_data: str = "", time_limit: float = 5.0) -> Dict:
    input_data = input_data or ""
    """Run a prepared command (argv list) with stdin. Returns {status, output, time_ms, mem_kb}.

    For backwards-compatibility, if ``run_argv`` is a string it is treated as a
    path to a Python script (legacy callers)."""
    if isinstance(run_argv, str):
        run_argv = [PYTHON, "-u", run_argv]
    if os.name == "posix":
        return _run_posix(run_argv, input_data, time_limit)
    return _run_simple(run_argv, input_data, time_limit)


def _run_simple(run_argv, input_data, time_limit):
    start = time.monotonic()
    try:
        proc = subprocess.run(run_argv, input=input_data, capture_output=True,
                              text=True, timeout=time_limit)
    except subprocess.TimeoutExpired:
        return {"status": "Time Limit Exceeded", "output": "", "time_ms": time_limit * 1000, "mem_kb": None}
    except FileNotFoundError:
        return {"status": "Runtime Error", "output": "Runtime not found on server.", "time_ms": 0, "mem_kb": None}
    elapsed = (time.monotonic() - start) * 1000
    if proc.returncode != 0:
        return {"status": "Runtime Error", "output": (proc.stderr or "")[:_MAX_OUTPUT], "time_ms": elapsed, "mem_kb": None}
    return {"status": "ok", "output": _normalize(proc.stdout)[:_MAX_OUTPUT], "time_ms": elapsed, "mem_kb": None}


def _run_posix(run_argv, input_data, time_limit):
    proc = subprocess.Popen(
        run_argv, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        preexec_fn=_limit_preexec(), start_new_session=True,
    )
    out_chunks, err_chunks = [], []

    def reader(stream, sink):
        try:
            for chunk in iter(lambda: stream.read(65536), b""):
                sink.append(chunk)
        except Exception:
            pass

    t_out = threading.Thread(target=reader, args=(proc.stdout, out_chunks), daemon=True)
    t_err = threading.Thread(target=reader, args=(proc.stderr, err_chunks), daemon=True)
    t_out.start()
    t_err.start()

    timed_out = {"v": False}

    def killer():
        timed_out["v"] = True
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass

    timer = threading.Timer(time_limit, killer)
    timer.start()
    try:
        if input_data:
            proc.stdin.write(input_data.encode())
        proc.stdin.close()
    except Exception:
        pass

    start = time.monotonic()
    try:
        _, status, ru = os.wait4(proc.pid, 0)
    except ChildProcessError:
        status, ru = 0, None
    elapsed = (time.monotonic() - start) * 1000
    timer.cancel()
    t_out.join(timeout=1)
    t_err.join(timeout=1)

    out = b"".join(out_chunks).decode("utf-8", "replace")
    err = b"".join(err_chunks).decode("utf-8", "replace")
    mem_kb = int(ru.ru_maxrss) if ru else None

    if timed_out["v"]:
        return {"status": "Time Limit Exceeded", "output": "", "time_ms": time_limit * 1000, "mem_kb": mem_kb}
    if not (os.WIFEXITED(status) and os.WEXITSTATUS(status) == 0):
        logger.info(f"Runtime error: {err[:200]}")
        return {"status": "Runtime Error", "output": err[:_MAX_OUTPUT], "time_ms": elapsed, "mem_kb": mem_kb}
    return {"status": "ok", "output": _normalize(out)[:_MAX_OUTPUT], "time_ms": elapsed, "mem_kb": mem_kb}


# ──────────────────────────── Judge ────────────────────────────────────────

def judge_submission(code: str, language: str, test_cases: List[Dict], time_limit: float = 5.0) -> Dict:
    """Compile once, run all test cases, compare normalized stdout, return verdict."""
    language = normalize_language(language)
    with tempfile.TemporaryDirectory() as tmpdir:
        run_argv, compile_error = compile_code(code, language, tmpdir)
        if run_argv is None:
            return {
                "status": "Compilation Error", "error": compile_error, "results": [],
                "passed": 0, "total": len(test_cases), "score": 0.0, "execution_time": 0.0,
            }

        results, passed, max_time = [], 0, 0.0
        for tc in test_cases:
            run = run_once(run_argv, tc.get("input_data") or "", time_limit)
            expected = _normalize(tc.get("expected_output") or "")
            actual = run["output"]
            tc_status = run["status"]
            if tc_status == "ok":
                tc_status = "Passed" if actual == expected else "Failed"
                if tc_status == "Passed":
                    passed += 1
            max_time = max(max_time, run["time_ms"])
            results.append({
                "test_case_id": tc.get("id"), "status": tc_status,
                "actual_output": actual, "execution_time": run["time_ms"],
                "is_hidden": tc.get("is_hidden", False),
            })

        total = len(test_cases)
        score = round((passed / total) * 100, 2) if total else 0.0
        statuses = {r["status"] for r in results}
        if total and passed == total:
            overall = "Accepted"
        elif "Time Limit Exceeded" in statuses:
            overall = "Time Limit Exceeded"
        elif "Runtime Error" in statuses:
            overall = "Runtime Error"
        else:
            overall = "Wrong Answer"

        return {
            "status": overall, "error": "", "results": results,
            "passed": passed, "total": total, "score": score, "execution_time": max_time,
        }


# ──────────────────────── Code check (static / build) ──────────────────────

_FLAKE_HELP = [
    (re.compile(r"undefined name '([^']+)'"),
     lambda m: f"You used '{m.group(1)}' before defining it (or misspelled it). Define it first."),
    (re.compile(r"local variable '([^']+)' .*assigned to but never used"),
     lambda m: f"You created '{m.group(1)}' but never used it — dead code, or a typo where you use it."),
    (re.compile(r"'([^']+)' imported but unused"),
     lambda m: f"You imported '{m.group(1)}' but never used it. Remove the import or use it."),
    (re.compile(r"f-string is missing placeholders"),
     lambda m: "This f-string has no {…} placeholders — did you forget the braces?"),
    (re.compile(r"local variable '([^']+)' referenced before assignment"),
     lambda m: f"You read '{m.group(1)}' before giving it a value on that path."),
]


def _help_for(msg: str) -> str:
    for pat, fn in _FLAKE_HELP:
        m = pat.search(msg)
        if m:
            return fn(m)
    return msg


def _parse_pyflakes(text: str) -> List[Dict]:
    findings = []
    for raw in (text or "").splitlines():
        m = re.match(r"^.*?:(\d+)(?::\d+)?:\s*(.+)$", raw.strip())
        if not m:
            continue
        findings.append({"type": "lint", "line": int(m.group(1)),
                         "title": m.group(2).strip(), "help": _help_for(m.group(2).strip())})
    seen, out = set(), []
    for f in findings:
        key = (f["line"], f["title"])
        if key not in seen:
            seen.add(key)
            out.append(f)
    return out


def memcheck(code: str, language: str, input_data: str = "", time_limit: float = 8.0) -> Dict:
    """
    "Code Check": for Python, run pyflakes (undefined names, unused vars, …) plus
    a normal run. For compiled languages, compile with warnings (-Wall) and treat
    any compiler warnings as findings, then run once. Returns
    {status, clean, output, report, findings}.
    """
    language = normalize_language(language)
    with tempfile.TemporaryDirectory() as tmpdir:
        if language == "python":
            return _memcheck_python(code, input_data, tmpdir, time_limit)
        return _memcheck_compiled(code, language, input_data, tmpdir, time_limit)


def _memcheck_python(code, input_data, tmpdir, time_limit) -> Dict:
    script = os.path.join(tmpdir, "solution.py")
    with open(script, "w", encoding="utf-8") as f:
        f.write(code or "")
    try:
        compile(code or "", "solution.py", "exec")
    except SyntaxError as e:
        return {"status": "Compilation Error", "clean": False, "output": "", "findings": [],
                "report": _friendly_py_syntax(e)}

    findings, report, note = [], "", None
    try:
        pf = subprocess.run([PYTHON, "-m", "pyflakes", script], capture_output=True, text=True, timeout=20)
        combined = (pf.stdout or "") + (pf.stderr or "")
        if "No module named pyflakes" in combined:
            note = "Install pyflakes on the server for static code checks."
        else:
            report = combined
            findings = _parse_pyflakes(pf.stdout)
    except FileNotFoundError:
        note = "Python interpreter not found on the server."
    except subprocess.TimeoutExpired:
        note = "Static analysis timed out."

    run = run_once([PYTHON, "-u", script], input_data or "", time_limit)
    out = run.get("output", "")
    if run.get("status") == "Runtime Error":
        tb = out.strip().splitlines()
        findings.append({"type": "runtime", "line": None, "title": tb[-1] if tb else "Runtime error",
                         "help": "Your program crashed at runtime. Read the traceback for the exact line."})
        out = ""
    result = {"status": "ok", "clean": not findings, "output": _normalize(out)[:_MAX_OUTPUT],
              "report": report[:8000], "findings": findings}
    if note:
        result["note"] = note
    return result


def _memcheck_compiled(code, language, input_data, tmpdir, time_limit) -> Dict:
    """Compile with extra warnings; surface warnings as findings; then run once."""
    cfg = LANGS[language]
    src = os.path.join(tmpdir, cfg["source"])
    with open(src, "w", encoding="utf-8") as f:
        f.write(code or "")
    exe = os.path.join(tmpdir, _EXE)

    compile_argv = _subst(cfg["compile"], src=src, exe=exe, tmpdir=tmpdir)
    if language in ("c", "cpp"):
        compile_argv = compile_argv[:1] + ["-Wall", "-Wextra"] + compile_argv[1:]
    try:
        proc = subprocess.run(compile_argv, capture_output=True, text=True, timeout=_COMPILE_TIMEOUT, cwd=tmpdir)
    except FileNotFoundError:
        return {"status": "ok", "clean": True, "output": "", "report": "", "findings": [],
                "note": f"Compiler for {cfg['label']} is not installed on this server."}
    except subprocess.TimeoutExpired:
        return {"status": "Compilation Error", "clean": False, "output": "", "findings": [],
                "report": "Compilation timed out."}

    stderr = (proc.stderr or "").replace(tmpdir + os.sep, "").replace(tmpdir, "")
    if proc.returncode != 0:
        return {"status": "Compilation Error", "clean": False, "output": "", "findings": [],
                "report": stderr[:8000]}

    findings = []
    for raw in stderr.splitlines():
        m = re.search(r":(\d+):\d+:\s*warning:\s*(.+)$", raw)
        if m:
            findings.append({"type": "lint", "line": int(m.group(1)), "title": m.group(2).strip(),
                             "help": "Compiler warning — review this line."})

    run = run_once([exe], input_data or "", time_limit)
    out = run.get("output", "")
    if run.get("status") == "Runtime Error":
        findings.append({"type": "runtime", "line": None, "title": (out.strip().splitlines() or ["Runtime error"])[-1],
                         "help": "Your program crashed at runtime."})
        out = ""
    return {"status": "ok", "clean": not findings, "output": _normalize(out)[:_MAX_OUTPUT],
            "report": stderr[:8000], "findings": findings}


# ──────────────────────── Runtime detection ────────────────────────────────

def detect_runtimes() -> Dict:
    out = {}
    for lang, cfg in LANGS.items():
        probe = _subst(cfg["probe"])
        binary = probe[0]
        available, version = False, ""
        if os.path.isabs(binary) or shutil.which(binary):
            try:
                r = subprocess.run(probe, capture_output=True, text=True, timeout=8)
                blob = (r.stdout or r.stderr or "")
                version = blob.strip().splitlines()[0] if blob.strip() else ""
                available = True
            except Exception:
                available = False
        out[lang] = {"available": available, "label": cfg["label"], "version": version}
    return out
