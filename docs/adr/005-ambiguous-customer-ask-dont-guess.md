
# ADR 005: When the customer is ambiguous, ask, never guess

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

The first run of the 30-message eval (`npm run eval` in `apps/api`) scored 93.3% on whole orders. Items, quantities and prices were all right. Both errors were the same: a message that only said "Zé" ("aqui é do Zé, me separa 15 fardos…") was assigned to "Zé Carlos", although "mercado do Zé" matches just as well.

The prompt already said "if the message could match more than one customer, return null", but the model read "could match" loosely and, like most models, preferred a confident answer over admitting doubt.

This is the most expensive mistake the system can make. It is error #1 in the README: an invoice for the wrong customer has to be cancelled or corrected.

## Decision

The interpreter picks a customer **only when the words in the message point to exactly one customer**. The prompt now says:

- A first name or short nickname that appears in more than one customer is ambiguous on its own. Return `customerId: null` and add a question. **A wrong customer is worse than a question.**
- Extra details can resolve it: the full nickname, the company name or the city ("o Zé de Pelotas").

The rule is written in general terms, never for "Zé" specifically. Naming the eval's cases in the prompt would make the eval pass without fixing the behaviour for the next shared name.

## Results

| Metric | Before | After |
|---|---|---|
| Customer precision | 93.1% (27/29) | 100% (27/27) |
| Customer recall | 100% (27/27) | 100% (27/27) |
| Ambiguity caught | 33.3% (1/3) | 100% (3/3) |
| Whole order right | 93.3% (28/30) | 100% (30/30) |

Model `openai/gpt-4.1-mini`, temperature 0.

## Consequences

- Orders that only use a shared first name come back without a customer and with a question. The clerk answers it in the approval screen ([ADR 003](003-human-approval.md)). This costs a few seconds and saves a cancelled NF-e.
- Recall did not drop: messages with a distinguishing detail are still matched.
- 30 messages is a small sample (each one is about 3 points), so 100% means "no known failure", not "never fails". The eval stays in place so that a prompt or model change that brings the guessing back shows up as a lower score.
- If guessing comes back with other models, the next step is a check in code, not only in the prompt.