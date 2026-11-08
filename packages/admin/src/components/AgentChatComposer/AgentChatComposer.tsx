import type { AgentInput } from "@lucidcms/types";
import type { Agent, AgentInteractionAction, AgentRoutine } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	Show,
} from "solid-js";
import AgentComposer, {
	type AgentComposerHandle,
	type AgentComposerProps,
} from "@/components/AgentComposer/AgentComposer";
import AgentComposerNotice from "@/components/AgentComposerNotice/AgentComposerNotice";
import AgentComposerStack from "@/components/AgentComposerStack/AgentComposerStack";
import AgentConfirmationPicker from "@/components/AgentConfirmationPicker/AgentConfirmationPicker";
import AgentContextRing from "@/components/AgentContextRing/AgentContextRing";
import AgentInteractionBar from "@/components/AgentInteractionBar/AgentInteractionBar";
import AgentModelPicker from "@/components/AgentModelPicker/AgentModelPicker";
import AgentSubagentConfirmations from "@/components/AgentSubagentConfirmations/AgentSubagentConfirmations";
import AgentUnavailableNotice from "@/components/AgentUnavailableNotice/AgentUnavailableNotice";
import AgentWidget from "@/components/AgentWidget/AgentWidget";
import type { AgentWidgetSubmitResult } from "@/components/AgentWidget/types";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Link from "@/components/Link/Link";
import type { AgentChat } from "@/hooks/useAgentChat/useAgentChat";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import api from "@/services/api";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import T, { translateAdminCopy } from "@/translations";
import { getAgentUnavailableReason } from "@/utils/agent-access";
import type { AgentReferenceItem } from "@/utils/agent-references";

/**
 * Shows queued input, controls and pending interactions, including sub-agent confirmations in the
 * parent chat. Sub-agent chats allow steering only while running, inherit model and confirmation
 * settings, and link back to the parent after finishing.
 */
