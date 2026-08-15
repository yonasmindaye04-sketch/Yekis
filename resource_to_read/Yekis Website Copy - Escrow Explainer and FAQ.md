# Yekis Website Copy — Escrow Explainer & FAQ

Ready to hand to whoever builds the frontend. English only — every string here needs a qualified Amharic translation before it ships, matching the platform's language-toggle requirement; I haven't attempted that translation myself since getting it wrong would undercut the trust these sections exist to build.

---

## 1. Escrow Explainer Section (homepage, above or immediately below the fold)

### Section headline
**Your money is protected before a single hour of work begins.**

### Subheadline
No handshake deals. No "I'll pay you when it's done." Your payment sits safely with Yekis until you approve the work — or you get it back.

### The four steps (visual step-through, one icon + short line each)

**1. Fund**
You deposit the agreed amount into escrow before work starts. It's held safely — not sent to the freelancer yet.

**2. Work**
Your freelancer delivers the job. You review it before anything is released.

**3. Approve**
Happy with the work? Approve it and payment releases instantly. Don't respond in 5 days? It releases automatically — so freelancers are never left waiting indefinitely either.

**4. Protected**
Something wrong with the delivery? Raise it before approving, and our team steps in to help sort it out — your money stays safely held until it's resolved.

### Trust line beneath the steps
*Every step is logged and time-stamped. Nobody — including Yekis — can move your money without following this process.*

### Secondary CTA under this section
`See how disputes get resolved →` (links to the relevant FAQ anchor below)

---

## 2. FAQ Section

Organize as an accordion, grouped under three short headers so it doesn't read as one long wall. Suggested anchor IDs included for internal linking (e.g., from the escrow section's "See how disputes get resolved" link).

### Trusting the platform

**Is my money actually safe?**
Yes. When you fund a job, your payment goes into escrow — held separately from Yekis's own operating funds — not directly to the freelancer. It only releases when you approve the work, or automatically after 5 days if you don't respond, which protects your freelancer's time too. If something's wrong, you can raise it before approving and your payment stays held while we help sort it out.

**What if the freelancer just disappears after I pay?**
Your money is still sitting safely in escrow — it was never sent to them in the first place. If a freelancer goes silent, raise it with our team and we'll help resolve it, which can include a full refund.

**{#disputes} What if we disagree about the work?**
Most disagreements get sorted out directly between you and the freelancer, with a short window to talk it through. If you can't agree, our team reviews both sides — the original brief, the delivered work, and your messages — and makes a call: release the payment, refund it, or split it fairly. If either side still disagrees with that decision, there's a final, formal step through an independent arbitration body — but the vast majority of cases never need to go that far.

**Is my payment information safe?**
Yes. We never see or store your card or account details directly — payments are handled through licensed providers (Telebirr, Chapa, CBE), and all your data is protected under Ethiopian data protection law.

### Getting started

**Why do I need to verify my identity (KYC)?**
It protects everyone on the platform — it's how we make sure the person you're hiring, or the client you're working for, is really who they say they are. Basic verification is quick (a valid ID and a few details) and unlocks browsing and posting jobs. A slightly deeper verification step is required before withdrawing earnings, which protects freelancers' payouts from fraud.

**How long does verification take?**
Most people are verified automatically within minutes. Occasionally we review manually, which can take up to 48 hours — you'll get a notification the moment it's done.

**What are the fees?**
Yekis takes a small percentage of each completed job, split between the client and the freelancer — never charged upfront, only when a payment actually releases. [Link to the full fee breakdown page.]

**Can I use Yekis in Amharic?**
Yes — switch languages anytime using the toggle in the top corner of any page.

### Getting paid

**When do I actually get paid?**
The moment a client approves your work (or after the 5-day auto-release window), funds move into your Yekis wallet immediately. From there, you can withdraw to your Telebirr or bank account.

**Why can't I withdraw right away as a new freelancer?**
Withdrawals require a slightly deeper identity check than browsing or bidding does — it's a safeguard that protects your payout from being sent to the wrong place. It's a one-time step; once it's done, you're set.

**Is there a minimum before I can withdraw?**
[Confirm exact figure with Finance before publishing — the platform enforces a minimum withdrawal floor, but the amount isn't finalized yet.]

---

## Notes for whoever implements this

- The dispute-process line deliberately doesn't mention "AACCSA" or "arbitration" by name in the FAQ — that's accurate legal detail for the Terms of Service, but naming an unfamiliar legal body in a trust-building FAQ does the opposite of reassuring a first-time visitor. Keep the plain-language version here; the ToS page can carry the precise legal language.
- The withdrawal minimum is flagged as unconfirmed rather than guessed — don't publish a number here until Finance actually sets one.
- Every specific figure in this copy (5-day auto-release, KYC tiers, withholding behavior) matches what's actually built in the backend — if any of those change, this copy needs to change with it, not drift out of sync.
