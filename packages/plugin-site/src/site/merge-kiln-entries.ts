import { LucidError } from "@lucidcms/core";
import { builtins } from "@lucidkiln/core";
import { PLUGIN_KEY } from "../constants.js";

/** Kiln's own names, which extensions can't replace any more than the site plugin's. */
const kilnNames = {
	function: builtins.functions,
	filter: builtins.filters,
	test: builtins.tests,
	global: [],
	type: [],
} satisfies Record<string, readonly string[]>;

/** Singular, such as `function`, for errors. */
export type KilnEntryKind = keyof typeof kilnNames;

/** Merges built-ins and ordered extensions before site overrides, rejecting extensions that replace built-ins or earlier extension entries. */
const mergeKilnEntries = <Value>(props: {
	kind: KilnEntryKind;
	builtIns?: Record<string, Value>;
	extensions: Array<{ name: string; entries?: Record<string, Value> }>;
	own?: Record<string, Value>;
}): Record<string, Value> => {
	const merged: Record<string, Value> = { ...props.builtIns };
	const owners = new Map<string, string>([
		...kilnNames[props.kind].map((name) => [name, "Kiln"] as const),
		...Object.keys(merged).map((name) => [name, "the site plugin"] as const),
	]);

	for (const extension of props.extensions) {
		for (const [name, value] of Object.entries(extension.entries ?? {})) {
			const owner = owners.get(name);
			if (owner) {
				throw new LucidError({
					scope: PLUGIN_KEY,
					message: `The '${extension.name}' extension registers the '${name}' ${props.kind}, which ${owner} already does.`,
				});
			}
			owners.set(name, `the '${extension.name}' extension`);
			merged[name] = value;
		}
	}

	return { ...merged, ...props.own };
};

export default mergeKilnEntries;
