import { getFieldTypeInlineText } from "@field-capabilities";
import type { Collection, FieldValue } from "@types";
import type { Accessor } from "solid-js";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import {
	isSamePreviewTarget,
	type PreviewFieldTarget,
	toShownText,
} from "@/preview/protocol";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import brickHelpers from "@/utils/brick-helpers";
import spawnToast from "@/utils/spawn-toast";
import {
	type PreviewEditableField,
	resolvePreviewField,
} from "./utils/resolve-preview-field";

/**
 * How a field the page asked to edit is edited: typed into on the page, in the builder's
 * fields, or not at all when the user can't change it, which they've been told.
 */
export type PreviewFieldEdit =
	| { mode: "inline"; multiline: boolean; clear: boolean }
	| { mode: "builder" }
	| { mode: "none" };

/** A field being typed into on the page, found by refs so edits around it don't lose it. */
type InlineSession = {
	target: PreviewFieldTarget;
	brickRef: string;
	groupRef?: string;
	repeaterKey?: string;
	config: PreviewEditableField["config"];
	locale: string;
	/** Its value before typing, which cancelling puts back. */
	before: FieldValue;
};

/**
 * Edits matching text values or empty placeholders inline; other fields open in the builder. Each
 * typing session is one undo step; cancellation restores its initial value.
 */
export const usePreviewFieldEdit = (props: {
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	locales: Accessor<string[]>;
}) => {
	const brickStore = useBrickStore();
	let session: InlineSession | null = null;

	/** The field a target shows, when it's in the document being edited. */
	const resolve = (target: PreviewFieldTarget) => {
		const collection = props.collection();
		if (
			!collection ||
			target.collectionKey !== props.collectionKey() ||
			target.documentId !== props.documentId()
		) {
			return null;
		}
		return resolvePreviewField({
			target,
			collection,
			bricks: brickStore.get.bricks,
		});
	};
	/** The content language a target's field is edited in: the page's, when the document has it. */
	const localeOf = (target: PreviewFieldTarget) =>
		target.locale && props.locales().includes(target.locale)
			? target.locale
			: (contentLocaleStore.get.contentLocale ?? "");
	/** Writes a value to the session's field, wherever its brick now is. */
	const write = (current: InlineSession, value: FieldValue) => {
		const brickIndex = brickStore.get.bricks.findIndex(
			(brick) => brick.ref === current.brickRef,
		);
		if (brickIndex === -1) return;
		brickStore.get.setFieldValue({
			brickIndex,
			fieldConfig: current.config,
			key: current.config.key,
			ref: current.groupRef,
			repeaterKey: current.repeaterKey,
			value,
			contentLocale: current.locale,
		});
	};

	return {
		/**
		 * Decides how to edit a field the page asked to, from the text its element shows (null when
		 * it holds more than text), starting a typing session when it's typed into on the page.
		 */
		request: (
			target: PreviewFieldTarget,
			text: string | null,
		): PreviewFieldEdit => {
			const field = resolve(target);
			if (!field || field.config.ui?.hidden) return { mode: "builder" };
			if (
				field.access !== "editable" ||
				field.config.ui?.disabled ||
				brickStore.get.locked
			) {
				spawnToast({
					title: T()("preview.structure.title"),
					message: T()("preview.edit.field.locked"),
					status: "warning",
				});
				return { mode: "none" };
			}

			const inline = getFieldTypeInlineText(field.config.type);
			const locale = localeOf(target);
			const before = brickHelpers.getFieldValue<FieldValue>({
				fieldData: field.fields.find((item) => item.key === field.config.key),
				fieldConfig: field.config,
				contentLocale: locale,
			});
			const shown = typeof before === "string" ? toShownText(before) : "";
			//* an empty field's element shows the site's placeholder, if anything
			const empty = shown === "";
			if (!inline || text === null || (!empty && toShownText(text) !== shown)) {
				return { mode: "builder" };
			}

			//* typing that's left running ends first, so its step is recorded on its own
			if (session) brickStore.edits.endBatch();
			//* fields of bricks the builder hasn't shown yet are made as it would, before typing's step starts
			if (!field.fields.some((item) => item.key === field.config.key)) {
				brickStore.get.addField({
					brickIndex: field.brickIndex,
					fieldConfig: field.config,
					ref: field.groupRef,
					repeaterKey: field.repeaterKey,
					locales: props.locales(),
				});
			}

			session = {
				target,
				brickRef: field.brickRef,
				groupRef: field.groupRef,
				repeaterKey: field.repeaterKey,
				config: field.config,
				locale,
				before,
			};
			brickStore.edits.beginBatch();
			return {
				mode: "inline",
				multiline: inline === "lines",
				clear: empty && toShownText(text) !== "",
			};
		},
		/** Writes the text typed so far into the field being typed into. */
		input: (target: PreviewFieldTarget, value: string) => {
			if (
				!session ||
				!isSamePreviewTarget(session.target, target) ||
				brickStore.get.locked
			) {
				return;
			}
			write(session, value);
		},
		/** Ends typing, as one undo step, putting the value back first when it was cancelled. */
		end: (target: PreviewFieldTarget, cancelled: boolean) => {
			const current = session;
			if (!current || !isSamePreviewTarget(current.target, target)) return;
			session = null;
			if (cancelled && !brickStore.get.locked) write(current, current.before);
			brickStore.edits.endBatch();
		},
	};
};

export type UsePreviewFieldEdit = ReturnType<typeof usePreviewFieldEdit>;
