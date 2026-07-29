import { useQueryClient } from "@tanstack/solid-query";
import type { AiUsageStatus } from "@types";
import {
	FaSolidArrowUpRightFromSquare,
	FaSolidTriangleExclamation,
} from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import SystemSettingsHeader from "@/components/Blocks/SystemSettingsHeader";
import { AiUsageChart } from "@/components/Charts";
import { AiUsageList } from "@/components/Groups/Content";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import Link from "@/components/Partials/Link";
import constants from "@/constants";
import useQueryState, {
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import siteStore from "@/store/siteStore";
import T from "@/translations";
import { getAiUsageFeatureOptions } from "@/utils/ai-usage";

const SystemAiUsageRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {
				requestId: textFilter(),
				providerRequestId: textFilter(),
				featureKey: textFilter(),
				featureVersion: textFilter(),
				status: textFilter(),
				model: textFilter(),
				userId: numberFilter(),
				targetType: textFilter(),
				durationMs: numberFilter(),
				createdAt: textFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
				cost: sort(),
				durationMs: sort(),
			},
			pagination: pagination({ defaultPerPage: 20 }),
		},
		options: {
			singleSort: true,
		},
	});

	// ----------------------------------------
	// Memos
	const featureOptions = createMemo(() => getAiUsageFeatureOptions());
	const connectionActive = createMemo(
		() => siteStore.get.connection?.status === "connected",
	);

	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: <SystemSettingsHeader />,
			}}
		>
			<DynamicContent options={{ padding: "24" }}>
				<Show when={!connectionActive()}>
					<section class="mb-5 flex flex-col gap-4 rounded-md border border-warning-base/25 bg-warning-base/5 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex min-w-0 items-start gap-3">
							<span class="grid size-8 shrink-0 place-items-center rounded-full bg-warning-base/10 text-warning-base">
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
								theme="border-outline"
								size="small"
							>
								{T()("ai.usage.connection.manage.action")}
							</Link>
							<Link
								href={constants.lucidRemote.pricing}
								target="_blank"
								rel="noreferrer"
								theme="primary"
								size="small"
							>
								{T()("ai.usage.connection.pricing.action")}
								<FaSolidArrowUpRightFromSquare class="ml-1.5 size-2.5" />
							</Link>
						</div>
					</section>
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
					title={T()("ai.usage.records.title")}
					description={T()("ai.usage.records.description")}
				>
					<InfoRow.Content>
						<div class="-mx-4 overflow-hidden">
							<QueryRow
								searchParams={searchParams}
								onRefresh={() => {
									queryClient.invalidateQueries({
										queryKey: ["ai.getUsage"],
									});
								}}
								filterSection={{
									subject: T()("ai.usage.records.title"),
									fields: [
										{
											label: T()("ai.usage.feature"),
											key: "featureKey",
											type: "select",
											options: featureOptions(),
										},
										{
											label: T()("common.status"),
											key: "status",
											type: "select",
											options: [
												{
													label: T()("common.status.pending"),
													value: "pending" satisfies AiUsageStatus,
												},
												{
													label: T()("common.status.success"),
													value: "success" satisfies AiUsageStatus,
												},
												{
													label: T()("common.status.failed"),
													value: "failed" satisfies AiUsageStatus,
												},
											],
										},
										{
											label: T()("ai.usage.model"),
											key: "model",
											type: "text",
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
										{
											label: T()("ai.usage.provider.request.id"),
											key: "providerRequestId",
											type: "text",
										},
										{
											label: T()("ai.usage.feature.version"),
											key: "featureVersion",
											type: "text",
										},
										{
											label: T()("ai.usage.target.type"),
											key: "targetType",
											type: "text",
										},
										{
											label: T()("ai.usage.elapsed"),
											key: "durationMs",
											type: "number",
										},
										{
											label: T()("ai.usage.initiated"),
											key: "createdAt",
											type: "datetime",
										},
									],
								}}
								sorts={[
									{
										label: T()("ai.usage.initiated"),
										key: "createdAt",
									},
									{
										label: T()("ai.usage.cost"),
										key: "cost",
									},
									{
										label: T()("ai.usage.elapsed"),
										key: "durationMs",
									},
								]}
								perPage={[10, 20, 40]}
								options={{
									padding: "16",
								}}
							/>
							<AiUsageList
								state={{
									searchParams: searchParams,
								}}
							/>
						</div>
					</InfoRow.Content>
				</InfoRow.Root>
			</DynamicContent>
		</Wrapper>
	);
};

export default SystemAiUsageRoute;
