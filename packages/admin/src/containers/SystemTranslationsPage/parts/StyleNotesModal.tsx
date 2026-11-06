import type { Locale } from "@types";
import { type Component, createEffect, createSignal, untrack } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Modal from "@/components/Modal/Modal";
import Textarea from "@/components/Textarea/Textarea";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import { getLocaleName } from "@/utils/locale-name";

/** Edits the notes on tone and style that translations into a language follow. */
const StyleNotesModal: Component<{
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	locale?: Locale;
	/** The language's current notes. */
	instructions: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [instructions, setInstructions] = createSignal("");

	// ----------------------------------------
	// Mutations
	const update = api.translations.useUpdateStyle({
		onSuccess: () => props.onOpenChange(false),
	});

	// ----------------------------------------
	// Functions
	const localeName = () =>
		props.locale ? getLocaleName(props.locale.code) : "";

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		setInstructions(untrack(() => props.instructions));
		update.reset();
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.open} onOpenChange={props.onOpenChange}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					const locale = props.locale;
					if (!locale) return;
					update.action.mutate({
						locale: locale.code,
						body: { instructions: instructions().trim() },
					});
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{T()("translations.styles.modal.title", { locale: localeName() })}
					</Modal.Title>
					<Modal.Description>
						{T()("translations.styles.modal.description", {
							locale: localeName(),
						})}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body>
					<Textarea
						id="translation-style"
						name="instructions"
						value={instructions()}
						onChange={setInstructions}
						label={T()("translations.styles.title")}
						placeholder={T()("translations.styles.placeholder")}
						errors={getBodyError("instructions", update.errors)}
					/>
				</Modal.Body>
				<Modal.Footer>
					<ErrorMessage theme="basic" message={update.errors()?.message} />
					<Modal.Actions>
						<Button variant="outline" onClick={() => props.onOpenChange(false)}>
							{T()("common.cancel")}
						</Button>
						<Button type="submit" loading={update.action.isPending}>
							{T()("common.save")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default StyleNotesModal;
