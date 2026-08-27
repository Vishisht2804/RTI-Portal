# RTI Navigator Track B

This repository implements the Track B vertical slice from Ready-to-File handoff onward:

Ready-to-File fixture -> applicant details -> demo OTP -> documents -> mock payment -> review -> simulated submission -> registration number -> dashboard -> status timeline -> next action.

The provided architecture and execution documents remain source references. The code labels all non-real operations as simulated and never claims to file with a real government system.

## Run Backend

```powershell
cd C:\Users\guruv\Desktop\hack\backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:DATABASE_URL = "sqlite+pysqlite:///./local-demo.db"
.\.venv\Scripts\uvicorn app.main:app --reload
```

For PostgreSQL, use `docker compose up` from the repository root.

## Run Frontend

```powershell
cd C:\Users\guruv\Desktop\hack\frontend
npm install
npm run dev
```

Open `http://localhost:5173/fixture`.

## Test

```powershell
cd C:\Users\guruv\Desktop\hack\backend
pytest
```

