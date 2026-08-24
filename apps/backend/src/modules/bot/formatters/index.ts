import { BotContext } from "../types.js";

export function formatJobCard(job: any, ctx: BotContext): string {
 
 const locale = ctx.i18n.locale;
 
 const deadline = job.deadline 
 ? new Date(job.deadline).toLocaleDateString(locale === "am" ? "am-ET" : "en-US", { year: "numeric", month: "short", day: "numeric" })
 : ctx.t("jobs_no_deadline");
 
 const budgetMin = (job.budgetMinMinor / 100).toLocaleString(locale);
 const budgetMax = job.budgetMaxMinor ? (job.budgetMaxMinor / 100).toLocaleString(locale) : null;
 const budget = budgetMax ? `${budgetMin} - ${budgetMax} ETB` : `${budgetMin}+ ETB`;
 
 const categoryMap: Record<string, string> = {
 WEB_APP_DEVELOPMENT: ctx.t("category_web_dev"),
 GRAPHIC_DESIGN: ctx.t("category_design"),
 DIGITAL_MARKETING: ctx.t("category_marketing"),
 CONTENT_WRITING: ctx.t("category_writing"),
 TRANSLATION: ctx.t("category_translation"),
 DATA_ENTRY: ctx.t("category_data_entry"),
 };
 
 const statusMap: Record<string, string> = {
 OPEN: ctx.t("job_status_open"),
 IN_PROGRESS: ctx.t("job_status_in_progress"),
 COMPLETED: ctx.t("job_status_completed"),
 CANCELLED: ctx.t("job_status_cancelled"),
 };

 const category = categoryMap[job.category] || job.category;
 const status = statusMap[job.status] || job.status;
 
 const desc = job.description ? escapeMd(job.description.slice(0, 150)) + (job.description.length > 150 ? "..." : "") : "";
 
 return (
 ` *${escapeMd(job.title)}*\n` +
 ` ${category} | ${status}\n` +
 ` ${budget}\n` +
 ` ${ctx.t("jobs_deadline")}: ${deadline}\n` +
 (desc ? `\n${desc}` : "")
 );
}

export function formatProposalCard(proposal: any, ctx: BotContext): string {
 
 const locale = ctx.i18n.locale;
 
 const statusMap: Record<string, string> = {
 SUBMITTED: ctx.t("proposal_status_submitted"),
 SHORTLISTED: ctx.t("proposal_status_shortlisted"),
 ACCEPTED: ctx.t("proposal_status_accepted"),
 REJECTED: ctx.t("proposal_status_rejected"),
 WITHDRAWN: ctx.t("proposal_status_withdrawn"),
 };
 
 const amount = (proposal.quotedAmountMinor / 100).toLocaleString(locale);
 const status = statusMap[proposal.status] || proposal.status;
 const createdAt = new Date(proposal.createdAt).toLocaleDateString(locale === "am" ? "am-ET" : "en-US");
 
 return (
 ` *${escapeMd(proposal.job?.title || "Unknown Job")}*\n` +
 ` ${amount} ETB | ⏱ ${proposal.estimatedDays} ${ctx.t("propose_days_label")}\n` +
 ` ${status}\n` +
 ` ${ctx.t("proposal_created")}: ${createdAt}\n` +
 `\n${escapeMd(proposal.coverLetter?.slice(0, 100) || "")}${proposal.coverLetter?.length > 100 ? "..." : ""}`
 );
}

