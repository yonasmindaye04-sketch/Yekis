# Customer Support Chat — Implementation Plan

Date: 2026-10-03
Status: **Approved — Stage 1 in progress.** Decisions recorded in §6.

Scope: hardening and completing the **native** support chat. Chatwoot was removed on
2026-10-03 (see CHANGELOG "Removed"); support now runs entirely on our own engine.
This plan does not reintroduce any third-party agent inbox.

---

## 1. What already works (do not rebuild)

Verified in the current codebase:

| Capability | Where |
|---|---|
| Realtime messaging, typing, read receipts | `lib/socket.ts`, `ChatWorkspace.tsx` |
| Guest support with conversation-scoped token | `guestSupportToken.ts`, `middleware/auth.ts` |
| Ticket auto-assignment to the least-loaded staff | `chat.service.ts` `pickAvailableStaff` |
| Claim / reassign | `POST /chat/admin/conversations/:id/claim`, `PATCH .../assign` |
| OPEN/CLOSED workflow | `Conversation.status` |
| Attachments (upload + stream) | `chat.routes.ts` `/upload`, `/attachments/:key(*)` |
| Staff queue UI | `StaffDashboard.tsx` |
| Staff alerting | `lib/staffAlerts.ts` via BullMQ |
| Audit log with IP, actor role, state snapshots | `model AuditLog` |
| WebSocket channel authorization | `lib/socket.ts` `isConversationParticipant` |
| Anti-circumvention contact filtering | `middleware/circumvention.middleware.ts` |

**Deliberately not adopting** from the reference report: microservices, Kafka/Cassandra/
Elasticsearch, Kubernetes, DataDog, third-party CRM connectors. This is a Node monolith on
Postgres + Redis + BullMQ; that stack is a multi-team program solving a throughput problem we
do not have, and adopting it would be a regression.

---

## 2. Verified findings

### F1 — Attachment endpoint has no authorization *(medium-high)*
`chat.routes.ts` → `chatRouter.get("/attachments/:key(*)")` has no auth middleware, and
`lib/objectStore.ts` → `getChatAttachmentStream()` issues a raw `GetObject` with no ownership
or conversation check. Response is sent with `Cache-Control: public, max-age=86400`.

Storage keys are `chat-attachments/{userId}/{uuid}-{safeName}`, so the random UUID means
guessing is infeasible — **correcting my earlier overstatement**. The real problems are:

1. A URL that leaks once (pasted in chat, forwarded, proxy/CDN log) grants **permanent** access.
2. `Cache-Control: public` allows shared proxies/CDNs to cache and re-serve private content.
3. The uploader's `userId` is embedded in the URL, so it lands in access logs and referrers.

### F2 — Public guest endpoint is effectively unthrottled *(high)*
`POST /api/v1/chat/guest` is unauthenticated and creates a `User` + `Conversation` + rows per
call. It has no route-level limiter; only the global `2000 / 15min` in `app.ts` applies.
That is ~2.2 writes/sec sustained, per IP-unrestricted.

### F3 — Guest file attachments are silently dropped *(functional)*
`LandingSupportChat.tsx` shows a paperclip and puts the filename in the composer, but
`handleSendMessage` calls `sendGuestChatMessage(conversationId, token, text)` — text only.
The file is never uploaded. `/upload` is behind `requireAuth`, so a guest could not upload
even if the client tried.

### F4 — First-response time is not recorded *(gap)*
No `firstReplyAt` / `firstResponseAt` field anywhere. FRT is the primary support KPI and is
also the input to any future SLA.

### F5 — No CSAT *(gap)*
No rating/survey/feedback model or endpoint.

### F6 — No internal agent notes *(gap)*
No way to leave a staff-only annotation. Staff must currently post public replies, which leaks
internal reasoning to the customer.

### F7 — Audit coverage is thin *(gap)*
Only `SUPPORT_CONVERSATION_CREATED` and `DIRECT_CONVERSATION_CREATED` are audited. Status
changes, claim, reassignment and messages are not — despite `AuditLog` already having the
right columns (`actorRole`, `previousState`, `newState`, `ipAddress`).

### F8 — No chat priority/severity, SLA, or agent macros *(deferred)*
`Conversation` carries only subject/status/assignee/timestamps.

---

## 3. Sequencing

Ordered by risk-reduction per unit of effort, not by feature count. Each stage is
independently shippable and independently revertible.

### Stage 1 — Security (do first, no dependencies)
| # | Work | Files | Est |
|---|---|---|---|
| 1.1 | Rate-limit `POST /chat/guest` (per-IP, generous but bounded) and `POST /chat/upload` | `chat.routes.ts` | 20 min |
| 1.2 | Strip `userId` from the storage key → opaque path | `objectStore.ts` | 15 min |
| 1.3 | Attachment delivery: authorize + stop public caching **(see Q1)** | `chat.routes.ts`, `objectStore.ts`, frontend | 2–4 h |
| 1.4 | Regression tests for 1.1–1.3 | `tests/` | 1 h |

