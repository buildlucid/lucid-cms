import { type Component, createMemo, Show } from "solid-js";
import DetailsList from "@/components/DetailsList/DetailsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import ProgressBar from "@/components/ProgressBar/ProgressBar";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import api from "@/services/api";
import T from "@/translations";
import { formatAiCredits } from "@/utils/ai-usage";
import dateHelpers from "@/utils/date-helpers";

const ALLOWANCE_WARNING_PERCENT = 90;

const AiCreditsSummary: Component = () => {
	// ----------------------------------------
	// Queries
	const credits = api.ai.useGetCredits();

	// ----------------------------------------
	// Memos
	const data = createMemo(() => credits.data?.data);
	const allowancePercentUsed = createMemo(() => {
		const allowance = data()?.allowance;
		if (!allowance || allowance.total <= 0) return 0;
		return Math.min(100, Math.floor((allowance.used / allowance.total) * 100));
	});

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
										allowancePercentUsed() > ALLOWANCE_WARNING_PERCENT
											? "danger"
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
