import type {
	CollectionDocumentKey,
	ContentBrick,
	ContentDocument,
	ContentList,
	Locale,
	LocalizedMedia,
	MediaListItem,
	ServiceContext,
	Toolkit,
} from "@lucidcms/core/types";
import type { RichTextJSON } from "@lucidcms/richtext";
import type { KilnOptions, RenderAware, RenderInfo } from "@lucidkiln/core";
import type { DocumentListOptions } from "./functions/document-list.js";
import type { DocumentReadOptions } from "./functions/document.js";
import type editable from "./functions/editable.js";
import type footer from "./functions/footer.js";
import type head from "./functions/head.js";
import type isEditing from "./functions/is-editing.js";
import type isPreview from "./functions/is-preview.js";
import type createLocalesFunction from "./functions/locales.js";
import type createMediaListFunction from "./functions/media-list.js";
import type { MediaListOptions } from "./functions/media-list.js";
import type mediaUrl from "./functions/media-url.js";
import type { MediaUrlOptions } from "./functions/media-url.js";
import type createMediaFunction from "./functions/media.js";
import type { MediaReadOptions } from "./functions/media.js";
import type notFound from "./functions/not-found.js";
import type redirect from "./functions/redirect.js";
import type richText from "./functions/rich-text.js";
import type { TranslateOptions } from "./functions/translate.js";
import type createViteAssetFunction from "./functions/vite-asset.js";
import type createViteFunction from "./functions/vite.js";
import type { BuiltUi } from "./ui/site-ui.js";
import type { UiIntegration, UiRenderer } from "./ui/types.js";

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
		/** A collection's document URLs in the locales of the render's domain, every site locale unless `siteUrl` puts them on several, such as for `{% export paths = documentPaths("page") %}`. */
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
		/**
		 * Preview attributes for fields, bricks or repeater items. Mark a repeater to enable item
		 * insertion. Empty outside previews.
		 */
		editable: typeof editable;
		/** True in builder and shared previews. */
		isPreview: typeof isPreview;
		/**
		 * True in the builder's preview, where editors fill in the page. Use it to render placeholders
		 * for empty fields, bricks or repeater items that shared previews shouldn't show.
		 */
		isEditing: typeof isEditing;
		/** Preview referrer policy for `<head>`, empty outside previews. */
		head: typeof head;
		/** The preview script to place before `</body>`, empty outside previews. */
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
		/** Types page render data for Kiln, exposing path and parameters such as `route.params.slug` for `pages/blog/[slug].kiln` to pages and includes, without making `route` global to components or islands. */
		route: SiteRoute;
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

/** A chunk in Vite's build manifest, keyed by its source path from the Vite root. */
export type ViteManifestChunk = {
	file: string;
	isEntry?: boolean;
	imports?: string[];
	dynamicImports?: string[];
	css?: string[];
	assets?: string[];
};

/** How the site's browser files are served: by Vite's dev server during development, otherwise from the client build. */
export type SiteData =
	| {
			kind: "dev";
			/** The site directory's path from the Vite root, such as `site/`, which Vite serves its files under. */
			prefix: string;
			/** Changes when a site file other than a template changes, such as a UI component, so cached pages are left behind. */
			revision: string;
			/** The project's public files, which no page may share a path with. A change to them restarts the server. */
			publicFiles: SitePublicFile[];
	  }
	| {
			kind: "build";
			/** New for every build, so stored pages and fragments from the last deploy are never served. */
			buildId: string;
			/** The site directory's path from the Vite root, which Vite's manifest keys start with. */
			prefix: string;
			/** Vite's client build manifest, keyed by source path from the Vite root. */
			manifest: Record<string, ViteManifestChunk>;
			/** The UI components templates name, or null when there are none. */
			ui: BuiltUi | null;
	  };

/** A client build's site data, which builds and `site:build` read. */
export type BuiltSiteData = Extract<SiteData, { kind: "build" }>;

/** Server-module exports provided by the CLI's Vite plugin as `runtimeContext.pluginModules`, loading templates and components through the server environment for live development edits and bundled builds. */
export type SiteModule = {
	data: SiteData;
	/** Template sources by name, such as `pages/index.kiln`. */
	templates: Record<string, () => Promise<string>>;
	/** UI components by name, with the integration that renders each. */
	components: Record<
		string,
		{ integration: string; load: () => Promise<{ default: unknown }> }
	>;
	/** UI integrations' server renderers by integration name. */
	renderers: Record<string, () => Promise<{ default: UiRenderer }>>;
};

