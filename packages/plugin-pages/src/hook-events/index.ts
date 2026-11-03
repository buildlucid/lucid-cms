import { defineHookEvents } from "@lucidcms/core";
import type { EffectHookEvent } from "@lucidcms/core/types";

/** Paths were rebuilt for every configured pages collection, inside the rebuild's transaction. */
export type PagesAfterRebuildPathsHookData = {
	collectionKeys: string[];
};

declare module "@lucidcms/core/types" {
	interface PluginHookEvents {
		pages: {
			afterRebuildPaths: EffectHookEvent<
				Record<string, never>,
				PagesAfterRebuildPathsHookData
			>;
		};
	}
}

/** Hook events projects can subscribe to with `service: "pages"`. */
export default defineHookEvents({
	key: "pages",
	events: { afterRebuildPaths: "effect" },
});
