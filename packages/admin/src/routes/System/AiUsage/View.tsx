import { useQueryClient } from "@tanstack/solid-query";
import type { AiUsageStatus } from "@types";
import { type Component, createMemo } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import SystemSettingsHeader from "@/components/Blocks/SystemSettingsHeader";
import { AiUsageChart } from "@/components/Charts";
import { AiUsageList } from "@/components/Groups/Content";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import useQueryState, {
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
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

	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: <SystemSettingsHeader />,
			}}
		>
			<DynamicContent options={{ padding: "24" }}>
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
