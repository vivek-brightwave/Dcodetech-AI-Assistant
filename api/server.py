import os
import re
from fastapi import FastAPI, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from retriever.hybrid_retriever import hybrid_search
from retriever.reranker import rerank
from retriever.context_builder import build_context
from src.llm.gemma_client import GemmaConnectionError, ask_gemma
from api.debug_tracker import tracker
import asyncio
import queue
import time

# Auth imports
from auth.database import engine, SessionLocal, Base
from auth.models import User, ChatHistory, GuestSession
from auth.auth_utils import hash_password, get_optional_user
from auth.routes import router as auth_router
from auth.admin_routes import router as admin_router
from auth.profile_routes import router as profile_router

GREETING_WORDS = {
    "hi",
    "hello",
    "hey",
    "hii",
    "hiii",
    "namaste",
}

conversation_state = {
    "last_user_query": "",
    "last_assistant_response": "",
}

def normalize_text(text: str) -> str:
    normalized = re.sub(r"[^a-zA-Z\s]", "", text).strip().lower()
    return re.sub(r"\s+", " ", normalized)

def is_greeting(query: str) -> bool:
    return normalize_text(query) in GREETING_WORDS


def rag(query: str, stream: bool = False):
    tracker.emit("User Question", "success")
    tracker.emit("FastAPI Server", "running")
    t0_fastapi = time.time()

    # Check if the query is a simple greeting to handle it without database lookup
    is_greeting_query = is_greeting(query)
    
    last_q = conversation_state["last_user_query"]
    last_a = conversation_state["last_assistant_response"]

    # Combine queries for better contextual retrieval
    retrieval_query = f"{last_q} {query}".strip() if last_q else query

    tracker.emit("FastAPI Server", "success", duration=int((time.time()-t0_fastapi)*1000))

    results = hybrid_search(retrieval_query)

    print("RESULTS:", len(results))

    if not results and not is_greeting_query:
        return (
            iter(["I'm sorry, but I can not provide answers."])
            if stream
            else "I'm sorry, but I can not provide answers."
        )

    if results:
        # Re-order results to ensure most relevant are first, then construct text context
        reranked = rerank(retrieval_query, results)
        tracker.emit("Top Documents", "success")
        context = build_context(reranked)
    else:
        reranked = []
        context = ""



    prompt = f"""
You are a helpful assistant for Dcodetech.

Rules:
1. If the user's input is a greeting (e.g., hi, hello), greet them back politely.
2. Answer the user's Current Question based ONLY on the provided Context.
3. If the Context does not contain any relevant information to answer, reply exactly:
"I'm sorry, but I can not provide answers."
4. Do not use your own external knowledge to answer questions.
5. If the user asks for a detailed answer, provide as much relevant detail from the Context as possible.

Context:
{context}

Previous User Question:
{last_q}

Current Question:
{query}

Answer:
"""
    # Call the LLM to generate the answer (supports streaming)
    answer_generator = ask_gemma(prompt, stream=stream)
    if not stream:
        return answer_generator

    def stream_answer():
        chunks = []
        stream_started = False
        t_stream = time.time()
        for chunk in answer_generator:
            if not stream_started:
                tracker.emit("Streaming Response", "running")
                tracker.emit("React UI", "running")
                stream_started = True
                
            chunks.append(chunk)
            yield chunk
            
        if stream_started:
            tracker.emit("Streaming Response", "success", duration=int((time.time()-t_stream)*1000))
            tracker.emit("React UI", "success")
            
        full_answer = "".join(chunks).strip()
        if full_answer and full_answer != "I'm sorry, but I can not provide answers." and not is_greeting_query:
            # Save valid Q&A to state to provide context for the next follow-up query
            conversation_state["last_user_query"] = query
            conversation_state["last_assistant_response"] = full_answer

    return stream_answer()

app = FastAPI()

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(profile_router)


