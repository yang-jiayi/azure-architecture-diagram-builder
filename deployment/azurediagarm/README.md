# AzureDiagarm production deployment

The production site is deployed to Azure Container Apps and exposed only through Azure Front Door Standard with WAF.

## Cost controls

- Azure Front Door uses the Standard tier, matching the `SQLServerEvo_rg` reference architecture.
- The Container App uses the Consumption workload profile and can scale to zero.
- Images use the existing `sqlserverevoacr` Basic registry instead of creating another paid registry.
- Upstream checks and deployments run in public-repository GitHub Actions every two hours, so no continuously allocated updater compute is required.
- Azure Communication Services sends mail only after a deployment succeeds or fails.

## Update flow

`.github/workflows/azurediagarm-sync-deploy.yml` runs every two hours. It merges `Arturo-Quiroga-MSFT/azure-architecture-diagram-builder` into this fork, pushes the merge to `main`, builds a unique image tag, deploys a new Container Apps revision, purges Front Door, verifies the production URL, and emails the update details.

## Security layers

- The wildcard `*.mssql.biz` certificate is read from `westuskvl` by the Front Door managed identity and tracks the latest Key Vault secret version.
- WAF runs in Prevention mode with rate limiting and known AI crawler `User-Agent` blocking.
- The origin validates `X-Azure-FDID`, preventing direct Container Apps access from bypassing WAF.
- Application responses include anti-indexing headers and `robots.txt`; these controls discourage compliant crawlers while WAF handles known automated clients.
