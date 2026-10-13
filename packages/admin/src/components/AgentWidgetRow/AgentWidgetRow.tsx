import type { AgentInteraction, AgentWidgetPart } from "@types";
import {
	TbOutlineEdit,
	TbOutlineHelpCircle,
	TbOutlineShieldHalf,
} from "solid-icons/tb";
import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import AgentToolDetails from "@/components/AgentToolDetails/AgentToolDetails";
import AgentTranscriptRow from "@/components/AgentTranscriptRow/AgentTranscriptRow";
import { resolveAgentSlot } from "@/components/AgentWidget/slots";
import AgentWidgetUnavailable from "@/components/AgentWidgetUnavailable/AgentWidgetUnavailable";
import Pill from "@/components/Pill/Pill";
import T, { translateAdminCopy } from "@/translations";
import {
	confirmationBatchWidget,
	confirmationWidget,
	isWidgetSupported,
	questionWidget,
} from "@/utils/agent-tools";
import AgentConfirmationDetails from "./parts/AgentConfirmationDetails";

const interactionStatus = (interaction: AgentInteraction, key: string) => {
	switch (interaction.status) {
		case "pending":
			return T()("agent.question.pending");
		case "dismissed":
			return T()("agent.question.dismissed.short");
		case "answered":
			if (interaction.confirmation) return T()("agent.confirmation.confirmed");
			//* a batch can mix confirmed and denied calls, so it reads as answered
			return T()(
				key === questionWidget || interaction.confirmations
					? "agent.interaction.answered"
					: "agent.interaction.submitted",
			);
		case "cancelled":
			return T()(
				interaction.confirmation || interaction.confirmations
					? "agent.confirmation.denied"
					: "agent.interaction.cancelled",
			);
	}
};

/** Renders a registered widget transcript row or an expandable built-in interaction row. */
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
	const supported = createMemo(() => isWidgetSupported(props.widget));
	const question = createMemo(
		() => props.widget.key === questionWidget && supported(),
	);
	const response = createMemo(() => {
		const interaction = props.widget.interaction;
		return interaction?.status === "answered"
			? interaction.response
			: undefined;
	});
	const selectedCalls = createMemo(() => {
		const ids = response()?.confirmedToolCallIds;
		return Array.isArray(ids)
			? ids.filter((id): id is string => typeof id === "string")
			: [];
	});
	const expandable = createMemo(
		() =>
			!supported() ||
			question() ||
			props.widget.interaction?.confirmation !== undefined ||
			props.widget.interaction?.confirmations !== undefined ||
			(props.widget.key !== confirmationWidget &&
				props.widget.key !== confirmationBatchWidget &&
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
								<Switch fallback={<TbOutlineEdit size={10} />}>
									<Match when={question()}>
										<TbOutlineHelpCircle size={10} />
									</Match>
									<Match
										when={
											interaction().confirmation || interaction().confirmations
										}
									>
										<TbOutlineShieldHalf size={10} />
									</Match>
								</Switch>
							}
							label={
								<>
									{question()
										? T()("agent.question.asked")
										: translateAdminCopy(interaction().title)}
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
								question()
									? T()("agent.question.asked")
									: translateAdminCopy(interaction().title)
							}
							renderPanel={() => (
								<Switch>
									<Match when={!supported()}>
										<AgentWidgetUnavailable widget={props.widget} />
									</Match>
									<Match when={question()}>
										<dl class="flex flex-col gap-3 text-xs">
											<div class="flex flex-col gap-1">
												<dt class="text-[11px] text-muted">
													{T()("agent.question.label")}
												</dt>
												<dd class="whitespace-pre-wrap wrap-break-word text-title">
													{translateAdminCopy(interaction().title)}
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
											<Show when={interaction().confirmations}>
												{(confirmations) => (
													<AgentConfirmationDetails
														confirmations={confirmations()}
														selected={selectedCalls()}
														status={interaction().status}
													/>
												)}
											</Show>
											<Show when={interaction().confirmation}>
												{(confirmation) => (
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
																{confirmation().toolName}
															</code>
														</div>
														<AgentToolDetails
															sections={[
																{
																	label: T()("agent.tool.input"),
																	value: confirmation().input,
																},
															]}
														/>
													</>
												)}
											</Show>
											<Show
												when={
													props.widget.key !== confirmationWidget &&
													props.widget.key !== confirmationBatchWidget &&
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
