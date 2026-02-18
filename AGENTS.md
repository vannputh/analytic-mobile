# Agent Guidelines

## Next.js 16 Proxy Convention

This project uses **Next.js 16**, which deprecated the `middleware` file convention in favor of `proxy`.

- **File:** Use `proxy.ts` at the project root (not `middleware.ts`)
- **Function:** Export a function named `proxy` (not `middleware`)
- **Config:** The `config` export with `matcher` works the same way as before

The rename clarifies that this feature acts as a network-layer proxy at the request boundary, not Express-style middleware. It also addresses security concerns (CVE-2025-29927) related to authentication bypass under high load when using the previous middleware convention at the Edge Runtime.
