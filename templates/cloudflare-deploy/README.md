# Lucid CMS Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/buildlucid/lucid-cms/tree/master/templates/cloudflare-deploy)

Lucid CMS starter for Cloudflare Workers, Postgres through Hyperdrive, KV, R2, Images, and the Pages plugin.

## Commands

| Command | Action |
| :------ | :----- |
| `npm run dev` | Start Lucid development mode |
| `npm run serve` | Serve the built Lucid worker locally |
| `npm run build` | Build the Lucid worker |
| `npm run deploy` | Build the Lucid worker and deploy it with `cf` |
| `npm run typegen` | Generate Lucid type files |
| `npm run sync` | Sync Lucid config changes |
| `npm run migrate` | Run pending database migrations |
| `npm run migrate:rollback` | Roll back the last migration batch |
| `npm run migrate:reset` | Roll back all migrations |
| `npm run migrate:fresh` | Reset the database and run all migrations again |

## Database

Lucid stores content in Postgres, which the Worker reaches through the `LUCID_DB` Hyperdrive binding in `cloudflare.config.ts`. Set its `id` to your Hyperdrive configuration, and its `dev.connectionString` to the database you develop against.

Commands such as `npm run migrate` use that development connection string. To migrate production before a deploy, set it for the command:

```bash
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_LUCID_DB="postgres://..." npm run migrate -- --yes
```
