import { type Component, createMemo, Show } from "solid-js";
import HomeCard from "@/components/HomeCard/HomeCard";
import type { HomeWidgetSize } from "@/components/HomeWidgets/types";
import ProgressBar from "@/components/ProgressBar/ProgressBar";
import api from "@/services/api";
import T from "@/translations";
import {
	aiCreditsWarningPercent,
	aiUsageHref,
	formatAiCreditAmount,
	getAllowancePercentUsed,
} from "@/utils/ai-usage";
import dateHelpers from "@/utils/date-helpers";

const AiCreditsWidget: Component<{ size: HomeWidgetSize }> = () => {
	// ----------------------------------------
	// Queries
	//* Home is opened often, so a failed load shows here rather than as a toast
	const credits = api.ai.useGetCredits({ displayErrorToast: false });

	// ----------------------------------------
	// Memos
	const data = createMemo(() => credits.data?.data);
	const percent = createMemo(() => getAllowancePercentUsed(data()?.allowance));
	const labels = createMemo(() => {
		if (credits.isLoading) return undefined;
		if (credits.isError) return { start: T()("home.widget.ai.credits.error") };

		const allowance = data()?.allowance;
		if (!allowance) return { start: T()("ai.credits.allowance.none") };
		return {
			start: T()("home.widget.ai.credits.used", { percent: percent() }),
			end: T()("ai.credits.resets", {
				date: dateHelpers.formatDate(allowance.resetsAt),
			}),
		};
	});

	// ----------------------------------------
	// Render
	return (
		<HomeCard
			title={T()("home.widget.ai.credits.label")}
			href={aiUsageHref}
			padding="md"
		>
			<div class="flex grow flex-col justify-end gap-1.5">
				<p class="flex items-baseline gap-1.5 text-title">
					<span class="text-2xl tabular-nums">
						{formatAiCreditAmount(data()?.available) ?? "-"}
					</span>
					<Show when={data()?.available !== undefined}>
						<span class="text-sm text-muted">{T()("ai.credits.unit")}</span>
					</Show>
				</p>
				<ProgressBar
					value={percent()}
					size="sm"
					variant={percent() >= aiCreditsWarningPercent ? "warning" : "primary"}
					labels={labels()}
				/>
			</div>
		</HomeCard>
	);
};

export default AiCreditsWidget;
