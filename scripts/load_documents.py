import sys
import os
from pathlib import Path
import pickle

# Add the root directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from langchain_text_splitters import RecursiveCharacterTextSplitter
from rank_bm25 import BM25Okapi
from vectorstore.qdrant_store import init_collection, index_documents

def load_documents():
    docs = []
    folder = Path("data")
    for file in folder.glob("*.txt"):
        with open(file, "r", encoding="utf-8") as f:
            docs.append(f.read())
    return docs

def process_and_index():
    print("Loading documents...")
    docs = load_documents()
    
    print("Chunking documents...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len
    )
    
    chunks = text_splitter.split_text("\n\n".join(docs))
    print(f"Generated {len(chunks)} chunks.")

    print("Initializing Qdrant collection...")
    init_collection()
    
    print("Indexing vectors in Qdrant...")
    index_documents(chunks)
    
    print("Building BM25 index...")
    tokenized_chunks = [chunk.split(" ") for chunk in chunks]
    bm25 = BM25Okapi(tokenized_chunks)
    
    print("Saving BM25 index and chunks to disk...")
    # Save the BM25 index and the raw chunks so we can retrieve them later
    bm25_data = {
        "bm25_index": bm25,
        "chunks": chunks
    }
    
    # Save to the vectorstore folder
    save_path = os.path.join(os.path.dirname(__file__), '..', 'vectorstore', 'bm25_index.pkl')
    with open(save_path, "wb") as f:
        pickle.dump(bm25_data, f)
        
    print("Data ingestion complete!")

if __name__ == "__main__":
    process_and_index()