# ADR 004: Fill missing fields from the customer's invoice history

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

A customer order usually only says *who*, *what* and *how much*, for example "20 bags of type 1 rice, same as last time". The invoice needs many more fields: lot, carrier, freight mode, CFOP, ICMS (CST, rate, base), payment terms and so on. Today the billing clerk fills these in by hand. For a repeat customer, most of them are identical to the previous invoice for the same customer and product.

## Decision

When building a draft, the agent looks up the **most recent approved invoices for the same customer and product** and reuses their values for every field the order does not specify:

| Field | Source |
|---|---|
| Customer, product, quantity | The order (AI extraction) |
| Price | The current price list. The last price is shown only for comparison |
| Lot | A lot of the same product **with enough balance** (FIFO). It is never copied blindly |
| Carrier, freight mode | History |
| CFOP, ICMS (CST, rate), other taxes | History, cross-checked against the customer's state and tax profile |
| Payment terms | History |

The agent works through **tools**, not by guessing. `findCustomer`, `findProduct`, `getLastInvoices(customer, product)`, `getCurrentPrice`, `findLotWithBalance`. The LLM decides which tool to call and fills a Zod-validated draft. Every field records its source.

If there is no history (a new customer or product), the field stays empty and is highlighted for the person to fill in.

## Consequences

- Repeat orders, which are most of the volume, become "check and approve" instead of "type everything".
- Errors in a past invoice can be carried forward. This is why tax fields are cross-checked and the human approval from [ADR 003](003-human-approval.md) remains mandatory.
- History has to be loaded from the ERP (read-only, see [ADR 001](001-do-not-write-to-erp.md)). v1 uses seeded sample data.