export function formatContractCard(contract: any, ctx: BotContext): string {
 
 const locale = ctx.i18n.locale;
 
 const statusMap: Record<string, string> = {
 PENDING_SIGNATURES: ctx.t("contract_status_pending_signatures"),
 ACTIVE: ctx.t("contract_status_active"),
 COMPLETED: ctx.t("contract_status_completed"),
 DISPUTED: ctx.t("contract_status_disputed"),
 };
 
 const status = statusMap[contract.status] || contract.status;
 const totalAmount = (contract.totalAmountMinor / 100).toLocaleString(locale);
 const createdAt = new Date(contract.createdAt).toLocaleDateString(locale === "am" ? "am-ET" : "en-US");
 
 const clientSigned = contract.clientAcceptedAt ? ctx.t("contract_signed") : ctx.t("contract_pending");
 const freelancerSigned = contract.freelancerAcceptedAt ? ctx.t("contract_signed") : ctx.t("contract_pending");
 
 return (
 ` *${escapeMd(contract.title || "Contract")}*\n` +
 ` ${status} | ${totalAmount} ETB\n` +
 ` ${ctx.t("contract_client")}: ${clientSigned} | ${ctx.t("contract_freelancer")}: ${freelancerSigned}\n` +
 ` ${ctx.t("contract_created")}: ${createdAt}\n` +
 (contract.description ? `\n${escapeMd(contract.description.slice(0, 100))}` : "")
 );
}

export function formatWalletCard(wallet: any, ctx: BotContext): string {
 
 const locale = ctx.i18n.locale;
 
 const balance = (wallet.balanceMinor / 100).toLocaleString(locale, { minimumFractionDigits: 2 });
 const pending = (wallet.pendingMinor / 100).toLocaleString(locale, { minimumFractionDigits: 2 });
 const available = (wallet.availableMinor / 100).toLocaleString(locale, { minimumFractionDigits: 2 });
 
 return (
 ` *${ctx.t("wallet_balance")}*\n` +
 `${ctx.t("wallet_available")}: ${available} ETB\n` +
 `${ctx.t("wallet_pending")}: ${pending} ETB\n` +
 `${ctx.t("wallet_total")}: ${balance} ETB`
 );
}

export function formatDisputeCard(dispute: any, ctx: BotContext): string {
 
 
 const stageMap: Record<string, string> = {
 STAGE_1_NEGOTIATION: ctx.t("dispute_stage_negotiation"),
 STAGE_2_EVIDENCE: ctx.t("dispute_stage_evidence"),
 STAGE_3_MEDIATION: ctx.t("dispute_stage_mediation"),
 STAGE_4_ARBITRATION: ctx.t("dispute_stage_arbitration"),
 RESOLVED: ctx.t("dispute_stage_resolved"),
 };
 
 const categoryMap: Record<string, string> = {
 NON_DELIVERY: ctx.t("dispute_category_non_delivery"),
 QUALITY_ISSUE: ctx.t("dispute_category_quality"),
 SCOPE_CREEP: ctx.t("dispute_category_scope_creep"),
 NON_PAYMENT: ctx.t("dispute_category_non_payment"),
 LATE_DELIVERY: ctx.t("dispute_category_late_delivery"),
 COMMUNICATION_BREAKDOWN: ctx.t("dispute_category_communication"),
 };
 
 const stage = stageMap[dispute.stage] || dispute.stage;
 const category = categoryMap[dispute.category] || dispute.category;
 
 return (
 ` *${ctx.t("dispute_id")}: ${dispute.id.slice(0, 8)}*\n` +
 ` ${stage} | ${category}\n` +
 ` ${dispute.amountMinor ? (dispute.amountMinor / 100).toLocaleString() + " ETB" : ctx.t("dispute_amount_pending")}\n` +
 ` ${ctx.t("dispute_created")}: ${new Date(dispute.createdAt).toLocaleDateString()}`
 );
}

