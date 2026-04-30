# Setup for Eng Platform

You're configuring this pack with an LLM (Claude Code, Cursor, etc.). Here's what to walk the user through:

1. Replace the example service / deploy / flag data in pack/briefing.example.json with their real internal-tech facts. Service slugs, team names, version strings, and oncall names change; the shape stays.
2. Tailor pack/SYSTEM.md and pack/RESEARCH.md to name their actual tools (PagerDuty vs incident.io vs Opsgenie, LaunchDarkly vs Statsig, Backstage vs Cortex). The agent reads these at runtime; specific tool names help the research agent be precise.
3. Decide whether to enable confidence_scoring. Default disabled because Eng Platform pulls from systems of record (service catalog, CI logs, flag system). Enable it only if any sources are interpretive (Slack-summarized incidents, agent-drafted runbook updates).
4. Walk through which cycle they need: daily covers stable platform state; hourly_business_hours adds active-incident and deploy-status polling; weekly is the lightweight verification pass for slow-moving facts. Disable cycles they don't need by removing them from cycles.json.
5. For each section, render the engine output once (curl /compact) and ask whether the format reads well. If not, write a render hint at pack/render-hints/<section>.md.

After setup, run:
- cp pack/briefing.example.json pack/briefing.json
- npm run validate
- npm run deploy
