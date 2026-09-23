import { useTranslation } from "@lucidcms/admin/hooks";
import type {
	FieldSlotComponent,
	TranslationRegistry,
} from "@lucidcms/admin/types";
import { createMemo, Show } from "solid-js";
import type messages from "../../../../translations/en.admin.json";

type PagesTranslations = TranslationRegistry<typeof messages>;
declare global {
	namespace LucidCMS {
		interface CopyTranslationKeys extends PagesTranslations {}
	}
}

const FullSlug: FieldSlotComponent = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();

	// ----------------------------------
	// Memos
	const path = createMemo(() => {
		const value = props.context.getValue("fullSlug");
		return typeof value === "string" ? value : "";
	});

	// ----------------------------------
	// Render
	return (
		<div class="flex min-w-0 items-center justify-between gap-3 text-sm text-body">
			<Show
				when={path()}
				fallback={<p class="text-sm">{t("plugin.pages.route.pending")}</p>}
			>
				<p class="break-all text-sm">
					<span class="text-subtitle">{t("plugin.pages.route.label")}: </span>
					{path()}
				</p>
			</Show>
		</div>
	);
};
export default FullSlug;
