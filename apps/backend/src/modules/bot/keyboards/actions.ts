import { InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";
import { buildPublicWebAppUrl } from "../utils/deepLink.js";

export function jobFiltersKeyboard(
  ctx: BotContext,
  page = 0,
  filters: Record<string, any> = {},
): InlineKeyboard {
  const kb = new InlineKeyboard();

  // Category row
  kb.row(
    {
      text: ctx.t("category_web_dev"),
      callback_data: "jobs:filter:category:WEB_APP_DEVELOPMENT",
    },
    {
      text: ctx.t("category_design"),
      callback_data: "jobs:filter:category:GRAPHIC_DESIGN",
    },
  )
    .row(
      {
        text: ctx.t("category_marketing"),
        callback_data: "jobs:filter:category:DIGITAL_MARKETING",
      },
      {
        text: ctx.t("category_writing"),
        callback_data: "jobs:filter:category:CONTENT_WRITING",
      },
    )
    .row(
      {
        text: ctx.t("category_translation"),
        callback_data: "jobs:filter:category:TRANSLATION",
      },
      {
        text: ctx.t("category_data_entry"),
        callback_data: "jobs:filter:category:DATA_ENTRY",
      },
    );

  // Budget row
  kb.row(
    { text: ctx.t("jobs_budget_any"), callback_data: "jobs:filter:budget:any" },
    {
      text: ctx.t("jobs_budget_under_10k"),
      callback_data: "jobs:filter:budget:0_10000",
    },
  )
    .row(
      {
        text: ctx.t("jobs_budget_10k_50k"),
        callback_data: "jobs:filter:budget:10000_50000",
      },
      {
        text: ctx.t("jobs_budget_50k_100k"),
        callback_data: "jobs:filter:budget:50000_100000",
      },
    )
    .row(
      {
        text: ctx.t("jobs_budget_over_100k"),
        callback_data: "jobs:filter:budget:100000",
      },
      { text: ctx.t("jobs_clear_filters"), callback_data: "jobs:filter:clear" },
    );

  // Sort row
  kb.row(
    {
      text: ctx.t("jobs_sort_newest"),
      callback_data: "jobs:filter:sort:newest",
    },
    {
      text: ctx.t("jobs_sort_budget_desc"),
      callback_data: "jobs:filter:sort:budget_desc",
    },
  ).row(
    {
      text: ctx.t("jobs_sort_budget_asc"),
      callback_data: "jobs:filter:sort:budget_asc",
    },
    {
      text: ctx.t("jobs_sort_deadline"),
      callback_data: "jobs:filter:sort:deadline",
    },
  );

  // Pagination
  kb.row(
    { text: ctx.t("back"), callback_data: `jobs:page:${page - 1}` },
    { text: `${page + 1}`, callback_data: "noop" },
    { text: ctx.t("next"), callback_data: `jobs:page:${page + 1}` },
  );

  // Open in Mini App
  //
  // Built by the deepLink helper, not `ctx.t("frontend_url")`. That key does not
  // exist in any locale file, and ctx.t falls through to returning the KEY ITSELF
  // on a miss, so this button was shipping the literal relative URL
  // "frontend_url/jobs" — which Telegram cannot open.
  //
  // buildPublicWebAppUrl returns null when FRONTEND_URL is not a public https
  // origin (loopback, LAN, http), which is exactly the condition under which
  // Telegram rejects a web_app button and fails the ENTIRE sendMessage. In that
  // case the row is omitted rather than shipping a dead button.
  const miniAppUrl = buildPublicWebAppUrl("/jobs");
  if (miniAppUrl) {
    kb.row({
      text: ctx.t("job_view_web"),
      web_app: { url: miniAppUrl },
    });
  }

  // Back to main
  kb.row({ text: ctx.t("back"), callback_data: "menu:main" });

  return kb;
}

export function proposalActionsKeyboard(
  ctx: BotContext,
  proposalId: string,
  isOwner = false,
): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (isOwner) {
    // Freelancer actions
    kb.text(ctx.t("proposal_withdraw"), `proposal:withdraw:${proposalId}`).text(
      ctx.t("back"),
      "menu:my_proposals",
    );
  } else {
    // Client actions
    kb.text(ctx.t("proposal_shortlist"), `proposal:shortlist:${proposalId}`)
      .text(ctx.t("proposal_accept"), `proposal:accept:${proposalId}`)
      .row()
      .text(ctx.t("proposal_reject"), `proposal:reject:${proposalId}`)
      .text(ctx.t("proposal_view"), `proposal:view:${proposalId}`)
      .row()
      .text(ctx.t("back"), "menu:my_jobs");
  }

  return kb;
}

export function contractActionsKeyboard(
  ctx: BotContext,
  contractId: string,
  status: string,
): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (status === "PENDING_SIGNATURES") {
    kb.text(ctx.t("contract_sign"), `contract:sign:${contractId}`)
      .text(ctx.t("contract_view"), `contract:view:${contractId}`)
      .row();
  } else if (status === "ACTIVE") {
    kb.text(ctx.t("contract_fund_milestone"), `contract:fund:${contractId}`)
      .text(ctx.t("contract_view"), `contract:view:${contractId}`)
      .row()
      .text(ctx.t("contract_deliver"), `contract:deliver:${contractId}`)
      .text(ctx.t("contract_dispute"), `contract:dispute:${contractId}`)
      .row();
  } else if (status === "DISPUTED") {
    kb.text(ctx.t("contract_view"), `contract:view:${contractId}`)
      .text(ctx.t("contract_mediate"), `contract:mediate:${contractId}`)
      .row();
  }

  kb.text(ctx.t("back"), "menu:contracts");
  return kb;
}

