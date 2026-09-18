import { brickSlotPolicies } from "../components/BrickSlots/constants.js";
import { documentSlotPolicies } from "../components/DocumentSlotCell/constants.js";
import { fieldSlotPolicies } from "../components/FieldSlots/constants.js";

/** Component-owned policies shared by config diagnostics and slot selection. */
export const slotDefinitions = {
	...brickSlotPolicies,
	...documentSlotPolicies,
	...fieldSlotPolicies,
} as const;

type Match = {
	collection?: string;
	brick?: string;
	kind?: string;
	field?: string;
};
type Entry = {
	key: string;
	slot: keyof typeof slotDefinitions;
	priority?: number;
	match?: Match;
};
const matchKeys = ["collection", "brick", "kind", "field"] as const;

/** Higher priorities render first; registration order breaks ties for single winners. */
export const resolveSlots = <T extends Entry>(
	entries: readonly T[],
	target: Match,
): T[] => {
	const ordered = entries
		.filter((entry) =>
			matchKeys.every(
				(key) =>
					entry.match?.[key] === undefined || entry.match[key] === target[key],
			),
		)
		.toSorted((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

	const winners = new Map<string, T>();

	for (const entry of ordered) {
		const policy = slotDefinitions[entry.slot];
		if (policy.multiple) continue;
		const previous = winners.get(policy.group);
		if (!previous || (previous.priority ?? 0) === (entry.priority ?? 0)) {
			winners.set(policy.group, entry);
		}
	}

	return ordered.filter(
		(entry) =>
			slotDefinitions[entry.slot].multiple ||
			winners.get(slotDefinitions[entry.slot].group) === entry,
	);
};

/** Equal-priority overlaps are ambiguous; explicit priorities express intentional overrides. */
export const findSlotConflicts = (entries: readonly Entry[]) =>
	entries.flatMap((entry, index) => {
		const policy = slotDefinitions[entry.slot];
		if (policy.multiple) return [];

		return entries
			.slice(0, index)
			.filter(
				(previous) =>
					slotDefinitions[previous.slot].group === policy.group &&
					(previous.priority ?? 0) === (entry.priority ?? 0) &&
					matchKeys.every(
						(key) =>
							previous.match?.[key] === undefined ||
							entry.match?.[key] === undefined ||
							previous.match[key] === entry.match[key],
					),
			)
			.map((previous) => ({
				previous: previous.key,
				winner: entry.key,
				group: policy.group,
			}));
	});
