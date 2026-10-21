import type {
	CollectionDocumentKey,
	ContentBrick,
	ContentDocument,
	ContentList,
	Locale,
	LocalizedMedia,
	MediaListItem,
	Toolkit,
} from "@lucidcms/core/types";
import type { RichTextJSON } from "@lucidcms/rich-text";
import type { KilnOptions, RenderAware, RenderInfo } from "@lucidkiln/core";
import type { DocumentReadOptions } from "./functions/document.js";
import type { DocumentListOptions } from "./functions/document-list.js";
import type editable from "./functions/editable.js";
import type footer from "./functions/footer.js";
import type head from "./functions/head.js";
import type createLocalesFunction from "./functions/locales.js";
import type createMediaFunction from "./functions/media.js";
import type { MediaReadOptions } from "./functions/media.js";
import type createMediaListFunction from "./functions/media-list.js";
import type { MediaListOptions } from "./functions/media-list.js";
import type mediaUrl from "./functions/media-url.js";
import type { MediaUrlOptions } from "./functions/media-url.js";
import type notFound from "./functions/not-found.js";
import type redirect from "./functions/redirect.js";
import type richText from "./functions/rich-text.js";
import type { TranslateOptions } from "./functions/translate.js";
import type createViteFunction from "./functions/vite.js";
import type createViteAssetFunction from "./functions/vite-asset.js";
import type { BuiltUi, SiteUi } from "./ui/site-ui.js";
import type { UiIntegration } from "./ui/types.js";

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
			) => Promise<ContentDocument<Key, true> | null>
		>;
		/** Lists documents as `{ items, pagination }`; scoped previews fall back to published content. */
		documentList: RenderAware<
			<Key extends CollectionDocumentKey>(
				render: RenderInfo<SiteState>,
				collection: Key,
				options?: DocumentListOptions,
			) => Promise<ContentList<ContentDocument<Key, true>>>
		>;
		/** A collection's document URLs in the site's locales, such as for `{% export paths = documentPaths("page") %}`. */
		documentPaths: RenderAware<
			(
				render: RenderInfo<SiteState>,
				collection: CollectionDocumentKey,
			) => Promise<string[]>
		>;
		/** Reads one library media item by ID, or null. */
		media: ReturnType<typeof createMediaFunction>;
		/** Lists library media as `{ items, pagination }`. */
		mediaList: ReturnType<typeof createMediaListFunction>;
		/** A media item's URL, such as `mediaUrl(image, { preset: "card", format: "webp" })`. */
		mediaUrl: typeof mediaUrl;
		/** The site's content locales, such as for language links. */
		locales: ReturnType<typeof createLocalesFunction>;
		/** Text from `<locale>.site.json` files in the render's locale, such as `translate("nav.home", { fallback: "Home" })`. */
		translate: RenderAware<
			(
				render: RenderInfo<SiteState>,
				key: SiteTranslationKey,
				options?: TranslateOptions,
			) => string
		>;
		/** Renders a rich text field or node as HTML; embedded bricks and document nodes are yours to render. */
		richText: typeof richText;
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

	interface KilnGlobals {
		/** The content locale this render reads, such as for `<html lang="{{ locale }}">`. */
		locale: string;
	}

	interface KilnTypes {
		Document: ContentDocument<string, true>;
		Brick: ContentBrick;
		Media: LocalizedMedia;
		RichText: RichTextJSON;
	}
}

type SiteKey<Key> = Key extends `site:${infer Name}` ? Name : never;
type GeneratedSiteTranslationKey = SiteKey<keyof LucidCMS.TranslationKeys>;

/** Keys from the project's and plugins' `<locale>.site.json` files, or any string until there are some. */
export type SiteTranslationKey = [GeneratedSiteTranslationKey] extends [never]
	? string
	: GeneratedSiteTranslationKey;

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
			kind: "dev";
			/** Absolute path of the site directory, resolved from the project root. */
			directory: string;
			/** Whether Vite is installed and serving the site's files. */
			vite: boolean;
			/** Loads UI components through Vite, or null when the site has no `ui` integrations. */
			ui: SiteUi | null;
	  }
	| {
			kind: "build";
			/** New for every build, so stored pages and fragments from the last deploy are never served. */
			buildId: string;
			/** Template sources keyed by path, e.g. `pages/index.kiln`, so builds need no files at runtime. */
			templates: Record<string, string>;
			/** Vite's manifest, or null when no template calls `vite()`. */
			manifest: Record<string, ViteManifestChunk> | null;
			/** The UI components templates name, or null when there are none. */
			ui: BuiltUi | null;
	  };

