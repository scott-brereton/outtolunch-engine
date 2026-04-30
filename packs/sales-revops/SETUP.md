# Setup for Sales / RevOps

You're configuring this pack with an LLM (Claude Code, Cursor, etc.). Here's what to walk the user through:

1. Replace the example pipeline data in pack/briefing.example.json with their real CRM facts. The shape is what matters; companies, owners, ARR values change.
2. Tailor pack/SYSTEM.md and pack/RESEARCH.md to name their actual tools (Salesforce vs HubSpot, Gainsight vs ChurnZero, Looker vs Mode). The agent reads these at runtime; specific tool names help the research agent be precise.
3. Decide whether to enable confidence_scoring. Default disabled because Sales / RevOps pulls from the CRM as the system of record. Enable it only if any sources are interpretive (Slack-message synthesis of deal state, AI-summarized account notes).
4. Walk through which cycle they need: daily covers most pipeline reporting; hourly_business_hours adds active at-risk and deals-in-flight polling for sales leadership dashboards. Disable cycles they don't need by removing them from cycles.json.
5. For each section, render the engine output once (curl /compact) and ask whether the format reads well. If not, write a render hint at pack/render-hints/<section>.md.

After setup, run:
- cp pack/briefing.example.json pack/briefing.json
- npm run validate
- npm run deploy
