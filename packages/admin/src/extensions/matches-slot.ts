import type { FieldSlotMatch } from "../components/FieldSlots/types.js";

/** Exact matching keeps unrelated components out of the render and import paths. */
export const matchesSlot = (match: FieldSlotMatch, target: FieldSlotMatch) =>
	(match.collection === undefined || match.collection === target.collection) &&
	(match.brick === undefined || match.brick === target.brick) &&
	(match.kind === undefined || match.kind === target.kind) &&
	(match.field === undefined || match.field === target.field);
