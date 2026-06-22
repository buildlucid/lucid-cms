# Lucid CMS Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/buildlucid/lucid-cms/tree/master/templates/cloudflare-deploy)

Lucid CMS starter for Cloudflare Workers, D1, KV, R2, and the Pages plugin.

## Commands

| Command | Action |
| :------ | :----- |
| `npm run dev` | Start Lucid development mode |
| `npm run serve` | Serve the built Lucid worker locally |
| `npm run build` | Build the Lucid worker |
| `npm run deploy` | Run remote Lucid migrations and deploy with Wrangler |
| `npm run wrangler:dev` | Build the app and run Wrangler locally |
| `npm run wrangler:deploy` | Build, migrate, and deploy with Wrangler |
| `npm run typegen` | Generate Lucid type files |
| `npm run sync` | Sync Lucid config changes |
| `npm run migrate` | Run pending database migrations |
| `npm run migrate:rollback` | Roll back the last migration batch |
| `npm run migrate:reset` | Roll back all migrations |
| `npm run migrate:fresh` | Reset the database and run all migrations again |
