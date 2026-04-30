# Sales / RevOps research playbook

## new_customers (full)

Last 7 days of closed-won deals. Pull from Salesforce or HubSpot. Each entry: company, arr, owner, closed_at, tier (smb/mid_market/enterprise).

## churned_customers (full)

Last 14 days. Pull from CS tooling or CRM cancellation events.

## at_risk_accounts (update)

Currently flagged at-risk by the CSM team. Each entry: company, arr, owner, risk_factor (one short phrase), next_action.

## top_deals_in_flight (full + update)

Top 5-10 deals weighted by amount * probability. Each entry: company, stage, amount, owner, expected_close.

## quota_attainment (full)

Current-quarter snapshot. target, closed, pct.

## corrections (full)

Wrong->right pairs the sales-team's AI agents have been observed making.
