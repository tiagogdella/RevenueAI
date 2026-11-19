# Roadmap

## Version 1: From pasted text to a validated NF-e, live

**Estimate:** 5–7 weeks at ~10 h/week

A NestJS API with Postgres that reads an order with AI, creates a draft, reduces the lot balance on approval (tested against a real Postgres), generates the NF-e XML signed with a test certificate and validated against the official XSD, plus the DANFE. Also a review/approval screen, CI, deploy and README.

| # | Step | Done when |
|---|---|---|
| 1 | **README, C4 context diagram, ADRs** | The README shows today's process with numbers, the context diagram and the ADRs. Someone outside billing can read it in 2 minutes and explain the problem back |
| 2 | Monorepo, Docker Compose (Postgres), CI skeleton | `docker compose up` starts the DB; CI runs lint + typecheck on every push |
| 3 | Data model (Prisma): customer, product, lot, price list, invoice, invoice history + seed data | Migrations run; seed loads realistic sample data |
| 4 | AI order extraction (AI SDK + Zod) | Pasted text → validated structured order; traced in Langfuse |
| 5 | Agent tools + draft builder (history-based defaults, [ADR 004](docs/adr/004-defaults-from-history.md)) | Draft created with every field and its source |
| 6 | Approval + lot balance reduction in a transaction | Vitest + Supertest against real Postgres prove the balance can't go negative, even with concurrent approvals |
| 7 | NF-e XML (node-sped-nfe), signing, XSD validation, DANFE | An approved draft produces a valid signed XML and a PDF |
| 8 | Review/approval screen (Next.js + Tailwind) | A person can review, edit and approve a draft |
| 9 | Deploy (Vercel, Railway, Neon) + final README | Live URL; README has the demo and the results |

## Later versions

- **v2:** Real channels: WhatsApp Cloud API webhook, e-mail, spreadsheet upload.
- **v3:** RabbitMQ (CloudAMQP) queue between channels and the agent, with retry and DLQ.
- **ERP integration:** read-only sync of customers, lots and invoice history, plus an import file the ERP accepts ([ADR 001](docs/adr/001-do-not-write-to-erp.md)).
- **Real SEFAZ transmission:** a `SefazIssuer` with an A1 certificate ([ADR 002](docs/adr/002-simulated-issuer.md)).
