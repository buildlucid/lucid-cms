/** Which files a UI library's Vite plugin should handle: globs relative to the site directory. */
export type UiFilter = {
	include?: string[];
	exclude?: string[];
};

/** Lets templates render UI components using integrations such as `react()` from `@lucidcms/site-react`, with custom integrations defined using `defineUiIntegration` from `@lucidcms/plugin-site/ui`. */
export type UiIntegration = UiFilter & {
	/** Names the library in errors, such as `react`. */
	name: string;
	/** File extensions of its components, such as `[".jsx", ".tsx"]`. */
	extensions: string[];
	/** Names the module whose `defineUiVite` default export supplies compilation plugins, so only the CLI loads Vite while config bundles the integration with the server. */
	vite?: string;
	/** The module that renders its components on the server, whose default export comes from `defineUiRenderer`. */
	server: string;
	/** The browser module that hydrates its components, whose default export is a `UiHydrate`. */
	client: string;
	/**
	 * The TypeScript type of a component's props, for editors, with `$file` standing for the component's module, such
	 * as `import("react").ComponentProps<typeof import($file).default>`.
	 */
	props?: string;
	/** Names a browser module to run before components, such as React Fast Refresh's development runtime, which Vite may serve as a virtual module. */
	preamble?: string;
};

/** Defines the `vite` module's default export, requiring supplied absolute globs to reach its plugins so libraries such as React and Solid can share extensions. */
export type UiVite<Plugin = unknown> = (
	filter: UiFilter,
	context: {
		/** The project's root, which is Vite's root, for plugins that look for their own config files. */
		projectRoot: string;
	},
) => Plugin[] | Promise<Plugin[]>;

/** What a renderer gets alongside the component and its props. */
export type UiRenderContext = {
	/** Unique to this component on the page, for ID prefixes such as React's `identifierPrefix`. */
	id: string;
	/** Whether the browser will hydrate it, so it renders the markers hydration needs. */
	hydrate: boolean;
};

/** Defines the integration's `server` module default export, rendering library components of type `Component` to HTML. */
export type UiRenderer<Component = unknown> = {
	/** Renders raw `slots` placeholders in `<client-slot>` using helpers such as `clientSlot`, with `default` for content outside fills and wrappers kept only for hydration; method syntax accepts any component type. */
	render(
		component: Component,
		props: Record<string, unknown>,
		slots: Record<string, string>,
		context: UiRenderContext,
	): UiRendered | Promise<UiRendered>;
};

/** Returns component HTML, optionally with head content such as Svelte's `<svelte:head>` for the layout's `{% outlet "head" %}`. */
export type UiRendered = string | { html: string; head?: string };

/** What a hydrate function gets alongside the component, its props and slots. */
export type UiHydrateContext = {
	/** The id the server rendered with, for ID prefixes such as React's `identifierPrefix`. */
	id: string;
	/** True for `client: "only"`, which renders into an empty host using server-provided slots rather than hydrating component HTML. */
	render: boolean;
};

/** Defines the integration's `client` module default export, hydrating library components with named `<client-slot>` elements from the template. */
export type UiHydrate<Component = unknown> = (
	element: HTMLElement,
	component: Component,
	props: Record<string, unknown>,
	slots: Record<string, Element>,
	context: UiHydrateContext,
) => void | Promise<void>;

/** Selects when a component loads through `client`, with `only` skipping server rendering and showing the template's `fallback` fill until loading finishes. */
export type UiClient = "load" | "idle" | "visible" | "only" | { media: string };
