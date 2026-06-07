import { useQueryClient } from "@tanstack/solid-query";
import type { AiUsageStatus } from "@types";
import { type Component, createMemo } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import SystemSettingsHeader from "@/components/Blocks/SystemSettingsHeader";
import { AiUsageChart } from "@/components/Charts";
import { AiUsageList } from "@/components/Groups/Content";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import api from "@/services/api";
import T from "@/translations";
import { getAiUsageFeatureOptions } from "@/utils/ai-usage";
import helpers from "@/utils/helpers";

const SystemAiUsageRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useSearchParamsState(
		{
			filters: {
				featureKey: {
					value: "",
					type: "text",
				},
				status: {
					value: "",
					type: "array",
				},
				model: {
					value: "",
					type: "text",
				},
				userId: {
					value: "",
					type: "array",
				},
			},
			sorts: {
				createdAt: "desc",
				cost: undefined,
				durationMs: undefined,
			},
			pagination: {
				perPage: 20,
			},
		},
		{
			singleSort: true,
		},
	);

	// ----------------------------------
	// Queries
	const users = api.users.useGetMultiple({
		queryParams: {
			filters: {
				isDeleted: 0,
			},
			perPage: -1,
		},
	});

	// ----------------------------------------
	// Memos
	const userOptions = createMemo(() =>
		(users.data?.data ?? []).map((user) => ({
			value: user.id,
			label:
				helpers.formatUserName(user, "simple") || T()("media.types.unknown"),
			user,
		})),
	);
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
								filters={[
									{
										label: T()("ai.usage.feature"),
										key: "featureKey",
										type: "select",
										options: featureOptions(),
									},
									{
										label: T()("common.status"),
										key: "status",
										type: "multi-select",
										options: [
											{
												label: T()("common.status.pending"),
												value: "pending" satisfies AiUsageStatus,
											},
											{
												label: T()("common.status.success"),
												value: "success" satisfies AiUsageStatus,
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
										type: "multi-select",
										optionType: "user",
										options: userOptions(),
									},
								]}
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
