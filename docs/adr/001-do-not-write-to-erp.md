# ADR 001: Do not write to the ERP database

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

All invoices are currently issued from the company ERP. RevenueAI must eventually hand its approved invoices to that ERP. One option is to write straight into the ERP's database tables.

That would be risky:

- The ERP schema is not documented for us and can change with any vendor update.
- A bad write could corrupt stock, financial or tax data. The ERP is the system of record for all of these.
- The vendor's support would not cover a database that was changed from outside.

## Decision

RevenueAI **never writes to the ERP database**. For each approved invoice it produces an **import file** (the NF-e XML and/or the ERP's own import layout), which the ERP loads through its normal import feature.

Reading reference data (customers, products, lots, previous invoices) is done through exports or read-only access, and never through writes.

## Consequences

- The ERP keeps all of its own validations and stays the source of truth.
- Integration is loosely coupled. The import file is the contract, so it can be tested without the ERP running.
- A person (or a scheduled job) has to trigger the import. Full automation will need the ERP's official API later.
- Reference data in RevenueAI can lag behind the ERP until a sync job exists.
