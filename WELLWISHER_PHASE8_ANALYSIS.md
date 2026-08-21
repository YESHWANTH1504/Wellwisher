# WellWisher Phase 8 — Comprehensive Architectural & Clinical AI Analysis

## Executive Summary
Phase 8 transforms JARVIS from a voice/text companion into an intelligent, secure, and controlled multi-modal vision and clinical document understanding system.

JARVIS is now capable of accepting, processing, extracting, summarizing, and comparing:
1. Blood and laboratory reports (e.g. CBC, lipid panels, metabolic panels, glucose, thyroid, liver, kidney functions).
2. Prescription images and medication instructions.
3. Medication packaging and labels.
4. Vital signs logs and health certificates.
5. General medical and clinical summary PDFs / images.

Crucially, JARVIS remains strictly informational and non-diagnostic:
- **Extract $\rightarrow$ Structure $\rightarrow$ Explain $\rightarrow$ Store $\rightarrow$ Retrieve** (Never *Diagnose $\rightarrow$ Prescribe $\rightarrow$ Act*).
- **Source Traceability**: Every single extracted value is tied directly to its source document ID and page number.
- **Pluggable Vision Engine**: Decoupled behind `VisionProvider` interfaces (`GoogleVisionProvider` via `@google/genai` and `LocalOCRProvider` for local heuristics and testing).
- **Clinical Safety Enforcement**: The `ClinicalSafetyValidator` blocks diagnosis assertions, dosage alterations, and unsupported medical claims.

---

## 1. Multi-Modal Ingestion & Security Architecture
```
Flutter UI (Camera / Gallery / PDF)
   │
   ▼
Authenticated Multipart Endpoint (POST /api/ai/documents/upload)
   │
   ▼
File Security & Signature Scanner (MIME, Extension, Size, Binary Header Check)
   │
   ▼
Vision Provider Factory (process.env.VISION_OCR_PROVIDER)
   ├── GoogleVisionProvider (Gemini Multi-Modal Vision)
   └── LocalOCRProvider (Deterministic Extraction & Regex Engine)
   │
   ▼
Clinical Report Normalizer (Classification & Metric Extraction)
   ├── Test Name & Numeric Value
   ├── Preserved Printed Reference Ranges (No hallucinations)
   └── Out-of-Range Flags (LOW, NORMAL, HIGH, CRITICAL)
   │
   ▼
Document Summary Engine (Grounded Findings, Doctor Questions, Disclaimers)
   │
   ▼
Clinical Safety Validator (Blocks Diagnostic Assertions & Dosage Changes)
   │
   ▼
Relational Persistence (ai_documents, ai_document_pages, ai_document_extractions, ai_document_summaries)
   │
   ▼
JARVIS Context Engine (DOCUMENT Relevance Domain) & Presentation Layer
```

---

## 2. Relational Persistence Schema

### 1. `ai_documents`
Stores document metadata, processing status, and user ownership:
- `id` (VARCHAR 64, PK)
- `user_id` (INT, FK -> users)
- `document_type` (`BLOOD_REPORT`, `LAB_REPORT`, `PRESCRIPTION`, `MEDICATION_LABEL`, `VITALS_REPORT`, `DOCTOR_NOTE`, `DISCHARGE_SUMMARY`, `HEALTH_CERTIFICATE`, `GENERAL_HEALTH_DOCUMENT`, `GENERAL_DOCUMENT`, `UNKNOWN`)
- `original_filename` (VARCHAR 255)
- `mime_type` (VARCHAR 100)
- `file_size` (INT)
- `storage_reference` (VARCHAR 255)
- `processing_status` (`UPLOADED`, `PROCESSING`, `EXTRACTED`, `REVIEW_REQUIRED`, `CONFIRMED`, `PROCESSED`, `FAILED`, `DELETED`, `EXPIRED`)
- `uploaded_at`, `processed_at`, `expires_at`, `metadata`

### 2. `ai_document_pages`
Stores per-page OCR transcripts and page-level confidence scores:
- `id` (VARCHAR 64, PK)
- `document_id` (VARCHAR 64, FK -> ai_documents)
- `user_id` (INT, FK -> users)
- `page_number` (INT)
- `ocr_text` (LONGTEXT)
- `confidence_score` (DECIMAL 3,2)
- `metadata`, `created_at`

### 3. `ai_document_extractions`
Stores normalized, traceable clinical metrics:
- `id` (VARCHAR 64, PK)
- `document_id` (VARCHAR 64, FK -> ai_documents)
- `user_id` (INT, FK -> users)
- `field_name` (VARCHAR 150)
- `field_value` (VARCHAR 100)
- `normalized_value` (VARCHAR 100)
- `unit` (VARCHAR 50)
- `reference_range` (VARCHAR 100)
- `flag` (`NORMAL`, `LOW`, `HIGH`, `CRITICAL_LOW`, `CRITICAL_HIGH`, `ABNORMAL`, `UNKNOWN`)
- `category` (VARCHAR 100)
- `confidence_score` (DECIMAL 3,2)
- `page_number` (INT)
- `source_text` (TEXT)
- `extraction_status` (`EXTRACTED`, `REVIEW_REQUIRED`, `CONFIRMED`, `REJECTED`)
- `observed_at`, `created_at`, `updated_at`

### 4. `ai_document_summaries`
Stores structured, non-diagnostic report explanations:
- `id` (VARCHAR 64, PK)
- `document_id` (VARCHAR 64, FK -> ai_documents, UNIQUE)
- `user_id` (INT, FK -> users)
- `summary` (TEXT)
- `key_findings` (JSON)
- `out_of_range_values` (JSON)
- `uncertain_values` (JSON)
- `questions_for_doctor` (JSON)
- `warnings` (JSON)
- `confidence` (DECIMAL 3,2)
- `disclaimer` (TEXT)
- `generated_at`

---

## 3. Clinical Safety & Medical Guardrails
The system strictly prohibits autonomous medical decision making:
1. **No Autonomous Clinical Actions**: JARVIS never asserts diagnoses (*"You have anemia"* is blocked and sanitized to *"The report shows parameters associated with..."*).
2. **No Autonomous Prescriptions / Dosage Changes**: Dosage adjustments (*"Increase your dosage to 50mg"*) are blocked.
3. **No Unconfirmed Medication Modifications**: Extracted prescription items remain in `REVIEW_REQUIRED` status and cannot mutate medication tables without explicit user confirmation through the `ToolRegistry` and `AgentVerifier`.
4. **Mandatory Standard Disclaimer**: All clinical summaries and comparisons display: *"This is an informational summary and not a medical diagnosis. Please consult your qualified healthcare professional regarding any medical questions or clinical results."*

---

## 4. Source Traceability & Document Comparison
Every displayed lab metric allows the user to inspect its originating document and page:
- **Traceability Link**: Tapping `Page X` in the UI immediately opens the raw OCR transcript snippet.
- **Historical Report Comparison**: Compares numerical deltas across multiple confirmed documents (e.g. Hemoglobin: 13.2 $\rightarrow$ 13.8 g/dL, Delta: +0.60 g/dL) without inferring clinical improvement/deterioration.
