-- Enable the pgvector extension, used for transaction embeddings (Phase 4 RAG).
create extension if not exists vector;