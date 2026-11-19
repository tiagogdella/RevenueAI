# ADR 002: Simulated issuer behind an `Issuer` interface

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

Sending an NF-e to SEFAZ requires a real CNPJ and a valid **A1 digital certificate**. This is a portfolio and learning project, so it has neither. Every other part of the flow still needs to be built and tested end to end: building, signing and validating the XML, and generating the DANFE.

## Decision

Transmission to SEFAZ sits behind an `Issuer` interface:

```ts
interface Issuer {
  issue(signedXml: string): Promise<IssueResult>; // authorization protocol or rejection
  cancel(accessKey: string, reason: string): Promise<CancelResult>;
}
```

- `SimulatedIssuer` (default) validates the XML against the official XSD and returns a fake authorization protocol.
- `SefazIssuer` (future) uses a real A1 certificate and talks to the SEFAZ web services.

The XML is signed with a **self-signed test certificate**.

## Consequences

- The whole flow (draft → approval → signed XML → XSD validation → DANFE) runs and is tested without SEFAZ.
- Switching to real transmission only means adding `SefazIssuer` and changing one configuration value.
- SEFAZ business rules are only checked when real transmission is added, because XSD validation covers structure only. Those rejections will not show up in v1.
