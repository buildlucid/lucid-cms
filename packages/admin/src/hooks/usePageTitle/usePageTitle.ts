import { createEffect, onCleanup } from "solid-js";
import { useAdminConfig } from "../useAdminConfig/useAdminConfig.js";

/**
 * Sets the tab title to `{title} · {brand}`, falling back to the brand when no title is available.
 *
 * @example
 * ```tsx
 * import { usePageTitle, useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 * usePageTitle(() => t("redirects.title"));
 * ```
 */
export const usePageTitle = (title: () => string | null | undefined) => {
	const brand = useAdminConfig().brand.name;
	let current = brand;

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const value = title()?.trim();
		current = value ? `${value} · ${brand}` : brand;
		document.title = current;
	});

	onCleanup(() => {
		//* route transitions can mount the next page first, so only reset a title this page still owns
		if (document.title === current) document.title = brand;
	});
};
