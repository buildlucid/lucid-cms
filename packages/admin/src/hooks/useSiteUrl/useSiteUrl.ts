import type { Accessor } from "solid-js";
import siteStore from "@/store/siteStore/siteStore";

/**
 * Returns the website's absolute URL for a content locale: its own `siteUrl` entry, or the default
 * locale's when it has none or no locale is given, resolved against the CMS's `url` as the server
 * resolves it. Null when no website is configured.
 *
 * @example
 * ```tsx
 * import { useDocumentEditor, useSiteUrl } from "@lucidcms/admin/hooks";
 *
 * const editor = useDocumentEditor();
 * const siteUrl = useSiteUrl(() => editor.locale.current);
 *
 * return (
 * 	<Show when={siteUrl()}>
 * 		{(url) => <a href={url()}>{url()}</a>}
 * 	</Show>
 * );
 * ```
 */
export const useSiteUrl =
	(locale?: Accessor<string | null | undefined>): Accessor<string | null> =>
	() =>
		siteStore.get.getSiteUrl(locale?.());
