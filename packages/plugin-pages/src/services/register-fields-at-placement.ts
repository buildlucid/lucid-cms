import {
	type CollectionBuilder,
	copy,
	LucidError,
	translate,
} from "@lucidcms/core";
import { PLUGIN_KEY } from "../constants.js";
import type { PagesFieldPlacement } from "../types/types.js";

type ResolvedPlacement = {
	index: number;
	tabParent: string | null;
};

const resolvePlacement = (
	collection: CollectionBuilder,
	placement: PagesFieldPlacement,
): ResolvedPlacement => {
	const fields = Array.from(collection.fields.values());

	if (placement.at !== undefined) {
		if (placement.tab === undefined) {
			return {
				index: placement.at === "start" ? 0 : fields.length,
				tabParent: null,
			};
		}

		const tabIndex = fields.findIndex(
			(field) => field.key === placement.tab && field.type === "tab",
		);
		if (tabIndex === -1) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: translate(
					copy("server:plugin.pages.config.placement.tab.invalid", {
						defaultMessage:
							"Pages field placement tab '{{tab}}' does not exist on collection '{{collection}}'.",
						data: {
							collection: collection.key,
							tab: placement.tab,
						},
					}),
				),
			});
		}

		if (placement.at === "start") {
			return {
				index: tabIndex + 1,
				tabParent: placement.tab,
			};
		}

		let index = tabIndex + 1;
		for (const [fieldIndex, field] of fields.entries()) {
			if (field.tabParent === placement.tab) index = fieldIndex + 1;
		}

		return {
			index,
			tabParent: placement.tab,
		};
	}

	const anchorKey = placement.before ?? placement.after;
	const anchorIndex = fields.findIndex((field) => field.key === anchorKey);
	const anchor = fields[anchorIndex];
	if (!anchor) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: translate(
				copy("server:plugin.pages.config.placement.anchor.not.found", {
					defaultMessage:
						"Pages field placement anchor '{{field}}' does not exist on collection '{{collection}}'.",
					data: {
						collection: collection.key,
						field: anchorKey,
					},
				}),
			),
		});
	}

	if (anchor.treeParent !== null || anchor.structuralParent !== null) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: translate(
				copy("server:plugin.pages.config.placement.anchor.nested", {
					defaultMessage:
						"Pages field placement anchor '{{field}}' on collection '{{collection}}' must be top-level or a direct child of a tab.",
					data: {
						collection: collection.key,
						field: anchorKey,
					},
				}),
			),
		});
	}

	return {
		index: anchorIndex + (placement.after === undefined ? 0 : 1),
		tabParent: anchor.type === "tab" ? null : anchor.tabParent,
	};
};

const registerFieldsAtPlacement = (data: {
	collection: CollectionBuilder;
	fieldKeys: readonly string[];
	placement: PagesFieldPlacement;
	register: () => void;
}) => {
	const placement = resolvePlacement(data.collection, data.placement);

	data.register();

	data.collection.moveFields(data.fieldKeys, {
		index: placement.index,
		tab: placement.tabParent,
	});
};

export default registerFieldsAtPlacement;
