from sentence_transformers import CrossEncoder
from api.debug_tracker import tracker
import time

reranker=CrossEncoder(
    "cross-encoder/ms-marco-MiniLM-L-6-v2"
)

def rerank(query,documents):
    tracker.emit("Cross Encoder", "running")
    t0 = time.time()
    try:
        # Create query-document pairs required by the CrossEncoder
        pairs=[
            (query,doc)
            for doc in documents
            if doc
        ]
    
        # Predict relevance score for each document against the query
        scores=reranker.predict(
            pairs
        )
    
        # Sort documents in descending order based on their relevance score
        ranked=sorted(
            zip(documents,scores),
            key=lambda x:x[1],
            reverse=True
        )
    
        tracker.emit("Cross Encoder", "success", duration=int((time.time()-t0)*1000), details={"Input": len(documents), "Output": len(ranked)})
        return ranked
    except Exception as e:
        tracker.emit("Cross Encoder", "failed", error=str(e))
        raise