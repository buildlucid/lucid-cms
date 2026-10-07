import { useSearchParams } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import { FaSolidTriangleExclamation } from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import AiCreditsSummary from "@/components/AiCreditsSummary/AiCreditsSummary";
import { AiUsageChart } from "@/components/AiUsageChart/AiUsageChart";
import AiUsageSessionDrawer from "@/components/AiUsageSessionDrawer/AiUsageSessionDrawer";
import { AiUsageSessionList } from "@/components/AiUsageSessionList/AiUsageSessionList";
import InfoRow from "@/components/InfoRow/InfoRow";
import Link from "@/components/Link/Link";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import useQueryState, {
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import { queryKeys } from "@/services/query-keys";
import siteStore from "@/store/siteStore/siteStore";
import T from "@/translations";
import {
	aiUsageSessionParam,
	getAiUsageSessionTypeOptions,
	parseAiUsageSessionParam,
} from "@/utils/ai-usage";

const SystemAiUsagePage: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	//* the open session lives in the URL, so other pages can link to it
	const [urlParams, setUrlParams] = useSearchParams<{ session?: string }>();
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {
				sessionType: textFilter(),
				userId: numberFilter(),
				requestId: textFilter(),
			},
			sorts: {
				lastActivityAt: sort({ defaultValue: "desc" }),
				credits: sort(),
				totalTokens: sort(),
			},
			pagination: pagination({ defaultPerPage: 10 }),
		},
		singleSort: true,
	});

	// ----------------------------------------
	// Memos
	const sessionTypeOptions = createMemo(() => getAiUsageSessionTypeOptions());
	const connectionActive = createMemo(
		() => siteStore.get.connection?.status === "connected",
	);
	const openSession = createMemo(() =>
		parseAiUsageSessionParam(urlParams.session),
	);

	// ----------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.system.ai.usage.title")}
				description={T()("routes.system.ai.usage.description")}
			/>
			<PageLayout.Body>
				<div class="flex-1 h-full p-4 md:p-6">
					<Show when={!connectionActive()}>
						<section class="mb-5 flex flex-col gap-4 rounded-md border border-warning-low-border bg-warning-low p-4 sm:flex-row sm:items-center sm:justify-between">
							<div class="flex min-w-0 items-start gap-3">
								<span class="grid size-8 shrink-0 place-items-center rounded-full border border-warning-low-border bg-warning-low text-warning-low-foreground">
									<FaSolidTriangleExclamation class="size-3.5" />
								</span>
								<div class="min-w-0">
									<h2 class="text-sm font-semibold text-title">
										{T()("ai.usage.connection.warning.title")}
									</h2>
									<p class="mt-0.5 max-w-3xl text-xs">
										{T()("ai.usage.connection.warning.description")}
									</p>
								</div>
							</div>
							<div class="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
								<Link
									href="/lucid/system/operations"
									variant="outline"
									size="sm"
								>
									{T()("ai.usage.connection.manage.action")}
								</Link>
							</div>
						</section>
					</Show>
					<Show when={connectionActive()}>
						<InfoRow.Root
							title={T()("ai.credits.title")}
							description={T()("ai.credits.description")}
						>
							<AiCreditsSummary />
						</InfoRow.Root>
					</Show>
					<InfoRow.Root
						title={T()("ai.usage.charts.title")}
						description={T()("ai.usage.charts.description")}
					>
						<InfoRow.Content>
							<AiUsageChart />
						</InfoRow.Content>
					</InfoRow.Root>
					<InfoRow.Root
						title={T()("ai.usage.sessions.title")}
						description={T()("ai.usage.sessions.description")}
					>
						<InfoRow.Content>
							<div class="-mx-4 overflow-hidden">
								<QueryToolbar
									queryState={searchParams}
									onRefresh={() => {
										queryClient.invalidateQueries({
											queryKey: queryKeys.ai.usage(),
										});
										queryClient.invalidateQueries({
											queryKey: queryKeys.ai.credits(),
										});
									}}
									filterSubject={T()("ai.usage.sessions.title")}
									filterFields={[
										{
											label: T()("ai.usage.session.type"),
											key: "sessionType",
											type: "select",
											options: sessionTypeOptions(),
										},
										{
											label: T()("common.user"),
											key: "userId",
											type: "user",
										},
										{
											label: T()("common.request.id"),
											key: "requestId",
											type: "text",
										},
									]}
									sorts={[
										{
											label: T()("ai.usage.last.activity"),
											key: "lastActivityAt",
										},
										{
											label: T()("ai.usage.credits"),
											key: "credits",
										},
										{
											label: T()("ai.usage.metrics.totalTokens"),
											key: "totalTokens",
										},
									]}
									perPage={[10, 20, 40]}
									padding="sm"
								/>
								<AiUsageSessionList
									state={{
										searchParams: searchParams,
									}}
									onOpen={(session) =>
										setUrlParams({ session: aiUsageSessionParam(session) })
									}
								/>
							</div>
						</InfoRow.Content>
					</InfoRow.Root>
					<AiUsageSessionDrawer
						session={openSession}
						state={{
							open: openSession() !== undefined,
							setOpen: (open) => {
								if (!open) setUrlParams({ session: undefined });
							},
						}}
					/>
				</div>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default SystemAiUsagePage;
