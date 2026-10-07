import { A } from "@solidjs/router";
import type { DocumentEnvironmentStatus, ReviewOverview } from "@types";
import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import T from "@/translations";
import {
	documentEnvironmentStatusVariants,
	getDocumentEnvironmentStatusLabel,
} from "@/utils/document-environment-status";

export type TargetCounts = Pick<
	ReviewOverview["collections"][number]["targets"][number],
	"inSync" | "outOfSync" | "unreleased"
>;

const linkClass =
	"rounded-sm text-xs leading-none text-muted transition-colors hover:text-title hover:underline focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary";

/**
 * How a collection's documents in one target compare to latest: a bar split
 * into in sync and behind, with links to the documents that need releasing.
 * A single shows its one document's status instead.
 */
const TargetStatus: Component<{
	counts: TargetCounts;
	single?: boolean;
	/** Where each status's documents are listed. Unset for totals. */
	href?: (status: Exclude<DocumentEnvironmentStatus, "in-sync">) => string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const total = createMemo(
		() =>
			props.counts.inSync + props.counts.outOfSync + props.counts.unreleased,
	);
	const singleStatus = createMemo((): DocumentEnvironmentStatus => {
		if (props.counts.unreleased > 0) return "unreleased";
		if (props.counts.outOfSync > 0) return "out-of-sync";
		return "in-sync";
	});

	// ----------------------------------------
	// Functions
	const percent = (count: number) => `${(count / total()) * 100}%`;

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={total() === 0}>
				<span class="text-xs text-muted">{T()("review.targets.none")}</span>
			</Match>
			<Match when={props.single}>
				<span class="flex items-center gap-2 text-xs text-subtitle">
					<StatusIndicator
						size="xs"
						variant={documentEnvironmentStatusVariants[singleStatus()]}
					/>
					{getDocumentEnvironmentStatusLabel(singleStatus())}
				</span>
			</Match>
			<Match when={true}>
				<div class="flex w-full max-w-60 flex-col gap-2">
					<div
						class="flex h-1 w-full overflow-hidden rounded-full bg-input"
						aria-hidden="true"
					>
						<span
							class="bg-success transition-all"
							style={{ width: percent(props.counts.inSync) }}
						/>
						<span
							class="bg-warning transition-all"
							style={{ width: percent(props.counts.outOfSync) }}
						/>
					</div>
					<p class="flex flex-wrap gap-x-2 gap-y-1 text-xs leading-none text-muted">
						<Show
							when={props.counts.outOfSync > 0 || props.counts.unreleased > 0}
							fallback={T()("review.targets.synced")}
						>
							<Show when={props.counts.outOfSync > 0}>
								<Show
									when={props.href}
									fallback={T()("review.targets.behind", {
										count: props.counts.outOfSync,
									})}
								>
									{(href) => (
										<A href={href()("out-of-sync")} class={linkClass}>
											{T()("review.targets.behind", {
												count: props.counts.outOfSync,
											})}
										</A>
									)}
								</Show>
							</Show>
							<Show when={props.counts.unreleased > 0}>
								<Show
									when={props.href}
									fallback={T()("review.targets.unreleased", {
										count: props.counts.unreleased,
									})}
								>
									{(href) => (
										<A href={href()("unreleased")} class={linkClass}>
											{T()("review.targets.unreleased", {
												count: props.counts.unreleased,
											})}
										</A>
									)}
								</Show>
							</Show>
						</Show>
					</p>
				</div>
			</Match>
		</Switch>
	);
};

export default TargetStatus;
