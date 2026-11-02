import type { AiCreditSource } from "@types";
import classnames from "classnames";
import { type Component, createMemo, For, Show } from "solid-js";
import InfoRow from "@/components/InfoRow/InfoRow";
import ProgressBar, {
	type ProgressBarVariant,
} from "@/components/ProgressBar/ProgressBar";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import StateNote from "@/components/StateNote/StateNote";
import api from "@/services/api";
import T from "@/translations";
import {
	aiCreditsWarningPercent,
	formatAiCreditAmount,
	getCreditsPercentUsed,
} from "@/utils/ai-usage";
import dateHelpers from "@/utils/date-helpers";

interface CreditSourceRow {
	label: string;
	hint: string;
	/** Background class for the source's part of the breakdown bar and its legend swatch. */
	color: string;
	source: AiCreditSource;
}

/** Shows available credits, their sources and the connection's monthly cap. */
const AiCreditsSummary: Component = () => {
	// ----------------------------------------
	// Queries
	const credits = api.ai.useGetCredits();

	// ----------------------------------------
	// Memos
	const data = createMemo(() => credits.data?.data);
	//* in spend order. Granted and purchased credit only show once the organisation has had some
	const sources = createMemo(() => {
		const current = data();
		if (!current) return [];

		const rows: CreditSourceRow[] = [];
		if (current.allowance) {
			rows.push({
				label: T()("ai.credits.allowance"),
				hint: T()("ai.credits.resets", {
					date: dateHelpers.formatDate(current.allowance.resetsAt),
				}),
				color: "bg-primary",
				source: current.allowance,
			});
		}
		if (current.granted.total > 0) {
			rows.push({
				label: T()("ai.credits.granted"),
				hint: T()("ai.credits.granted.hint"),
				color: "bg-purple-low-foreground",
				source: current.granted,
			});
		}
		if (current.purchased.total > 0) {
			rows.push({
				label: T()("ai.credits.purchased"),
				hint: T()("ai.credits.purchased.hint"),
				color: "bg-blue-low-foreground",
				source: current.purchased,
			});
		}
		return rows;
	});
	const balance = createMemo(() =>
		sources().reduce((total, row) => total + row.source.remaining, 0),
	);
	const capPercentUsed = createMemo(() => {
		const cap = data()?.connectionCap;
		return getCreditsPercentUsed(
			cap ? { used: cap.used, total: cap.limit } : undefined,
		);
	});

	// ----------------------------------------
	// Functions
	//* what's left as text, with how much is used as a bar
	const meter = (
		credits: AiCreditSource,
		variant: ProgressBarVariant = "neutral",
	) => (
		<div class="w-full md:w-48">
			<p class="text-sm tabular-nums md:text-right">
				{T()("ai.credits.left.of", {
					left: formatAiCreditAmount(credits.remaining),
					total: formatAiCreditAmount(credits.total),
				})}
			</p>
			<ProgressBar
				class="mt-1.5"
				size="sm"
				value={getCreditsPercentUsed(credits)}
				variant={variant}
			/>
		</div>
	);

	// ----------------------------------------
	// Render
	return (
		<QueryBoundary
			loading={credits.isLoading}
			error={credits.isError}
			appearance="card"
			onRetry={() => credits.refetch()}
			loadingFallback={
				<div class="rounded-md border border-border bg-card">
					<div class="px-5 py-4">
						<span class="skeleton block h-5 w-24" />
						<span class="skeleton mt-0.5 block h-8 w-36" />
						<span class="skeleton mt-3 block h-1.5 w-full" />
						<span class="skeleton mt-3 block h-4 w-72 max-w-full" />
					</div>
					<div class="divide-y divide-border border-t border-border">
						<For each={[0, 1]}>
							{() => (
								<div class="flex items-center justify-between gap-4 px-5 py-4">
									<div>
										<span class="skeleton block h-5 w-32" />
										<span class="skeleton mt-0.5 block h-5 w-24" />
									</div>
									<span class="skeleton block h-8 w-40 md:w-48" />
								</div>
							)}
						</For>
					</div>
				</div>
			}
		>
			<Show when={data()}>
				{(current) => (
					<InfoRow.Content padding="none">
						<div class="px-5 py-4">
							<Show when={current().hasDebt}>
								<StateNote variant="danger" class="mb-4">
									{T()("ai.credits.debt")}
								</StateNote>
							</Show>
							<p class="text-sm">{T()("ai.credits.available")}</p>
							<p class="mt-0.5 flex items-baseline gap-1.5 text-2xl text-title tabular-nums">
								{formatAiCreditAmount(current().available)}
								<span class="text-sm text-muted">{T()("ai.credits.unit")}</span>
							</p>
							<Show when={sources().length > 0}>
								{/* the legend below carries the values, so the bar is decorative */}
								<div
									aria-hidden="true"
									class="mt-3 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-input"
								>
									<For each={sources()}>
										{(row) => (
											<Show when={row.source.remaining > 0}>
												<div
													class={classnames("h-full", row.color)}
													style={{
														width: `${(row.source.remaining / balance()) * 100}%`,
													}}
												/>
											</Show>
										)}
									</For>
								</div>
								<dl class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
									<For each={sources()}>
										{(row) => (
											<div class="flex items-center gap-2 text-xs">
												<span
													class={classnames("size-2 rounded-full", row.color)}
												/>
												<dt>{row.label}</dt>
												<dd class="font-medium text-title tabular-nums">
													{formatAiCreditAmount(row.source.remaining)}
												</dd>
											</div>
										)}
									</For>
								</dl>
							</Show>
							<Show when={sources().length > 1}>
								<p class="mt-3 text-xs text-muted">
									{T()("ai.credits.spend.order")}
								</p>
							</Show>
						</div>
						<ul class="divide-y divide-border border-t border-border">
							<For each={sources()}>
								{(row) => (
									<InfoRow.Item
										title={row.label}
										description={row.hint}
										actions={meter(row.source)}
									/>
								)}
							</For>
							<Show
								when={current().connectionCap}
								fallback={
									<InfoRow.Item
										title={T()("ai.credits.connection.cap")}
										description={T()("ai.credits.connection.cap.none")}
									/>
								}
							>
								{(cap) => (
									<InfoRow.Item
										title={T()("ai.credits.connection.cap")}
										description={T()("ai.credits.resets", {
											date: dateHelpers.formatDate(cap().resetsAt),
										})}
										actions={meter(
											{
												total: cap().limit,
												used: cap().used,
												remaining: cap().remaining,
											},
											capPercentUsed() >= aiCreditsWarningPercent
												? "warning"
												: "neutral",
										)}
									/>
								)}
							</Show>
						</ul>
					</InfoRow.Content>
				)}
			</Show>
		</QueryBoundary>
	);
};

export default AiCreditsSummary;
