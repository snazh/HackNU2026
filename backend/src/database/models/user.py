from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.database.models.base import Base


class UserRole(PyEnum):
    ADMIN = "admin"
    USER = "user"


class User(Base):
    __tablename__ = "users"
    firstname: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    lastname: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    middlename: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_constraint=True),
        nullable=False,
        default=UserRole.USER,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    products = relationship(
        "Product", back_populates="owner", cascade="all, delete-orphan"
    )