**Risk:** 1.3 can break attachment rendering if done wrong — that is why Q1 must be answered first.

### Stage 2 — Metrics foundation
| # | Work | Files | Est |
|---|---|---|---|
| 2.1 | Add `Conversation.firstReplyAt DateTime?` + migration | `schema.prisma`, migration | 20 min |
| 2.2 | Set it once, on the first staff message in a thread (idempotent) | `chat.service.ts` | 45 min |
| 2.3 | Surface FRT in the staff queue | `StaffDashboard.tsx`, `chat.service.ts` | 1 h |
| 2.4 | Tests: FRT set exactly once, not by the customer | `tests/` | 45 min |

### Stage 3 — Internal notes
| # | Work | Est |
|---|---|---|
| 3.1 | `ChatMessage.visibility String @default("CUSTOMER")` + migration | 20 min |
| 3.2 | Staff-only filter on every read path (messages, list, socket push) | 1.5 h |
| 3.3 | Note composer in the staff queue UI | 1.5 h |
| 3.4 | Tests: a customer can never read a note via any endpoint | 1 h |

**Risk:** the socket broadcast and `listMessages` are the two places notes can leak. Both must be covered explicitly.

### Stage 4 — CSAT
| # | Work | Est |
|---|---|---|
| 4.1 | `ChatSatisfaction` model (conversationId, score 1–5, comment, createdAt) + migration | 30 min |
| 4.2 | Submit endpoint, scoped to the thread (guest token or session) | 45 min |
| 4.3 | Prompt on close in both the guest widget and `ChatWorkspace` | 1.5 h |
| 4.4 | Show aggregate CSAT in the staff dashboard | 1 h |
| 4.5 | Tests: one rating per closed conversation, guest-scoped | 1 h |

### Stage 5 — Audit completeness
Record `SUPPORT_STATUS_CHANGED`, `SUPPORT_CLAIMED`, `SUPPORT_REASSIGNED`, and a
`SUPPORT_MESSAGE_SENT` metadata event, using the `AuditLog` columns that already exist.

### Stage 6 — Deferred (revisit only with real volume)
Priority/severity, SLA targets + breach alerting, agent macro library, knowledge base.
Rationale: each needs real ticket data to calibrate, and a KB with no content is maintenance
burden with no return. Reassess once FRT/CSAT show actual traffic.

---

## 4. Out of scope (explicitly)

- Reintroducing Chatwoot or any third-party agent inbox.
- Microservices / Kafka / Cassandra / Elasticsearch / Kubernetes.
- Voice, SMS, WhatsApp, Twitter/Facebook channels.
- CRM/ERP connectors, billing-initiated refunds from chat.
- GDPR/CCPA/HIPAA compliance programme (see Q2 — the current regime appears to be Ethiopia's PDDP).
- Machine translation of chat.

---

## 5. Instrumentation to add alongside

So the later stages are evidence-driven rather than guess-driven:

- FRT p50 / p90 per queue and per agent.
- Open-ticket count and age distribution (oldest unassigned).
- Conversations closed per agent per day.
- CSAT average, with n.
- Guest→ticket conversion (visitors who opened the widget vs created a ticket).

---

## 6. Open questions (answers needed before Stage 1)

**Q1 — How should attachments be delivered?** This is the only blocking decision.
- **A. Authorize the route + fetch-with-token in the browser (blob URL).** Strongest:
  unauthorized reads are impossible. Cost: frontend must load attachments via
  `fetch` + `objectURL` instead of `<img src>`; download links need an authorized
  fetch too; loses HTTP caching. Recommended.
- **B. Short-lived presigned object-store URLs**, generated by an authorized endpoint at
  render time. Browser loads directly, no blob plumbing. Cost: one signed-URL call per
  attachment render; URLs expire (so refresh needed); presigner is already a dependency.
- **C. Minimal: keep public URLs, remove the userId from keys, set `Cache-Control: private`.**
  Cheapest, stops the caching and PII issues, but a leaked URL is still permanent.

**Q2 — Compliance regime: PDDP only, or also GDPR/CCPA?** Affects retention windows,
consent capture and the right-to-erasure workflow. Does not block Stages 1–4.

**Q3 — CSAT channel?** In-chat 1–5 stars on close (recommended: highest response rate, no
email dependency) vs emailed survey vs both.

**Q4 — Internal note visibility?** All staff can read (recommended; matches how support desks
work and keeps handoffs cheap) vs assigned-agent-only vs per-note ACL.

**Q5 — Should guests be able to attach files at all?** Today the control is shown but the file
is dropped. Options: support it properly (scoped upload token), hide the paperclip for guests,
or keep visible and fix it.

**Q6 — Confirm sequencing.** Proceed Stage 1→5 as written, or stop after Stage 1 (security) and
re-review?

---

## 7. Rollback

Every stage is additive: new nullable columns, new tables, new guarded branches on read paths.
Reverting is dropping the migration and reverting the commit. No destructive change to existing
conversation or message data is planned at any stage.