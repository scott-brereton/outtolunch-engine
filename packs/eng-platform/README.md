# Eng Platform starter pack

Service-ownership and deploy-state starter for outtolunch-engine. Seven sections covering service owners, oncall rotation, deploy status, feature flags, internal API versions, active incidents, and corrections. Confidence scoring disabled — this pack assumes you're pulling from your service catalog, CI logs, and flag system as systems of record.

To use:
- cp -R packs/eng-platform/. pack/
- Replace example data with real platform data.
- Run npm run validate, then npm run deploy.

See SETUP.md for the LLM-led configuration walkthrough.
