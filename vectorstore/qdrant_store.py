from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from vectorstore.embedding_model import generate_embedding

client = QdrantClient(host="localhost", port=6333)
COLLECTION_NAME = "company_docs"

def init_collection():
    client.recreate_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
    )

def index_documents(chunks: list[str]):
    points = []
    for idx, chunk in enumerate(chunks):
        embedding = generate_embedding(chunk)
        points.append(
            PointStruct(
                id=idx,
                vector=embedding,
                payload={"text": chunk}
            )
        )
    
    if points:
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )

def search_documents(query_embedding, top_k=10):
    response = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=top_k
    )
    return [hit.payload["text"] for hit in response.points]