/** ssr streams requests, isr caches until content changes, and static builds files while using SSR for development and previews. */
export type SiteMode = "ssr" | "isr" | "static";

/** What a page's `paths` export lists for a static build: URLs, or values for its file name's parameters. */
export type SitePagePaths = Array<string | Record<string, string | number>>;

export type SitePreview = Extract<
	NonNullable<Awaited<ReturnType<Toolkit["previews"]["state"]>>["data"]>,
	{ kind: "preview" }
>;

/** Inputs to the site's `locale` option, with only the path available during static builds. */
export type SiteLocaleContext = {
	/** Decoded request path, without a trailing slash. */
	path: string;
	/** The request URL, or null in static builds. */
	url: URL | null;
	/** Reads a request header and adds it to the response's `Vary`; null in static builds. */
	header: (name: string) => string | null;
	/** Reads a request cookie and adds `Cookie` to the response's `Vary`; undefined in static builds. */
	cookie: (name: string) => string | undefined;
};

/** Render state available to custom functions through `withRender`. */
export type SiteState = {
	/** Document reads are tracked for page cache invalidation. */
	toolkit: Toolkit;
	/** Decoded request path, without a trailing slash. */
	path: string;
	/** The content locale reads use unless given another, also the `locale` global. */
	locale: string;
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
	/** The content locale this render reads. */
	locale: string;
	/** Tags the cached section this call runs in, for reads the built-in functions don't make. */
	tagCache: (...tags: string[]) => void;
	/** The built-in template functions, handling the site version, previews and cache tags. */
	functions: {
		document: <Key extends CollectionDocumentKey>(
			collection: Key,
			options?: DocumentReadOptions,
		) => Promise<ContentDocument<Key, true> | null>;
		documentList: <Key extends CollectionDocumentKey>(
			collection: Key,
			options?: DocumentListOptions,
		) => Promise<ContentList<ContentDocument<Key, true>>>;
		/** A collection's document URLs in the site's locales, the shape a page's `paths` export accepts. */
		documentPaths: (collection: CollectionDocumentKey) => Promise<string[]>;
		media: (
			id: number,
			options?: MediaReadOptions,
		) => Promise<LocalizedMedia | null>;
		mediaList: (
			options?: MediaListOptions,
		) => Promise<ContentList<LocalizedMedia<MediaListItem>>>;
		mediaUrl: (
			media: { key: string } | string,
			options?: MediaUrlOptions,
		) => Promise<string | null>;
		locales: () => Promise<Locale[]>;
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
	/** Content locales the site renders, defaulting to every CMS locale. */
	locales?: string[];
	/** Chooses a render's locale from the site's locales, such as by path prefix, domain or cookie, or uses the default locale when omitted. */
	locale?: (context: SiteLocaleContext) => string;
	/** Default `Cache-Control` for SSR and ISR pages, overridable per page; prefer `s-maxage` over browser caching that cannot be purged and bypass CDN caches for the `lucid_preview` cookie. */
	cacheControl?: string;
	static?: {
		/** Static output directory relative to the project root, defaulting to `dist-site` and emptied by each `site:build`. */
		outDir?: string;
	};
	kiln?: SiteKilnOptions;
	/**
	 * UI libraries whose components templates can render, such as `ui: [react()]` from `@lucidcms/site-react`.
	 * Templates name components by file, such as `{% component "components/Counter.tsx" with { client: "visible" } %}`.
	 */
	ui?: UiIntegration[];
};

/** Site plugin options with their defaults filled in. */
export type SitePluginOptionsInternal = Omit<
	SitePluginOptions,
	"directory" | "mode" | "static"
> & {
	directory: string;
	mode: SiteMode;
	static: { outDir: string };
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
	/** The site's mode, or the page's `mode` export. */
	mode: "ssr" | "isr";
	/** The page's `revalidate` export: an ISR TTL in seconds for external data, since content changes invalidate sooner. */
	revalidate?: number;
	/** The page's `cacheControl` export, or the site's default, sent as-is outside previews and development. */
	cacheControl?: string;
	/** Whether the page has a `paths` export, which static builds evaluate for dynamic pages. */
	paths: boolean;
};
