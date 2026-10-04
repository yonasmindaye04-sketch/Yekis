# Customer Support Chat — Implementation Plan

Date: 2026-10-03
Status: **Approved. Stage 1 complete and verified; Stage 2 next.** Decisions in §6.

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

### Stage 1 — Security ✅ COMPLETE
| # | Work | Files | Est |
|---|---|---|---|
| 1.1 | Rate-limit `POST /chat/guest` (**20/hour/IP**) and `POST /chat/upload` (**60/hour**) | `chat.routes.ts` | done |
| 1.2 | Storage key no longer contains the uploader's `userId`; sharded by uuid prefix | `objectStore.ts` | done |
| 1.3 | Attachment route authorizes every read; `Cache-Control: private, no-store`; `nosniff` **(Q1 = A)** | `chat.routes.ts`, `chat.service.ts`, `SecureAttachment.tsx` | done |
| 1.4 | Guest attachments actually work via the scoped token (F3) | `chat.routes.ts`, `LandingSupportChat.tsx` | done |
| 1.5 | Regression tests: authorization (6), route surface (8) | `tests/` | done |

**Also added:** `ChatMessage_attachmentUrl_idx` migration (`20261003160000`) so the
ownership lookup is an indexed point lookup.

**Access policy, now explicit:** the thread owner (including a guest holding the scoped
token) and any **staff** may read an attachment. Staff access is intentional — the support
desk cannot help without seeing the customer's screenshot. Non-participants get `404`,
not `403`, so the endpoint cannot be used to probe which keys exist.

**Live verification:** owner `200` · non-staff stranger `404` · anonymous `401` · staff `200`
· guest intake limiter returns `429` after exactly 20 calls · key contains no user id.

**Bug found and fixed during this stage:** `POST /api/v1/chat/support` had been deleted
accidentally when the Chatwoot block was removed. TypeScript stayed green because the
frontend holds the path as a string. Restored, and `tests/chat-routes.test.ts` now pins
the router surface so this class of regression fails CI. The guard was mutation-tested:
renaming the path makes it fail.

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

## 6. Decisions (2026-10-03)

**Q1 — Attachment delivery: Option A, authorized proxy.**
The route requires authentication and authorization on every read; the browser loads
through `fetch` + `objectURL` instead of `<img src>`. Shared caching is removed.
Accepted costs: no HTTP caching, and an extra server round trip per attachment.
Rejected: Option C (a leaked URL stays valid forever — unacceptable for screenshots
that may contain bank details), and Option B (deferred; presigning stays available if
attachment bandwidth ever becomes a real cost).

**Q2 — Compliance: design for GDPR by default, which subsumes PDDP.**
Applies the stricter standard uniformly rather than maintaining two regimes. In practice
this means: no personal identifiers in URLs, `private` caching on personal data, consent
captured before chat, and a documented path for data export/deletion. Full GDPR
programme work (retention automation, DPIA, erasure workflow) is **not** in Stages 1–5;
it is tracked as future work rather than silently skipped.

**Q3 — CSAT: in-chat, single-click rating on close.** Highest response rate and no email
dependency. An emailed survey can be added later as a secondary path.

**Q4 — Internal notes: readable by all staff.** Keeps handoffs cheap; per-note ACLs add
complexity for no current benefit. Only the author may delete their own note.

**Q5 — Guest attachments: enabled properly via the scoped token.** The paperclip stays.
The control is currently shown and the file silently dropped (F3), which is the worst
outcome. Guest uploads are authorized by their scoped token, rate limited, and size
capped.

**Additional direction accepted:** F3 is pulled into Stage 1 rather than deferred, since
a visible control that discards data is a defect, not a missing feature.

---

## 7. Rollback

Every stage is additive: new nullable columns, new tables, new guarded branches on read paths.
Reverting is dropping the migration and reverting the commit. No destructive change to existing
conversation or message data is planned at any stage.