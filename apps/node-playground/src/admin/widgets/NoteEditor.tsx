import { Input, Textarea } from "@lucidcms/admin/components";
import { useTranslation } from "@lucidcms/admin/hooks";
import type { AgentWidgetProps } from "@lucidcms/admin/types";
import {
	createEffect,
	createMemo,
	createSignal,
	createUniqueId,
} from "solid-js";
import type { NoteData } from "../../tools/review-note.js";

/** Lets the user edit the note `playground_review_note` prepared. Lucid owns the submit and cancel actions. */
const NoteEditor = (props: AgentWidgetProps<undefined, NoteData, NoteData>) => {
	// ----------------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const id = createUniqueId();
	const [title, setTitle] = createSignal(props.data.title);
	const [body, setBody] = createSignal(props.data.body);

	// ----------------------------------------
	// Memos
	const active = createMemo(() =>
		props.interaction?.status === "active" ? props.interaction : undefined,
	);
	const disabled = createMemo(() => !active() || active()?.submitting);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const values = { title: title().trim(), body: body().trim() };
		const valid =
			values.title.length > 0 &&
			values.title.length <= 100 &&
			values.body.length > 0 &&
			values.body.length <= 1000;
		active()?.setResponse(valid ? values : undefined);
	});

	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col gap-3">
			<Input
				id={`${id}-title`}
				name="title"
				type="text"
				label={t("playground.note.title")}
				value={title()}
				onChange={setTitle}
				required
				maxLength={100}
				disabled={disabled()}
			/>
			<Textarea
				id={`${id}-body`}
				name="body"
				label={t("playground.note.body")}
				value={body()}
				onChange={setBody}
				required
				maxLength={1000}
				rows={4}
				disabled={disabled()}
			/>
		</div>
	);
};

export default NoteEditor;
