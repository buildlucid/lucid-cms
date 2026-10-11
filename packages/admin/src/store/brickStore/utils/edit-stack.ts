import type { InternalDocumentField } from "@types";
import safeDeepEqual from "@/utils/safe-deep-equal";

//* typing that pauses for longer than this starts a new step, as in Gutenberg
const MERGE_WINDOW_MS = 1_000;
//* enough for a long session, with the oldest steps dropped once reached
const LIMIT = 100;

/** Who made an edit, so the chat can offer to undo an agent reply's changes as a whole. */
export type EditSource = { type: "user" } | { type: "agent"; runId: string };

/** Where a field value lives, which stays valid because structural edits around it are undone in order. */
export type FieldEditTarget = {
	brickRef: string;
	key: string;
	groupRef?: string;
	repeaterKey?: string;
	/** The content locale a localized field was edited in. Left out for shared values. */
	locale?: string;
};

export type BrickLayoutItem = {
	ref: string;
	key: string;
	type: "builder" | "fixed" | "embedded" | "collection-fields";
	order: number;
};

/** The bricks as they were on one side of an edit, carrying the fields of only those it changed. */
export type BricksEditState = {
	/** Every brick's identity and position, in store order. */
	layout: BrickLayoutItem[];
	/** The fields of the bricks the edit changed or removed, by ref. Bricks left out kept their fields. */
	fields: Record<string, InternalDocumentField[]>;
};

export type EditEntry =
	| {
			kind: "field";
			target: FieldEditTarget;
			before: InternalDocumentField["value"];
			after: InternalDocumentField["value"];
			source: EditSource;
			at: number;
	  }
	| {
			kind: "bricks";
			before: BricksEditState;
			after: BricksEditState;
			source: EditSource;
			at: number;
	  };

/** Creates document undo and redo history that merges continued typing in one field and drops redo steps on new edits, leaving notifications to the store. */
export const createEditStack = () => {
	let done: EditEntry[] = [];
	let undone: EditEntry[] = [];

	/** Adds an edit, merging continued typing in one field and dropping redo history. */
	const push = (entry: EditEntry) => {
		const last = done.at(-1);
		if (
			entry.kind === "field" &&
			last?.kind === "field" &&
			entry.at - last.at <= MERGE_WINDOW_MS &&
			safeDeepEqual(last.target, entry.target)
		) {
			last.after = entry.after;
			last.at = entry.at;
			undone = [];
			//* typing that ends where it started never happened
			if (safeDeepEqual(last.before, last.after)) done.pop();
			return;
		}

		done.push(entry);
		undone = [];
		if (done.length > LIMIT) done = done.slice(done.length - LIMIT);
	};

	return {
		push,
		/** Moves the latest step to the redo side and returns it for the store to apply. */
		undo: () => {
			const entry = done.pop();
			if (entry) undone.push(entry);
			return entry;
		},
		/** Moves the latest undone step back and returns it for the store to apply. */
		redo: () => {
			const entry = undone.pop();
			if (entry) done.push(entry);
			return entry;
		},
		peekUndo: () => done.at(-1),
		peekRedo: () => undone.at(-1),
		clear: () => {
			done = [];
			undone = [];
		},
	};
};

export type EditStack = ReturnType<typeof createEditStack>;
