# ADR 003: A person approves every invoice

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

An NF-e is a tax document. Once it is authorized, it can only be cancelled within a short window or fixed with a correction letter. If the AI misreads an order, picks the wrong customer or uses an outdated price, the result is a real fiscal and financial cost.

## Decision

The AI **never issues an invoice on its own**. It only creates **drafts**. Every draft has to be reviewed and approved by a person in the approval screen before anything happens.

- The draft shows where every field came from: the order text, the customer's history, or the price list.
- The draft highlights doubtful fields, such as a low-confidence match, a price different from the last invoice, or a low lot balance.
- **The lot balance is reduced only on approval**, inside a database transaction. A draft never reserves stock.
- Every approval records who approved it and when.

## Consequences

- No invoice leaves the system without a person being accountable for it.
- The human is still in the loop, but the job changes from typing 15 fields to checking a pre-filled screen.
- Auto-approval for low-risk cases (for example an exact repeat of a recent invoice) can be reconsidered later in a new ADR, once there is data on how accurate the agent is.
