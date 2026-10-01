import type {
	Agent,
	AgentInput,
	AgentInteractionAction,
	AgentRoutine,
} from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	Show,
} from "solid-js";
import AgentApprovalPicker from "@/components/AgentApprovalPicker/AgentApprovalPicker";
import AgentComposer, {
	type AgentComposerHandle,
	type AgentComposerProps,
} from "@/components/AgentComposer/AgentComposer";
import AgentComposerStack from "@/components/AgentComposerStack/AgentComposerStack";
import AgentContextRing from "@/components/AgentContextRing/AgentContextRing";
import AgentInteractionBar from "@/components/AgentInteractionBar/AgentInteractionBar";
import AgentModelPicker from "@/components/AgentModelPicker/AgentModelPicker";
import AgentUnavailableNotice from "@/components/AgentUnavailableNotice/AgentUnavailableNotice";
import AgentWidget from "@/components/AgentWidget/AgentWidget";
import type { AgentWidgetSubmitResult } from "@/components/AgentWidget/types";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import type { AgentChat } from "@/hooks/useAgentChat/useAgentChat";
import api from "@/services/api";
import T from "@/translations";
import { getAgentUnavailableReason } from "@/utils/agent-access";
import type { AgentReferenceItem } from "@/utils/agent-references";

/**
 * Everything below the transcript: queued input, then the chat box with its
 * approval, context and model controls. A composer interaction takes the chat
 * box's place until it is answered, or set aside to send instructions instead.
 */
const AgentChatComposer: Component<{
	chat: AgentChat;
	conversationId: string;
	agent?: Agent;
	routine?: AgentRoutine;
	referenceDetails: Readonly<Record<string, AgentReferenceItem>>;
	ref: (handle: AgentComposerHandle) => void;
	onAttachedChange: (attached: boolean) => void;
	onReferencesChange: AgentComposerProps["onReferencesChange"];
	onRespond: (
		interactionId: string,
		response: Record<string, unknown>,
		action?: AgentInteractionAction,
	) => Promise<AgentWidgetSubmitResult>;
	/** Called as a message is sent, eg. to scroll to the end. */
	onSend: () => void;
	onEditRoutineApprovals: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const updateConversation = api.agent.useUpdateConversation();
	//* the composer interaction set aside to send instructions instead
	const [redirecting, setRedirecting] = createSignal<string>();
	let composer: AgentComposerHandle | undefined;

	// ----------------------------------------
	// Memos
	const conversation = createMemo(() => props.chat.data());
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
	const placeholder = createMemo(() => {
		if (models.isError) return T()("agent.composer.placeholder.unreachable");
		if (props.chat.pendingInteraction()) {
			return T()("agent.composer.placeholder.instructions");
		}
		if (props.chat.working()) return T()("agent.composer.placeholder.busy");
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
			props.chat.waiting() ? "steer" : mode,
			references,
		);
	};
	/** Editing takes a queued message back into the chat box. */
	const edit = async (input: AgentInput) => {
		if (await props.chat.updateInput({ kind: "cancel", id: input.id })) {
			composer?.insert(input.text, input.references);
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
			<ErrorMessage
				theme="basic"
				message={updateConversation.errors()?.message}
			/>
			<AgentUnavailableNotice>
				<Show when={!activeWidget()}>
					<AgentComposer
						ref={(handle) => {
							composer = handle;
							props.ref(handle);
						}}
						class="agent-composer-morph"
						autofocus={true}
						draftKey={props.conversationId}
						floatAttachments={true}
						onAttachedChange={props.onAttachedChange}
						onReferencesChange={props.onReferencesChange}
						referenceDetails={props.referenceDetails}
						agentKey={props.agent?.key}
						features={props.agent?.features}
						capabilities={props.agent?.capabilities}
						disabled={!models.isSuccess}
						placeholder={placeholder()}
						header={
							<Show when={props.chat.pendingInteraction()}>
								{(pending) => (
									<AgentInteractionBar
										title={pending().widget.interaction?.title}
										redirecting={true}
										onRedirect={
											pending().widget.interaction?.placement === "composer"
												? () => setRedirecting(undefined)
												: undefined
										}
										onStop={stop}
									/>
								)}
							</Show>
						}
						queueable={true}
						busy={props.chat.working()}
						onStop={props.chat.working() ? stop : undefined}
						controls={
							<Show when={conversation()}>
								{(current) => (
									<AgentApprovalPicker
										routine={
											current().routineId
												? {
														disabled: !props.routine,
														onEdit: props.onEditRoutineApprovals,
													}
												: undefined
										}
										value={current().approvalMode}
										onChange={(approvalMode) =>
											updateConversation.action.mutate({
												id: props.conversationId,
												body: { approvalMode },
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
								<Show when={conversation()}>
									{(current) => (
										<AgentModelPicker
											agentKey={current().agentKey}
											routineId={current().routineId ?? undefined}
											value={current().modelSelection}
											onChange={(modelSelection) =>
												updateConversation.action.mutateAsync({
													id: props.conversationId,
													body: { modelSelection },
												})
											}
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
							class="max-h-[60vh] overflow-y-auto motion-safe:animate-rise-in"
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
