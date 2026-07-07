from sentence_transformers import SentenceTransformer

model=SentenceTransformer(
    "BAAI/bge-large-en-v1.5"
)

def generate_embedding(text):

    return model.encode(text).tolist()