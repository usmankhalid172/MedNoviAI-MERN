# Pull Request: Fix BOOK-04 (P2) — Cancellation Dialog Remains Open After Cancellation

## 1. Finding ID
**BOOK-04 (P2)**

---

## 2. Problem
After a patient successfully cancels an appointment from the patient appointments dashboard (`/patient/appointments`), the cancellation confirmation dialog remained open instead of closing automatically. Although the backend updated the appointment status to `cancelled`, the dialog remained overlaying the screen with active buttons ("Keep Appointment" and "Yes, Cancel"). If the patient clicked "Yes, Cancel" again, a duplicate API request was triggered, resulting in a confusing `409 Conflict: This appointment is already cancelled.` error.

---

## 3. Root Cause
1. **Modal Visibility State Not Reset on Success:** In `src/app/patient/appointments/page.tsx`, the `CancelModal` was rendered conditionally based on `cancelId` (`{cancelId && <CancelModal ... />}`). The callback provided to `onSuccess` was `refresh` (`() => setRefreshKey((k) => k + 1)`), which triggered an appointment list refetch but never called `setCancelId(null)`.
2. **Modal Component Omitted `onClose` Call:** In `src/components/appointments/CancelModal.tsx`, `handleCancel` called `onSuccess()` after receiving a successful response from `cancelAppointment(appointmentId)`, but never invoked `onClose()` to dismiss the dialog.
3. **Missing Guard Against In-Flight Submissions:** `handleCancel` lacked an in-flight check (`if (loading) return;`), allowing rapid repetitive clicks or keyboard triggers to submit duplicate cancellation requests while a request was already processing.
4. **Unhandled Rejections:** Any unexpected error during the API call lacked structured `try...catch` handling to gracefully maintain the dialog state, surface an actionable error message, and re-enable safe retry or dismissal.

---

## 4. Summary of Fix
1. **`src/components/appointments/CancelModal.tsx`**:
   - Added duplicate submission prevention guard (`if (loading) return;`) at the top of `handleCancel`.
   - Wrapped the cancellation API call in `try...catch` to reliably catch errors and surface fallback messaging without crashing or closing improperly.
   - On successful cancellation (`result.ok === true`), reset `loading` to `false`, invoked `onClose()` to close the modal, and invoked `onSuccess()` to notify the parent container.
   - On failure (`!result.ok` or catch), set the error message, reset `loading = false`, and kept the dialog open so the user can either retry or safely click "Keep Appointment".

2. **`src/app/patient/appointments/page.tsx`**:
   - Implemented `handleCancelSuccess` callback that explicitly resets modal state (`setCancelId(null)`), displays a success toast notification via `toast.success("Appointment cancelled successfully.")`, and triggers a non-disruptive list refresh (`refresh()`).
   - Connected `CancelModal`'s `onSuccess` prop to `handleCancelSuccess` and `onClose` to `() => setCancelId(null)`.
   - Preserved tab selection, scroll position, and existing status badge presentation without requiring manual page reload.

---

## 5. Testing Steps

### Scenario 1: Successful Cancellation
**Steps:**
1. Navigate to `/patient/appointments`.
2. Under the **Upcoming** tab, locate an active appointment card and click **Cancel**.
3. In the "Cancel Appointment?" modal, click **Yes, Cancel**.
4. Observe the network request to `PATCH /api/appointments/[id]` with payload `{"action":"cancel"}`.

**Actual Results:**
- API responds with HTTP 200 `{ "appointment": { ... "status": "cancelled" } }`.
- The cancellation modal closes automatically and immediately upon success.
- A success toast notification appears: `"Appointment cancelled successfully."`
- The appointment list refreshes automatically in place without a full browser reload.
- The cancelled appointment is moved to the **Past** tab with the red badge status `cancelled`.
- The Upcoming tab counter decreases and the Past tab counter increases accordingly.

### Scenario 2: Unsuccessful Cancellation (API Error / Network Failure)
**Steps:**
1. Navigate to `/patient/appointments`.
2. Click **Cancel** on an appointment card to open the modal.
3. Simulate an API failure (e.g., server returns error or client is offline).
4. Click **Yes, Cancel**.

**Actual Results:**
- API call fails or returns `{ ok: false, message: "..." }`.
- The cancellation modal remains open.
- An appropriate error message is displayed directly inside the modal (e.g., `"Network error. Please check your internet connection."` or `"Failed to cancel appointment. Please try again."`).
- The modal buttons ("Keep Appointment" and "Yes, Cancel") are re-enabled, allowing the user to retry or safely close the dialog without state corruption.

### Scenario 3: In-Flight Duplicate Request Prevention
**Steps:**
1. Open the cancellation dialog for an appointment.
2. Rapidly trigger multiple clicks on the **Yes, Cancel** button while the network request is pending.

**Actual Results:**
- The button is disabled (`loading = true`, text reads `"Cancelling..."`).
- The in-flight lock (`if (loading) return;`) prevents subsequent invocations.
- Exactly one PATCH request is dispatched to the backend.

---

## 6. Evidence

### Automated Test Suite Results
An automated test suite was executed using `node:test` covering reproduction and fix verification:
```
✔ REPRODUCTION: Dialog remains open after successful cancellation in current code (0.9595ms)
✔ FIX VERIFICATION: Dialog closes automatically after successful cancellation (0.6841ms)
✔ FIX VERIFICATION: Dialog remains open with error message on failure (0.4004ms)
✔ FIX VERIFICATION: Duplicate requests are prevented while loading (59.0436ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 224.7299
```

### Static Analysis and Production Build
1. **ESLint on modified files:**
   ```bash
   npx eslint src/app/patient/appointments/page.tsx src/components/appointments/CancelModal.tsx
   # Exit code: 0 (No warnings, no errors)
   ```
2. **Next.js Production Build:**
   ```bash
   npm run build
   # ▲ Next.js 16.3.4 (Turbopack)
   # ✓ Compiled successfully in 2.0s
   # ✓ Finished TypeScript in 5.6s
   # ✓ Generating static pages using 7 workers (19/19) in 1132ms
   # Exit code: 0
   ```

### UI Screenshots Placeholders
<!-- [SCREENSHOT PLACEHOLDER 1: BEFORE FIX] -->
<!-- Description: Appointment cancellation dialog remaining open after successful cancellation, with the underlying appointment removed or updated behind it. -->
<!-- File: docs/evidence/book-04-cancellation-dialog-stuck-before.png -->

<!-- [SCREENSHOT PLACEHOLDER 2: AFTER FIX - SUCCESSFUL CANCELLATION] -->
<!-- Description: Appointment cancellation dialog closes automatically, toast "Appointment cancelled successfully." appears, and the cancelled appointment is displayed under Past tab with "cancelled" status badge. -->
<!-- File: docs/evidence/book-04-cancellation-success-closed-after.png -->

<!-- [SCREENSHOT PLACEHOLDER 3: AFTER FIX - FAILED CANCELLATION] -->
<!-- Description: Cancellation failure displaying inline error message in modal while keeping modal open for retry or dismissal. -->
<!-- File: docs/evidence/book-04-cancellation-error-retry.png -->

