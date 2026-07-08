from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from auth.database import get_db
from auth.models import User, LoginHistory
from auth.schemas import ProfileOut, ProfileUpdate, LoginHistoryOut, UserOut, ChangePasswordRequest
from auth.auth_utils import get_current_user, verify_password, hash_password

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Previous login: second most recent successful login
    logins = (
        db.query(LoginHistory)
        .filter(LoginHistory.user_id == current_user.id, LoginHistory.login_status == "SUCCESS")
        .order_by(LoginHistory.login_time.desc())
        .limit(2)
        .all()
    )
    last_login = logins[0].login_time if logins else None
    previous_login = logins[1].login_time if len(logins) > 1 else None

    total_count = (
        db.query(LoginHistory)
        .filter(LoginHistory.user_id == current_user.id, LoginHistory.login_status == "SUCCESS")
        .count()
    )

    # Last logout
    last_logout_record = (
        db.query(LoginHistory)
        .filter(LoginHistory.user_id == current_user.id, LoginHistory.logout_time.isnot(None))
        .order_by(LoginHistory.logout_time.desc())
        .first()
    )
    last_logout_time = last_logout_record.logout_time if last_logout_record else None

    # Average session duration
    avg_result = (
        db.query(func.avg(LoginHistory.session_duration))
        .filter(LoginHistory.user_id == current_user.id, LoginHistory.session_duration.isnot(None))
        .scalar()
    )
    avg_duration = round(avg_result, 1) if avg_result else None

    # Recent 10 sessions
    recent = (
        db.query(LoginHistory)
        .filter(LoginHistory.user_id == current_user.id)
        .order_by(LoginHistory.login_time.desc())
        .limit(10)
        .all()
    )

    return ProfileOut(
        id=current_user.id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        last_login=last_login,
        previous_login=previous_login,
        total_login_count=total_count,
        last_logout_time=last_logout_time,
        average_session_duration=avg_duration,
        recent_login_history=[LoginHistoryOut.model_validate(r) for r in recent],
    )


@router.put("", response_model=UserOut)
def update_profile(
    body: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.email and body.email != current_user.email:
        existing = db.query(User).filter(User.email == body.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = body.email

    if body.first_name is not None:
        current_user.first_name = body.first_name
    if body.last_name is not None:
        current_user.last_name = body.last_name

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"detail": "Password changed successfully"}
