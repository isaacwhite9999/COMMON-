"""Request limits and operational metadata for the legacy API boundary."""
from __future__ import annotations

import json
import logging
import os
from time import perf_counter
from uuid import UUID, uuid4

from anyio import fail_after
from starlette.datastructures import Headers, MutableHeaders, URL
from starlette.responses import JSONResponse, PlainTextResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

LOGGER = logging.getLogger("uvicorn.error.common.requests")
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": (
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
        "connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    ),
}


def request_id(value: str | None) -> str:
    if value and len(value) == 36:
        try:
            parsed = UUID(value)
            if parsed.version == 4:
                return str(parsed)
        except ValueError:
            pass
    return str(uuid4())


class APIOperations:
    def __init__(self, app: ASGIApp, max_body_bytes: int = 32_768):
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        correlation = request_id(headers.get("x-request-id"))
        scope.setdefault("state", {})["request_id"] = correlation
        is_api = scope["path"].startswith("/api/")
        started = perf_counter()
        status = 500
        response_started = False

        async def send_response(message: Message):
            nonlocal status, response_started
            if message["type"] == "http.response.start":
                response_started = True
                status = message["status"]
                output = MutableHeaders(scope=message)
                for key, value in SECURITY_HEADERS.items():
                    output[key] = value
                output["X-Request-ID"] = correlation
                if is_api:
                    output["Cache-Control"] = "no-store"
                    output["Server-Timing"] = f"app;dur={(perf_counter() - started) * 1_000:.2f}"
            await send(message)

        try:
            if scope["method"] in {"POST", "PUT", "PATCH", "DELETE"}:
                origin = headers.get("origin")
                allowed = os.getenv("PUBLIC_ORIGIN") or str(URL(scope=scope).replace(path="", query=""))
                if origin and origin.rstrip("/") != allowed.rstrip("/"):
                    await PlainTextResponse("Cross-origin write requests are not allowed", status_code=403)(
                        scope, receive, send_response
                    )
                    return
            if is_api and scope["method"] in {"POST", "PUT", "PATCH", "DELETE"}:
                buffered: bytearray | None = bytearray()
                try:
                    with fail_after(5):
                        while True:
                            message = await receive()
                            if message["type"] == "http.disconnect":
                                status = 499
                                return
                            chunk = message.get("body", b"")
                            if len(buffered) + len(chunk) > self.max_body_bytes:
                                await JSONResponse(
                                    {"detail": "Request body exceeds the API limit", "request_id": correlation},
                                    status_code=413,
                                )(scope, receive, send_response)
                                return
                            buffered.extend(chunk)
                            if not message.get("more_body", False):
                                break
                except TimeoutError:
                    if response_started:
                        raise
                    await JSONResponse(
                        {"detail": "Request body timed out", "request_id": correlation},
                        status_code=408,
                    )(scope, receive, send_response)
                    return

                async def replay() -> Message:
                    nonlocal buffered
                    if buffered is None:
                        return await receive()
                    body = bytes(buffered)
                    buffered = None
                    return {"type": "http.request", "body": body, "more_body": False}

                await self.app(scope, replay, send_response)
            else:
                await self.app(scope, receive, send_response)
        except Exception as error:
            # Preserve only the error type. Driver exceptions can contain SQL parameters.
            LOGGER.error("request_exception type=%s request_id=%s", type(error).__name__, correlation)
            if response_started:
                raise
            await JSONResponse(
                {"detail": "Internal server error", "request_id": correlation},
                status_code=500,
            )(scope, receive, send_response)
        finally:
            if is_api and LOGGER.isEnabledFor(logging.INFO):
                route = getattr(scope.get("route"), "path", None)
                LOGGER.info(json.dumps({
                    "event": "api_request",
                    "request_id": correlation,
                    "route": route,
                    "method": scope["method"],
                    "status": status,
                    "duration_ms": round((perf_counter() - started) * 1_000, 2),
                }))
