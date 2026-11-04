import type { Collection } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import type { PreviewFieldTarget } from "@/preview/protocol";
import T from "@/translations";
import {
	getPreviewTargetTrail,
	type PreviewEditingDetails,
} from "@/utils/preview-editing";
import spawnToast from "@/utils/spawn-toast";
import { getPreviewAgentFocus } from "./utils/get-preview-agent-focus";

/**
 * Adds bricks, repeater items and fields picked on the preview to the agent chat, as the
 * document pointed at the part, so a message can be about it.
 */
export const usePreviewAgent = (props: {
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	/** The document's name, which its attachments carry. */
	label: Accessor<string>;
	details: Accessor<PreviewEditingDetails | null>;
}) => {
	const session = useAgentSession();
	const brickStore = useBrickStore();

	return {
		/** Whether the chat beside the page can take parts of this document. */
		available: createMemo(
			() =>
				props.documentId() !== undefined &&
				session.panel.available() &&
				session.attachAgent()?.features.documents.attach === true,
		),
		/** Attaches a part of the document to the chat, opening it. */
		ask: (target: PreviewFieldTarget) => {
			const collection = props.collection();
			const details = props.details();
			const documentId = props.documentId();
			if (!collection || !details || documentId === undefined) return;

			const focus = getPreviewAgentFocus({
				target,
				collection,
				bricks: brickStore.get.bricks,
				label: getPreviewTargetTrail(details, target).join(" › "),
			});
			if (!focus) {
				spawnToast({
					title: T()("preview.edit.ask.unavailable"),
					message: T()("preview.focus.missing"),
					status: "warning",
				});
				return;
			}
			session.attach([
				{
					type: "document",
					collectionKey: props.collectionKey(),
					documentId,
					label: props.label(),
					focus,
				},
			]);
		},
	};
};

export type UsePreviewAgent = ReturnType<typeof usePreviewAgent>;
