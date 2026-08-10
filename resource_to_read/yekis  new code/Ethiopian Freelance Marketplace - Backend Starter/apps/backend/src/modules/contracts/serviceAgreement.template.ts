import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const SERVICE_AGREEMENT_TEMPLATE_VERSION = "v1.0-2026";

export interface ServiceAgreementData {
  contractId: string;
  jobTitle: string;
  jobDescription: string;
  clientEmail: string;
  freelancerEmail: string;
  milestones: Array<{ title: string; amountMinor: number; dueDate: Date }>;
  totalAmountMinor: number;
  generatedAt: Date;
}

function formatBirr(amountMinor: number): string {
  return `ETB ${(amountMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

/**
 * Renders the Master Freelance Service Agreement to PDF bytes, using the
 * clause language drafted in the legal design document (independent
 * contractor status, milestone schedule, IP-on-full-payment, confidentiality,
 * liability, termination, and the AACCSA arbitration clause with the
 * Art. 49(2) cassation waiver).
 *
 * This is drafting-stage language, not final legal text — see the legal
 * design document's open-questions list before treating this as
 * counsel-approved. Swapping in the firm's final language later only
 * requires editing the CLAUSES array below, not the generation logic.
 */
export async function generateServiceAgreementPdf(data: ServiceAgreementData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function newPageIfNeeded(neededSpace: number) {
    if (y - neededSpace < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  function wrapText(text: string, size: number, useFont = font): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word;
      if (useFont.widthOfTextAtSize(trial, size) > maxWidth) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = trial;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function drawParagraph(text: string, opts: { size?: number; bold?: boolean; gap?: number } = {}) {
    const size = opts.size ?? 10;
    const useFont = opts.bold ? boldFont : font;
    const lines = wrapText(text, size, useFont);
    newPageIfNeeded(lines.length * (size + 4) + (opts.gap ?? 10));
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size, font: useFont, color: rgb(0.1, 0.1, 0.1) });
      y -= size + 4;
    }
    y -= opts.gap ?? 10;
  }

  function drawHeading(text: string) {
    newPageIfNeeded(30);
    page.drawText(text, { x: margin, y, size: 13, font: boldFont, color: rgb(0.1, 0.13, 0.49) });
    y -= 22;
  }

  // ---------- Title ----------
  drawHeading("MASTER FREELANCE SERVICE AGREEMENT");
  drawParagraph(`Contract ID: ${data.contractId}`, { size: 9 });
  drawParagraph(`Generated: ${data.generatedAt.toISOString()}   |   Template version: ${SERVICE_AGREEMENT_TEMPLATE_VERSION}`, { size: 9, gap: 16 });
  drawParagraph(`Between: ${data.clientEmail} ("Client") and ${data.freelancerEmail} ("Freelancer")`, { bold: true, gap: 16 });

  // ---------- 1. Independent contractor status ----------
  drawHeading("1. Independent Contractor Status");
  drawParagraph(
    "1.1 The Freelancer is an independent contractor and not an employee, agent, partner, or joint venturer of the Client. Nothing in this Agreement shall be construed to create an employment relationship. The Freelancer controls the manner, means, timing, and location of the Work, is not subject to the Client's direct supervision or control, and is free to perform services for other clients. The Freelancer shall use their own tools, equipment, software, and workspace to perform the Work."
  );
  drawParagraph(
    "1.2 No Exclusivity. This Agreement does not create an exclusive relationship. The Freelancer may provide services to other clients during the Term, provided such other work does not materially impair the Freelancer's ability to meet the milestones and deliverables set out in this Agreement."
  );

  // ---------- 2. Scope of work ----------
  drawHeading("2. Scope of Work");
  drawParagraph(`Title: ${data.jobTitle}`, { bold: true });
  drawParagraph(data.jobDescription);
  drawParagraph(
    "2.1 The Client shall have 5 business days from delivery of each deliverable to review it and provide written feedback or a request for revisions. If the Client fails to respond within this period, the deliverable shall be deemed accepted."
  );

  // ---------- 3. Milestone schedule ----------
  drawHeading("3. Milestone Schedule");
  for (const m of data.milestones) {
    drawParagraph(`\u2022 ${m.title} \u2014 ${formatBirr(m.amountMinor)} \u2014 due ${m.dueDate.toDateString()}`, { size: 10, gap: 4 });
  }
  drawParagraph(`Total contract value: ${formatBirr(data.totalAmountMinor)}`, { bold: true, gap: 16 });

  // ---------- 4. Revisions ----------
  drawHeading("4. Revisions and Scope");
  drawParagraph(
    "This Agreement includes up to two rounds of reasonable revisions within the original agreed scope. Any material change to requirements or additional deliverables constitutes a scope expansion and requires a separate written agreement and adjusted pricing."
  );

  // ---------- 5. Payment terms / escrow ----------
  drawHeading("5. Payment Terms and Escrow");
  drawParagraph(
    "5.1 Client shall deposit the full project fee into Escrow before work begins. Milestone payments will be released from Escrow upon Client's written acceptance of each milestone deliverable. If Client fails to respond within the Review Period, the deliverable is deemed accepted and funds release automatically."
  );

  // ---------- 6. Tax withholding ----------
  drawHeading("6. Tax Withholding");
  drawParagraph(
    "The platform acts as a withholding agent for payments of ETB 10,000 or more per project: 3% withholding tax if the Freelancer has provided a TIN, 30% otherwise. The Freelancer remains responsible for filing their own personal income tax."
  );

  // ---------- 7. Intellectual property ----------
  drawHeading("7. Intellectual Property");
  drawParagraph(
    "7.1 Assignment. Upon full payment (complete release of Escrow funds), all IP rights in the final deliverables transfer to the Client. Until the Freelancer is paid in full, the Freelancer retains all IP rights, and the Client is prohibited from using or modifying the deliverables."
  );
  drawParagraph(
    "7.2 Pre-Existing Materials. Freelancer retains ownership of tools, methodologies, or software libraries owned prior to the project. Client receives a license to use Pre-Existing Materials solely as incorporated into the final deliverables."
  );

  // ---------- 8. Confidentiality ----------
  drawHeading("8. Confidentiality");
  drawParagraph(
    "Each party shall keep the other's confidential information secret. Permitted disclosures (e.g. as required by law, or communications conducted on-platform for dispute-evidence purposes) are excepted. Breach of confidentiality shall be deemed material breach."
  );

  // ---------- 9. Liability ----------
  drawHeading("9. Liability");
  drawParagraph(
    "Neither party shall be liable to the other for indirect or consequential damages. Freelancer's total liability is limited to the total fees paid under this Agreement."
  );

  // ---------- 10. Termination ----------
  drawHeading("10. Termination");
  drawParagraph(
    "Client may terminate if Freelancer misses a milestone deadline by more than a specified number of days. Freelancer may terminate if Client fails to fund Escrow within a specified period. In either case, any funds in Escrow shall be refunded or released per the Escrow rules and work delivered to date."
  );

  // ---------- 11. Dispute resolution and arbitration ----------
  drawHeading("11. Dispute Resolution and Arbitration");
  drawParagraph(
    "Dispute escalation: (1) informal negotiation, (2) timed platform mediation with a non-binding recommendation, (3) arbitration if still unresolved."
  );
  drawParagraph(
    "11.1 Arbitration Clause. Any dispute arising under this Agreement that cannot be resolved by mediation shall be finally settled by arbitration in Addis Ababa, Ethiopia, under the Arbitration and Conciliation Proclamation No. 1237/2021, including an express waiver of appeal to the Cassation Bench for fundamental error of law under Article 49(2). The arbitration shall be conducted in English by a sole arbitrator appointed by AACCSA (Addis Ababa Chamber of Commerce Arbitration Institute, pending final confirmation of current name and rules with counsel). The award is final and binding on the parties."
  );

  // ---------- 12. Platform role ----------
  drawHeading("12. Independent Contractor Affirmation and Platform Role");
  drawParagraph(
    "The Freelancer affirms independent-contractor status as set out in Clause 1. The platform is a neutral marketplace/payment facilitator, not a party to this Agreement and not the employer of either side. The platform's Terms of Service are incorporated by reference."
  );

  drawParagraph(
    "This document was auto-generated from the approved Service Agreement template and is drafting-stage language pending final review by counsel. See the legal design document's open-questions list for items still requiring confirmation.",
    { size: 8, gap: 0 }
  );

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
