import type { AgentMemory, AgentMemoryScope } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
	untrack,
} from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Modal from "@/components/Modal/Modal";
import RadioCards from "@/components/RadioCards/RadioCards";
import Textarea from "@/components/Textarea/Textarea";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

/** Adds a memory, or edits one when `memory` is set. */
const UpsertAgentMemoryModal: Component<{
	memory: Accessor<AgentMemory | undefined>;
	/** The scopes the person can save to, with the first as the default. */
	scopes: AgentMemoryScope[];
	contentChars: number;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [content, setContent] = createSignal("");
	const [scope, setScope] = createSignal<AgentMemoryScope>("personal");

	// ----------------------------------------
	// Mutations
	const createMemory = api.agent.useCreateMemory({
		onSuccess: () => props.state.setOpen(false),
	});
	const updateMemory = api.agent.useUpdateMemory({
		onSuccess: () => props.state.setOpen(false),
	});

	// ----------------------------------------
	// Memos
	const errors = createMemo(() =>
		props.memory() ? updateMemory.errors() : createMemory.errors(),
	);
	const pending = createMemo(
		() => createMemory.action.isPending || updateMemory.action.isPending,
	);

	// ----------------------------------------
	// Functions
	const submit = () => {
		const body = { scope: scope(), content: content().trim() };
		const id = props.memory()?.id;
		if (id) updateMemory.action.mutate({ id, body });
		else createMemory.action.mutate(body);
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		const memory = untrack(props.memory);
		setContent(memory?.content ?? "");
		setScope(memory?.scope ?? untrack(() => props.scopes[0]) ?? "personal");
		createMemory.reset();
		updateMemory.reset();
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.state.open} onOpenChange={props.state.setOpen}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{T()(
							props.memory()
								? "modals.agent.memory.edit.title"
								: "modals.agent.memory.create.title",
						)}
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div class="flex flex-col gap-4">
						<Textarea
							id="agent-memory-content"
							name="content"
							label={T()("agent.memory.content")}
							value={content()}
							onChange={setContent}
							description={T()("agent.memory.content.count", {
								count: content().trim().length,
								max: props.contentChars,
							})}
							maxLength={props.contentChars}
							rows={3}
							required={true}
							errors={getBodyError("content", errors)}
						/>
						<Show when={props.scopes.length > 1}>
							<RadioCards
								id="agent-memory-scope"
								name="scope"
								label={T()("agent.memory.scope")}
								value={scope()}
								onChange={setScope}
								columns={2}
								options={props.scopes.map((value) => ({
									value,
									label: T()(`agent.memory.scope.${value}`),
									description: T()(`agent.memory.scope.${value}.description`),
								}))}
								errors={getBodyError("scope", errors)}
							/>
						</Show>
					</div>
				</Modal.Body>
				<Modal.Footer>
					<ErrorMessage theme="basic" message={errors()?.message} />
					<Modal.Actions>
						<Button
							variant="outline"
							onClick={() => props.state.setOpen(false)}
						>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							loading={pending()}
							disabled={!content().trim()}
						>
							{T()("common.save")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default UpsertAgentMemoryModal;
