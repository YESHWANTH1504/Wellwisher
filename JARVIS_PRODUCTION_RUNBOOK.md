# WellWisher JARVIS: Production Operations Runbook

**Version**: 3.0.0 — Production Launch Candidate  
**Target Environment**: Enterprise Android OS & Node.js Production Cluster  
**Governing Standard**: Zero-Simulation & Continuous Reliability  

---

## 1. Core Operational Modes & Commands

| Command | Action / Mode | Effect |
| :--- | :--- | :--- |
| `JARVIS STOP ALL` | **Emergency Stop** | Immediately halts all active TTS speech, blocks active mutations, cancels in-flight workflows, releases all held locks, enters safe standby. |
| `JARVIS SAFE MODE` | **Safe Mode** | Restricts high-impact autonomous mutations (external messaging, deletions); maintains read-only queries and diagnostic checks. |
| `JARVIS RECOVERY MODE` | **Recovery Mode** | Scans WAL checkpoints, reconciles live provider states, and resumes incomplete steps without duplicate executions. |
| `JARVIS DIAGNOSTIC MODE` | **Diagnostic Mode** | Runs full 16-capability Android and backend health diagnostics; outputs p50/p95/p99 latency percentiles and error budgets. |

---

## 2. Operational Procedures

### Procedure 1: First Startup & Configuration Audit
- **Preconditions**: Target environment initialized with production `.env`.
- **Execution**: Run `productionConfigValidator.enforceProductionSanity()`.
- **Validation**: Ensures zero `MOCK_PROVIDERS`, zero `SIMULATE_ANDROID`, and valid database connectivity.

### Procedure 2: Daily System Diagnostics
- **Trigger**: Automated 06:00 AM cron or user voice command *"Run health check"*.
- **Inspection**: `SelfDiagnosticsEngine.runHealthCheck()`.
- **Output**: Reports provider health, exact alarm special access status, and battery whitelist advisories.

### Procedure 3: Emergency Assistant Shutdown (`JARVIS STOP ALL`)
- **Trigger**: User command *"Emergency stop"* or critical error threshold breach.
- **Execution**:
  1. `ProductionActionGateway.triggerEmergencyStop()`.
  2. `TextToSpeech.stop()` and audio focus abandoned (< 100ms).
  3. `ConcurrencyLockManager.clear()`.
  4. Active workflows transitioned to `REQUIRES_USER`.

### Procedure 4: Safe Mode Activation & Exit
- **Activation**: `ProductionActionGateway.enableSafeMode()`.
- **Exit**: `ProductionActionGateway.disableSafeMode()`.
- **Behavior**: While active, all mutations require explicit user confirmation prompts.

### Procedure 5: Process Death & Reboot Recovery
- **Trigger**: Application restart following unexpected process termination (`kill -9`) or system reboot.
- **Execution**:
  1. `ProcessRecoveryManager.recoverAllInterruptedWorkflows(providerFetchers)`.
  2. For each step: query live provider.
  3. If already applied on provider -> mark `COMPLETED` and DO NOT re-execute.
  4. Resume first incomplete safe step.

### Procedure 6: Privacy & Persistent Data Purge
- **Trigger**: User commands *"Forget everything you know about me"* or *"Clear my activity history"*.
- **Execution**:
  1. `PrivacyAndMemoryManager.forgetByKey(userId, pattern)` or `clearActivityHistory(userId)`.
  2. Physical record removal from SQLite/disk.
  3. Post-deletion verification assert query.

### Procedure 7: Offline Operation & Network Reconnection
- **Offline Transition**: `ConnectivityStateManager.setConnectivity('OFFLINE')`.
  - Local database and calendar tools continue. Cloud operations report `UNAVAILABLE`. Safe non-destructive tasks queue in memory.
- **Network Reconnection**: `ConnectivityStateManager.reconcilePendingQueue(executor)`.
  - Suppresses duplicate idempotency keys. Reconciles state before committing.

### Procedure 8: Schema Migration & Rollback
- **Execution**: `SchemaMigrationManager.migrateTo(targetVersion)`.
- **Failure Handling**: On error, automatic rollback executes down to the initial version, preserving state integrity.

---

## 3. Incident Escalation Matrix

| Incident Severity | Trigger Condition | System Action | Operator Action |
| :--- | :--- | :--- | :--- |
| **LOW** | Single transient timeout | Automatic exponential retry (max 3) | None |
| **MEDIUM** | State drift on external change | Halt mutation, preserve live state, prompt user | Review calendar sync |
| **HIGH** | Permission revoked mid-action | Preserve WAL checkpoint, explain missing permission | Grant permission in Settings |
| **CRITICAL** | Database corruption or config breach | Fail closed, block startup | Restore from WAL backup |
