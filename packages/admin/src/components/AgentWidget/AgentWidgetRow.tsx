import type { AgentInteraction, AgentWidgetPart } from "@types";
import {
	FaSolidCircleQuestion,
	FaSolidPenToSquare,
	FaSolidShieldHalved,
} from "solid-icons/fa";
import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import AgentToolDetails from "@/components/AgentToolDetails/AgentToolDetails";
import AgentTranscriptRow from "@/components/AgentTranscriptRow/AgentTranscriptRow";
import Pill from "@/components/Pill/Pill";
import T from "@/translations";
import {
	approvalBatchWidget,
	approvalWidget,
	questionWidget,
} from "@/utils/agent-tools";
import AgentApprovalDetails from "./AgentApprovalDetails";
import { resolveAgentSlot } from "./slots";

const interactionStatus = (interaction: AgentInteraction, key: string) => {
	switch (interaction.status) {
		case "pending":
			return T()("agent.question.pending");
		case "dismissed":
			return T()("agent.question.dismissed.short");
		case "answered":
			if (interaction.approvals) return T()("agent.approval.batch.reviewed");
			if (interaction.approval) return T()("agent.approval.approved");
			return T()(
				key === questionWidget
					? "agent.interaction.answered"
					: "agent.interaction.submitted",
			);
		case "cancelled":
			return T()(
				interaction.approval || interaction.approvals
					? "agent.approval.denied"
					: "agent.interaction.cancelled",
			);
	}
};

/**
 * A widget as a compact transcript row: the plugin's registered row, or Lucid's
 * own for an interaction, which expands to show what was asked and answered.
 */
const AgentWidgetRow: Component<{ widget: AgentWidgetPart }> = (props) => {
	// ----------------------------------------
	// Memos
	const contribution = createMemo(() =>
		resolveAgentSlot("agent.transcriptRow", props.widget),
	);
	const status = createMemo(() => {
		const interaction = props.widget.interaction;
		return interaction
			? interactionStatus(interaction, props.widget.key)
			: undefined;
	});
	const question = createMemo(() => props.widget.key === questionWidget);
	const response = createMemo(() => {
		const interaction = props.widget.interaction;
		return interaction?.status === "answered"
			? interaction.response
			: undefined;
	});
	const selectedCalls = createMemo(() => {
		const ids = response()?.approvedToolCallIds;
		return Array.isArray(ids)
			? ids.filter((id): id is string => typeof id === "string")
			: [];
	});
	const expandable = createMemo(
		() =>
			question() ||
			props.widget.interaction?.approval !== undefined ||
			props.widget.interaction?.approvals !== undefined ||
			(props.widget.key !== approvalWidget &&
				props.widget.key !== approvalBatchWidget &&
				response() !== undefined),
	);

	// ----------------------------------------
	// Render
	return (
		<Show
			when={contribution()}
			keyed
			fallback={
				<Show when={props.widget.interaction}>
					{(interaction) => (
						<AgentTranscriptRow
							expandable={expandable()}
							icon={
								<Switch fallback={<FaSolidPenToSquare size={10} />}>
									<Match when={question()}>
										<FaSolidCircleQuestion size={10} />
									</Match>
									<Match
										when={interaction().approval || interaction().approvals}
									>
										<FaSolidShieldHalved size={10} />
									</Match>
								</Switch>
							}
							label={
								<>
									{question()
										? T()("agent.question.asked")
										: interaction().title}
									<span
										classList={{
											"text-primary": interaction().status === "pending",
										}}
									>
										{" "}
										· {status()}
									</span>
								</>
							}
							panelTitle={
								question() ? T()("agent.question.asked") : interaction().title
							}
							renderPanel={() => (
								<Switch>
									<Match when={question()}>
										<dl class="flex flex-col gap-3 text-xs">
											<div class="flex flex-col gap-1">
												<dt class="text-[11px] text-muted">
													{T()("agent.question.label")}
												</dt>
												<dd class="whitespace-pre-wrap wrap-break-word text-title">
													{interaction().title}
												</dd>
											</div>
											<Show when={response()}>
												{(answered) => (
													<div class="flex flex-col gap-1">
														<dt class="text-[11px] text-muted">
															{T()("agent.question.answer")}
														</dt>
														<dd class="whitespace-pre-wrap wrap-break-word text-body">
															{String(answered().answer ?? "")}
														</dd>
													</div>
												)}
											</Show>
										</dl>
									</Match>
									<Match when={true}>
										<div class="flex flex-col gap-5">
											<Show when={interaction().approvals}>
												{(approvals) => (
													<AgentApprovalDetails
														approvals={approvals()}
														selected={selectedCalls()}
														status={interaction().status}
													/>
												)}
											</Show>
											<Show when={interaction().approval}>
												{(approval) => (
													<>
														<div class="-mt-3 flex flex-wrap items-center gap-2">
															<Pill
																size="xs"
																variant={
																	interaction().status === "answered"
																		? "success-subtle"
																		: interaction().status === "cancelled"
																			? "danger-subtle"
																			: "neutral"
																}
															>
																{status()}
															</Pill>
															<code class="rounded bg-input px-1.5 py-0.5 text-[11px] text-body">
																{approval().toolName}
															</code>
														</div>
														<AgentToolDetails
															sections={[
																{
																	label: T()("agent.tool.input"),
																	value: approval().input,
																},
															]}
														/>
													</>
												)}
											</Show>
											<Show
												when={
													props.widget.key !== approvalWidget &&
													props.widget.key !== approvalBatchWidget &&
													response()
												}
											>
												{(answered) => (
													<AgentToolDetails
														sections={[
															{
																label: T()("agent.interaction.response"),
																value: answered(),
															},
														]}
													/>
												)}
											</Show>
										</div>
									</Match>
								</Switch>
							)}
						/>
					)}
				</Show>
			}
		>
			{(entry) => {
				const Renderer = entry.component;
				return (
					<AdminExtensionBoundary name={props.widget.key} placement="content">
						<Renderer
							slot="agent.transcriptRow"
							key={props.widget.key}
							version={props.widget.version}
							data={props.widget.data}
							options={entry.options}
							interaction={props.widget.interaction}
							status={status()}
						/>
					</AdminExtensionBoundary>
				);
			}}
		</Show>
	);
};

export default AgentWidgetRow;
