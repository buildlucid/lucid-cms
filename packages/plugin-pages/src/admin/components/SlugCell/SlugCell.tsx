import type { DocumentListSlotComponent } from "@lucidcms/admin/types";
import { createMemo, Show } from "solid-js";

const SlugCell: DocumentListSlotComponent = (props) => {
	// ----------------------------------
	// Memos
	const path = createMemo(() => {
		const value = props.document.route?.path;
		return typeof value === "string" ? value : value?.[props.contentLocale];
	});
	const slug = createMemo(() =>
		props.slot === "field.cell" && typeof props.field.value === "string"
			? props.field.value
			: "",
	);

	// ----------------------------------
	// Render
	return (
		<div class="min-w-0">
			<p class="truncate text-sm text-subtitle" title={slug()}>
				{slug() || "—"}
			</p>
			<Show when={path() && path() !== slug()}>
				<p class="truncate text-xs text-body" title={path() ?? undefined}>
					{path()}
				</p>
			</Show>
		</div>
	);
};
export default SlugCell;
