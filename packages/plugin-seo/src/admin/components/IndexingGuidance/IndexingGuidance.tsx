import {
	useDocumentEditor,
	useSiteUrl,
	useTranslation,
} from "@lucidcms/admin/hooks";
import type { SlotComponent } from "@lucidcms/admin/types";
import { createMemo, Show } from "solid-js";
import { fields } from "../../../constants.js";
import { buildPageUrl, isCanonicalElsewhere } from "../../../shared/urls.js";
import { readText } from "../../utils/field-values.js";
import type indexingGuidanceConfig from "./config.js";

const IndexingGuidance: SlotComponent<
	ReturnType<typeof indexingGuidanceConfig>
> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const editor = useDocumentEditor();
	//* the sitemap lists a path every locale shares once, on the default locale's site
	const siteUrl = useSiteUrl(() =>
		editor.route?.localized ? editor.locale.current : null,
	);

	// ----------------------------------
	// Memos
	const noindex = () => props.field.value === "noindex";
	//* a path every locale shares is listed by the default locale's SEO values, which other locales can't see here
	const readsListedValues = () =>
		props.field.config.localized !== true ||
		editor.route?.localized === true ||
		editor.locale.current === editor.locale.default;
	//* matches the sitemap's rules: noindex pages and canonical URLs pointing away from the page's listed URL are left out
	const unlisted = createMemo(() => {
		if (!props.options.sitemap || !editor.route || !readsListedValues()) {
			return false;
		}
		if (noindex()) return true;

		const path = editor.route.path;
		const url = siteUrl();
		if (!path || !url) return false;
		return isCanonicalElsewhere(
			readText(props.fields, fields.canonicalUrl),
			buildPageUrl(url, path),
		);
	});

	// ----------------------------------
	// Render
	return (
		<>
			<p class="text-sm text-muted" classList={{ "text-warning": noindex() }}>
				{t(
					noindex()
						? "plugin.seo.indexing.noindex"
						: "plugin.seo.indexing.index",
				)}
			</p>
			<Show when={unlisted()}>
				<p class="mt-1 text-sm text-muted">
					{t("plugin.seo.indexing.unlisted")}
				</p>
			</Show>
		</>
	);
};
export default IndexingGuidance;
