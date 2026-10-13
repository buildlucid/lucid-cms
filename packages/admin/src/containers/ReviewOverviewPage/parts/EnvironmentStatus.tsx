import { A } from "@solidjs/router";
import type { DocumentEnvironmentStatus, ReviewOverview } from "@types";
import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import T from "@/translations";
import {
	documentEnvironmentStatusVariants,
	getDocumentEnvironmentStatusLabel,
} from "@/utils/document-environment-status";

export type EnvironmentCounts = Pick<
	ReviewOverview["collections"][number]["environments"][number],
	"inSync" | "outOfSync" | "unpublished"
>;

const linkClass =
	"rounded-sm text-xs leading-none text-muted transition-colors hover:text-title hover:underline focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary";

/** Shows environment counts against latest with optional status links, or one document's status for single collections. */
const EnvironmentStatus: Component<{
	counts: EnvironmentCounts;
	single?: boolean;
	/** Where each status's documents are listed. Unset for totals. */
	href?: (status: Exclude<DocumentEnvironmentStatus, "in-sync">) => string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const total = createMemo(
		() =>
			props.counts.inSync + props.counts.outOfSync + props.counts.unpublished,
	);
	const singleStatus = createMemo((): DocumentEnvironmentStatus => {
		if (props.counts.unpublished > 0) return "unpublished";
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
				<span class="text-xs text-muted">
					{T()("review.environments.none")}
				</span>
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
							when={props.counts.outOfSync > 0 || props.counts.unpublished > 0}
							fallback={T()("review.environments.synced")}
						>
							<Show when={props.counts.outOfSync > 0}>
								<Show
									when={props.href}
									fallback={T()("review.environments.behind", {
										count: props.counts.outOfSync,
									})}
								>
									{(href) => (
										<A href={href()("out-of-sync")} class={linkClass}>
											{T()("review.environments.behind", {
												count: props.counts.outOfSync,
											})}
										</A>
									)}
								</Show>
							</Show>
							<Show when={props.counts.unpublished > 0}>
								<Show
									when={props.href}
									fallback={T()("review.environments.unpublished", {
										count: props.counts.unpublished,
									})}
								>
									{(href) => (
										<A href={href()("unpublished")} class={linkClass}>
											{T()("review.environments.unpublished", {
												count: props.counts.unpublished,
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

export default EnvironmentStatus;
