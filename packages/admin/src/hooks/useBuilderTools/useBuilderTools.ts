import type {
	AgentBuilderContent,
	AgentScreen,
	AgentScreenCall,
	AgentScreenResponse,
	Collection,
	DocumentVersionCheckField,
	InternalDocumentBrick,
	InternalDocumentField,
} from "@types";
import { type Accessor, createMemo, onCleanup, onMount } from "solid-js";
import { unwrap } from "solid-js/store";
import {
	type AgentBuilderFocus,
	useAgentSession,
} from "@/hooks/useAgentSession/useAgentSession";
import brickStore from "@/store/brickStore/brickStore";
import {
	createBricksSnapshot,
	createContentComparisonSnapshot,
} from "@/store/brickStore/utils/snapshots";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import {
	applyBuilderChanges,
	type BuilderContentKeys,
	builderContentKeys,
	updateConflicts,
} from "@/utils/agent-builder-changes";
import { screenLabel } from "@/utils/agent-screen";
import brickHelpers from "@/utils/brick-helpers";
import {
	type BuilderFieldPath,
	revealBuilderField,
} from "@/utils/builder-reveal";
import { tabId } from "@/utils/tab-id";

/** Restores editor state omitted by the save shape, preserving unchanged fields and their resources from the store so they do not count as edits. */
const toInternalField = (
	field: DocumentVersionCheckField & Pick<InternalDocumentField, "resource">,
	groupRef?: string,
): InternalDocumentField => ({
	key: field.key,
	type: field.type,
	...(field.resource !== undefined && { resource: field.resource }),
	...(groupRef !== undefined && { groupRef }),
	...(field.translations !== undefined && {
		translations: field.translations,
	}),
	...(field.value !== undefined && { value: field.value }),
	...(field.groups !== undefined && {
		groups: field.groups.map((group, index) => ({
			ref: group.ref,
			order: group.order ?? index,
			open: group.open ?? false,
			fields: group.fields.map((child) => toInternalField(child, group.ref)),
		})),
	}),
});

const toInternalContent = (content: AgentBuilderContent) => ({
	fields: content.fields.map((field) => toInternalField(field)),
	bricks: content.bricks.map(
		(brick): InternalDocumentBrick => ({
			id: brick.id ?? -1,
			ref: brick.ref,
			key: brick.key,
			order: brick.order,
			type: brick.type,
			open: brick.open ?? false,
			fields: (brick.fields ?? []).map((field) => toInternalField(field)),
		}),
	),
});

/** The builder's content in the shape the admin saves. */
const currentContent = (): AgentBuilderContent =>
	structuredClone(
		unwrap({
			fields: brickHelpers.getCollectionPseudoBrickFields(),
			bricks: brickHelpers.getUpsertBricks(),
		}),
	);

const contentKeys = () =>
	builderContentKeys(
		createContentComparisonSnapshot(
			createBricksSnapshot(brickStore.get.bricks),
		),
	);

/** Resolves field keys and repeater refs to builder positions, stopping at the repeater if an item is missing. */
const previewPath = (fields: InternalDocumentField[], path: string[]) => {
	const resolved: BuilderFieldPath = [];
	let scope = fields;
	for (let index = 0; index < path.length; index += 2) {
		const key = path[index];
		if (key === undefined) break;
		resolved.push(key);

		const ref = path[index + 1];
		if (ref === undefined || path[index + 2] === undefined) break;
		const groups = scope.find((field) => field.key === key)?.groups ?? [];
		const position = groups.findIndex((group) => group.ref === ref);
		const group = groups[position];
		if (!group) break;
		resolved.push(position);
		scope = group.fields;
	}
	return resolved;
};

/** Registers the open builder for agent reads, unsaved edits and field or brick navigation from tools and chat links. */
export const useBuilderTools = (props: {
	enabled: Accessor<boolean>;
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	/** The version the builder's content belongs to, undefined before the document is saved. */
	versionId: Accessor<number | undefined>;
	/** The request whose proposal is open, or null for latest. */
	requestId: Accessor<number | null>;
	label: Accessor<string>;
	locales: Accessor<string[]>;
	/** Whether the person can edit the document here right now. */
	editable: Accessor<boolean>;
}) => {
	// ----------------------------------------
	// State & Hooks
	const session = useAgentSession();
	//* the content each read handed out, so an update built from it applies only where the builder still matches it
	let lastRead: { revision: number; keys: BuilderContentKeys } | undefined;

	// ----------------------------------------
	// Memos
	const screen = createMemo<AgentScreen | undefined>(() =>
		props.enabled()
			? {
					type: "document",
					tabId,
					label: screenLabel(props.label()),
					collectionKey: props.collectionKey(),
					documentId: props.documentId() ?? null,
					requestId: props.requestId(),
				}
			: undefined,
	);

	// ----------------------------------------
	// Functions
	const read = (): AgentScreenResponse => {
		lastRead = {
			revision: (lastRead?.revision ?? 0) + 1,
			keys: contentKeys(),
		};
		return {
			status: "done",
			document: {
				revision: lastRead.revision,
				versionId: props.versionId() ?? null,
				content: currentContent(),
				contentLocale: contentLocaleStore.get.contentLocale ?? null,
				unsaved: brickStore.getDocumentMutated(),
				editable: props.editable(),
			},
		};
	};
	const update = (
		call: Extract<AgentScreenCall, { action: "update" }>,
		runId: string,
	): AgentScreenResponse => {
		if (!props.editable()) return { status: "unavailable", reason: "locked" };

		//* the person can keep editing while the agent works, but not what the update changes, or load another version
		if (
			lastRead?.revision !== call.revision ||
			(props.versionId() ?? null) !== call.versionId ||
			updateConflicts(lastRead.keys, contentKeys(), call.content)
		) {
			return { status: "unavailable", reason: "changed" };
		}

		brickStore.get.applyContent({
			content: toInternalContent(
				applyBuilderChanges(currentContent(), call.content),
			),
			refs: call.refs,
			collection: props.collection(),
			runId,
		});
		lastRead = undefined;
		return { status: "done" };
	};
	const focus = async (target: AgentBuilderFocus) => {
		const collection = props.collection();
		if (!collection) return false;

		if (
			target.contentLocale &&
			props.locales().includes(target.contentLocale)
		) {
			contentLocaleStore.get.setContentLocale(target.contentLocale);
		}

		const bricks = brickStore.get.bricks;
		const brickIndex = bricks.findIndex((brick) =>
			target.brick === undefined
				? brick.type === "collection-fields"
				: brick.type === "fixed"
					? brick.key === target.brick
					: brick.type === "builder" && brick.ref === target.brick,
		);
		const brick = bricks[brickIndex];
		if (!brick) return false;

		return revealBuilderField({
			collection,
			collectionKey: props.collectionKey(),
			documentId: props.documentId(),
			bricks,
			brickIndex,
			path: previewPath(brick.fields, target.path),
		});
	};

	// ----------------------------------------
	// Effects
	onMount(() => {
		const unregister = session.screen.register({
			screen,
			answer: async (call, runId) => {
				switch (call.action) {
					case "read":
						return read();
					case "update":
						return update(call, runId);
					case "focus": {
						const shown = await focus({
							brick: call.target.brick,
							path: call.target.field ? [call.target.field] : [],
							contentLocale: call.target.contentLocale,
						});
						return shown
							? { status: "done" }
							: { status: "unavailable", reason: "missing" };
					}
				}
			},
			focus,
		});
		onCleanup(unregister);
	});
};
