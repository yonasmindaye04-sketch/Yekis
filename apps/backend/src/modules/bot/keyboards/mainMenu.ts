import { InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";

export function mainMenuKeyboard(ctx: BotContext): InlineKeyboard {
 
 const kb = new InlineKeyboard();

 // Common for all authenticated users
 kb.text(ctx.t("menu_jobs"), "menu:jobs")
 .text(ctx.t("menu_my_jobs"), "menu:my_jobs").row()
 .text(ctx.t("menu_proposals"), "menu:proposals")
 .text(ctx.t("menu_contracts"), "menu:contracts").row()
 .text(ctx.t("menu_wallet"), "menu:wallet")
 .text(ctx.t("menu_kyc"), "menu:kyc").row()
 .text(ctx.t("menu_disputes"), "menu:disputes")
 .text(ctx.t("menu_notifications"), "menu:notifications").row()
 .text(ctx.t("menu_settings"), "menu:settings")
 .text(ctx.t("menu_help"), "menu:help");

 // Staff-only
 if (ctx.session.role === "STAFF") {
 kb.row().text(ctx.t("menu_staff_dashboard"), "menu:staff");
 }

 return kb;
}

export function languageKeyboard(): InlineKeyboard {
 const kb = new InlineKeyboard()
 .text(" English", "lang:en")
 .text(" አማርኛ", "lang:am");
 return kb;
}

export function settingsKeyboard(ctx: BotContext): InlineKeyboard {
 
 const kb = new InlineKeyboard()
 .text(ctx.t("settings_language"), "settings:language")
 .text(ctx.t("settings_notifications"), "settings:notifications").row()
 .text(ctx.t("settings_privacy"), "settings:privacy")
 .text(ctx.t("back"), "menu:main");
 return kb;
}

export function jobFiltersKeyboard(ctx: BotContext): InlineKeyboard {
 
 const kb = new InlineKeyboard()
 .text(ctx.t("jobs_category"), "jobs:filter:category")
 .text(ctx.t("jobs_budget"), "jobs:filter:budget").row()
 .text(ctx.t("jobs_sort"), "jobs:filter:sort")
 .text(ctx.t("jobs_newest"), "jobs:filter:sort:newest").row()
 .text(ctx.t("back"), "menu:main");
 return kb;
}

export function proposalActionsKeyboard(ctx: BotContext, proposalId: string): InlineKeyboard {
 
 const kb = new InlineKeyboard()
 .text(ctx.t("proposal_status_shortlisted"), `proposal:shortlist:${proposalId}`)
 .text(ctx.t("proposal_status_rejected"), `proposal:reject:${proposalId}`).row()
 .text(ctx.t("back"), "menu:my_jobs");
 return kb;
}

export function contractActionsKeyboard(ctx: BotContext, contractId: string): InlineKeyboard {
 
 const kb = new InlineKeyboard()
 .text(ctx.t("contract_sign"), `contract:sign:${contractId}`)
 .text(ctx.t("contract_view"), `contract:view:${contractId}`).row()
 .text(ctx.t("contract_fund"), `contract:fund:${contractId}`)
 .text(ctx.t("back"), "menu:contracts");
 return kb;
}

export function disputeActionsKeyboard(ctx: BotContext, disputeId: string): InlineKeyboard {
 
 const kb = new InlineKeyboard()
 .text(ctx.t("dispute_evidence_prompt"), `dispute:evidence:${disputeId}`)
 .text(ctx.t("back"), "menu:disputes");
 return kb;
}

export function paginationKeyboard(ctx: BotContext, type: string, page: number, hasNext: boolean): InlineKeyboard {
 
 const kb = new InlineKeyboard();

 if (page > 0) {
 kb.text(ctx.t("back"), `${type}:page:${page - 1}`);
 }
 if (hasNext) {
 kb.text(ctx.t("next"), `${type}:page:${page + 1}`);
 }
 kb.row().text(ctx.t("back"), "menu:main");

 return kb;
}

export function confirmKeyboard(ctx: BotContext, confirmAction: string, cancelAction: string): InlineKeyboard {
 
 return new InlineKeyboard()
 .text(ctx.t("confirm_yes"), confirmAction)
 .text(ctx.t("confirm_no"), cancelAction);
}
