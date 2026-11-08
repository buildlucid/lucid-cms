import { useTranslation } from "@lucidcms/admin/hooks";
import type { FieldSlotComponent } from "@lucidcms/admin/types";
import { createMemo, Show } from "solid-js";
import type {} from "../../translations.js";

/** Shows the document's path below the slug field. */
const PathDisplay: FieldSlotComponent = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();

	// ----------------------------------
	// Memos
	const path = createMemo(() => props.fields.get("path", "text")?.value ?? "");

	// ----------------------------------
	// Render
	return (
		<div class="flex min-w-0 items-center justify-between gap-3 text-sm text-body">
			<Show when={path()}>
				<p class="break-all text-sm">
					<span class="text-subtitle">
						{t("plugin.pages.fields.path.label")}:{" "}
					</span>
					{path()}
				</p>
			</Show>
		</div>
	);
};
export default PathDisplay;
