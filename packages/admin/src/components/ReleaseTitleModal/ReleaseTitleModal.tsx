import type { Release } from "@types";
import { type Component, createEffect, createSignal, untrack } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

const ReleaseTitleModal: Component<{
	open: boolean;
	setOpen: (_open: boolean) => void;
	release: Release;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [title, setTitle] = createSignal("");

	// ----------------------------------------
	// Mutations
	const update = api.releases.useUpdateSingle({
		onSuccess: () => props.setOpen(false),
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		setTitle(untrack(() => props.release.title));
		update.reset();
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.open} onOpenChange={props.setOpen}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					update.action.mutate({
						id: props.release.id,
						body: { title: title() },
					});
				}}
			>
				<Modal.Header>
					<Modal.Title>{T()("releases.rename.title")}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Input
						id="release-title"
						name="title"
						type="text"
						value={title()}
						onChange={setTitle}
						required={true}
						label={T()("common.title")}
						errors={getBodyError("title", update.errors)}
					/>
				</Modal.Body>
				<Modal.Footer>
					<ErrorMessage theme="basic" message={update.errors()?.message} />
					<Modal.Actions>
						<Button variant="outline" onClick={() => props.setOpen(false)}>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							loading={update.action.isPending}
							disabled={!title().trim()}
						>
							{T()("common.save")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default ReleaseTitleModal;
