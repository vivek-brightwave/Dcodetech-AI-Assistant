from api.debug_tracker import tracker
import time

def build_context(ranked_docs):

    tracker.emit("Context Builder", "running")
    t0 = time.time()
    try:
        context = ""
    
        # Limit context to top 5 documents to avoid exceeding LLM token limit
        for doc, _ in ranked_docs[:5]:
            context += str(doc)
            context += "\n\n"
    
        tracker.emit("Context Builder", "success", duration=int((time.time()-t0)*1000), details={"Chunks": min(len(ranked_docs), 5), "Tokens": f"~{int(len(context)/4)}"})
        return context
    except Exception as e:
        tracker.emit("Context Builder", "failed", error=str(e))
        raise