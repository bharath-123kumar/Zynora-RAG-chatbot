# Zynora 2.0 Production Rollback Plan & Release Procedure

## 1. Release Identification
- **Current Production Release**: `Zynora v2.0.0`
- **Previous Stable Release**: `Zynora v1.0.0`
- **Git Tag**: `v2.0.0`

---

## 2. Upgrade Summary (v1.0.0 -> v2.0.0)
1. **Persistent Conversations**:
   - Database tables `Conversation` and `Message` added to track conversational history per authenticated user.
   - Strict cross-user data isolation: Users can only read, rename, clear, or delete their own conversations (HTTP 403 enforcement).
2. **Context-Aware Deterministic RAG**:
   - Multi-turn reference resolution enables follow-up reasoning (e.g. *"What comes after Hub?"* -> resolves correctly to *"Command"* in physical hierarchy).
   - Strict RAG boundaries: Never guesses or invents answers; returns fallback message for unanswerable questions.
3. **AI Response Quality Evaluation System**:
   - Per-query evaluation logged in `ResponseEvaluation` table with top score, latency, confidence ratings (`HIGH`, `MEDIUM`, `LOW`, `NONE`), and groundedness verification.
4. **Internal AI Monitoring Dashboard**:
   - Admin console with real database metrics, date filtering, FAQ aggregations, error logs, and health status.
5. **Structured Production Logging & Error Tracking**:
   - Structured JSON logging with trace IDs (`x-trace-id`), action, module, status, and error capture into `ErrorLog`.

---

## 3. Database Rollback Considerations
- The migration was executed non-destructively using Prisma (`prisma db push`).
- Existing `User`, `KnowledgeDocument`, `KnowledgeChunk` (51 approved chunks), and `AuditLog` records remain 100% intact.
- New models (`Conversation`, `Message`, `ResponseEvaluation`, `ErrorLog`) do not alter any legacy columns.

### Rollback Steps (Database):
If a full schema revert to v1.0 is required:
1. Back up current database:
   ```bash
   cp backend/prisma/dev.db backend/prisma/dev.db.v2.bak
   ```
2. Checkout previous schema:
   ```bash
   git checkout v1.0.0 -- backend/prisma/schema.prisma
   ```
3. Re-generate Prisma Client:
   ```bash
   cd backend && npx prisma db push && npx prisma generate
   ```

---

## 4. Backend Rollback Procedure
If the backend requires immediate reversion to v1.0:
1. Terminate running backend process (PID listening on port 5000).
2. Revert backend code:
   ```bash
   git checkout v1.0.0 -- backend/
   ```
3. Restart backend service:
   ```bash
   cd backend
   npm start
   ```
4. Verify health endpoint:
   ```bash
   curl http://localhost:5000/health
   ```

---

## 5. Frontend Rollback Procedure
If the frontend requires immediate reversion to v1.0:
1. Revert frontend source code:
   ```bash
   git checkout v1.0.0 -- frontend/
   ```
2. Rebuild production bundle:
   ```bash
   cd frontend
   npm run build
   ```
3. Restart frontend server.

---

## 6. Verification Checklist After Rollback
- [ ] Backend responds with 200 on `http://localhost:5000/health`
- [ ] Frontend loads at `http://localhost:3000`
- [ ] User login works (`user@zyngram.com` / `UserPass123!`)
- [ ] Admin login works (`admin@zyngram.com` / `AdminPass123!`)
- [ ] 15 standard RAG assessment queries pass
