import type { NoteData } from "../../tools/review-note.js";

const NoteCard = (props: { note: NoteData }) => {
	// ----------------------------------------
	// Render
	return (
		<div class="rounded-lg border border-border px-4 py-3">
			<p class="text-sm font-medium text-title">{props.note.title}</p>
			<p class="mt-1 whitespace-pre-wrap text-sm text-body">
				{props.note.body}
			</p>
		</div>
	);
};

export default NoteCard;
