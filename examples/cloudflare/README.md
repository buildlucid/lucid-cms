# Lucid CMS: Cloudflare

Minimal Lucid CMS example using the Cloudflare adapter, LibSQL, the Pages plugin, Cloudflare R2 media storage, and a Cloudflare KV adapter.

## Commands

All commands are run from the root of the project, from a terminal:

| Command | Action |
| :------ | :----- |
| `npm run dev` | Start Lucid development mode |
| `npm run serve` | Serve the built Lucid worker locally |
| `npm run build` | Build the Lucid worker |
| `npm run wrangler:dev` | Build the app and run Wrangler locally |
| `npm run wrangler:deploy` | Build and deploy with Wrangler |
| `npm run sync` | Sync Lucid config changes |
| `npm run migrate` | Run pending database migrations |
| `npm run migrate:rollback` | Roll back the last migration batch |
| `npm run migrate:reset` | Roll back all migrations |
| `npm run migrate:fresh` | Reset the database and run all migrations again |

## Example collection

```ts
import { CollectionBuilder } from "@lucidcms/core";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	bricks: {
		fixed: [SeoBrick],
		builder: [ContentBrick],
	},
})
	.addText("title", {
		details: { label: "Title" },
		displayInListing: true,
	})
	.addTextarea("summary", {
		details: { label: "Summary" },
	});
```

## Example brick

```ts
import { BrickBuilder } from "@lucidcms/core";

const ContentBrick = new BrickBuilder("content", {
	details: { name: "Content" },
})
	.addText("heading", {
		details: { label: "Heading" },
	})
	.addTextarea("body", {
		details: { label: "Body" },
	});
```

## Learn more

- [Lucid getting started](https://lucidcms.io/en/cms/docs/getting-started/installation/)
- [Cloudflare adapter](https://github.com/buildlucid/lucid-cms/tree/master/packages/cloudflare-adapter)
