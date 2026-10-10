import type {
	AgentBuilderContent,
	AgentBuilderTarget,
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
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import { resolvePreviewFieldTarget } from "@/hooks/usePreviewFocus/utils/resolve-preview-field-target";
import brickStore from "@/store/brickStore/brickStore";
import {
	createBricksSnapshot,
	createContentComparisonSnapshot,
} from "@/store/brickStore/utils/snapshots";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import { screenLabel } from "@/utils/agent-screen";
import brickHelpers from "@/utils/brick-helpers";
import {
	getPreviewStructureId,
	revealPreviewField,
} from "@/utils/preview-focus-dom";
import { tabId } from "@/utils/tab-id";

//* lazy builder content can take a moment to render once its brick opens
const focusWaitMs = 3_000;

/** Fills in the editor state the save shape leaves out, so content from the server can go back into the store. */
const toInternalField = (
	field: DocumentVersionCheckField,
	groupRef?: string,
): InternalDocumentField => ({
	key: field.key,
	type: field.type,
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

/** The content as the person sees it, without whether bricks and groups are open, to tell whether it changed. */
const contentKey = () =>
	JSON.stringify(
		createContentComparisonSnapshot(
			createBricksSnapshot(brickStore.get.bricks),
		),
	);

/** Registers the open builder for agent tools that read unsaved content, apply unsaved edits and reveal fields or bricks. */
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
	//* the content each read handed out, so an update built from it applies only to the same content
	let lastRead: { revision: number; key: string } | undefined;

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
		lastRead = { revision: (lastRead?.revision ?? 0) + 1, key: contentKey() };
		return {
			status: "done",
			document: {
				revision: lastRead.revision,
				versionId: props.versionId() ?? null,
				content: structuredClone(
					unwrap({
						fields: brickHelpers.getCollectionPseudoBrickFields(),
						bricks: brickHelpers.getUpsertBricks(),
					}),
				),
				contentLocale: contentLocaleStore.get.contentLocale ?? null,
				unsaved: brickStore.getDocumentMutated(),
				editable: props.editable(),
			},
		};
	};
	const update = (
		call: Extract<AgentScreenCall, { action: "update" }>,
	): AgentScreenResponse => {
		if (!props.editable()) return { status: "unavailable", reason: "locked" };
		//* the person edited, or the editor loaded another version, since the read the update was built from
		if (
			lastRead?.revision !== call.revision ||
			lastRead.key !== contentKey() ||
			(props.versionId() ?? null) !== call.versionId
		) {
			return { status: "unavailable", reason: "changed" };
		}

		brickStore.get.applyContent({
			content: toInternalContent(call.content),
			refs: call.refs,
			collection: props.collection(),
		});
		lastRead = undefined;
		return { status: "done" };
	};
	const focus = async (
		target: AgentBuilderTarget,
	): Promise<AgentScreenResponse> => {
		const collection = props.collection();
		const missing = { status: "unavailable", reason: "missing" } as const;
		if (!collection) return missing;

		if (
			target.contentLocale &&
			props.locales().includes(target.contentLocale)
		) {
			contentLocaleStore.get.setContentLocale(target.contentLocale);
		}

		const bricks = brickStore.get.bricks;
		const brickIndex =
			target.brick === undefined
				? -1
				: bricks.findIndex((brick) =>
						brick.type === "fixed"
							? brick.key === target.brick
							: brick.type === "builder" && brick.ref === target.brick,
					);
		const brick = bricks[brickIndex];
		if (target.brick !== undefined && !brick) return missing;

		//* a builder brick on its own shows its header, as it has no field of its own
		if (!target.field) {
			if (brick?.type !== "builder") return missing;
			const shown = await revealPreviewField({
				fieldId: getPreviewStructureId({ brickIndex, type: "brick" }),
				structureIds: [],
				signal: AbortSignal.timeout(focusWaitMs),
			});
			return shown ? { status: "done" } : missing;
		}

		const resolution = resolvePreviewFieldTarget({
			target: {
				collectionKey: props.collectionKey(),
				//* only the brick and path find the field
				documentId: props.documentId() ?? 0,
				brick: brick && {
					type: brick.type === "fixed" ? "fixed" : "builder",
					key: brick.key,
					order: brick.order,
				},
				path: [target.field],
			},
			collection,
			bricks,
		});
		if (!resolution) return missing;

		const shown = await revealPreviewField({
			fieldId: resolution.fieldId,
			structureIds: resolution.structureIds,
			signal: AbortSignal.timeout(focusWaitMs),
		});
		return shown ? { status: "done" } : missing;
	};

	// ----------------------------------------
	// Effects
	onMount(() => {
		const unregister = session.screen.register({
			screen,
			answer: async (call) => {
				switch (call.action) {
					case "read":
						return read();
					case "update":
						return update(call);
					case "focus":
						return focus(call.target);
				}
			},
		});
		onCleanup(unregister);
	});
};
