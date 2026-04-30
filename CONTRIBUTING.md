# Contributing

Thanks for your interest. This is a small project and contributions are welcome.

## Useful contributions

- New starter packs. If your org's domain (legal, ops, finance, support) doesn't fit one of the three existing packs, open a PR adding `packs/<your-domain>/`.
- Render hints for sections that read awkwardly through the generic walker.
- Bug fixes in `lib/` or `scripts/`.
- Documentation improvements, especially for SETUP.md.

## Less useful contributions

- New endpoints. The engine surface is intentionally small.
- New confidence rules without a clear use case.
- Programmatic data adapters. The engine deliberately ships none.

## Process

1. Fork.
2. Branch.
3. `npm test` must pass.
4. Open a PR with a description that explains the use case.
