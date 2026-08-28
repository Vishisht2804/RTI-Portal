import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db.database import init_db
from app.schemas.rti import ApiError

# Track A — AI-guided intake
from app.api.routes import authority, draft, intent
# Track B — filing lifecycle
from app.api.routes import demo, documents, rtis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("RTI Navigator starting up...")
    try:
        init_db()
        logger.info("Database initialised and seeded")
    except Exception as e:  # keep the demo alive even if the DB is unreachable
        logger.error(f"DB init error: {e}")
    yield
    logger.info("RTI Navigator shutting down")


app = FastAPI(
    title="RTI Navigator API",
    description="AI-guided RTI intake (Track A) + filing lifecycle (Track B).",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ApiError)
async def api_error_handler(_: Request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


# --- Track A routes ---
app.include_router(intent.router, prefix="/api/v1/intent", tags=["Intent"])
app.include_router(authority.router, prefix="/api/v1/authorities", tags=["Authority"])
app.include_router(draft.router, prefix="/api/v1/drafts", tags=["Draft"])

# --- Track B routes ---
app.include_router(rtis.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(demo.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "mode": "demo" if settings.demo_mode else "production"}


@app.get("/")
def root():
    return {"service": "RTI Navigator API", "docs": "/docs", "health": "/health"}
