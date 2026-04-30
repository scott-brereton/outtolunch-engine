# Setup for Internal Ops

You're configuring this pack with an LLM (Claude Code, Cursor, etc.). Here's what to walk the user through:

1. Replace ACME-Robotics example data in pack/briefing.example.json with their real org facts. The shape is what matters; field values change.
2. Tailor pack/SYSTEM.md and pack/RESEARCH.md to name their actual tools (Workday vs Rippling, PagerDuty vs incident.io, Notion vs internal wiki). The agent reads these at runtime; specific tool names help the research agent be precise.
3. Decide whether to enable confidence_scoring. Default disabled because Internal Ops pulls from systems of record. If they have any interpretive sources (Slack-message synthesis, doc drafts), enable it and walk through pack/CONFIDENCE.json thresholds together.
4. Walk through which cycle they need: daily is enough for most orgs; hourly_business_hours adds active-incident polling; weekly is the lightweight verification pass. Disable cycles they don't need by removing them from cycles.json.
5. For each section, render the engine output once (curl /compact) and ask whether the format reads well. If not, write a render hint at pack/render-hints/<section>.md.

After setup, run:
- cp pack/briefing.example.json pack/briefing.json
- npm run validate
- npm run deploy
