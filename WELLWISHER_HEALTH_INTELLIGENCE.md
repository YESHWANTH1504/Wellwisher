# WellWisher — Health Intelligence & Biomarker Trend Engine Reference

## 1. Tracked Biomarker Dimensions
The Health Trend Engine tracks 14 core physiological metrics:
- **Blood Glucose / Fasting Blood Glucose (FBS)** (`mg/dL`)
- **Glycated Hemoglobin (HbA1c)** (`%`)
- **Total Cholesterol** (`mg/dL`)
- **LDL Cholesterol** (`mg/dL`)
- **HDL Cholesterol** (`mg/dL`)
- **Triglycerides** (`mg/dL`)
- **Hemoglobin** (`g/dL`)
- **WBC Count** (`/mcL`)
- **Platelets** (`x10^3/mcL`)
- **Serum Creatinine** (`mg/dL`)
- **Blood Pressure** (`mmHg`)
- **Heart Rate / Pulse** (`bpm`)
- **Oxygen Saturation (SpO2)** (`%`)
- **Body Weight** (`kg`)

---

## 2. Mathematical Delta & Trend Formulations
- **Absolute Delta**: $\Delta = V_{\text{latest}} - V_{\text{previous}}$
- **Percentage Change**: $\% \Delta = \frac{V_{\text{latest}} - V_{\text{previous}}}{|V_{\text{previous}}|} \times 100$
- **Direction Rules**:
  - `INCREASING` if $\Delta > +0.05$
  - `DECREASING` if $\Delta < -0.05$
  - `STABLE` if $|\Delta| \le 0.05$
  - `INSUFFICIENT_DATA` if observations count $N < 2$.

---

## 3. Health Trend Alert Engine
- **Persistent Out of Range ($\ge 3$ consecutive reports)**: Severity `HIGH`
- **Repeated Out of Range (2 consecutive reports)**: Severity `MEDIUM`
- **Significant Drift ($\ge 20\%$ numerical shift)**: Severity `MEDIUM`
- **Duplicate Suppression**: Re-evaluating existing active alerts updates timestamps rather than creating duplicate active notifications.
- **Fatigue Protection**: Routed through `ProactiveDecisionEngine` respecting quiet hours and daily delivery caps.

---

## 4. Medication Intelligence Engine
- **Dosage Discrepancy Detection**: Compares active schedule dosage with document extractions.
- **Unrecorded Medication Discovery**: Flags newly appearing prescription medications for user and clinician discussion.
- **Duplicate Detection**: Identifies multiple active prescriptions for similar drugs.
- **Read-Only Invariance**: Active medication tables remain completely untouched.
