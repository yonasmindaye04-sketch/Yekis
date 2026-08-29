import { InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";

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
  kb.row({
    text: ctx.t("job_view_web"),
    web_app: { url: `${ctx.t("frontend_url")}/jobs` },
  });

  // Back to main
  kb.row({ text: ctx.t("back"), callback_data: "menu:main" });

  return kb;
}

export function jobCard(job: any, ctx: BotContext): string {
  const deadline = job.deadline
    ? new Date(job.deadline).toLocaleDateString(
        ctx.i18n.locale === "am" ? "am-ET" : "en-US",
      )
    : ctx.t("jobs_no_deadline");
  const budget = job.budgetMaxMinor
    ? `${(job.budgetMinMinor / 100).toLocaleString()} - ${(job.budgetMaxMinor / 100).toLocaleString()} ETB`
    : `${(job.budgetMinMinor / 100).toLocaleString()}+ ETB`;

  return (
    ` *${escapeMd(job.title)}*\n` +
    ` ${ctx.t("category_" + job.category.toLowerCase())}\n` +
    ` ${budget}\n` +
    ` ${ctx.t("jobs_deadline")}: ${deadline}\n` +
    `\n${escapeMd(job.description?.slice(0, 200) || "")}${job.description?.length > 200 ? "..." : ""}`
  );
}

function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}