@app.on_event("startup")
def on_startup():
    """Create auth tables and seed a default admin if none exists."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "ADMIN").first()
        if not admin:
            admin = User(
                first_name="Admin",
                last_name="User",
                email="admin@dcodetech.in",
                password_hash=hash_password("Admin123@"),
                role="ADMIN",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            print("[AUTH] Default admin created: admin@dcodetech.in / Admin123@")
    finally:
        db.close()


@app.post("/chat")
def chat(
    query: str,
    request: Request,
    chat_id: int = None,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(lambda: next(_get_db())),
):
    guest_session_id = request.headers.get("X-Guest-Session-ID")
    tracker.emit("User Question", "running")

    try:
        answer_generator = rag(query, stream=True)
    except GemmaConnectionError as exc:
        tracker.emit("Gemma (Ollama)", "failed", error=str(exc))
        answer_generator = iter([str(exc)])
    except Exception as exc:
        tracker.emit("FastAPI Server", "failed", error=str(exc))
        raise

    def stream_and_save():
        chunks = []
        for chunk in answer_generator:
            chunks.append(chunk)
            yield chunk
        full_answer = "".join(chunks).strip()

        # Persist conversation to DB
        import json
        try:
            if chat_id:
                chat_record = db.query(ChatHistory).filter(ChatHistory.id == chat_id).first()
                if chat_record:
                    msgs = json.loads(chat_record.messages or "[]")
                    msgs.append({"role": "user", "content": query})
                    msgs.append({"role": "assistant", "content": full_answer})
                    chat_record.messages = json.dumps(msgs)
                    db.commit()
                    return

            msgs = [
                {"role": "user", "content": query},
                {"role": "assistant", "content": full_answer},
            ]
            title = query[:60]

            if current_user:
                new_chat = ChatHistory(
                    user_id=current_user.id,
                    title=title,
                    messages=json.dumps(msgs),
                )
            elif guest_session_id:
                # Ensure guest session exists
                gs = db.query(GuestSession).filter(GuestSession.session_id == guest_session_id).first()
                if not gs:
                    gs = GuestSession(session_id=guest_session_id)
                    db.add(gs)
                    db.commit()
                new_chat = ChatHistory(
                    session_id=guest_session_id,
                    title=title,
                    messages=json.dumps(msgs),
                )
            else:
                return

            db.add(new_chat)
            db.commit()
        except Exception as e:
            print(f"[CHAT] Failed to save chat history: {e}")

    return StreamingResponse(stream_and_save(), media_type="text/plain")


def _get_db():
    from auth.database import SessionLocal as _SL
    db = _SL()
    try:
        yield db
    finally:
        db.close()


@app.get("/api/chats")
def get_chats(
    request: Request,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(lambda: next(_get_db())),
):
    guest_session_id = request.headers.get("X-Guest-Session-ID")
    import json
    if current_user:
        chats = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).order_by(ChatHistory.created_at.desc()).limit(50).all()
    elif guest_session_id:
        chats = db.query(ChatHistory).filter(ChatHistory.session_id == guest_session_id).order_by(ChatHistory.created_at.desc()).limit(50).all()
    else:
        return []
    return [
        {"id": c.id, "title": c.title, "messages": json.loads(c.messages or "[]"), "created_at": c.created_at.isoformat() if c.created_at else None}
        for c in chats
    ]

@app.get("/debug/events")
async def debug_events():
    async def event_generator():
        q = tracker.subscribe()
        try:
            while True:
                # Poll the queue non-blockingly using a short timeout in a thread
                try:
                    event_str = await asyncio.to_thread(q.get, timeout=1.0)
                    yield f"data: {event_str}\n\n"
                except queue.Empty:
                    # just keep alive
                    yield ": keep-alive\n\n"
        finally:
            tracker.unsubscribe(q)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ── SPA catch-all: serve index.html for client-side routes ──
ui_path = os.path.join(os.path.dirname(__file__), '..', 'ui', 'public')

# Mount /assets to serve built JS/CSS assets
assets_path = os.path.join(ui_path, 'assets')
if os.path.isdir(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")


@app.get("/favicon.ico")
def favicon():
    return FileResponse(os.path.join(ui_path, "favicon.svg"))


@app.get("/icons.svg")
def icons():
    return FileResponse(os.path.join(ui_path, "icons.svg"))


@app.get("/{full_path:path}", include_in_schema=False)
def spa_catch_all(full_path: str):
    """Serve index.html for all non-API GET routes so React Router works."""
    index_file = os.path.join(ui_path, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return {"detail": "Not found"}
