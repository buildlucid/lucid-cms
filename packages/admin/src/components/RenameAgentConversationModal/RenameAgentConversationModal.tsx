import type { AgentConversation } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
	untrack,
} from "solid-js";
import AiDraftReviewPill from "@/components/AiDraftReviewPill/AiDraftReviewPill";
import AiIconButton from "@/components/AiIconButton/AiIconButton";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import useSuperKeyHeld from "@/hooks/useSuperKeyHeld/useSuperKeyHeld";
import api from "@/services/api";
import siteStore from "@/store/siteStore/siteStore";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

const RenameAgentConversationModal: Component<{
	conversation: Accessor<AgentConversation | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State & Mutations
	const [title, setTitle] = createSignal("");
	const [originalTitle, setOriginalTitle] = createSignal<string>();
	let openedId: string | undefined;
	let openingId = 0;
	const superKeyHeld = useSuperKeyHeld();
	const update = api.agent.useUpdateConversation({
		onSuccess: () => props.state.setOpen(false),
	});
	const generate = api.agent.useGenerateConversationTitle({
		onSuccess: (response, params) => {
			if (
				props.state.open &&
				props.conversation()?.id === params.id &&
				params.openingId === openingId
			) {
				setTitle(response.data.title);
				setOriginalTitle(params.originalTitle);
			}
		},
	});

	// ----------------------------------------
	// Memos
	const generateEnabled = createMemo(() =>
		siteStore.get.isAiFeatureEnabled("chatRename"),
	);
	const canGenerate = createMemo(
		() =>
			generateEnabled() &&
			Boolean(props.conversation()?.id) &&
			originalTitle() === undefined,
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const id = props.state.open ? props.conversation()?.id : undefined;
		if (id === openedId) return;
		openedId = id;
		openingId += 1;
		setOriginalTitle(undefined);
		if (id) setTitle(untrack(() => props.conversation()?.title ?? ""));
		else {
			update.reset();
			generate.reset();
		}
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.state.open} onOpenChange={props.state.setOpen}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					const id = props.conversation()?.id;
					if (!id) return;
					update.action.mutate({ id, body: { title: title() } });
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{T()("modals.agent.conversation.rename.title")}
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Input
						id="agent-conversation-title"
						name="title"
						type="text"
						value={title()}
						onChange={setTitle}
						required={true}
						label={T()("common.title")}
						labelEnd={
							<Show when={generateEnabled()}>
								<div class="relative">
									<AiIconButton
										label={T()("modals.agent.conversation.rename.generate")}
										tooltip={T()(
											"modals.agent.conversation.rename.generate.tooltip",
										)}
										loading={generate.action.isPending}
										quickActionActive={superKeyHeld() && canGenerate()}
										quickActionOnHover={canGenerate()}
										disabled={!canGenerate()}
										onClick={() => {
											const id = props.conversation()?.id;
											if (id) {
												generate.action.mutate({
													id,
													openingId,
													originalTitle: title(),
												});
											}
										}}
									/>
									<Show when={originalTitle() !== undefined}>
										<AiDraftReviewPill
											label={T()(
												"modals.agent.conversation.rename.review.label",
											)}
											onAccept={() => setOriginalTitle(undefined)}
											onReject={() => {
												setTitle(originalTitle() ?? "");
												setOriginalTitle(undefined);
											}}
										/>
									</Show>
								</div>
							</Show>
						}
						disabled={generate.action.isPending}
						errors={getBodyError("title", update.errors)}
					/>
				</Modal.Body>
				<Modal.Footer>
					<ErrorMessage theme="basic" message={update.errors()?.message} />
					<ErrorMessage theme="basic" message={generate.errors()?.message} />
					<Modal.Actions>
						<Button
							variant="outline"
							onClick={() => props.state.setOpen(false)}
						>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							loading={update.action.isPending}
							disabled={!title().trim() || generate.action.isPending}
						>
							{T()("common.save")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default RenameAgentConversationModal;
