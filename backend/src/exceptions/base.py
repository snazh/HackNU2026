from fastapi import HTTPException


class BaseAppException(HTTPException):
    def __init__(self, status_code: int, message: str):
        super().__init__(status_code=status_code, detail=message)


class ItemNotFoundError(BaseAppException):
    def __init__(self, item: str, attr: str, value):
        super().__init__(404, f"{item} with {attr} {value} not found")


class ItemAlreadyExistsError(BaseAppException):
    def __init__(self, item: str, attr: str, value):
        super().__init__(409, f"{item} with {attr} {value} already exists")
