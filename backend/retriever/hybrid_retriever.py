import os
import pickle
from vectorstore.qdrant_store import search_documents
from vectorstore.embedding_model import generate_embedding
from api.debug_tracker import tracker
import time

# Load the BM25 index on startup so it's ready in memory
bm25_data = None
bm25_path = os.path.join(os.path.dirname(__file__), '..', 'vectorstore', 'bm25_index.pkl')

if os.path.exists(bm25_path):
    with open(bm25_path, "rb") as f:
        bm25_data = pickle.load(f)

def hybrid_search(query, top_k=5):
    tracker.emit("Hybrid Retrieval", "running")
    t0_hybrid = time.time()
    
    try:
        # 1. Vector Search
        tracker.emit("Dense Search", "running")
        t0_dense = time.time()
        # Convert query into vector representation for dense search
        query_embedding = generate_embedding(query)
        vector_results = search_documents(query_embedding, top_k=top_k)
        tracker.emit("Dense Search", "success", duration=int((time.time()-t0_dense)*1000), details={"Results": len(vector_results)})
        
        # 2. BM25 Keyword Search
        tracker.emit("BM25 Search", "running")
        t0_bm25 = time.time()
        bm25_results = []
        if bm25_data:
            bm25_index = bm25_data["bm25_index"]
            chunks = bm25_data["chunks"]
            tokenized_query = query.split(" ")
            # Perform BM25 sparse search for exact keyword matching
            bm25_results = bm25_index.get_top_n(tokenized_query, chunks, n=top_k)
        
        tracker.emit("BM25 Search", "success", duration=int((time.time()-t0_bm25)*1000), details={"Results": len(bm25_results)})
            
        # 3. Merge and deduplicate
        tracker.emit("Merge Results", "running")
        t0_merge = time.time()
        merged = []
        merged.extend(vector_results)
        
        for doc in bm25_results:
            # Merge and deduplicate results from both search methods
            if doc not in merged:
                merged.append(doc)
                
        tracker.emit("Merge Results", "success", duration=int((time.time()-t0_merge)*1000), details={"Merged": len(merged[:top_k * 2])})
        tracker.emit("Hybrid Retrieval", "success", duration=int((time.time()-t0_hybrid)*1000))
        return merged[:top_k * 2]
    except Exception as e:
        tracker.emit("Hybrid Retrieval", "failed", error=str(e))
        raise