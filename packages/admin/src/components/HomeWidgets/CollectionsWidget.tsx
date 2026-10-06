import { A } from "@solidjs/router";
import type { Collection } from "@types";
import { FaSolidChevronDown, FaSolidPlus } from "solid-icons/fa";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import { getCollectionNavigationHref } from "@/components/CollectionNavLink/CollectionNavLink";
import DashboardCard from "@/components/DashboardCard/DashboardCard";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import DocumentThumb from "@/components/DocumentThumb/DocumentThumb";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import {
	getCreatableCollections,
	getReadableCollections,
} from "@/utils/home-widgets";
import { getDocumentRoute } from "@/utils/route-helpers";

const collapsedCount = 4;

const CollectionsWidget: Component<{ size: DashboardWidgetSize }> = () => {
	// ----------------------------------------
	// State & Hooks
	const [expanded, setExpanded] = createSignal(false);

	// ----------------------------------------
	// Queries
	const collections = api.collections.useGetAll({ queryParams: {} });

	// ----------------------------------------
	// Memos
	const readable = createMemo(() =>
		getReadableCollections(collections.data?.data ?? []),
	);
	const visible = createMemo(() =>
		expanded() ? readable() : readable().slice(0, collapsedCount),
	);
	const creatable = createMemo(
		() =>
			new Set(
				getCreatableCollections(collections.data?.data ?? [])
					.filter((collection) => collection.mode === "multiple")
					.map((collection) => collection.key),
			),
	);

	// ----------------------------------------
	// Functions
	const label = (collection: Collection, form: "plural" | "singular") =>
		helpers.getLocaleValue({
			value: collection.details.labels[form],
			fallback: collection.key,
		}) || collection.key;

	// ----------------------------------------
	// Render
	return (
		<DashboardCard title={T()("home.widget.collections.label")}>
			<ul class="grid grid-cols-1 @2xl:grid-cols-2">
				<For each={visible()}>
					{(collection) => (
						<li class="flex items-center gap-1">
							<A
								href={getCollectionNavigationHref(collection)}
								class="flex min-w-0 grow items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
							>
								<DocumentThumb multiple={collection.mode === "multiple"} />
								<span class="flex min-w-0 flex-col">
									<span class="truncate text-sm text-title">
										{label(collection, "plural")}
									</span>
									<Show
										when={helpers.getLocaleValue({
											value: collection.details.description,
										})}
									>
										{(description) => (
											<span class="truncate text-xs text-muted">
												{description()}
											</span>
										)}
									</Show>
								</span>
							</A>
							<Show when={creatable().has(collection.key)}>
								<A
									href={getDocumentRoute("create", {
										collectionKey: collection.key,
									})}
									aria-label={T()("actions.create.dynamic", {
										name: label(collection, "singular"),
									})}
									title={T()("actions.create.dynamic", {
										name: label(collection, "singular"),
									})}
									class="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-icon transition-colors hover:bg-card-hover hover:text-title focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
								>
									<FaSolidPlus size={11} />
								</A>
							</Show>
						</li>
					)}
				</For>
			</ul>
			<Show when={readable().length > collapsedCount}>
				<button
					type="button"
					aria-expanded={expanded()}
					onClick={() => setExpanded((open) => !open)}
					class="mx-2 mt-1 flex items-center gap-1.5 self-start rounded-md px-1 py-1 text-xs text-muted transition-colors hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
				>
					{expanded()
						? T()("common.show_less")
						: T()("home.widget.collections.more", {
								count: readable().length - collapsedCount,
							})}
					<FaSolidChevronDown
						size={9}
						class="transition-transform"
						classList={{ "rotate-180": expanded() }}
					/>
				</button>
			</Show>
		</DashboardCard>
	);
};

export default CollectionsWidget;
