import type { AgentInteractionAction, AgentWidgetPart } from "@types";
import classnames from "classnames";
import { FaSolidCode } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Match,
	on,
	Show,
	Switch,
} from "solid-js";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import AgentInteractionBar from "@/components/AgentInteractionBar/AgentInteractionBar";
import AgentQuestionPanel from "@/components/AgentQuestionPanel/AgentQuestionPanel";
import Button from "@/components/Button/Button";
import JSONPreview from "@/components/JSONPreview/JSONPreview";
import T from "@/translations";
import {
	approvalBatchWidget,
	approvalWidget,
	questionWidget,
} from "@/utils/agent-tools";
import { resolveAgentSlot } from "./slots";
import type { AgentWidgetInteraction, AgentWidgetSubmitResult } from "./types";

const AgentWidget: Component<{
	widget: AgentWidgetPart;
	view: "inline" | "composer";
	onRespond?: (
		interactionId: string,
		response: Record<string, unknown>,
		action?: AgentInteractionAction,
	) => Promise<AgentWidgetSubmitResult>;
	onRedirect?: () => void;
	onStop?: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string>();
	const [showInput, setShowInput] = createSignal(false);
	const [approvedCalls, setApprovedCalls] = createSignal<string[]>([]);
	const [approvalStep, setApprovalStep] = createSignal(0);
	const [draft, setDraft] = createSignal<{
		id: string;
		response: Record<string, unknown>;
	}>();

	// ----------------------------------------
	// Memos
	const contribution = createMemo(() =>
		resolveAgentSlot("agent.widget", props.widget),
	);
	const pending = createMemo(() =>
		props.widget.interaction?.status === "pending"
			? props.widget.interaction
			: undefined,
	);
	const active = createMemo(() => !!pending() && !!props.onRespond);
	const batch = createMemo(() => pending()?.approvals);
	const approvalOnly = createMemo(
		() =>
			props.widget.key === approvalWidget ||
			props.widget.key === approvalBatchWidget,
	);
	const currentApproval = createMemo(() => batch()?.[approvalStep()]);
	const approval = createMemo(() => currentApproval() ?? pending()?.approval);
	const hasApproval = createMemo(
		() => approval() !== undefined || batch() !== undefined,
	);
	const waitingText = createMemo(() => {
		const approvals = batch();
		if (approvals) {
			return T()("agent.approval.waiting.step", {
				current: approvalStep() + 1,
				total: approvals.length,
			});
		}

		return T()(
			hasApproval() ? "agent.approval.waiting" : "agent.interaction.waiting",
		);
	});
	const collapsed = createMemo(() => approvalOnly() && !showInput());
	const ready = createMemo(
		() => approvalOnly() || draft()?.id === pending()?.id,
	);
	const question = createMemo(() => {
		const { question, options } = props.widget.data;
		return {
			question: typeof question === "string" ? question : "",
			options: Array.isArray(options)
				? options.filter((value): value is string => typeof value === "string")
				: [],
		};
	});
	const interaction = createMemo<AgentWidgetInteraction | undefined>(() => {
		const state = pending();
		if (!state) return undefined;
		if (!active()) return { status: "inactive" };

		return {
			status: "active",
			submitting: submitting(),
			error: error(),
			setResponse: (response) => {
				if (active() && pending()?.id === state.id && !submitting()) {
					setDraft(
						response === undefined ? undefined : { id: state.id, response },
					);
				}
			},
		};
	});

	// ----------------------------------------
	// Functions
	const submit = async (
		response: Record<string, unknown>,
		action: AgentInteractionAction = "submit",
	): Promise<AgentWidgetSubmitResult> => {
		const id = pending()?.id;
		if (!id || !active() || !props.onRespond) {
			return { error: T()("agent.interaction.unavailable") };
		}
		if (submitting()) {
			return { error: T()("agent.interaction.submitting") };
		}
		setSubmitting(true);
		setError(undefined);

		try {
			const result = await props.onRespond(
				id,
				structuredClone(response),
				action,
			);
			setError(result.error);

			return result;
		} catch {
			const message = T()("agent.errors.stream");
			setError(message);

			return { error: message };
		} finally {
			setSubmitting(false);
		}
	};
	/** Grouped approvals collect each decision locally and submit once after the last call. */
	const decide = (action: AgentInteractionAction) => {
		if (submitting() || (action === "submit" && !ready())) return;

		const current = currentApproval();
		if (!current) {
			void submit(action === "cancel" ? {} : (draft()?.response ?? {}), action);
			return;
		}

		const approvedToolCallIds =
			action === "submit"
				? [...approvedCalls(), current.toolCallId]
				: approvedCalls();

		if (approvalStep() + 1 < (batch()?.length ?? 0)) {
			setApprovedCalls(approvedToolCallIds);
			setApprovalStep((step) => step + 1);
			setError(undefined);
			return;
		}

		void submit({ approvedToolCallIds });
	};
	const answer = async (value: string) =>
		(await submit({ answer: value })).error === undefined;

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => pending()?.id,
			() => {
				setApprovalStep(0);
				setApprovedCalls([]);
			},
		),
	);

	// ----------------------------------------
	// Render
	return (
		<div aria-busy={submitting()}>
			<Switch>
				<Match when={props.widget.key === questionWidget}>
					<AgentQuestionPanel
						question={question()}
						onAnswer={answer}
						onSubmit={answer}
						onStop={props.onStop}
					/>
				</Match>
				<Match when={true}>
					<section
						class={classnames({
							"overflow-hidden rounded-2xl border border-primary-low-border bg-card shadow-sm transition-colors focus-within:border-primary":
								props.view === "composer",
							"rounded-2xl border border-border bg-card p-3":
								props.view === "inline" && pending(),
						})}
					>
						<Show when={props.view === "composer" && pending()}>
							{(state) => (
								<AgentInteractionBar
									title={currentApproval()?.title ?? state().title}
									onRedirect={props.onRedirect}
									onStop={props.onStop}
									details={
										approvalOnly()
											? {
													open: showInput(),
													onToggle: () => setShowInput((open) => !open),
												}
											: undefined
									}
								/>
							)}
						</Show>
						<Show when={!collapsed()}>
							<div
								classList={{
									"p-3": props.view === "composer",
									"mb-3": props.view === "inline",
								}}
							>
								<Show
									when={!approvalOnly()}
									fallback={<JSONPreview json={approval()?.input ?? {}} />}
								>
									<Show
										when={contribution()}
										keyed
										fallback={
											<p class="text-xs text-muted">
												{T()("agent.widget.unavailable", {
													key: props.widget.key,
												})}
											</p>
										}
									>
										{(entry) => {
											const Renderer = entry.component;
											return (
												<AdminExtensionBoundary
													name={props.widget.key}
													placement="content"
												>
													<fieldset disabled={submitting()} class="min-w-0">
														<Renderer
															slot="agent.widget"
															key={props.widget.key}
															version={props.widget.version}
															data={props.widget.data}
															options={entry.options}
															view={props.view}
															interaction={interaction()}
														/>
													</fieldset>
												</AdminExtensionBoundary>
											);
										}}
									</Show>
								</Show>
							</div>
						</Show>
						<Show when={active()}>
							<div
								class={classnames(
									"flex flex-wrap items-center justify-end gap-2",
									props.view === "composer"
										? {
												"px-3 py-3": true,
												"border-t border-border": !collapsed(),
											}
										: { "border-t border-border pt-3": !collapsed() },
								)}
							>
								<Show when={props.view === "composer"}>
									<p class="min-w-0 grow text-xs text-muted">{waitingText()}</p>
								</Show>
								<Show when={props.view === "inline"}>
									<p class="min-w-0 grow text-xs text-muted">
										{currentApproval()?.title ?? pending()?.title}
									</p>
									<Show when={approvalOnly()}>
										<Button
											type="button"
											variant="ghost"
											size="xs"
											shape="circle"
											aria-pressed={showInput()}
											aria-label={T()(
												showInput()
													? "agent.interaction.details.hide"
													: "agent.interaction.details.show",
											)}
											title={T()(
												showInput()
													? "agent.interaction.details.hide"
													: "agent.interaction.details.show",
											)}
											onClick={() => setShowInput((open) => !open)}
										>
											<FaSolidCode size={11} />
										</Button>
									</Show>
								</Show>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={submitting()}
									onClick={() => decide("cancel")}
								>
									{T()(
										hasApproval()
											? "agent.approval.deny"
											: "agent.interaction.cancel",
									)}
								</Button>
								<Button
									type="button"
									size="sm"
									disabled={
										!ready() ||
										submitting() ||
										(!approvalOnly() && !contribution())
									}
									onClick={() => decide("submit")}
								>
									{T()(
										hasApproval()
											? "agent.approval.approve"
											: "agent.interaction.continue",
									)}
								</Button>
							</div>
						</Show>
					</section>
				</Match>
			</Switch>
			<Show when={error()}>
				<p role="alert" class="mt-2 text-sm text-danger">
					{error()}
				</p>
			</Show>
		</div>
	);
};

export default AgentWidget;
