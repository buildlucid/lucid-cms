import { useSearchParams } from "@solidjs/router";
import { type Component, createMemo, Show } from "solid-js";
import AiConnectionNotice from "@/components/AiConnectionNotice/AiConnectionNotice";
import AiCreditsSummary from "@/components/AiCreditsSummary/AiCreditsSummary";
import { AiUsageChart } from "@/components/AiUsageChart/AiUsageChart";
import AiUsageSessionDrawer from "@/components/AiUsageSessionDrawer/AiUsageSessionDrawer";
import { AiUsageSessionList } from "@/components/AiUsageSessionList/AiUsageSessionList";
import InfoRow from "@/components/InfoRow/InfoRow";
import PageLayout from "@/components/PageLayout/PageLayout";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import useQueryState, {
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import siteStore from "@/store/siteStore/siteStore";
import T from "@/translations";
import {
	aiUsageSessionParam,
	parseAiUsageSessionParam,
} from "@/utils/ai-usage";

const SystemAiUsagePage: Component = () => {
	// ----------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.system.ai.usage.title"));
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
					<InfoRow.Root
						title={T()("ai.credits.title")}
						description={T()("ai.credits.description")}
					>
						<Show
							when={connectionActive()}
							fallback={
								<AiConnectionNotice
									description={T()("ai.usage.connection.warning.description")}
								/>
							}
						>
							<AiCreditsSummary />
						</Show>
					</InfoRow.Root>
					<InfoRow.Root
						title={T()("ai.usage.charts.title")}
						description={T()("ai.usage.charts.description")}
					>
						<AiUsageChart />
					</InfoRow.Root>
					<InfoRow.Root
						title={T()("ai.usage.sessions.title")}
						description={T()("ai.usage.sessions.description")}
					>
						<AiUsageSessionList
							state={{
								searchParams: searchParams,
							}}
							onOpen={(session) =>
								setUrlParams({ session: aiUsageSessionParam(session) })
							}
						/>
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
