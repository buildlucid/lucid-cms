import { type Component, createMemo, Show } from "solid-js";
import DetailsList from "@/components/DetailsList/DetailsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import ProgressBar from "@/components/ProgressBar/ProgressBar";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import api from "@/services/api";
import T from "@/translations";
import {
	aiCreditsWarningPercent,
	formatAiCredits,
	getAllowancePercentUsed,
} from "@/utils/ai-usage";
import dateHelpers from "@/utils/date-helpers";

const AiCreditsSummary: Component = () => {
	// ----------------------------------------
	// Queries
	const credits = api.ai.useGetCredits();

	// ----------------------------------------
	// Memos
	const data = createMemo(() => credits.data?.data);
	const allowancePercentUsed = createMemo(() =>
		getAllowancePercentUsed(data()?.allowance),
	);

	// ----------------------------------------
	// Render
	return (
		<QueryBoundary loading={credits.isLoading} error={credits.isError}>
			<Show when={data()}>
				{(current) => (
					<InfoRow.Content
						title={T()("ai.credits.available", {
							credits: formatAiCredits(current().available),
						})}
					>
						<Show when={current().allowance}>
							{(allowance) => (
								<ProgressBar
									class="mb-4"
									value={allowancePercentUsed()}
									variant={
										allowancePercentUsed() >= aiCreditsWarningPercent
											? "warning"
											: "primary"
									}
									labels={{
										start: T()("ai.credits.allowance.used", {
											used: formatAiCredits(allowance().used),
											total: formatAiCredits(allowance().total),
										}),
										end: T()("ai.credits.resets", {
											date: dateHelpers.formatDate(allowance().resetsAt),
										}),
									}}
								/>
							)}
						</Show>
						<DetailsList
							variant="plain"
							items={[
								{
									label: T()("ai.credits.allowance"),
									value: current().allowance
										? formatAiCredits(current().allowance?.remaining)
										: T()("ai.credits.allowance.none"),
								},
								{
									label: T()("ai.credits.additional"),
									value: formatAiCredits(current().additional.remaining),
								},
								{
									label: T()("ai.credits.connection.cap"),
									value: current().connectionCap
										? T()("ai.credits.connection.cap.value", {
												remaining: formatAiCredits(
													current().connectionCap?.remaining,
												),
												limit: formatAiCredits(current().connectionCap?.limit),
												date: dateHelpers.formatDate(
													current().connectionCap?.resetsAt,
												),
											})
										: T()("common.unlimited"),
								},
							]}
						/>
					</InfoRow.Content>
				)}
			</Show>
		</QueryBoundary>
	);
};

export default AiCreditsSummary;
