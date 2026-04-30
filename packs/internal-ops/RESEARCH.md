# Internal Ops research playbook

The cycles below describe what to do per refresh. Section headings match cycles.json.

## leadership (full)

For each officeholder (CEO, COO, CFO, CTO, VP Eng, VP Sales, VP Product, Chief of Staff, etc.) confirm:
- Current name and start date in role.
- Previous officeholder if there was a transition in the last 6 months.

Sources: most recent leadership announcements; org-wide channels; the company about page if maintained.

## people_on_vacation (full)

Pull entries for the next 14 days from your HRIS (Workday, Rippling, Lattice, or the dedicated Slack channel).
Structure each entry: name, role, return_date, optional reason.

## recent_hires_departures (full)

Last 30 days. Group by date.

## current_priorities (full + update)

Top 3-5 active company priorities. Pull from the source-of-truth doc (varies by org).
Each entry: title, owner, status (one of: on_track, at_risk, blocked).

## active_incidents (update)

Currently OPEN customer-affecting incidents. From your incident management system.
Each entry: title, severity (sev1/2/3), started_at, owner, brief_status.

## internal_tool_versions (full + verify)

Current versions of internal services and SDKs that AI consumers reference.
Confirm each one ships with the version listed; flag any deprecations.

## corrections (full + verify)

Wrong->right pairs your AI consumers have been observed bungling. Examples:
- "Sarah Chen is the CTO" -> "Sarah Chen left in February. The CTO is Alex Park as of 2026-02-15."
- "The mobile SDK is mobilekit v3" -> "mobilekit v4.2 is the current version; v3 was deprecated 2025-12."

Add new corrections sparingly. Verify existing ones still hold.

## upcoming_events (full)

Next 30 days: launches, all-hands, board meetings, marketing pushes.
