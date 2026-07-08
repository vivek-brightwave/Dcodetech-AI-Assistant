import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from retriever.hybrid_retriever import hybrid_search
from retriever.reranker import rerank
from retriever.context_builder import build_context
from src.llm.gemma_client import ask_gemma

query=input("Ask: ")

# Retrieve relevant documents using both dense and sparse search
results=hybrid_search(query)

# Re-score and sort results to bring the most relevant documents to the top
reranked=rerank(
    query,
    results
)

# Format the top reranked documents into a single text block for the LLM
context=build_context(
    reranked
)

prompt=f"""
You are a helpful assistant for Dcodetech. You must strictly follow these rules:
1. You must ONLY answer the user's question based on the provided Context below.
2. If the answer cannot be found in the Context, you must reply exactly with: "I'm sorry, but I can not provide answers."
3. Do NOT use any outside knowledge to answer the question.

Context:

{context}

Question:

{query}
"""

# Send prompt to Gemma model to generate the final answer
response=ask_gemma(prompt)

print(response)
