import { type Component, createMemo, Show } from "solid-js";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import RequestQueues from "@/components/RequestQueues/RequestQueues";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import type { TargetCounts } from "./parts/TargetStatus";
import TargetTable, {
	type TargetColumn,
	type TargetRow,
} from "./parts/TargetTable";

/**
 * What needs reviewing: the open request queues, then how far each
 * collection's documents in every publish target are behind latest.
 */
const ReviewOverviewPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.review.title"));

	// ----------------------------------------
	// Queries
	const collections = api.collections.useGetAll({
		queryParams: {},
	});
	const overview = api.review.useGetOverview({
		queryParams: {},
	});

	// ----------------------------------------
	// Memos
	const rows = createMemo(() => {
		const collectionsByKey = new Map(
			(collections.data?.data ?? []).map((collection) => [
				collection.key,
				collection,
			]),
		);
		return (overview.data?.data.collections ?? []).flatMap(
			(item): TargetRow[] => {
				const collection = collectionsByKey.get(item.collectionKey);
				if (!collection) return [];
				return [
					{
						collection,
						total: item.total,
						targets: new Map(
							item.targets.map((target) => [target.key, target]),
						),
					},
				];
			},
		);
	});
	//* columns follow the order collections first configure each target
	const targets = createMemo(() => {
		const columns = new Map<string, TargetColumn>();
		for (const row of rows()) {
			for (const target of row.collection.publishing.targets) {
				if (columns.has(target.key)) continue;
				columns.set(target.key, {
					key: target.key,
					label:
						helpers.getLocaleValue({
							value: target.label,
							fallback: target.key,
						}) || target.key,
				});
			}
		}
		return Array.from(columns.values());
	});
	const totals = createMemo(() => {
		const counts = new Map<string, TargetCounts>();
		for (const row of rows()) {
			for (const [key, target] of row.targets) {
				const current = counts.get(key) ?? {
					inSync: 0,
					outOfSync: 0,
					unreleased: 0,
				};
				counts.set(key, {
					inSync: current.inSync + target.inSync,
					outOfSync: current.outOfSync + target.outOfSync,
					unreleased: current.unreleased + target.unreleased,
				});
			}
		}
		return counts;
	});

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.review.title")}
				description={T()("routes.review.description")}
			/>
			<PageLayout.Body>
				<QueryBoundary
					loading={collections.isLoading || overview.isLoading}
					error={collections.isError || overview.isError}
					loadingFallback={
						<div aria-busy="true" class="flex w-full flex-col gap-8 self-start">
							<div>
								<span class="skeleton mb-3 block h-5 w-40" />
								<span class="skeleton block h-24 w-full" />
							</div>
							<div>
								<span class="skeleton mb-3 block h-5 w-40" />
								<span class="skeleton block h-48 w-full" />
							</div>
						</div>
					}
					class="flex-1 h-full p-4 md:p-6"
				>
					<div class="flex min-w-0 flex-col gap-8">
						<section>
							<div class="mb-3">
								<h2>{T()("review.requests.title")}</h2>
								<p class="mt-0.5 text-sm text-body">
									{T()("review.requests.description")}
								</p>
							</div>
							<RequestQueues overview={overview.data?.data.requests} />
						</section>
						<section>
							<div class="mb-3">
								<h2>{T()("review.targets.title")}</h2>
								<p class="mt-0.5 text-sm text-body">
									{T()("review.targets.description")}
								</p>
							</div>
							<Show
								when={rows().length > 0}
								fallback={
									<p class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
										{T()("review.targets.empty")}
									</p>
								}
							>
								<TargetTable
									targets={targets()}
									rows={rows()}
									totals={totals()}
								/>
							</Show>
						</section>
					</div>
				</QueryBoundary>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default ReviewOverviewPage;
