# 005: AI reads the order (`POST /orders/interpret`)

**Status:** In progress

## Goal

Turn a customer's free-text message ("manda 40 fardos de 30 pro mercado do Zé, mesmo preço") into a structured, Zod-validated order: customer, product, quantity and price. This is the first AI feature of v1 and the base for the draft invoice.

## Scope

- `POST /orders/interpret`: receives the text and returns the interpreted order.
- Structured output with AI SDK 7: `generateText` + `Output.object({ schema })`.
- The whole catalog goes in the system prompt: 8 customers and 12 products, which is small enough.
- Models come through OpenRouter, chosen by `LLM_MODEL` in `.env`.
- The model is injected by Nest through an `LLM` token, so tests can swap in a fake model.
- The server re-checks the AI output against the database: ids and codes must exist.

## Business rules

- **BR-1:** Only reference what exists. `customerId` and `productCode` must exist in the database. Anything else becomes `null`.
- **BR-2:** Ambiguity is never guessed. If the message can match more than one customer (e.g. "o Zé"), `customerId` is `null` and a question is added(Human-in-the-loop).
- **BR-3:** Never invent a price. `unitPrice` is set only when the message states it. "Mesmo preço" or no price means `null`.
- **BR-4:** Quantity is in the product's unit (FD, SC, PCT, KG) and is a positive integer.
- **BR-5:** Read only. Interpreting never saves or changes anything.

## Non-goals

- Saving the result. In this step the endpoint only **reads**: no draft, no `Order` update.
- Choosing a lot, resolving "same price" from history, and taxes (CFOP/ICMS). These come in the agent step ([ADR 004](../docs/adr/004-defaults-from-history.md)).
- Tools and the agent loop. The catalog is in the prompt for now and becomes a tool in v2.
- Langfuse tracing and the 30-message eval, each in its own step.

## Contract

**Request**

```json
POST /orders/interpret
{ "text": "manda 40 fardos de 30 pro mercado do Zé, mesmo preço" }
```

`text`: trimmed string, 3 to 2000 characters.

**Response 200**: `InterpretedOrder`

```json
{
  "customerId": 1,
  "items": [{ "productCode": "ARZ-T1-FD30", "quantity": 40, "unitPrice": null }],
  "questions": []
}
```

| Field | Type | Rule |
|---|---|---|
| `customerId` | int \| null | `null` if the customer is ambiguous or unknown |
| `items[].productCode` | string \| null | Must be a code from the catalog, otherwise `null` |
| `items[].quantity` | positive int | In the product's unit (FD, SC, PCT, KG) |
| `items[].unitPrice` | number \| null | Only when the message states it. "Mesmo preço" or no price means `null` |
| `questions` | string[] | One sentence per doubt. Empty if everything is clear |

Every field is required and `.nullable()`, never `.optional()`, because strict structured output requires all keys.

**Errors**

| Case | Status |
|---|---|
| Invalid body (`text` missing, too short or too long) | 400, and the LLM is **not** called |
| LLM fails (bad key, no credits, output doesn't match schema) | 502 `Bad Gateway` with a short message. The real cause goes to the log |

**Config (`.env`)**: `OPENROUTER_API_KEY` and `LLM_MODEL` (e.g. `openai/gpt-4.1-mini`, which must support `structured_outputs`).

**Files** (`apps/api/src/orders/`)

```
order.schema.ts              InterpretedOrder, InterpretBody (Zod)
model.ts                     LLM token + createModel() (OpenRouter, require_parameters: true)
order-interpreter.service.ts loads catalog, calls generateText, validates ids
orders.controller.ts         + POST /orders/interpret
orders.module.ts             new: { provide: LLM, useFactory: createModel }; OrdersController moves here from AppModule
```

## Acceptance criteria

**Automated** (Vitest with a fake model, no network):

- [ ] Given body `{"text":"x"}`, when I call `POST /orders/interpret`, then I get 400 and the model is never called.
- [ ] *(BR-1)* Given the model returns a `customerId` or `productCode` that is not in the database, when the order is interpreted, then that field becomes `null` and a sentence is added to `questions`.
- [ ] Given the model throws an error, when I call the endpoint, then I get 502, not 500.

**Manual** (real model, verified with curl; the eval step automates these later):

- [x] *(BR-3)* Given "manda 40 fardos de 30 pro mercado do Zé, mesmo preço", then `customerId = 1`, `productCode = "ARZ-T1-FD30"`, `quantity = 40`, `unitPrice = null`.
- [x] *(BR-2)* Given "o Zé quer 10 sacos de 50" (two customers called Zé), then `customerId = null` and `questions` mentions the ambiguity.
- [x] *(BR-3)* Given "Boa Compra: 20 fardos de 10 a 55 reais", then `customerId = 3`, `productCode = "ARZ-T1-FD10"`, `unitPrice = 55`.
- [x] Given a fake `OPENROUTER_API_KEY`, then the endpoint returns 502 and the log shows OpenRouter's 401. This proves the wiring works.
- [x] Given `LLM_MODEL` is missing, then the API fails at startup with a clear message, not on the first request.

## Notes

- **`generateObject` is deprecated in AI SDK 7.** Use `generateText({ output: Output.object({ schema }) })` and read `result.output`.
- `temperature: 0`: the same message gives the same answer as much as possible. The eval depends on this.
- `require_parameters: true` makes OpenRouter only route to providers that support structured output.
- **Why re-check ids on the server:** structured output guarantees the *shape* of the JSON, not that `customerId: 9` exists. We never trust the model with references to our data.
- Don't hard-code a free model: the free list changes and is limited to 50 requests a day.
- Pinned versions: `ai@7.0.173`, `@openrouter/ai-sdk-provider@3.1.0`. Both are ESM only, like our API.
