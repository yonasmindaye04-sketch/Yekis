import { useState } from "react";
import { events } from "./analytics";
import { useI18n } from "./i18n";
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
  const { t } = useI18n();
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
      category: t.marketing.faq.trustTitle,
      questions: [
        {
          q: t.marketing.faq.q1,
          a: t.marketing.faq.a1,
        },
        {
          q: t.marketing.faq.q2,
          a: t.marketing.faq.a2,
        },
        {
          q: t.marketing.faq.q3,
          a: t.marketing.faq.a3,
          id: "disputes",
        },
        {
          q: t.marketing.faq.q4,
          a: t.marketing.faq.a4,
        },
      ],
    },
    {
      category: t.marketing.faq.startTitle,
      questions: [
        {
          q: t.marketing.faq.q5,
          a: t.marketing.faq.a5,
        },
        {
          q: t.marketing.faq.q6,
          a: t.marketing.faq.a6,
        },
        {
          q: t.marketing.faq.q7,
          a: t.marketing.faq.a7,
          link: "fees",
        },
        {
          q: t.marketing.faq.q8,
          a: t.marketing.faq.a8,
        },
      ],
    },
    {
      category: t.marketing.faq.paidTitle,
      questions: [
        {
          q: t.marketing.faq.q9,
          a: t.marketing.faq.a9,
        },
        {
          q: t.marketing.faq.q10,
          a: t.marketing.faq.a10,
        },
        {
          q: t.marketing.faq.q11,
          a: t.marketing.faq.a11,
        },
      ],
    },
  ];

  let qIndex = 0;

  return (
    <div className="marketing-page">
      <div className="marketing-container">
        <div className="marketing-breadcrumbs">
          <button onClick={() => onNavigate("home")}>{t.nav.home}</button> &gt; {t.marketing.faq.title}
        </div>
        <section className="content-section">
          <h1>{t.marketing.faq.title}</h1>
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
                              {t.marketing.faq.viewFees}
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
