# Phase 53: Gemini Model Architecture

## 1. Multi-Model Adapter Strategy
The backend uses `@google/genai` with a resilient fallback chain:
1. `GEMINI_MODEL` environment override (e.g. `gemini-2.5-flash`).
2. Primary fallback: `gemini-2.0-flash`.
3. High-throughput fallback: `gemini-1.5-flash`.
4. Ultimate safety fallback: Deterministic rule-based task planning engine.

## 2. Structured JSON Output & Context Injection
LLM prompts are structured with strict schemas:
- Context package injection: User time, location, schedule context, working memory.
- Output constraints: Strict JSON schema declaring `intent`, `category`, and `steps` array with typed parameters.
- Tool boundaries: The model NEVER directly accesses the database or runs code; all actions are mapped to registered `ToolRegistry` functions.
