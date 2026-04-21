export type { Toolkit } from "@lucidcms/core/toolkit";

import type {
	DocumentVersionType,
	RenderedTemplates,
} from "@lucidcms/core/types";

/**
 * Configure Lucid's front-end admin bar in Astro.
 */
export type LucidAstroAdminBarOptions = {
	/**
	 * Disable the admin bar entirely.
	 */
	disable?: boolean;
};

/**
 * Options for the `lucidCMS()` Astro integration.
 */
export type LucidAstroIntegrationOptions = {
	/**
	 * Configure the front-end admin bar and its injection behavior.
	 */
	adminBar?: LucidAstroAdminBarOptions;
};

/**
 * Describe the Lucid document the current page should open from the admin bar.
 */
export type LucidAstroAdminBarEditLink = {
	collectionKey: string;
	documentId: number;
	status?: DocumentVersionType;
	versionId?: number;
	/**
	 * Optional label for the edit action. Defaults to `Edit document`.
	 */
	label?: string;
};

/**
 * Request-local admin bar metadata set from an Astro page or layout.
 */
export type LucidAstroAdminBarContext = {
	edit?: LucidAstroAdminBarEditLink;
};

export type LucidAstroConfigMeta = {
	emailTemplates?: RenderedTemplates;
};

export type LucidAstroRuntime = "node" | "cloudflare";
