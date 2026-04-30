# Eng Platform research playbook

## service_owners (full + verify)

Service catalog / runbook wiki. Each entry keyed by service slug: team, tech_lead, slack_channel.

## oncall_rotation (full)

Pull from PagerDuty / incident.io / Opsgenie. Current primary, current secondary, rotation_id.

## deploy_status (update)

GitHub Actions deploy logs (or equivalent CI). Per service: version, last_deploy timestamp, status (healthy/degraded/rolling_back/failed). Reflects last successful deploy.

## feature_flags (full)

Feature-flag system (LaunchDarkly, Statsig, internal). Each entry: name, state (enabled/disabled/ramping), rollout_pct.

## internal_api_versions (full + verify)

Current version of each internally-shipped library or SDK. Pull from the package registry / monorepo manifest.

## active_incidents (update)

Currently-open incidents in the incident-management tool. Each entry: title, severity (sev1/sev2/sev3), started_at, owner, brief_status.

## corrections (full)

Wrong->right pairs that engineering AI agents have been observed making about internal tools, versions, or owners.
