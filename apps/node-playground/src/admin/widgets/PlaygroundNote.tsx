import type { AgentWidgetProps } from "@lucidcms/admin/types";
import type { NoteData } from "../../tools/review-note.js";
import NoteCard from "./NoteCard.js";

const PlaygroundNote = (props: AgentWidgetProps<undefined, NoteData>) => {
	// ----------------------------------------
	// Render
	return <NoteCard note={props.data} />;
};

export default PlaygroundNote;
