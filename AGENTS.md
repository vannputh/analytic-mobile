# Agent Guidelines

## Modular Architecture & Code Organization

- **Favor composition over monoliths**
  - **Small modules**: Keep files focused on a single responsibility (feature, domain, or UI concern).
  - **Stable interfaces**: Export minimal, well‑named public APIs from each module; avoid leaking implementation details.
  - **Layered architecture**: Clearly separate UI, application/services, and data layers. Avoid crossing layers directly (e.g., UI → DB).

- **Domain‑oriented structure**
  - **Group by feature/domain** (e.g., `media`, `reviews`, `auth`) rather than only by technical type (`components`, `utils`).
  - **Colocate code** that changes together: components, hooks, tests, and styles for a feature should live near each other.
  - **Shared modules**: Extract truly cross‑cutting utilities into shared packages/modules, but keep them lean to avoid a "god utils" folder.

- **Clear boundaries & dependencies**
  - **Dependency direction**: Lower‑level modules must not depend on higher‑level ones (e.g., `core` should not import from `features`).
  - **Interfaces / types**: Use shared types/interfaces at the boundaries between layers and domains.
  - **No circular imports**: If two modules depend on each other, refactor to introduce a third abstraction they can both use.

## Best Practices for Agents in This Repo

- **Respect project tooling & constraints**
  - **Package manager**: Use `bun` and `bunx` (not `npm`, `npx`, `yarn`, or `pnpm`) for scripts, installs, and code generation.
  - **Environment files**: **Never** touch or modify `.env`, `.env.local`, or any other secrets files.
  - **Do not run the application** unless the user explicitly instructs otherwise (tests or builds may still be allowed if requested).

- **Incremental, safe changes**
  - **Read before write**: Always read a file before editing it, and make the minimal necessary diff.
  - **Keep changes small**: Prefer focused, composable edits over large rewrites unless the user asks for a refactor.
  - **Preserve behavior**: When refactoring for modularity, keep external APIs stable unless the user asks to change them.

- **API & data‑flow design**
  - **Pure functions where possible**: Business logic should be testable without I/O or framework dependencies.
  - **Explicit inputs/outputs**: Avoid hidden global state; pass what a function needs via parameters and return structured results.
  - **Error handling**: Fail fast with clear errors at boundaries, and centralize error translation/logging where practical.

- **Testing & reliability**
  - **Test close to the code**: Colocate unit and integration tests with the modules they cover.
  - **Prefer deterministic tests**: Avoid real network or time dependence where possible; use mocks/fakes for external systems.
  - **Guard critical paths**: Add or update tests when touching authentication, authorization, persistence, or data migration logic.

- **Performance & scalability**
  - **Avoid premature optimization**: Write clear code first, then optimize based on real bottlenecks.
  - **Chunk work**: For heavy computations or large payloads, consider batching, streaming, or pagination.
  - **Minimize duplication**: Extract shared logic when you see the same pattern three or more times, but only when the abstraction is clear.

- **Documentation & clarity**
  - **Prefer self‑documenting code**: Use descriptive names for functions, variables, and modules over comments that repeat the obvious.
  - **Explain non‑obvious decisions**: Add short comments or README sections for constraints, invariants, or surprising trade‑offs.
  - **Update docs with behavior**: When changing behavior or public APIs, update any relevant README/rules/agent docs in the same PR.

## Next.js 16 Proxy Convention

This project uses **Next.js 16**, which deprecated the `middleware` file convention in favor of `proxy`.

- **File:** Use `proxy.ts` at the project root (not `middleware.ts`)
- **Function:** Export a function named `proxy` (not `middleware`)
- **Config:** The `config` export with `matcher` works the same way as before

The rename clarifies that this feature acts as a network-layer proxy at the request boundary, not Express-style middleware. It also addresses security concerns (CVE-2025-29927) related to authentication bypass under high load when using the previous middleware convention at the Edge Runtime.
