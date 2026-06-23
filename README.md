# CodeForge — Multi-Language Coding **Test** Platform

A proctored coding-**test** platform built on the CodeForge UI. Admins create tests
(problems + visible/hidden test cases, duration, proctoring); students take them in
the in-browser editor and **choose their language: Python, Java, C++, or C**.
Submissions are **compiled and judged automatically**, with detailed analytics,
weak-area mapping, and exportable reports.

> This is the CodeForge platform trimmed to **test mode only** and extended for
> **multiple languages**. Lessons, notes, classroom and practice mode were removed.

## Stack

- **Backend** — FastAPI + SQLAlchemy + JWT. Student code is compiled/run by shelling
  out to the system toolchains (`python3` / `gcc` / `g++` / `javac`+`java`), sandboxed
  with POSIX resource limits (Linux/Render) and wall-clock timeouts. See
  [`code_runner.py`](backend/code_runner.py).
- **Frontend** — React + Vite + Tailwind + Monaco editor + Recharts.
- **Database** — local **SQLite** by default; **TiDB-ready** — set `DATABASE_URL` to a
  `mysql+pymysql://…` URL and the same code runs unchanged.

## How multi-language judging works

| Language | Source file | Compile | Run |
|---|---|---|---|
| Python | `solution.py` | syntax check (`compile()`) | `python3 -u solution.py` |
| C | `solution.c` | `gcc -O2 -lm` | `./sol` |
| C++ | `solution.cpp` | `g++ -O2 -std=c++17` | `./sol` |
| Java | `Main.java` (must be `public class Main`) | `javac` | `java Main` |

The editor's language picker loads a per-language starter template, switches Monaco's
syntax mode, and sends the chosen language to run/judge. The **Code Visualizer** stays
Python-only and auto-hides for other languages; the interactive console and sample
runner work for all four.

## Running locally

### Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install fastapi "uvicorn[standard]" sqlalchemy pymysql `
    "python-jose[cryptography]" bcrypt python-multipart python-dotenv "pydantic[email]" `
    openpyxl pyflakes httpx
copy .env.example .env            # if present; otherwise create .env (see below)
.\.venv\Scripts\python.exe seed.py     # creates SQLite DB + users + a sample test
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Minimal `.env`:
```
DATABASE_URL=sqlite:///./cplatform.db
SECRET_KEY=change-this-secret-key
FRONTEND_URL=http://localhost:5173
```

> **Toolchains:** Python + the C/C++ compilers (`gcc`/`g++`) must be on PATH to run
> those languages; Java needs a JDK. Whatever is missing returns a clear "compiler not
> installed" message. `GET /api/health/runtimes` shows what's detected. To get all four
> with zero installs, run the Docker image (below).

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (proxies /api → :8000)
```

### Default logins
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@123` |
| Student | `student1` | `Student@123` (also student2, student3) |

## All four languages with Docker (no local installs) / Render

The backend `Dockerfile` installs `gcc`, `g++`, and a JDK so the same image runs the
API and compiles every language — locally and on Render.

```bash
cd backend
docker build -t codeforge-api .
docker run -p 8000:8000 codeforge-api
```

On Render: deploy `backend/` as a **Docker** web service (gets `$PORT`); deploy
`frontend/` as a **Static Site** (`npm run build` → `dist/`) with `VITE_API_URL` set to
the backend URL.

### Switching to TiDB later

No code changes — point `DATABASE_URL` at TiDB and run the migration script to copy
the exact SQLite data into TiDB without touching the local database:
```
cd backend
$env:DATABASE_URL="mysql+pymysql://<user>:<pass>@<host>:4000/<db>?ssl_verify_cert=true&ssl_verify_identity=true"
python migrate_sqlite_to_tidb.py --source sqlite:///./test_platform.db --target $env:DATABASE_URL
```
The models are MySQL-safe and TiDB speaks the MySQL protocol. If your app runs on
TiDB after the migration, keep `DATABASE_URL` pointed at TiDB in the deployment
environment; the local SQLite file remains as-is for backup or rollback.

## Notes
- Python 3.14 note: the legacy `passlib` breaks on new `bcrypt`, so auth uses `bcrypt`
  directly ([`auth.py`](backend/auth.py)). On Python ≤3.12 the pinned `requirements.txt`
  installs as-is.
- Java requires the student's public class to be named `Main` (standard judge convention);
  the editor's Java starter template reflects this.
