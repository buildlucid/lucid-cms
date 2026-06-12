import { A } from "@solidjs/router";
import type { Collection } from "@types";
import {
	FaSolidArrowRight,
	FaSolidBox,
	FaSolidBoxesStacked,
} from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

const DashboardContentShortcuts: Component<{
	collections: Collection[];
	loading: boolean;
	error: boolean;
}> = (props) => {
	// ----------------------------------
	// Memos
	const visibleCollections = createMemo(() => props.collections.slice(0, 6));

	// ----------------------------------
	// Functions
	const collectionLink = (collection: Collection) => {
		if (collection.mode === "single") {
			if (collection.documentId) {
				return getDocumentRoute("edit", {
					collectionKey: collection.key,
					documentId: collection.documentId,
				});
			}
			return getDocumentRoute("create", {
				collectionKey: collection.key,
			});
		}
		return `/lucid/collections/${collection.key}`;
	};
	const collectionName = (collection: Collection) =>
		helpers.getLocaleValue({
			value: collection.details.name,
			fallback: collection.key,
		}) || collection.key;
	const collectionSummary = (collection: Collection) =>
		helpers.getLocaleValue({
			value: collection.details.summary,
		});

	// ----------------------------------
	// Render
	return (
		<section>
			<div class="mb-4">
				<h2>{T()("dashboard.content.title")}</h2>
				<p class="mt-1 text-sm text-body">
					{T()("dashboard.content.description")}
				</p>
			</div>
			<Show
				when={!props.error}
				fallback={
					<div class="rounded-md border border-border bg-card-base px-3 py-3">
						<p class="text-sm text-body">
							{T()("errors.collections.load.failed")}
						</p>
					</div>
				}
			>
				<Show
					when={!props.loading}
					fallback={
						<div class="overflow-hidden rounded-md border border-border bg-card-base">
							<ul class="grid grid-cols-1 md:grid-cols-2">
								<For each={[1, 2, 3, 4]}>
									{() => (
										<li
											class={
												"h-full border-b border-border last:border-b-0 md:odd:border-r md:last:border-r-0 md:nth-last-1:border-b-0 md:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
											}
										>
											<div class="h-full bg-card-base px-3 py-3">
												<span class="skeleton block h-4 w-1/2" />
												<span class="skeleton mt-2 block h-4 w-full" />
											</div>
										</li>
									)}
								</For>
							</ul>
						</div>
					}
				>
					<Show
						when={visibleCollections().length > 0}
						fallback={
							<div class="rounded-md border border-border bg-card-base px-3 py-3">
								<p class="text-sm text-body">
									{T()("dashboard.content.empty")}
								</p>
							</div>
						}
					>
						<div class="overflow-hidden rounded-md border border-border bg-card-base">
							<ul class="grid auto-rows-fr grid-cols-1 bg-card-base md:grid-cols-2">
								<For each={visibleCollections()}>
									{(collection) => (
										<li
											class={
												"h-full border-b border-border last:border-b-0 md:odd:border-r md:last:border-r-0 md:nth-last-1:border-b-0 md:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
											}
										>
											<A
												href={collectionLink(collection)}
												class="group flex h-full items-start gap-3 bg-card-base px-3 py-3 transition-colors duration-200 hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary-base"
											>
												<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background-base text-secondary-base">
													<Show
														when={collection.mode === "single"}
														fallback={<FaSolidBoxesStacked size={14} />}
													>
														<FaSolidBox size={14} />
													</Show>
												</span>
												<span class="min-w-0 flex-1">
													<span class="block truncate text-sm font-medium leading-5 text-title">
														{collectionName(collection)}
													</span>
													<Show when={collectionSummary(collection)}>
														{(summary) => (
															<span class="mt-0.5 block truncate text-sm leading-5 text-body">
																{summary()}
															</span>
														)}
													</Show>
												</span>
												<FaSolidArrowRight
													aria-hidden="true"
													class="h-3 w-3 shrink-0 text-icon-base transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary-base"
												/>
											</A>
										</li>
									)}
								</For>
							</ul>
						</div>
					</Show>
				</Show>
			</Show>
		</section>
	);
};

export default DashboardContentShortcuts;
