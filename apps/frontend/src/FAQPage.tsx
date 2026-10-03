import { useState } from "react";
import { events } from "./analytics";
import "./marketing.css";

type FAQPageProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

type Question = {
  q: string;
  a: string;
  id?: string;
  link?: string;
};

type FaqCategory = {
  category: string;
  questions: Question[];
};

export function FAQPage({ onNavigate, onStart: _onStart }: FAQPageProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Track which questions visitors actually open (question text only — no PII).
  const trackToggle = (index: number, question: string) => {
    if (openIndex !== index) events.faqExpanded(question);
    toggle(index);
  };

  const faqs: FaqCategory[] = [
    {
      category: "Trusting the platform",
      questions: [
        {
          q: "Is my money actually safe?",
          a: "Yes. When you fund a job, your payment goes into escrow — held separately from Yekis's own operating funds — not directly to the freelancer. It only releases when you approve the work, or automatically after 5 days if you don't respond, which protects your freelancer's time too. If something's wrong, you can raise it before approving and your payment stays held while we help sort it out.",
        },
        {
          q: "What if the freelancer just disappears after I pay?",
          a: "Your money is still sitting safely in escrow — it was never sent to them in the first place. If a freelancer goes silent, raise it with our team and we'll help resolve it, which can include a full refund.",
        },
        {
          q: "What if we disagree about the work?",
          a: "Most disagreements get sorted out directly between you and the freelancer, with a short window to talk it through. If you can't agree, our team reviews both sides — the original brief, the delivered work, and your messages — and makes a call: release the payment, refund it, or split it fairly. If either side still disagrees with that decision, there's a final, formal step through an independent arbitration body — but the vast majority of cases never need to go that far.",
          id: "disputes",
        },
        {
          q: "Is my payment information safe?",
          a: "Yes. We never see or store your card or account details directly — payments are handled through licensed providers (Telebirr and CBE), and all your data is protected under Ethiopian data protection law.",
        },
      ],
    },
    {
      category: "Getting started",
      questions: [
        {
          q: "Why do I need to verify my identity (KYC)?",
          a: "It protects everyone on the platform — it's how we make sure the person you're hiring, or the client you're working for, is really who they say they are. Basic verification is quick (a valid ID and a few details) and unlocks browsing and posting jobs. A slightly deeper verification step is required before withdrawing earnings, which protects freelancers' payouts from fraud.",
        },
        {
          q: "How long does verification take?",
          a: "Most people are verified automatically within minutes. Occasionally we review manually, which can take up to 48 hours — you'll get a notification the moment it's done.",
        },
        {
          q: "What are the fees?",
          a: "Yekis takes a small percentage of each completed job, split between the client and the freelancer — never charged upfront, only when a payment actually releases.",
          link: "fees",
        },
        {
          q: "Can I use Yekis in Amharic?",
          a: "Yes — switch languages anytime using the toggle in the top corner of any page.",
        },
      ],
    },
    {
      category: "Getting paid",
      questions: [
        {
          q: "When do I actually get paid?",
          a: "The moment a client approves your work (or after the 5-day auto-release window), funds move into your Yekis wallet immediately. From there, you can withdraw to your Telebirr or bank account.",
        },
        {
          q: "Why can't I withdraw right away as a new freelancer?",
          a: "Withdrawals require a slightly deeper identity check than browsing or bidding does — it's a safeguard that protects your payout from being sent to the wrong place. It's a one-time step; once it's done, you're set.",
        },
        {
          q: "Is there a minimum before I can withdraw?",
          a: "[TODO: Confirm exact figure with Finance before publishing]",
        },
      ],
    },
  ];

  let qIndex = 0;

  return (
    <div className="marketing-page">
      <div className="marketing-container">
        <div className="marketing-breadcrumbs">
          <button onClick={() => onNavigate("home")}>Home</button> &gt; FAQ
        </div>
        <section className="content-section">
          <h1>Frequently Asked Questions</h1>
          <div className="faq-accordion">
            {faqs.map((cat, catIdx) => (
              <div key={catIdx} style={{ marginBottom: "40px" }}>
                <h2
                  style={{
                    marginBottom: "20px",
                    color: "var(--color-primary)",
                  }}
                >
                  {cat.category}
                </h2>
                {cat.questions.map((q) => {
                  const currentIndex = qIndex++;
                  return (
                    <div key={currentIndex} className="faq-item" id={q.id}>
                      <button
                        className="faq-question"
                        onClick={() => trackToggle(currentIndex, q.q)}
                      >
                        {q.q}
                        <span>{openIndex === currentIndex ? "−" : "+"}</span>
                      </button>
                      <div
                        className={`faq-answer ${openIndex === currentIndex ? "open" : ""}`}
                      >
                        <p style={{ paddingTop: "10px" }}>
                          {q.a}
                          {q.link === "fees" && (
                            <button
                              onClick={() => onNavigate("fees")}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--color-primary)",
                                cursor: "pointer",
                                padding: 0,
                                marginLeft: "5px",
                                textDecoration: "underline",
                              }}
                            >
                              View fees page
                            </button>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      </div>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs
            .flatMap((c) => c.questions)
            .map((q) => ({
              "@type": "Question",
              name: q.q,
              acceptedAnswer: { "@type": "Answer", text: q.a },
            })),
        })}
      </script>
    </div>
  );
}
