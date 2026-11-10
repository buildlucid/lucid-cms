import { useTranslation } from "@lucidcms/admin/hooks";
import type { FieldSlotComponent } from "@lucidcms/admin/types";
import { createMemo, Show } from "solid-js";
import type {} from "../../translations.js";
import PreviousPathsButton from "../PreviousPathsButton/PreviousPathsButton.jsx";

/** Shows the document's path below the slug field, with a button opening its previous paths when they're tracked. */
const PathDisplay: FieldSlotComponent<{ previousPaths: boolean }> = (props) => {
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
			<Show when={props.options.previousPaths}>
				<PreviousPathsButton />
			</Show>
		</div>
	);
};

export default PathDisplay;
