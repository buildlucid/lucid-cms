import type { CollectionDocumentKey, Toolkit } from "@lucidcms/core/types";
import type { KilnOptions, RenderAware, RenderInfo } from "@lucidkiln/core";
import type { DocumentReadOptions } from "./engine/functions/document.js";
import type { DocumentsOptions } from "./engine/functions/documents.js";
import type editable from "./engine/functions/editable.js";
import type footer from "./engine/functions/footer.js";
import type head from "./engine/functions/head.js";
import type notFound from "./engine/functions/not-found.js";
import type redirect from "./engine/functions/redirect.js";
import type {
	TemplateBrick,
	TemplateDocument,
} from "./engine/to-template-document.js";

/** Template function and prop types for Kiln's editor extensions. */
declare module "@lucidkiln/core" {
	interface KilnFunctions {
		/** Reads one document; use `document(...) ?? notFound()` to return a 404 when absent. */
		// Written out so the collection key keeps the project's generated names; Kiln types each call from its collection.
		document: RenderAware<
			<Key extends CollectionDocumentKey>(
				render: RenderInfo<SiteState>,
				collection: Key,
				options?: DocumentReadOptions,
			) => Promise<TemplateDocument<Key> | null>
		>;
		/** Lists documents; scoped previews fall back to published content. */
		documents: RenderAware<
			<Key extends CollectionDocumentKey>(
				render: RenderInfo<SiteState>,
				collection: Key,
				options?: DocumentsOptions,
			) => Promise<TemplateDocument<Key>[]>
		>;
		/** Preview attributes for `<h1{{ editable(page, "title") }}>`, empty outside previews. */
		editable: typeof editable;
		/** Preview referrer policy for `<head>`, empty outside previews. */
		head: typeof head;
		/** Preview toolbar and script to place before `</body>`, empty outside previews. */
		footer: typeof footer;
		/** Stops rendering with `pages/_404.kiln` and status 404. */
		notFound: typeof notFound;
		/** Stops rendering with a redirect, defaulting to 302. */
		redirect: typeof redirect;
	}

	interface KilnTypes {
		Document: TemplateDocument;
		Brick: TemplateBrick;
	}
}

/** Template sources keyed by path, e.g. `pages/index.kiln`. */
export type SiteTemplates = Record<string, string>;

/** ssr streams requests, isr caches until content changes, and static builds files while using SSR for development and previews. */
export type SiteMode = "ssr" | "isr" | "static";

export type SitePathsProps = {
	toolkit: Toolkit;
	/** All document paths across locales in the site's content version. */
	documentPaths: (collectionKey: string) => Promise<string[]>;
};

export type SiteRoute = {
	/** Overrides the server mode for non-static sites. */
	mode?: "ssr" | "isr";
	/** ISR TTL in seconds for external data; content changes invalidate pages sooner. */
	revalidate?: number;
	/** Build paths for dynamic pages, e.g. `/blog/hello`. */
	paths?: (props: SitePathsProps) => string[] | Promise<string[]>;
};

/** Route settings keyed by paths within `pages/`, without `.kiln`. */
export type SiteRoutes = Record<string, SiteRoute>;

export type SitePreview = Extract<
	NonNullable<Awaited<ReturnType<Toolkit["previews"]["state"]>>["data"]>,
	{ kind: "preview" }
>;

/** Render state available to custom functions through `withRender`. */
export type SiteState = {
	/** Document reads are tracked for page cache invalidation. */
	toolkit: Toolkit;
	/** Decoded request path, without a trailing slash. */
	path: string;
	/** Pass preview.token to toolkit reads to use preview content. */
	preview: SitePreview | null;
	/** Returns the collection's site version, or null if excluded. */
	version: (collectionKey: string) => string | null;
};

export type SitePluginOptions = {
	/** Template directory relative to cwd, defaulting to `site`, or sources keyed by path, which Workers require. */
	templates?: string | SiteTemplates;
	/** Defaults to the shared final environment, or latest when all collections lack environments; excludes collections missing it and uses latest for those without environments. */
	environment?: string;
	/** Defaults to ssr. */
	mode?: SiteMode;
	routes?: SiteRoutes;
} & Pick<KilnOptions<SiteState>, "globals" | "functions" | "filters" | "tests">;

export type SitePage = {
	template: string;
	/** Template path within `pages/`, without `.kiln`. */
	name: string;
	/** Router pattern, e.g. `/blog/:slug`. */
	pattern: string;
	contentType: string;
	mode: "ssr" | "isr";
	route: SiteRoute;
};
