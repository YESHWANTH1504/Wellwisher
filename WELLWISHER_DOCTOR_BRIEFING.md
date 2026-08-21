# WellWisher — Doctor Visit Preparation & Clinical Briefing Engine

## 1. Overview
The Doctor Visit Preparation Engine compiles a structured 1-page clinical briefing summarizing recent biomarkers, mathematical trends, out-of-range observations, current medications, reconciliation discussion points, and targeted questions for healthcare consultations.

---

## 2. Briefing Document Structure
1. **Patient Overview**: Name, User ID, Date of Generation.
2. **Recent Measurements**: Vitals and latest laboratory values with units and collection dates.
3. **Biomarker Trajectories**: Previous value $\rightarrow$ Latest value with absolute and percentage deltas.
4. **Out-of-Range Results**: Extracted strictly from printed lab report reference ranges.
5. **Current Medications**: Active schedule + dosage + timings.
6. **Discussion Points**: Medication review items labeled `DISCUSSION POINT` (`REQUIRES_CLINICIAN_REVIEW`, `REVIEW_RECOMMENDED`).
7. **Prepared Questions for Doctor**: Tailored practical questions based on verified shifts.
8. **Source Document Citations**: Audit trace of all reports contributing to the briefing.
9. **Mandatory Non-Diagnostic Notice**:
   > *"This briefing is generated strictly from personal records for consultation organization. It does not constitute a medical diagnosis, treatment plan, or prescription."*

---

## 3. PDF Export and Native Printing
- Compiles via `pdf` and `printing` packages in Flutter.
- Formatted as a high-density, professional A4 consultation document.
- Fully user-controlled: export and printing are triggered exclusively by explicit user actions.
