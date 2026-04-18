# Deterministic Scaffold Contract

## Purpose

This contract defines a deterministic, drift-resistant scaffold for Repo-Stabilization.

## Core directives

1. No Drift: module order is fixed and reproducible.
2. Full Scaffold Layers: backend/frontend/CI/config represented in one structure.
3. Permissionless Repair: any user can scan/repair/rebuild.
4. Conflict Resolver: deterministic merge resolution policy.
5. Dependency Rebuilder: deterministic lockfile regeneration hook.
6. Error Passing Tests: repairs are mergeable only after verification.

## Repo-Brain module sequence

Hospital → Detect → Scan-Actions → Normalize → Doctor → Surgeon → Verify → AI-Guard → Firewall → Vitals → Fleet

Extended modules: Autopsy, Genome, Immunizer, Blackbox, Fix.Safe.

## Supported surfaces

- Web/UI: Next.js, Vite, React, Remix, Astro, SvelteKit, Nuxt, Vue
- Backend: Node, Python, Go, Rust, Java
- Blockchain: Solidity + Solana
- Config: YAML/JSON/TOML/ENV/TSConfig

## Governance invariant

No automated repair can merge unless Verify + AI-Guard pass.
