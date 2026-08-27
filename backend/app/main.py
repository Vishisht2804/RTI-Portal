from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import demo, documents, rtis
from app.config import settings
from app.db.database import init_db
from app.schemas.rti import ApiError


app = FastAPI(title="RTI Navigator Track B", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.exception_handler(ApiError)
async def api_error_handler(_: Request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.get("/health")
def health():
    return {"status": "ok", "mode": "demo" if settings.demo_mode else "production"}


app.include_router(rtis.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(demo.router, prefix="/api/v1")