export function milestoneActionsKeyboard(
  ctx: BotContext,
  milestoneId: string,
  escrowState: string,
): InlineKeyboard {
  const kb = new InlineKeyboard();

  switch (escrowState) {
    case "PAYMENT_PENDING":
      kb.text(ctx.t("milestone_fund"), `milestone:fund:${milestoneId}`);
      break;
    case "ESCROW_HELD":
      kb.text(ctx.t("milestone_deliver"), `milestone:deliver:${milestoneId}`);
      break;
    case "SUBMITTED_FOR_REVIEW":
      kb.text(ctx.t("milestone_accept"), `milestone:accept:${milestoneId}`)
        .text(ctx.t("milestone_dispute"), `milestone:dispute:${milestoneId}`)
        .row();
      break;
    case "DISPUTED":
      kb.text(
        ctx.t("milestone_view_dispute"),
        `milestone:dispute:view:${milestoneId}`,
      );
      break;
    case "RELEASED":
    case "REFUNDED":
    case "PARTIAL_REFUND":
      kb.text(ctx.t("milestone_view"), `milestone:view:${milestoneId}`);
      break;
  }

  kb.row().text(ctx.t("back"), "menu:contracts");
  return kb;
}

export function walletActionsKeyboard(ctx: BotContext): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text(ctx.t("wallet_withdraw"), "wallet:withdraw")
    .text(ctx.t("wallet_topup"), "wallet:topup")
    .row()
    .text(ctx.t("wallet_transactions"), "wallet:transactions")
    .text(ctx.t("wallet_history"), "wallet:history")
    .row()
    .text(ctx.t("back"), "menu:main");
  return kb;
}

export function kycActionsKeyboard(
  ctx: BotContext,
  tier: string,
  status: string,
): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (status === "PENDING" || status === "REJECTED") {
    kb.text(ctx.t("kyc_upload_id"), "kyc:upload:id")
      .text(ctx.t("kyc_upload_selfie"), "kyc:upload:selfie")
      .row();
  }

  if (tier === "TIER_1" && status === "VERIFIED") {
    kb.text(ctx.t("kyc_upload_tin"), "kyc:upload:tin")
      .text(ctx.t("kyc_upload_business_reg"), "kyc:upload:business")
      .row();
  }

  kb.text(ctx.t("back"), "menu:main");
  return kb;
}

export function disputeActionsKeyboard(
  ctx: BotContext,
  disputeId: string,
  stage: string,
): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (stage === "STAGE_1_NEGOTIATION") {
    kb.text(ctx.t("dispute_add_evidence"), `dispute:evidence:${disputeId}`)
      .text(ctx.t("dispute_negotiate"), `dispute:negotiate:${disputeId}`)
      .row();
  } else if (stage === "STAGE_2_EVIDENCE") {
    kb.text(ctx.t("dispute_escalate"), `dispute:escalate:${disputeId}`)
      .text(
        ctx.t("dispute_view_evidence"),
        `dispute:evidence:view:${disputeId}`,
      )
      .row();
  } else if (stage === "STAGE_3_MEDIATION") {
    kb.text(ctx.t("dispute_accept_proposal"), `dispute:accept:${disputeId}`)
      .text(
        ctx.t("dispute_escalate_arbitration"),
        `dispute:arbitrate:${disputeId}`,
      )
      .row();
  }

  kb.text(ctx.t("back"), "menu:disputes");
  return kb;
}

export function paginationKeyboard(
  ctx: BotContext,
  baseAction: string,
  page: number,
  hasNext: boolean,
): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (page > 0) {
    kb.text(ctx.t("back"), `${baseAction}:page:${page - 1}`);
  }
  kb.text(`${page + 1}`, "noop");
  if (hasNext) {
    kb.text(ctx.t("next"), `${baseAction}:page:${page + 1}`);
  }
  kb.row().text(ctx.t("back"), "menu:main");
  return kb;
}

export function confirmKeyboard(
  ctx: BotContext,
  confirmAction: string,
  cancelAction: string,
): InlineKeyboard {
  return new InlineKeyboard()
    .text(ctx.t("confirm_yes"), confirmAction)
    .text(ctx.t("confirm_no"), cancelAction);
}

export function notificationSettingsKeyboard(ctx: BotContext): InlineKeyboard {
  const settings = (ctx.session?.notificationSettings || {}) as Record<
    string,
    boolean
  >;
  const kb = new InlineKeyboard();

  const toggles = [
    { key: "jobs", label: ctx.t("notif_jobs") },
    { key: "proposals", label: ctx.t("notif_proposals") },
    { key: "escrow", label: ctx.t("notif_escrow") },
    { key: "disputes", label: ctx.t("notif_disputes") },
    { key: "wallet", label: ctx.t("notif_wallet") },
    { key: "kyc", label: ctx.t("notif_kyc") },
  ];

  for (const { key, label } of toggles) {
    const status = settings[key] ? "" : "";
    kb.text(
      `${status} ${label}`,
      `settings:notif:${key}:${settings[key] ? "off" : "on"}`,
    ).row();
  }

  kb.text(ctx.t("back"), "menu:settings");
  return kb;
}

export function settingsKeyboard(ctx: BotContext): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text(ctx.t("settings_language"), "settings:language")
    .text(ctx.t("settings_notifications"), "settings:notifications")
    .row()
    .text(ctx.t("settings_privacy"), "settings:privacy")
    .text(ctx.t("back"), "menu:main");
  return kb;
}
