import type { Config } from "../../../types.js";
import type CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import type { CFConfig } from "../../collection/custom-fields/types.js";
import { translate } from "../../i18n/index.js";

const checkCollectionKeys = (props: {
	field: CFConfig<"rich-text">;
	feature: string;
	collectionKeys: string[];
	config: Config;
}) => {
	const knownCollectionKeys = new Set(
		props.config.collections.map((collection) => collection.key),
	);

	for (const collectionKey of props.collectionKeys) {
		if (knownCollectionKeys.has(collectionKey)) continue;
		throw new Error(
			translate("server:core.fields.rich.text.collection.not.found", {
				data: {
					field: props.field.key,
					feature: props.feature,
					collection: collectionKey,
				},
			}),
		);
	}
};

const checkInternalLinks = (field: CFConfig<"rich-text">, config: Config) => {
	if (
		field.editor?.links?.internal === true &&
		config.collections.every((collection) => !collection.getData.routing)
	) {
		throw new Error(
			translate("server:core.fields.rich.text.routes.empty", {
				data: { field: field.key },
			}),
		);
	}

	const internalCollections = Array.isArray(field.editor?.links?.internal)
		? field.editor.links.internal
		: [];

	checkCollectionKeys({
		field,
		feature: translate("server:core.fields.rich.text.feature.internal.links"),
		collectionKeys: internalCollections,
		config,
	});
	for (const collectionKey of internalCollections) {
		if (
			config.collections.some(
				(collection) =>
					collection.key === collectionKey && collection.getData.routing,
			)
		) {
			continue;
		}
		throw new Error(
			translate("server:core.fields.rich.text.collection.route.not.found", {
				data: { field: field.key, collection: collectionKey },
			}),
		);
	}
};

const checkVariables = (field: CFConfig<"rich-text">, config: Config) => {
	checkCollectionKeys({
		field,
		feature: translate("server:core.fields.rich.text.feature.variables"),
		collectionKeys: Array.isArray(field.editor?.variables)
			? field.editor.variables
			: [],
		config,
	});
};

const checkEmbeddedBricks = (
	field: CFConfig<"rich-text">,
	collection: CollectionBuilder,
) => {
	const embeddedBricks = collection.config.bricks?.embedded ?? [];
	if (Array.isArray(field.editor?.bricks)) {
		const embeddedBrickKeys = new Set(embeddedBricks.map((brick) => brick.key));
		for (const brickKey of field.editor.bricks) {
			if (embeddedBrickKeys.has(brickKey)) continue;
			throw new Error(
				translate("server:core.fields.rich.text.brick.not.found", {
					data: {
						field: field.key,
						brick: brickKey,
						collection: collection.key,
					},
				}),
			);
		}
	}

	if (field.editor?.bricks === true && embeddedBricks.length === 0) {
		throw new Error(
			translate("server:core.fields.rich.text.bricks.empty", {
				data: {
					field: field.key,
					collection: collection.key,
				},
			}),
		);
	}
};

/** Validates rich-text editor integrations against the processed config. */
const checkRichTextField = (
	field: CFConfig<"rich-text">,
	config: Config,
	collection: CollectionBuilder,
) => {
	checkInternalLinks(field, config);
	checkVariables(field, config);
	checkEmbeddedBricks(field, collection);
};

export default checkRichTextField;
