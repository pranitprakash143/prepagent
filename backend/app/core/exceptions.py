"""
Custom exception classes with standardized error codes
"""


class AppException(Exception):
    """
    Base application exception with code and optional field
    """

    def __init__(
        self,
        detail: str,
        status_code: int = 400,
        code: str = "UNKNOWN",
        field: str = None,
    ):
        self.detail = detail
        self.status_code = status_code
        self.code = code
        self.field = field
        super().__init__(detail)


class NotFoundException(AppException):
    """Resource not found"""

    def __init__(self, resource: str, resource_id: str):
        detail = f"{resource} with id '{resource_id}' not found"
        super().__init__(detail, status_code=404, code="NOT_FOUND")


class UnauthorizedException(AppException):
    """Unauthorized access"""

    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(detail, status_code=401, code="UNAUTHORIZED")


class ForbiddenException(AppException):
    """Forbidden access"""

    def __init__(self, detail: str = "Forbidden"):
        super().__init__(detail, status_code=403, code="FORBIDDEN")


class ValidationException(AppException):
    """Validation error"""

    def __init__(self, detail: str, field: str = None):
        super().__init__(detail, status_code=422, code="VALIDATION_ERROR", field=field)


class ConflictException(AppException):
    """Resource conflict"""

    def __init__(self, detail: str):
        super().__init__(detail, status_code=409, code="CONFLICT")


class InternalServerException(AppException):
    """Internal server error"""

    def __init__(self, detail: str = "Internal server error"):
        super().__init__(detail, status_code=500, code="INTERNAL_ERROR")
