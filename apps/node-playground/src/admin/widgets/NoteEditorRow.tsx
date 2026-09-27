import { AgentTranscriptRow } from "@lucidcms/admin/components";
import type { AgentTranscriptRowSlotProps } from "@lucidcms/admin/types";
import { createMemo } from "solid-js";
import type { NoteData } from "../../tools/review-note.js";
import NoteCard from "./NoteCard.js";

const NoteEditorRow = (
	props: AgentTranscriptRowSlotProps<undefined, NoteData>,
) => {
	// ----------------------------------------
	// Memos
	//* the submitted note, or the draft the agent prepared until then
	const note = createMemo(() => {
		const interaction = props.interaction;
		if (interaction?.status !== "answered") return props.data;
		const response = interaction.response;
		return typeof response.title === "string" &&
			typeof response.body === "string"
			? { title: response.title, body: response.body }
			: props.data;
	});
	const label = createMemo(() =>
		[props.interaction?.title, props.status].filter(Boolean).join(" · "),
	);

	// ----------------------------------------
	// Render
	return (
		<AgentTranscriptRow
			icon={
				<svg
					aria-hidden="true"
					viewBox="0 0 16 16"
					width="10"
					height="10"
					fill="currentColor"
				>
					<path d="M2 1h12a1 1 0 0 1 1 1v8l-5 5H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Zm8 13 4-4h-3a1 1 0 0 0-1 1v3Z" />
				</svg>
			}
			label={label()}
			panelTitle={props.interaction?.title}
			renderPanel={() => <NoteCard note={note()} />}
		/>
	);
};

export default NoteEditorRow;
