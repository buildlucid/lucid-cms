import type { Config } from "../../../types.js";
import { translate } from "../../i18n/index.js";

const pathFieldTypes = new Set(["text", "textarea", "number"]);

const labelFieldTypes = new Set([
	"text",
	"textarea",
	"number",
	"range",
	"checkbox",
	"select",
	"datetime",
	"color",
]);

/** Validates registered content routes against their collection fields. */
const checkContentRoutes = (config: Config) => {
	const keys = new Set<string>();

	for (const route of config.contentRoutes) {
		if (keys.has(route.key)) {
			throw new Error(
				translate("server:core.config.content.routes.key.duplicate", {
					data: { route: route.key },
				}),
			);
		}
		keys.add(route.key);

		const collection = config.collections.find(
			(candidate) => candidate.key === route.collectionKey,
		);
		if (!collection) {
			throw new Error(
				translate("server:core.config.content.routes.collection.not.found", {
					data: {
						route: route.key,
						collection: route.collectionKey,
					},
				}),
			);
		}

		const pathField = collection.fields.get(route.path.field);
		if (
			!pathField ||
			pathField.treeParent !== null ||
			!pathFieldTypes.has(pathField.type)
		) {
			throw new Error(
				translate("server:core.config.content.routes.path.field.invalid", {
					data: {
						route: route.key,
						field: route.path.field,
						collection: route.collectionKey,
					},
				}),
			);
		}

		for (const fieldKey of route.label?.fields ?? []) {
			const field = collection.fields.get(fieldKey);
			if (
				!field ||
				field.treeParent !== null ||
				!labelFieldTypes.has(field.type)
			) {
				throw new Error(
					translate("server:core.config.content.routes.label.field.invalid", {
						data: {
							route: route.key,
							field: fieldKey,
							collection: route.collectionKey,
						},
					}),
				);
			}
		}
	}
};

export default checkContentRoutes;
