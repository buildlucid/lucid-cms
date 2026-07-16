import type { PreviewFieldTarget } from "@lucidcms/preview-protocol";
import type { Collection } from "@types";
import { type Accessor, onCleanup } from "solid-js";
import brickStore, { type BrickData } from "@/store/brickStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import type {
	CollectionDataFieldConfig,
	CollectionFieldConfig,
} from "@/types/collection-config";
import {
	getPreviewFieldId,
	getPreviewStructureId,
	revealPreviewField,
} from "@/utils/preview-focus-dom";
import spawnToast from "@/utils/spawn-toast";

type PreviewFocusStructuralTarget = {
	type: "tab" | "collapsible";
	key: string;
	pathPrefix: Array<string | number>;
};

type ResolvedPreviewField = {
	structureIds: string[];
	fieldId: string;
};

type ConfigMatch = {
	config: CollectionDataFieldConfig;
	structures: PreviewFocusStructuralTarget[];
};

/** Finds a data field and records transparent UI structures around it. */
const findDataFieldConfig = (props: {
	configs: CollectionFieldConfig[];
	key: string;
	pathPrefix: Array<string | number>;
	structures: PreviewFocusStructuralTarget[];
}): ConfigMatch | null => {
	for (const config of props.configs) {
		if (
			config.type === "tab" ||
			config.type === "section" ||
			config.type === "collapsible"
		) {
			const nextStructures = [...props.structures];
			if (config.type === "tab" || config.type === "collapsible") {
				nextStructures.push({
					type: config.type,
					key: config.key,
					pathPrefix: props.pathPrefix,
				});
			}
			const nested = findDataFieldConfig({
				...props,
				configs: config.fields,
				structures: nextStructures,
			});
			if (nested) return nested;
			continue;
		}

		if (config.key === props.key) {
			return {
				config,
				structures: props.structures,
			};
		}
	}

	return null;
};

/** Resolves a public preview path into builder DOM targets. */
export const resolvePreviewFieldTarget = (props: {
	target: PreviewFieldTarget;
	collection: Collection;
	bricks: Array<Pick<BrickData, "key" | "order" | "type">>;
}): ResolvedPreviewField | null => {
	const targetBrick = props.target.brick;
	const brickIndex = targetBrick
		? props.bricks.findIndex(
				(brick) =>
					brick.type === targetBrick.type &&
					brick.key === targetBrick.key &&
					brick.order === targetBrick.order,
			)
		: props.bricks.findIndex((brick) => brick.type === "collection-fields");
	const brick = props.bricks[brickIndex];
	if (!brick) return null;

	const brickConfig =
		brick.type === "fixed"
			? props.collection.fixedBricks.find((config) => config.key === brick.key)
			: brick.type === "builder"
				? props.collection.builderBricks.find(
						(config) => config.key === brick.key,
					)
				: null;
	let configs: CollectionFieldConfig[] =
		brick.type === "collection-fields"
			? props.collection.fields
			: (brickConfig?.fields ?? []);
	let pathOffset = 0;
	let pathPrefix: Array<string | number> = [];
	const structureIds =
		targetBrick?.type === "builder"
			? [getPreviewStructureId({ brickIndex, type: "brick" })]
			: [];

	while (pathOffset < props.target.path.length) {
		const key = props.target.path[pathOffset];
		if (typeof key !== "string") return null;

		const match = findDataFieldConfig({
			configs,
			key,
			pathPrefix,
			structures: [],
		});
		if (!match) return null;
		structureIds.push(
			...match.structures.map((structure) =>
				getPreviewStructureId({ brickIndex, ...structure }),
			),
		);

		if (pathOffset === props.target.path.length - 1) {
			return {
				structureIds,
				fieldId: getPreviewFieldId({
					brickIndex,
					path: props.target.path,
				}),
			};
		}

		const groupIndex = props.target.path[pathOffset + 1];
		if (match.config.type !== "repeater" || typeof groupIndex !== "number") {
			return null;
		}

		const groupPath = [...pathPrefix, key, groupIndex];
		structureIds.push(
			getPreviewStructureId({
				brickIndex,
				type: "group",
				path: groupPath,
			}),
		);
		configs = match.config.fields;
		pathPrefix = groupPath;
		pathOffset += 2;
	}

	return null;
};

/** Coordinates preview target validation, reveal state, and DOM highlighting. */
export const usePreviewFocus = (props: {
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	hasUnsavedContent: Accessor<boolean>;
	hasUnsavedBuilderStructure: Accessor<boolean>;
}) => {
	let revealController: AbortController | undefined;
	let clearHighlight: (() => void) | undefined;

	const cancelReveal = () => {
		revealController?.abort();
		revealController = undefined;
		clearHighlight?.();
		clearHighlight = undefined;
	};
	const notify = (message: string) => {
		spawnToast({
			title: T()("preview.focus.unavailable.title"),
			message,
			status: "warning",
		});
	};
	const requestTarget = async (target: PreviewFieldTarget) => {
		const documentId = props.documentId();
		if (
			target.collectionKey !== props.collectionKey() ||
			documentId === undefined ||
			target.documentId !== documentId
		) {
			notify(T()("preview.focus.different.document"));
			return;
		}

		if (
			props.hasUnsavedContent() &&
			target.path.some((segment) => typeof segment === "number")
		) {
			notify(T()("preview.focus.dirty.repeater"));
			return;
		}
		if (
			props.hasUnsavedBuilderStructure() &&
			target.brick?.type === "builder"
		) {
			notify(T()("preview.focus.dirty.brick"));
			return;
		}

		const collection = props.collection();
		if (!collection) {
			notify(T()("preview.focus.missing"));
			return;
		}
		const resolution = resolvePreviewFieldTarget({
			target,
			collection,
			bricks: brickStore.get.bricks,
		});
		if (!resolution) {
			notify(T()("preview.focus.missing"));
			return;
		}

		cancelReveal();
		if (
			target.locale &&
			contentLocaleStore.get.locales.some(
				(locale) => locale.code === target.locale,
			)
		) {
			contentLocaleStore.get.setContentLocale(target.locale);
		}
		const controller = new AbortController();
		revealController = controller;
		const cleanup = await revealPreviewField({
			fieldId: resolution.fieldId,
			structureIds: resolution.structureIds,
			signal: controller.signal,
		});
		if (controller.signal.aborted || revealController !== controller) {
			cleanup?.();
			return;
		}
		if (!cleanup) {
			revealController = undefined;
			notify(T()("preview.focus.missing"));
			return;
		}
		clearHighlight = cleanup;
	};

	onCleanup(cancelReveal);
	return { requestTarget };
};
