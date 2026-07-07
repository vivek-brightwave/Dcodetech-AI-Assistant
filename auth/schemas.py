from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class LogoutRequest(BaseModel):
    session_id: Optional[int] = None


# ── User ──────────────────────────────────────────────
class UserCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)
    role: str = Field(default="USER", pattern="^(ADMIN|USER)$")
    is_active: bool = True


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


# ── Login History ─────────────────────────────────────
class LoginHistoryOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    email_attempted: Optional[str] = None
    login_time: Optional[datetime] = None
    logout_time: Optional[datetime] = None
    session_duration: Optional[int] = None
    ip_address: Optional[str] = None
    browser: Optional[str] = None
    operating_system: Optional[str] = None
    login_status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Dashboard Stats ───────────────────────────────────
class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    online_users: int
    logged_in_today: int
    failed_logins_today: int
    total_sessions_today: int


# ── Profile ───────────────────────────────────────────
class ProfileOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    previous_login: Optional[datetime] = None
    total_login_count: int = 0
    last_logout_time: Optional[datetime] = None
    average_session_duration: Optional[float] = None
    recent_login_history: List[LoginHistoryOut] = []

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None


# ── Paginated responses ──────────────────────────────
class PaginatedUsers(BaseModel):
    users: List[UserOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedLoginHistory(BaseModel):
    records: List[LoginHistoryOut]
    total: int
    page: int
    page_size: int
    total_pages: int

# ── Chat History ──────────────────────────────────────

class ChatHistoryOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    session_id: Optional[str] = None
    title: Optional[str] = None
    messages: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class GuestSessionResponse(BaseModel):
    session_id: str
    created_at: Optional[datetime] = None

