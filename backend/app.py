import os
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from .schemas import InferenceRequest

MAX_BODY_BYTES = 4 * 1024 * 1024

def error_response(status: int, code: str, message: str):
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}}, headers={"Cache-Control": "no-store"})

class BodyLimitMiddleware:
    """Bound memory before JSON parsing, including chunked requests."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in {"POST", "PUT", "PATCH"}:
            await self.app(scope, receive, send)
            return
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > MAX_BODY_BYTES:
                await error_response(413, "PAYLOAD_TOO_LARGE", "Batas permintaan adalah 4 MiB.")(scope, receive, send)
                return
            if not message.get("more_body", False):
                break
        delivered = False
        async def replay():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()
        await self.app(scope, replay, send)

app = FastAPI(
    title="SAPA Local Service",
    version="0.3.0",
    description="API contract and validation only. No BISINDO classifier or approved language pack is installed.",
    debug=False,
)
app.add_middleware(BodyLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[value.strip() for value in os.getenv("SAPA_ALLOWED_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173").split(",") if value.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

@app.middleware("http")
async def no_store(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response

@app.exception_handler(RequestValidationError)
async def invalid_input(_request: Request, _error: RequestValidationError):
    # FastAPI's default error includes input values; never echo coordinates or arbitrary fields.
    return error_response(422, "INVALID_INPUT", "Format landmark atau waktu sequence tidak valid.")

@app.get("/api/v1/health")
async def health():
    return {
        "status": "ok", "stage": "3a",
        "model": {"available": False, "version": None, "region": None},
        "capabilities": {"inference": False, "landmarkInputValidation": True},
    }

@app.get("/api/v1/packs/{region_id}/manifest")
async def manifest(region_id: str):
    return error_response(404, "PACK_NOT_AVAILABLE", "Belum ada paket BISINDO yang tervalidasi.")

@app.post("/api/v1/inference/sign")
async def inference(_payload: InferenceRequest):
    # Explicitly unavailable: no random predictions, mock accuracy, or inferred labels.
    return error_response(503, "MODEL_NOT_AVAILABLE", "Model BISINDO belum tersedia. Gunakan frasa, pengetikan, atau bantuan petugas.")
