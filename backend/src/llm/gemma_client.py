import json
import os
import requests
import time
from api.debug_tracker import tracker

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma2:2b")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "300"))
OLLAMA_NUM_CTX = int(os.getenv("OLLAMA_NUM_CTX", "4096"))
OLLAMA_NUM_GPU = os.getenv("OLLAMA_NUM_GPU", None)

class GemmaConnectionError(RuntimeError):
    pass

def _offline_message():
    return (
        "I'm unable to connect to the local Ollama server. "
        "Please start Ollama and make sure the model is available, then try again."
    )

def _timeout_message():
    return (
        "The local Ollama model took too long to respond. "
        "Try again in a moment, or use a smaller model with OLLAMA_MODEL."
    )

def ask_gemma(prompt, stream=False):
    tracker.emit("Gemma (Ollama)", "running")
    t0 = time.time()
    
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": stream,
        "options": {
            "num_ctx": OLLAMA_NUM_CTX
        }
    }
    
    if OLLAMA_NUM_GPU is not None:
        payload["options"]["num_gpu"] = int(OLLAMA_NUM_GPU)

    try:
        response = requests.post(
            OLLAMA_URL,
            json=payload,
            stream=stream,
            timeout=OLLAMA_TIMEOUT
        )
        response.raise_for_status()
    except requests.exceptions.Timeout as exc:
        raise GemmaConnectionError(_timeout_message()) from exc
    except requests.exceptions.HTTPError as exc:
        try:
            error_details = exc.response.json().get('error', exc.response.text)
        except Exception:
            error_details = exc.response.text
            
        if exc.response.status_code == 404:
            raise GemmaConnectionError(f"Model '{OLLAMA_MODEL}' not found in Ollama. Please run 'ollama pull {OLLAMA_MODEL}' in your terminal.") from exc
        
        raise GemmaConnectionError(f"Ollama Server Error ({exc.response.status_code}): {error_details}") from exc
    except requests.exceptions.RequestException as exc:
        raise GemmaConnectionError(_offline_message()) from exc
    except Exception as exc:
        raise
        
    tracker.emit("Gemma (Ollama)", "success", duration=int((time.time()-t0)*1000), details={"Model": OLLAMA_MODEL, "Streaming": str(stream)})
    
    if not stream:
        try:
            return response.json()["response"]
        except (KeyError, ValueError) as exc:
            raise GemmaConnectionError("Ollama returned an unexpected response.") from exc
        
    def generate():
        try:
            for line in response.iter_lines():
                if line:
                    data = json.loads(line.decode('utf-8'))
                    if "response" in data:
                        yield data["response"]
                    if data.get("error"):
                        yield f"\n\nOllama error: {data['error']}"
                        break
        except (requests.exceptions.RequestException, json.JSONDecodeError):
            yield "\n\nThe local model connection stopped unexpectedly."

    return generate()
