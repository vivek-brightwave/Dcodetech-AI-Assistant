from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from auth.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="USER")  # ADMIN or USER
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    login_history = relationship("LoginHistory", back_populates="user", lazy="dynamic")
    chats = relationship("ChatHistory", back_populates="user", lazy="dynamic")


class GuestSession(Base):
    __tablename__ = "guest_sessions"

    session_id = Column(String(36), primary_key=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_active = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    chats = relationship("ChatHistory", back_populates="guest_session", lazy="dynamic")


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(36), ForeignKey("guest_sessions.session_id"), nullable=True)
    title = Column(String(255), nullable=True)
    messages = Column(Text, default="[]")  # Store JSON as string
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="chats")
    guest_session = relationship("GuestSession", back_populates="chats")


class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable for failed logins where user may not exist
    email_attempted = Column(String(255), nullable=True)  # store email for failed attempts
    login_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    logout_time = Column(DateTime, nullable=True)
    session_duration = Column(Integer, nullable=True)  # in seconds
    ip_address = Column(String(100), nullable=True)
    browser = Column(String(255), nullable=True)
    operating_system = Column(String(255), nullable=True)
    login_status = Column(String(20), nullable=False, default="SUCCESS")  # SUCCESS or FAILED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="login_history")
