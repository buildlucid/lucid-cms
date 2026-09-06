import { LucidError } from "@lucidcms/core";
import { PLUGIN_KEY } from "../constants.js";
import type { RedirectTarget } from "../types.js";
export type TargetCollection = {
	key: string;
	targets?: RedirectTarget[];
};
const cloneTargetLabel = (name: RedirectTarget["label"]) => {
	if (typeof name === "string") return name;
	return {
		...name,
		...(name.values ? { values: { ...name.values } } : {}),
	};
};
const cloneTarget = (target: RedirectTarget): RedirectTarget => ({
	key: target.key,
	label: cloneTargetLabel(target.label),
	...(target.requires ? { requires: [...target.requires] } : {}),
});
const cloneConfiguredTarget = (target: RedirectTarget): RedirectTarget => ({
	...cloneTarget(target),
	...(target.collectionVersions
		? { collectionVersions: { ...target.collectionVersions } }
		: {}),
});
const getTargetSignature = (targets: RedirectTarget[] = []) =>
	JSON.stringify(
		targets
			.map((target) => ({
				key: target.key,
				requires: [...(target.requires ?? [])].sort(),
			}))
			.sort((a, b) => a.key.localeCompare(b.key)),
	);
const resolveTargets = (
	configured: RedirectTarget[] | undefined,
	collections: TargetCollection[],
): RedirectTarget[] => {
	if (configured !== undefined) {
		return configured.map(cloneConfiguredTarget);
	}
	const reference = collections[0];
	if (!reference) return [];
	const signature = getTargetSignature(reference.targets);
	const mismatched = collections.filter(
		(collection) => getTargetSignature(collection.targets) !== signature,
	);
	if (mismatched.length > 0) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Cannot infer redirect targets because '${reference.key}' and ${mismatched.map((collection) => `'${collection.key}'`).join(", ")} use different publishing setups. Configure 'targets' explicitly for the redirects plugin.`,
		});
	}
	// Target-specific version maps do not apply to the redirects collection.
	return (reference.targets ?? []).map(cloneTarget);
};
export default resolveTargets;
