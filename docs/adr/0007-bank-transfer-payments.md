# 0007. Payments by bank transfer with a reference, no card provider

- **Status:** Accepted
- **Date:** 2026-10-05 (decided at project start)

## Context

The roadmap includes session fees and automatic invoices. Card providers charge per transaction, which
conflicts with [0003](0003-free-tiers-only.md).

## Decision

Members pay by bank transfer, quoting a unique reference per invoice (for example `COU-2611-0042`). Invoices
are generated and emailed by the ops app; payments are reconciled by reference (marked by hand, or matched
from a pasted bank CSV).

## Consequences

No card fees and no PCI scope. Reconciliation needs someone with the bank statement; matching by reference
keeps that quick.
