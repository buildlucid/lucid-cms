import { type Component, createEffect, createSignal, untrack } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import T from "@/translations";

/** Requests a new document through a create release, which creates it once approved and released. */
const DocumentRequestModal: Component<{
	open: boolean;
	setOpen: (open: boolean) => void;
	collectionName: string;
	loading: boolean;
	error?: string;
	onConfirm: (title: string) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [title, setTitle] = createSignal("");

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		untrack(() => setTitle(""));
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.open} onOpenChange={props.setOpen}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					props.onConfirm(title().trim());
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{T()("documents.request.title", { name: props.collectionName })}
					</Modal.Title>
					<Modal.Description>
						{T()("documents.request.description")}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body>
					<Input
						id="document-request-title"
						name="title"
						type="text"
						value={title()}
						onChange={setTitle}
						required={true}
						label={T()("releases.title.label")}
					/>
				</Modal.Body>
				<Modal.Footer>
					<ErrorMessage theme="basic" message={props.error} />
					<Modal.Actions>
						<Button variant="outline" onClick={() => props.setOpen(false)}>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							loading={props.loading}
							disabled={!title().trim()}
						>
							{T()("documents.request.submit")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default DocumentRequestModal;
