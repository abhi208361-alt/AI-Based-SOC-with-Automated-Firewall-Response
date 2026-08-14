from typing import Any, cast

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def _error_payload(
    code: str, message: str, request_id: str | None = None
) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "request_id": request_id or "",
        }
    }


async def validation_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    _ = cast(RequestValidationError, exc)
    request_id = getattr(request.state, "request_id", "")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_payload(
            "VALIDATION_ERROR", "Request validation failed", request_id
        ),
    )


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    http_exc = cast(HTTPException, exc)
    request_id = getattr(request.state, "request_id", "")
    return JSONResponse(
        status_code=http_exc.status_code,
        content=_error_payload("HTTP_ERROR", str(http_exc.detail), request_id),
    )


async def starlette_http_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    star_exc = cast(StarletteHTTPException, exc)
    request_id = getattr(request.state, "request_id", "")
    return JSONResponse(
        status_code=star_exc.status_code,
        content=_error_payload("HTTP_ERROR", str(star_exc.detail), request_id),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_payload(
            "INTERNAL_SERVER_ERROR", "An unexpected error occurred", request_id
        ),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, starlette_http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