/** ssr streams requests, isr caches until content changes, and static builds files while using SSR for development and previews. */
export type SiteMode = "ssr" | "isr" | "static";

/** Whether HTML page URLs end in a slash: the other form redirects to it. */
export type SiteTrailingSlash = "never" | "always";

/** The `route` every page renders with. */
export type SiteRoute = {
	/** Decoded request path, without a trailing slash. */
	path: string;
	/** Decoded values for the page file name's parameters, empty for error pages. */
	params: Record<string, string>;
};

/** What a page's `paths` export lists for a static build, and for the sitemap with `sitemap = true`: URLs, or values for its file name's parameters. */
export type SitePagePaths = Array<string | Record<string, string | number>>;

export type SitePreview = Extract<
	NonNullable<Awaited<ReturnType<Toolkit["previews"]["state"]>>["data"]>,
	{ kind: "preview" }
>;

/**
 * Inputs to the site's `locale` option. Static builds and the sitemap have no request, so headers
 * and cookies read as missing there and a locale chosen by them is whatever the option falls back to.
 */
export type SiteLocaleContext = {
	/** Decoded request path, without a trailing slash; empty while `paths` exports are evaluated. */
	path: string;
	/**
	 * The request URL. In the sitemap, the page's URL on the domain being listed, or that domain's
	 * site URL while `paths` exports are evaluated. Null in static builds.
	 */
	url: URL | null;
	/** Reads a request header and adds it to the response's `Vary`; null in static builds and the sitemap. */
	header: (name: string) => string | null;
	/** Reads a request cookie and adds `Cookie` to the response's `Vary`; undefined in static builds and the sitemap. */
	cookie: (name: string) => string | undefined;
};

/** Render state available to custom functions through `withRender`. */
export type SiteState = {
	/** Document reads are tracked for page cache invalidation. */
	toolkit: Toolkit;
	/** The request's service context, which the fragment store reads KV with; read content through `toolkit`. */
	context: ServiceContext;
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
	/**
	 * HTML tags for browser files the function's markup needs. Put them in the markup it returns,
	 * so they are cached with it: pages rendered in one go move each into `<head>` once, and
	 * streamed pages keep them beside the markup.
	 */
	assets: {
		/** A module script, which browsers run once however many times it is on the page. */
		script: (src: string) => string;
		style: (href: string) => string;
	};
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
		/** A collection's document URLs in the locales of the render's domain, every site locale unless `siteUrl` puts them on several, the shape a page's `paths` export accepts. */
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
	/**
	 * Chooses a render's locale, such as by path prefix or cookie. The request's domain decides which locales are possible:
	 * with a `siteUrl` record, those whose URL is on its host, with hosts the record doesn't name on the default locale's
	 * domain; otherwise every site locale. A domain with one locale renders it without calling the option, so the option
	 * only chooses between locales that share a domain, and returning one from another domain is an error. When omitted,
	 * each domain renders its first locale in the order of `locales`, the default locale first. Static builds need every
	 * site URL on one domain.
	 */
	locale?: (context: SiteLocaleContext) => string;
	/** Default `Cache-Control` for SSR and ISR pages, overridable per page, and for 404 pages; prefer `s-maxage` over browser caching that cannot be purged and bypass CDN caches for the `lucid_preview` cookie. */
	cacheControl?: string;
	/**
	 * Which form of an HTML page's URL is canonical, defaulting to `never`: `/about/` redirects to `/about` with a 301, or the other way round with `always`.
	 * The root and pages with another content type, such as `robots.txt`, serve both forms. Only served pages are affected; static builds write `index.html` folders, so whatever serves them decides.
	 */
	trailingSlash?: SiteTrailingSlash;
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
	"directory" | "mode" | "trailingSlash" | "static"
> & {
	directory: string;
	mode: SiteMode;
	trailingSlash: SiteTrailingSlash;
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
	/** Whether the page has a `paths` export, which static builds evaluate for dynamic pages, as the sitemap does for those exporting `sitemap = true`. */
	paths: boolean;
	/**
	 * The page's `sitemap` export, for the SEO plugin's sitemap: `false` leaves the page and the
	 * documents it renders out, and `true` lists a page with route parameters from its `paths`
	 * export. Pages without route parameters are listed unless it is `false`.
	 */
	sitemap?: boolean;
};

/** A file a static build writes, by its path within the output folder, such as `/sitemap.xml`. */
export type SiteStaticFile = { path: string; body: string };

/** A project public file, by its public path, such as `/robots.txt`, and its file from the project root, such as `public/robots.txt`. */
export type SitePublicFile = { path: string; file: string };
