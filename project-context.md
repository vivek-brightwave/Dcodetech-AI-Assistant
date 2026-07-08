# Project Context

## Project Overview
This repository contains a Retrieval-Augmented Generation (RAG) application built with a Python FastAPI backend and a React/Vite frontend.

The app is designed to answer user questions by retrieving and ranking content from a set of company documents, then generating responses with an LLM.

## Top-level Structure
- `backend/`
  - `api/`: FastAPI server, SPA asset serving, chat endpoint, auth routes, and debugging utilities.
  - `auth/`: Authentication, authorization, user/chat models, and session handling.
  - `retriever/`: Document retrieval, reranking, and context construction.
  - `src/llm/`: LLM integration via `gemma_client.py`.
  - `vectorstore/`: Qdrant vector store integration and embedding model.
  - `scripts/`: Backend utility scripts such as document indexing.
  - `data/`: Source documents used for retrieval.
  - `qdrant_storage/`: Persistent Qdrant storage.
  - `auth.db`: SQLite database for authentication and chat history.
  - `requirements.txt`: Python package dependencies.
  - `Dockerfile`: Backend container build definition.

- `frontend/`
  - `ui-react/`: React/Vite application source code.
  - `ui/`: Built frontend assets served by the backend.

- `docker-compose.yml`: Compose configuration for the API service and Qdrant.

## Backend Details
- Built with FastAPI and SQLAlchemy.
- Provides authentication, guest sessions, admin routes, and profile management.
- Exposes chat and conversation endpoints used by the React frontend.
- Uses a RAG pipeline:
  - `retriever.hybrid_retriever` performs semantic retrieval from Qdrant.
  - `retriever.reranker` reorders retrieved results.
  - `retriever.context_builder` builds prompt context for the LLM.
- LLM interactions are mediated by `src/llm/gemma_client.py`.
- Static frontend assets are served from `frontend/ui/public` via the API.

## Frontend Details
- Built with React 19 and Vite.
- Uses `react-router-dom` for client-side routing.
- Frontend source is in `frontend/ui-react`.
- Build output is written to `frontend/ui/public`.
- The frontend proxies API requests to the backend in development.

## Docker / Deployment
- `docker-compose.yml` defines two services:
  - `api`: Builds from `backend/Dockerfile` and serves the backend application.
  - `qdrant`: Uses the official Qdrant image for vector storage.
- The backend mounts local `backend/auth.db` and `backend/qdrant_storage` volumes.
- The API service exposes port `8080`.

## Key Dependencies
- Python: `fastapi`, `uvicorn`, `sqlalchemy`, `python-jose`, `passlib`, `qdrant-client`, `sentence-transformers`, `langchain`, `torch`, `transformers`
- Frontend: `react`, `react-dom`, `react-router-dom`, `vite`, `@vitejs/plugin-react`

## Important Notes
- The app uses company documents (`Brightwave Software Data.txt`, `Dcodetech Overview.txt`, `Dezignlocis Data.txt`) as the only retrieval source.
- The backend logic is intentionally preserved to prevent changes in auth, API, RAG, or business behavior.
- A default admin user is created on startup if none exists.

## Current Cleanup Status
- Generated Python cache files (`__pycache__`, `*.pyc`) have been removed.
- No source logic, configuration, or application files were deleted.

## Run Commands
- Backend (from `Dcodetech-AI-Assistant`):
  - `docker compose up --build`
- Frontend (dev):
  - `cd frontend/ui-react`
  - `npm install`
  - `npm run dev`

## Confirmations
- `main.py` preserved.
- Authentication files unchanged.
- Backend and frontend source preserved.
- Docker configuration unchanged except for cleanup artifact removal.
- Application functionality remains the same as before cleanup.
