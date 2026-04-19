# Lucid CMS: Astro + Node

Minimal Lucid CMS example using Astro, the Node adapter, SQLite, the Pages plugin, one fixed `seo` brick, and one repeatable `content` brick.

## Commands

All commands are run from the root of the project, from a terminal:

| Command | Action |
| :------ | :----- |
| `npm run dev` | Start the Astro dev server |
| `npm run build` | Build the Astro app |
| `npm run preview` | Preview the production build locally |
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

## Example toolkit

```ts
import getToolkit from "@lucidcms/astro/toolkit";

const toolkit = await getToolkit();
const response = await toolkit.documents.getSingle({
	collectionKey: "page",
	query: {
		filter: {
			_fullSlug: {
				value: "/",
			},
		},
	},
});
```

## Learn more

- [Lucid getting started](https://lucidcms.io/en/cms/docs/getting-started/installation/)
- [Astro integration](https://github.com/buildlucid/lucid-cms/tree/master/packages/astro)
- [Pages plugin](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-pages)