export function formatNotification(event: string, data: any, ctx: BotContext): string {
 
 const locale = ctx.i18n.locale;
 
 const formatters: Record<string, (data: any) => string> = {
 "job.new_match": (d) => 
 ` *${ctx.t("notify_job_new_match")}*\n` +
 `${d.title}\n` +
 ` ${(d.budgetMinor / 100).toLocaleString(locale)} ETB\n` +
 ` ${new Date(d.deadline).toLocaleDateString(locale === "am" ? "am-ET" : "en-US")}`,
 
 "proposal.received": (d) =>
 ` *${ctx.t("notify_proposal_received")}*\n` +
 `${d.freelancerName} ${ctx.t("notify_proposal_for")} "${d.jobTitle}"\n` +
 ` ${(d.amountMinor / 100).toLocaleString(locale)} ETB`,
 
 "proposal.accepted": (d) =>
 ` *${ctx.t("notify_proposal_accepted")}*\n` +
 `Your proposal for "${d.jobTitle}" was accepted!\n` +
 ` ${ctx.t("notify_contract_ready")}`,
 
 "escrow.funded": (d) =>
 ` *${ctx.t("notify_escrow_funded")}*\n` +
 `${(d.amountMinor / 100).toLocaleString(locale)} ETB ${ctx.t("notify_held_in_escrow")} "${d.title}"`,
 
 "milestone.submitted": (d) =>
 ` *${ctx.t("notify_milestone_submitted")}*\n` +
 `${d.freelancerName} ${ctx.t("notify_submitted_work")} "${d.title}"\n` +
 ` ${ctx.t("notify_review_window")}`,
 
 "milestone.auto_release_warning": (d) =>
 ` *${ctx.t("notify_auto_release_warning")}*\n` +
 `${(d.amountMinor / 100).toLocaleString(locale)} ETB for "${d.title}"\n` +
 `${ctx.t("notify_review_now")}`,
 
 "milestone.released": (d) =>
 ` *${ctx.t("notify_milestone_released")}*\n` +
 `${(d.amountMinor / 100).toLocaleString(locale)} ETB ${ctx.t("notify_released_to")} ${d.freelancerName}`,
 
 "dispute.raised": (d) =>
 ` *${ctx.t("notify_dispute_raised")}*\n` +
 `"${d.title}" - ${d.category}\n` +
 `${ctx.t("notify_dispute_stage")}: ${d.stage}`,
 
 "dispute.mediation_proposal": (d) =>
 ` *${ctx.t("notify_mediation_proposal")}*\n` +
 `"${d.title}"\n` +
 `${ctx.t("notify_freelancer_share")}: ${d.freelancerShare}%`,
 
 "kyc.status_changed": (d) =>
 `${d.status === "VERIFIED" ? "" : ""} *${ctx.t("notify_kyc_status")}*\n` +
 `${ctx.t("kyc_tier_" + d.tier.toLowerCase())}: ${d.status}`,
 
 "wallet.topup_approved": (d) =>
 ` *${ctx.t("notify_topup_approved")}*\n` +
 `${(d.amountMinor / 100).toLocaleString(locale)} ETB ${ctx.t("notify_added_to_wallet")}`,
 
 "wallet.withdrawal_completed": (d) =>
 ` *${ctx.t("notify_withdrawal_completed")}*\n` +
 `${(d.amountMinor / 100).toLocaleString(locale)} ETB ${ctx.t("notify_sent_to")} ${d.destination}`,
 };
 
 const formatter = formatters[event];
 return formatter ? formatter(data) : ` ${event}: ${JSON.stringify(data)}`;
}

function escapeMd(text: string): string {
 return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

export function formatKycQueueItem(item: any, ctx: BotContext): string {
  const locale = ctx.i18n?.locale || "en";
  return `*KYC Record*: ${escapeMd(item.id)}\nUser: ${escapeMd(item.user?.email || item.user?.phone || item.userId)}\nTier: ${item.tier}\nStatus: ${item.status}`;
}

export function formatTopupQueueItem(item: any, ctx: BotContext): string {
  const locale = ctx.i18n?.locale || "en";
  return `*Top-up*: ${escapeMd(item.id)}\nUser: ${escapeMd(item.user?.email || item.userId)}\nAmount: ${(item.amountMinor / 100).toLocaleString(locale)} ETB\nProvider: ${item.provider}`;
}

export function formatDisputeQueueItem(item: any, ctx: BotContext): string {
  return `*Dispute*: ${escapeMd(item.id)}\nContract: ${escapeMd(item.contractId)}\nStage: ${item.stage}\nCategory: ${item.category}`;
}

