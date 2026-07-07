from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from datetime import datetime

from auth.database import get_db
from auth.models import User, LoginHistory, GuestSession
from auth.schemas import LoginRequest, LoginResponse, UserOut, LogoutRequest, GuestSessionResponse
from auth.auth_utils import hash_password, verify_password, create_access_token, get_current_user
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _parse_user_agent(request: Request):
    ua = request.headers.get("user-agent", "")
    browser = "Unknown"
    os_name = "Unknown"
    ua_lower = ua.lower()
    if "chrome" in ua_lower and "edg" not in ua_lower:
        browser = "Chrome"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "edg" in ua_lower:
        browser = "Edge"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
    if "windows" in ua_lower:
        os_name = "Windows"
    elif "mac" in ua_lower:
        os_name = "macOS"
    elif "linux" in ua_lower:
        os_name = "Linux"
    elif "android" in ua_lower:
        os_name = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os_name = "iOS"
    return browser, os_name


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    browser, os_name = _parse_user_agent(request)
    ip = request.client.host if request.client else "unknown"

    if not user:
        # Auto-create new user
        user = User(
            first_name=body.email.split("@")[0],
            last_name="",
            email=body.email,
            password_hash=hash_password(body.password),
            role="USER",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Existing user, check password
        if not verify_password(body.password, user.password_hash):
            history = LoginHistory(
                user_id=user.id,
                email_attempted=body.email,
                ip_address=ip,
                browser=browser,
                operating_system=os_name,
                login_status="FAILED",
            )
            db.add(history)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password",
            )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact admin.",
        )

    # Update last_login
    now = datetime.utcnow()
    user.last_login = now

    # Record successful login
    history = LoginHistory(
        user_id=user.id,
        email_attempted=user.email,
        ip_address=ip,
        browser=browser,
        operating_system=os_name,
        login_status="SUCCESS",
        login_time=now,
    )
    db.add(history)
    db.commit()
    db.refresh(history)

    token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})

    return LoginResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.post("/logout")
def logout(
    body: LogoutRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()

    # Find the most recent open session for this user
    session = (
        db.query(LoginHistory)
        .filter(
            LoginHistory.user_id == current_user.id,
            LoginHistory.login_status == "SUCCESS",
            LoginHistory.logout_time.is_(None),
        )
        .order_by(LoginHistory.login_time.desc())
        .first()
    )

    if session:
        session.logout_time = now
        if session.login_time:
            session.session_duration = int((now - session.login_time).total_seconds())
        db.commit()

    return {"detail": "Logged out successfully"}


@router.post("/guest-session", response_model=GuestSessionResponse)
def create_guest_session(db: Session = Depends(get_db)):
    session_id = str(uuid.uuid4())
    session = GuestSession(session_id=session_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return GuestSessionResponse(session_id=session.session_id, created_at=session.created_at)
