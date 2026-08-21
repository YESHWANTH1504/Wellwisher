# WellWisher Multi-Modal AI & Vision Architecture Guide

## 1. Overview & Core Philosophy
WellWisher’s JARVIS Multi-Modal Vision and Clinical Document Understanding System delivers high-fidelity, grounded clinical metric extraction while upholding strict safety boundaries:
- **Informational & Non-Diagnostic**: JARVIS structures and summarizes data but never issues diagnoses or prescribes clinical interventions.
- **Traceable to Source**: Every extracted lab metric, vital sign, and prescription field maintains pointer references to originating document pages.
- **Auditable & Reversible**: Deletion of documents cascades through relational tables and requires user verification.

---

## 2. Supported Clinical Document Types
| Document Type | Key Extraction Fields | Safety Rules |
| :--- | :--- | :--- |
| `BLOOD_REPORT` | Hemoglobin, WBC, Platelets, RBC, Hematocrit, Fasting Glucose, HbA1c, Serum Creatinine, Lipids, Liver Enzymes (ALT/AST), TSH, Free T4 | Reference ranges extracted verbatim from document. Out-of-range values flagged (`LOW`, `HIGH`, `CRITICAL`). |
| `LAB_REPORT` | Electrolytes (Sodium, Potassium, Chloride), BUN, eGFR, Urinalysis | No clinical diagnosis inferred. Summary provides grounded explanations and suggested questions for doctor. |
| `PRESCRIPTION` | Medication Name, Dosage, Frequency, Route, Duration, Refills | Status set to `REVIEW_REQUIRED`. Requires explicit user confirmation before any schedule or medication record mutation. |
| `MEDICATION_LABEL` | Drug Name, Strength, Warnings, Expiration Date | Informational storage. |
| `VITALS_REPORT` | Blood Pressure, Heart Rate, SpO2, Temperature, Respiratory Rate | Structured metric extraction with out-of-range indicators. |
| `DOCTOR_NOTE` / `DISCHARGE_SUMMARY` | Clinical notes, follow-up instructions | Extracted with standard disclaimer. |

---

## 3. Vision Provider Architecture
```dart
                 ┌────────────────────────────────┐
                 │       VisionProvider (Base)     │
                 └───────────────┬────────────────┘
                                 │
            ┌────────────────────┴────────────────────┐
            ▼                                         ▼
┌────────────────────────┐               ┌────────────────────────┐
│  GoogleVisionProvider  │               │    LocalOCRProvider    │
│  (Gemini Multi-Modal)  │               │   (Deterministic &     │
│                        │               │     Regex Engine)      │
└────────────────────────┘               └────────────────────────┘
```
The provider is selected at runtime via `process.env.VISION_OCR_PROVIDER` (`google` vs `local`), ensuring offline/mock test predictability and seamless cloud multi-modal scaling.

---

## 4. API Endpoints
All endpoints are secured via JWT authentication and scoped strictly to `req.user.id`:
- `POST /api/ai/documents/upload` — Ingests file (multipart or base64) and initiates full extraction pipeline.
- `GET /api/ai/documents` — Lists user's health documents with pagination and optional `documentType` filtering.
- `GET /api/ai/documents/search?query=...` — Searches user's documents by filename or test content.
- `GET /api/ai/documents/:id` — Returns single document metadata.
- `GET /api/ai/documents/:id/summary` — Returns grounded summary, out-of-range values, warnings, doctor questions.
- `GET /api/ai/documents/:id/extraction` — Returns structured metrics and per-page OCR transcripts.
- `POST /api/ai/documents/:id/confirm` — User verification of extracted fields.
- `POST /api/ai/documents/compare` — Test-by-test comparison between two reports.
- `DELETE /api/ai/documents/:id` — Cascading deletion of document, pages, extractions, and summaries.
- `POST /api/ai/documents/clear` — Clears all user document records.

---

## 5. Flutter Multi-Modal Experience
1. **Document Center**: Accessible from JARVIS AppBar and drawer (`/jarvis/documents`).
2. **Scanner & Ingestion**: Allows sample lab reports, camera scan, or OCR paste with real-time pipeline status animation (`/jarvis/documents/upload`).
3. **Traceability Inspector**: Tap any metric's source page badge to open a bottom modal with the exact OCR transcript and snippet match.
4. **Historical Comparison**: Compares numeric trends across lab visits with delta badges (`/jarvis/documents/compare`).
