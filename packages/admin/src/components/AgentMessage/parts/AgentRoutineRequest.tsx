import type {
	AgentRoutineEventSubject,
	AgentRoutineTrigger,
	AgentRunResultPart,
} from "@types";
import classnames from "classnames";
import { TbOutlineChevronRight, TbOutlineRepeat } from "solid-icons/tb";
import {
	type Component,
	createSignal,
	createUniqueId,
	type JSXElement,
	Show,
} from "solid-js";
import AgentMarkdown from "@/components/AgentMarkdown/AgentMarkdown";
import AgentReferenceFiles from "@/components/AgentReferenceFiles/AgentReferenceFiles";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import T from "@/translations";
import {
	type AgentReferenceItem,
	agentReferenceKey,
} from "@/utils/agent-references";
import { routineTriggerLabel } from "@/utils/agent-routine-events";
import dateHelpers from "@/utils/date-helpers";

const AgentRoutineRequest: Component<{
	name: string;
	instructions: string;
	trigger: AgentRoutineTrigger;
	/** The content changes the run was given. */
	events?: AgentRoutineEventSubject[];
	/** Live resource details keyed by `agentReferenceKey` for preview rendering. */
	referenceDetails?: Readonly<Record<string, AgentReferenceItem>>;
	createdAt: string | null;
	result?: AgentRunResultPart;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const id = createUniqueId();
	const [open, setOpen] = createSignal(false);

	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col">
			<section
				class={classnames(
					"rounded-2xl border bg-card",
					props.result?.outcome === "needs_review"
						? "border-warning-low-border"
						: "border-border",
				)}
			>
				<button
					type="button"
					class="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-start focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
					aria-expanded={open()}
					aria-controls={id}
					onClick={() => setOpen((value) => !value)}
				>
					<TbOutlineRepeat size={11} class="shrink-0 text-muted" />
					<span class="min-w-0 grow truncate text-sm text-title">
						{props.name}
						<span class="text-muted">
							{" · "}
							{routineTriggerLabel(props.trigger)}
						</span>
					</span>
					<Show when={props.result}>
						{(result) => (
							<AgentRunStatus status="completed" outcome={result().outcome} />
						)}
					</Show>
					<TbOutlineChevronRight
						size={9}
						class={classnames("shrink-0 text-muted transition-transform", {
							"rotate-90": open(),
						})}
					/>
				</button>
				<div
					id={id}
					hidden={!open()}
					class="flex flex-col gap-3 border-t border-border px-3.5 py-3"
				>
					<Show when={open()}>
						<div>
							<p class="mb-1.5 text-xs text-muted">
								{T()("agent.routine.instructions")}
							</p>
							<FadedScroll>
								<AgentMarkdown
									text={props.instructions}
									size="sm"
									class="text-subtitle"
								/>
							</FadedScroll>
						</div>
						<Show when={props.result}>
							{(result) => (
								<div>
									<p class="mb-1.5 text-xs text-muted">
										{T()("agent.routine.run.summary")}
									</p>
									<FadedScroll>
										<AgentMarkdown
											text={result().summary}
											size="sm"
											class="text-subtitle"
										/>
									</FadedScroll>
								</div>
							)}
						</Show>
					</Show>
				</div>
			</section>
			<AgentReferenceFiles
				references={(props.events ?? []).map((change) => ({
					...change.reference,
					previewUrl:
						props.referenceDetails?.[agentReferenceKey(change.reference)]
							?.previewUrl,
				}))}
				class="-ms-4 w-[calc(100%+1rem)]"
			/>
			<Show when={props.createdAt}>
				{(createdAt) => (
					<div class="mt-3 flex h-6 items-center self-start text-xs text-muted">
						<time
							datetime={createdAt()}
							title={dateHelpers.formatFullDate(createdAt(), {
								includeTime: true,
							})}
						>
							{dateHelpers.formatTimestamp(createdAt())}
						</time>
					</div>
				)}
			</Show>
		</div>
	);
};

const FadedScroll: Component<{ children: JSXElement }> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="relative overflow-hidden rounded-lg border border-border bg-background">
			<div class="max-h-48 overflow-y-auto px-3 py-4">{props.children}</div>
			<div
				aria-hidden="true"
				class="pointer-events-none absolute inset-x-0 top-0 h-4 bg-linear-to-b from-background to-transparent"
			/>
			<div
				aria-hidden="true"
				class="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-linear-to-t from-background to-transparent"
			/>
		</div>
	);
};

export default AgentRoutineRequest;
