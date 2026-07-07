import queue
import time
import json
import threading

class DebugTracker:
    def __init__(self):
        self.listeners = []
        self._lock = threading.Lock()
    
    def emit(self, stage: str, status: str, **kwargs):
        event = {
            "stage": stage,
            "status": status,
            "time": time.time(),
            **kwargs
        }
        event_str = json.dumps(event)
        
        with self._lock:
            for q in self.listeners:
                try:
                    q.put_nowait(event_str)
                except queue.Full:
                    pass
                
    def subscribe(self):
        q = queue.Queue(maxsize=100)
        with self._lock:
            self.listeners.append(q)
        return q
        
    def unsubscribe(self, q):
        with self._lock:
            if q in self.listeners:
                self.listeners.remove(q)

tracker = DebugTracker()
