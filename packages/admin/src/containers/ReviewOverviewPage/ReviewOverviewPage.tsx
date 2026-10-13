import { type Component, createMemo, Show } from "solid-js";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import RequestQueues from "@/components/RequestQueues/RequestQueues";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import { useAgentScreen } from "@/hooks/useAgentScreen/useAgentScreen";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { tabId } from "@/utils/tab-id";
import type { EnvironmentCounts } from "./parts/EnvironmentStatus";
import EnvironmentTable, {
	type EnvironmentColumn,
	type EnvironmentRow,
} from "./parts/EnvironmentTable";

/**
 * What needs reviewing: the open request queues, then how far each
 * collection's documents in every environment are behind latest.
 */
const ReviewOverviewPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.review.title"));
	useAgentScreen(() => ({
		type: "review",
		tabId,
		label: T()("routes.review.title"),
	}));

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
			(item): EnvironmentRow[] => {
				const collection = collectionsByKey.get(item.collectionKey);
				if (!collection) return [];
				return [
					{
						collection,
						total: item.total,
						environments: new Map(
							item.environments.map((environment) => [
								environment.key,
								environment,
							]),
						),
					},
				];
			},
		);
	});
	//* columns follow the order collections first configure each environment
	const environments = createMemo(() => {
		const columns = new Map<string, EnvironmentColumn>();
		for (const row of rows()) {
			for (const environment of row.collection.publishing.environments) {
				if (columns.has(environment.key)) continue;
				columns.set(environment.key, {
					key: environment.key,
					label:
						helpers.getLocaleValue({
							value: environment.label,
							fallback: environment.key,
						}) || environment.key,
				});
			}
		}
		return Array.from(columns.values());
	});
	const totals = createMemo(() => {
		const counts = new Map<string, EnvironmentCounts>();
		for (const row of rows()) {
			for (const [key, environment] of row.environments) {
				const current = counts.get(key) ?? {
					inSync: 0,
					outOfSync: 0,
					unpublished: 0,
				};
				counts.set(key, {
					inSync: current.inSync + environment.inSync,
					outOfSync: current.outOfSync + environment.outOfSync,
					unpublished: current.unpublished + environment.unpublished,
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
							<SectionHeading
								title={T()("review.requests.title")}
								description={T()("review.requests.description")}
							/>
							<RequestQueues overview={overview.data?.data.requests} />
						</section>
						<section>
							<SectionHeading
								title={T()("review.environments.title")}
								description={T()("review.environments.description")}
							/>
							<Show
								when={rows().length > 0}
								fallback={
									<p class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
										{T()("review.environments.empty")}
									</p>
								}
							>
								<EnvironmentTable
									environments={environments()}
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
