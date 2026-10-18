import type { CollectionDocumentKey, Toolkit } from "@lucidcms/core/types";
import type { KilnOptions, RenderAware, RenderInfo } from "@lucidkiln/core";
import type { DocumentReadOptions } from "./engine/functions/document.js";
import type { DocumentsOptions } from "./engine/functions/documents.js";
import type editable from "./engine/functions/editable.js";
import type footer from "./engine/functions/footer.js";
import type head from "./engine/functions/head.js";
import type notFound from "./engine/functions/not-found.js";
import type redirect from "./engine/functions/redirect.js";
import type createViteFunction from "./engine/functions/vite.js";
import type createViteAssetFunction from "./engine/functions/vite-asset.js";
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
		/** Stylesheet, script and preload tags for Vite entries, such as `vite("styles/site.css")`. Paths must be written out; `attrs` adds attributes to every tag. */
		vite: ReturnType<typeof createViteFunction>;
		/** The URL of one file Vite builds, such as `viteAsset("images/logo.svg")`. Paths must be written out. */
		viteAsset: ReturnType<typeof createViteAssetFunction>;
	}

	interface KilnTypes {
		Document: TemplateDocument;
		Brick: TemplateBrick;
	}
}

/** A chunk in Vite's build manifest, keyed by its source path relative to the site directory. */
export type ViteManifestChunk = {
	file: string;
	isEntry?: boolean;
	imports?: string[];
	css?: string[];
	assets?: string[];
};

/** What the plugin's CLI hands its runtime code: the site directory in development, otherwise the built site. */
export type SiteCliData =
	| {
			mode: "dev";
			/** Absolute path of the site directory, resolved from the project root. */
			directory: string;
			/** Whether Vite is installed and serving the site's files. */
			vite: boolean;
	  }
	| {
			mode: "build";
			/** New for every build, so stored pages and fragments from the last deploy are never served. */
			buildId: string;
			/** Template sources keyed by path, e.g. `pages/index.kiln`, so builds need no files at runtime. */
			templates: Record<string, string>;
			/** Vite's manifest, or null when no template calls `vite()`. */
			manifest: Record<string, ViteManifestChunk> | null;
	  };

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

/** What a `defineSiteFunction` function receives before its template arguments. */
export type SiteFunctionContext = {
	/** Document reads are tracked for page cache invalidation. */
	toolkit: Toolkit;
	/** The preview token, or null, matching the toolkit's `preview` input. */
	preview: string | null;
	/** Returns the collection's site version, or null if excluded. */
	version: (collectionKey: string) => string | null;
	/** Decoded request path, without a trailing slash. */
	path: string;
	/** Tags the cached section this call runs in, for reads the built-in functions don't make. */
	tagCache: (...tags: string[]) => void;
	/** The built-in template functions, handling the site version, previews and cache tags. */
	functions: {
		document: <Key extends CollectionDocumentKey>(
			collection: Key,
			options?: DocumentReadOptions,
		) => Promise<TemplateDocument<Key> | null>;
		documents: <Key extends CollectionDocumentKey>(
			collection: Key,
			options?: DocumentsOptions,
		) => Promise<TemplateDocument<Key>[]>;
	};
	/** Kiln's render info, such as its locale, time zone and abort signal. */
	render: RenderInfo<SiteState>;
};

export type SitePluginOptions = {
	/** The site's folder relative to the project root, defaulting to `site`. Builds bundle its templates, so production reads no files. */
	directory?: string;
	/** Defaults to the shared final environment, or latest when all collections lack environments; excludes collections missing it and uses latest for those without environments. */
	environment?: string;
	/** Defaults to ssr. */
	mode?: SiteMode;
	static?: {
		/** Static output directory relative to the project root, defaulting to `dist-site` and emptied by each `site:build`. */
		outDir?: string;
	};
	routes?: SiteRoutes;
	kiln?: SiteKilnOptions;
};

type SiteCallables = KilnOptions<SiteState>["functions"];

/** Template functions, filters, tests, globals and type checks registered together, such as by a plugin. */
export type SiteExtension = {
	/** Names the extension in errors when two register the same thing. */
	name: string;
	functions?: SiteCallables;
	filters?: SiteCallables;
	tests?: SiteCallables;
	globals?: Record<string, unknown>;
	/** Type checks for `{% props item: Product %}`, keyed by type name. */
	types?: Record<string, (value: unknown) => boolean>;
};

/** Kiln settings with site overrides, rejecting extensions that replace built-ins or each other's entries. */
export type SiteKilnOptions = Omit<SiteExtension, "name"> & {
	extensions?: SiteExtension[];
} & Pick<KilnOptions<SiteState>, "timeZone">;

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
