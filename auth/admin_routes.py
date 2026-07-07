import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from auth.database import get_db
from auth.models import User, LoginHistory
from auth.schemas import (
    UserCreate, UserUpdate, UserOut, ResetPasswordRequest,
    PaginatedUsers, PaginatedLoginHistory, LoginHistoryOut, DashboardStats,
)
from auth.auth_utils import hash_password, require_role

router = APIRouter(prefix="/api", tags=["admin"])


# ── Dashboard Stats ───────────────────────────────────
@router.get("/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db), _admin: User = Depends(require_role("ADMIN"))):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()

    # Online = logged in within last 15 minutes and no logout recorded
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
    online_users = (
        db.query(LoginHistory)
        .filter(
            LoginHistory.login_status == "SUCCESS",
            LoginHistory.login_time >= cutoff,
            LoginHistory.logout_time.is_(None),
        )
        .distinct(LoginHistory.user_id)
        .count()
    )

    logged_in_today = (
        db.query(LoginHistory)
        .filter(
            LoginHistory.login_status == "SUCCESS",
            LoginHistory.login_time >= today_start,
        )
        .count()
    )

    failed_today = (
        db.query(LoginHistory)
        .filter(
            LoginHistory.login_status == "FAILED",
            LoginHistory.created_at >= today_start,
        )
        .count()
    )

    total_sessions_today = (
        db.query(LoginHistory)
        .filter(LoginHistory.login_time >= today_start)
        .count()
    )

    return DashboardStats(
        total_users=total_users,
        active_users=active_users,
        online_users=online_users,
        logged_in_today=logged_in_today,
        failed_logins_today=failed_today,
        total_sessions_today=total_sessions_today,
    )


# ── User CRUD ─────────────────────────────────────────
@router.get("/users", response_model=PaginatedUsers)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = Query(None, pattern="^(name|email|role|created_at|last_login)$"),
    sort_order: Optional[str] = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("ADMIN")),
):
    q = db.query(User)

    if search:
        like = f"%{search}%"
        q = q.filter(or_(User.first_name.ilike(like), User.last_name.ilike(like), User.email.ilike(like)))
    if role:
        q = q.filter(User.role == role.upper())
    if status:
        q = q.filter(User.is_active == (status.lower() == "active"))

    total = q.count()

    if sort_by:
        col = getattr(User, sort_by)
        q = q.order_by(col.desc() if sort_order == "desc" else col.asc())
    else:
        q = q.order_by(User.created_at.desc())

    users = q.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedUsers(
        users=[UserOut.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size),
    )


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("ADMIN")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ── Login History ─────────────────────────────────────
@router.get("/login-history", response_model=PaginatedLoginHistory)
def all_login_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort: Optional[str] = Query("latest", pattern="^(latest|oldest)$"),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("ADMIN")),
):
    q = db.query(LoginHistory)

    if search:
        like = f"%{search}%"
        q = q.join(User, isouter=True).filter(
            or_(User.first_name.ilike(like), User.last_name.ilike(like), LoginHistory.email_attempted.ilike(like))
        )
    if status_filter:
        q = q.filter(LoginHistory.login_status == status_filter.upper())
    if date_from:
        try:
            df = datetime.strptime(date_from, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            q = q.filter(LoginHistory.login_time >= df)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            q = q.filter(LoginHistory.login_time <= dt)
        except ValueError:
            pass

    total = q.count()
    q = q.order_by(LoginHistory.login_time.desc() if sort == "latest" else LoginHistory.login_time.asc())
    records = q.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedLoginHistory(
        records=[LoginHistoryOut.model_validate(r) for r in records],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size),
    )


@router.get("/users/{user_id}/login-history", response_model=PaginatedLoginHistory)
def user_login_history(
    user_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("ADMIN")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    q = db.query(LoginHistory).filter(LoginHistory.user_id == user_id)
    total = q.count()
    records = q.order_by(LoginHistory.login_time.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedLoginHistory(
        records=[LoginHistoryOut.model_validate(r) for r in records],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size),
    )


# ── Read-Only Enforcement: Block all write operations ──────────────────────────
_READ_ONLY_MSG = (
    "This admin panel is read-only. "
    "User management actions (create, update, delete, role changes, "
    "password resets) are not permitted."
)


@router.post("/users", include_in_schema=False)
def create_user_forbidden(*_, **__):
    raise HTTPException(status_code=403, detail=_READ_ONLY_MSG)


@router.put("/users/{user_id}", include_in_schema=False)
def update_user_forbidden(user_id: int, *_, **__):
    raise HTTPException(status_code=403, detail=_READ_ONLY_MSG)


@router.delete("/users/{user_id}", include_in_schema=False)
def delete_user_forbidden(user_id: int, *_, **__):
    raise HTTPException(status_code=403, detail=_READ_ONLY_MSG)


@router.patch("/users/{user_id}/activate", include_in_schema=False)
def activate_user_forbidden(user_id: int, *_, **__):
    raise HTTPException(status_code=403, detail=_READ_ONLY_MSG)


@router.patch("/users/{user_id}/deactivate", include_in_schema=False)
def deactivate_user_forbidden(user_id: int, *_, **__):
    raise HTTPException(status_code=403, detail=_READ_ONLY_MSG)


@router.post("/users/{user_id}/reset-password", include_in_schema=False)
def reset_password_forbidden(user_id: int, *_, **__):
    raise HTTPException(status_code=403, detail=_READ_ONLY_MSG)


@router.patch("/users/{user_id}/role", include_in_schema=False)
def change_role_forbidden(user_id: int, *_, **__):
    raise HTTPException(status_code=403, detail=_READ_ONLY_MSG)

