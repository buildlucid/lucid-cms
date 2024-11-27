import { Show, createMemo, type Component } from "solid-js";
import type { CollectionResponse } from "@lucidcms/core/types";
import { A } from "@solidjs/router";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import { FaSolidBox, FaSolidBoxesStacked } from "solid-icons/fa";

export const CollectionCardLoading: Component = () => {
	// ----------------------------------
	// Return
	return (
		<li class={"bg-container-2 border-border border rounded-md p-15"}>
			<span class="skeleton block h-5 w-1/2 mb-2" />
			<span class="skeleton block h-5 w-full" />
		</li>
	);
};

const CollectionCard: Component<{
	collection: CollectionResponse;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const collectionLink = createMemo(() => {
		if (props.collection.mode === "single") {
			if (props.collection.documentId)
				return getDocumentRoute("edit", {
					collectionKey: props.collection.key,
					useDrafts: props.collection.config.useDrafts,
					documentId: props.collection.documentId,
				});
			return getDocumentRoute("create", {
				collectionKey: props.collection.key,
				useDrafts: props.collection.config.useDrafts,
			});
		}
		return `/admin/collections/${props.collection.key}`;
	});
	const collectionName = createMemo(() =>
		helpers.getLocaleValue({
			value: props.collection.details.name,
		}),
	);
	const collectionSummary = createMemo(() =>
		helpers.getLocaleValue({
			value: props.collection.details.summary,
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<li class={""}>
			<A
				class="border-border border h-full w-full p-15 rounded-md bg-container-2 overflow-hidden cursor-pointer hover:border-primary-base transition-colors duration-200 flex flex-col"
				href={collectionLink()}
			>
				<div class="flex items-center gap-1.5">
					<Show when={props.collection.mode === "single"}>
						<FaSolidBox class="text-base text-primary-base" />
					</Show>
					<Show when={props.collection.mode === "multiple"}>
						<FaSolidBoxesStacked class="text-base text-primary-base" />
					</Show>
					<h3 class="text-base">{collectionName()}</h3>
				</div>

				{collectionSummary() && (
					<p class="line-clamp-2 text-sm mt-1.5">{collectionSummary()}</p>
				)}
			</A>
		</li>
	);
};

export default CollectionCard;
