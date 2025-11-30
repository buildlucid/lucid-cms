import { Show, createMemo, type Component } from "solid-js";
import type { CollectionResponse } from "@types";
import { A } from "@solidjs/router";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import { FaSolidBox, FaSolidBoxesStacked } from "solid-icons/fa";

export const CollectionCardLoading: Component = () => {
	// ----------------------------------
	// Return
	return (
		<li class={"bg-background-base border-border border rounded-md p-4"}>
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
					documentId: props.collection.documentId,
				});
			return getDocumentRoute("create", {
				collectionKey: props.collection.key,
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
				class="border-border border h-full w-full p-4 rounded-md bg-card-base overflow-hidden cursor-pointer hover:border-primary-base transition-colors duration-200 flex flex-col"
				href={collectionLink()}
			>
				<div class="flex items-center gap-2">
					<Show when={props.collection.mode === "single"}>
						<FaSolidBox class="text-base text-secondary-base" />
					</Show>
					<Show when={props.collection.mode === "multiple"}>
						<FaSolidBoxesStacked class="text-base text-secondary-base" />
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