const AgentChatComposer: Component<{
	chat: AgentChat;
	conversationId: string;
	agent?: Agent;
	routine?: AgentRoutine;
	referenceDetails: Readonly<Record<string, AgentReferenceItem>>;
	ref: (handle: AgentComposerHandle | undefined) => void;
	onAttachedChange: (attached: boolean) => void;
	onReferencesChange: AgentComposerProps["onReferencesChange"];
	onRespond: (
		interactionId: string,
		response: Record<string, unknown>,
		action?: AgentInteractionAction,
	) => Promise<AgentWidgetSubmitResult>;
	/** Called as a message is sent, eg. to scroll to the end. */
	onSend: () => void;
	/** Opens the routine's settings. Without it, a routine chat's confirmations can't be edited from here. */
	onEditRoutineConfirmations?: () => void;
	/** @default true */
	capabilityHints?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const session = useAgentSession();
	const updateConversation = api.agent.useUpdateConversation();
	//* the composer interaction set aside to send instructions instead
	const [redirecting, setRedirecting] = createSignal<string>();
	const [composer, setComposer] = createSignal<AgentComposerHandle>();

	// ----------------------------------------
	// Memos
	const conversation = createMemo(() => props.chat.data());
	const subagent = createMemo(() => props.chat.parentId() !== undefined);
	//* a sub-agent works for the chat that started it, so people can only redirect it while it runs
	const subagentFinished = createMemo(
		() => subagent() && props.chat.activeRunId() === undefined,
	);
	//* shares the model picker's query; chat waits for it as it needs the same Lucid connection
	const models = api.agent.useGetModels({
		agentKey: () => conversation()?.agentKey,
		routineId: () => conversation()?.routineId ?? undefined,
	});
	const composerWidget = createMemo(() => {
		const pending = props.chat.pendingInteraction();
		return pending?.widget.interaction?.placement === "composer"
			? pending
			: undefined;
	});
	const activeWidget = createMemo(() => {
		const pending = composerWidget();
		return pending?.id !== redirecting() ? pending : undefined;
	});
	//* a run waiting on its sub-agents takes a message straight away, so the box reads like an idle chat's
	const busy = createMemo(
		() => props.chat.working() && !props.chat.waitingOnSubagents(),
	);
	const placeholder = createMemo(() => {
		if (models.isError) return T()("agent.composer.placeholder.unreachable");
		if (props.chat.pendingInteraction()) {
			return T()("agent.composer.placeholder.instructions");
		}
		if (busy()) return T()("agent.composer.placeholder.busy");
		return T()("agent.composer.placeholder");
	});

	// ----------------------------------------
	// Functions
	const send = (
		text: string,
		mode: "send" | "steer",
		references: AgentReferenceItem[],
	) => {
		//* a run reads the chat's settings when it starts, so wait for a change to save
		if (
			getAgentUnavailableReason() ||
			!models.isSuccess ||
			updateConversation.action.isPending
		) {
			return false;
		}
		props.onSend();
		return props.chat.send(
			text,
			props.chat.waiting() || props.chat.waitingOnSubagents() || subagent()
				? "steer"
				: mode,
			references,
		);
	};
	/** Editing takes a queued message back into the chat box. */
	const edit = async (input: AgentInput) => {
		if (await props.chat.updateInput({ kind: "cancel", id: input.id })) {
			composer()?.insert(input.text, input.references);
		}
	};
	const editLast = () => {
		const last = props.chat.inputs.findLast(
			(input) => input.status === "pending" && input.delivery.kind === "queue",
		);
		if (!last) return false;
		void edit(last);
		return true;
	};
	const stop = () => void props.chat.stop();

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.conversationId,
			() => setRedirecting(undefined),
			{ defer: true },
		),
	);
	//* a first message the agent did not accept comes back to its chat box
	createEffect(() => {
		const message = session.returned();
		const handle = composer();
		if (!handle || message?.conversationId !== props.conversationId) return;
		session.takeReturned();
		handle.insert(message.text, message.references);
	});
	//* resources added from a page, eg. selected media, wait for the box while an interaction replaces it
	createEffect(() => {
		const references = session.attached();
		const handle = composer();
		if (!handle || !references) return;
		session.takeAttached();
		handle.attach(references);
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<AgentComposerStack
				inputs={props.chat.inputs}
				paused={props.chat.queuePaused()}
				canSteer={props.chat.activeRunId() !== undefined}
				onSteer={(input) => {
					const targetRunId = props.chat.activeRunId();
					if (targetRunId) {
						void props.chat.updateInput({
							kind: "steer",
							id: input.id,
							targetRunId,
						});
					}
				}}
				onEdit={activeWidget() ? undefined : (input) => void edit(input)}
				onCancel={(input) =>
					void props.chat.updateInput({ kind: "cancel", id: input.id })
				}
				onResume={() => void props.chat.updateInput({ kind: "resume" })}
				onClear={() => void props.chat.updateInput({ kind: "clear" })}
			/>
			<AgentSubagentConfirmations conversationId={props.conversationId} />
			<ErrorMessage
				theme="basic"
				message={updateConversation.errors()?.message}
			/>
			<AgentUnavailableNotice>
				<Show when={subagentFinished() && props.chat.parentId()}>
					{(parent) => (
						<AgentComposerNotice
							message={T()("agent.subagent.composer.finished")}
							action={
								<Link
									href={`/admin/agent/chats/${parent()}`}
									variant="outline"
									size="sm"
								>
									{T()("agent.subagent.composer.parent")}
								</Link>
							}
						/>
					)}
				</Show>
				<Show when={!activeWidget() && !subagentFinished()}>
					<AgentComposer
						ref={(handle) => {
							setComposer(handle);
							props.ref(handle);
						}}
						class="agent-composer-morph"
						autofocus={true}
						draftKey={props.conversationId}
						screen={session.screen.current()}
						floatAttachments={true}
						onAttachedChange={props.onAttachedChange}
						onReferencesChange={props.onReferencesChange}
						referenceDetails={props.referenceDetails}
						agentKey={props.agent?.key}
						features={props.agent?.features}
						capabilities={props.agent?.capabilities}
						capabilityHints={props.capabilityHints}
						disabled={!models.isSuccess}
						placeholder={placeholder()}
						header={
							<Show when={props.chat.pendingInteraction()?.widget.interaction}>
								{(interaction) => (
									<AgentInteractionBar
										title={translateAdminCopy(interaction().title)}
										redirecting={true}
										onRedirect={
											interaction().placement === "composer"
												? () => setRedirecting(undefined)
												: undefined
										}
										onStop={stop}
									/>
								)}
							</Show>
						}
						queueable={true}
						busy={busy()}
						onStop={props.chat.working() ? stop : undefined}
						controls={
							<Show when={!subagent() && conversation()}>
								{(current) => (
									<AgentConfirmationPicker
										routine={
											current().routineId
												? {
														disabled:
															!props.routine ||
															!props.onEditRoutineConfirmations,
														onEdit: () => props.onEditRoutineConfirmations?.(),
													}
												: undefined
										}
										value={current().confirmationMode}
										onChange={(confirmationMode) =>
											updateConversation.action.mutate({
												id: props.conversationId,
												body: { confirmationMode },
											})
										}
									/>
								)}
							</Show>
						}
						onSubmit={send}
						onEditLast={editLast}
						end={
							<>
								<Show when={props.chat.context()}>
									{(context) => (
										<AgentContextRing
											context={context()}
											busy={props.chat.working()}
											onCompact={() => void props.chat.compact()}
										/>
									)}
								</Show>
								<Show when={!subagent() && conversation()}>
									{(current) => (
										<AgentModelPicker
											agentKey={current().agentKey}
											routineId={current().routineId ?? undefined}
											value={current().modelSelection}
											onChange={async (modelSelection) => {
												const chat = current();
												const response =
													await updateConversation.action.mutateAsync({
														id: props.conversationId,
														body: { modelSelection },
													});
												if (!chat.routineId && response.data.modelSelection) {
													userPreferencesStore.setAgentModelSelection(
														chat.agentKey,
														response.data.modelSelection,
													);
												}
											}}
										/>
									)}
								</Show>
							</>
						}
					/>
				</Show>
				{/* kept while instructions are sent instead, so the form keeps its values */}
				<Show when={composerWidget()}>
					{(pending) => (
						<div
							class="motion-safe:animate-rise-in"
							classList={{ hidden: !activeWidget() }}
						>
							<AgentWidget
								widget={pending().widget}
								view="composer"
								onRespond={props.onRespond}
								onRedirect={() => setRedirecting(pending().id)}
								onStop={stop}
							/>
						</div>
					)}
				</Show>
			</AgentUnavailableNotice>
		</>
	);
};

export default AgentChatComposer;
