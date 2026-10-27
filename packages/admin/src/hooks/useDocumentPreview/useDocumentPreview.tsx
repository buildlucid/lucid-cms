import type {
	DocumentVersionUpdateResponse,
	InternalCollectionDocument,
	PreviewMode,
} from "@types";
import { type Accessor, createMemo } from "solid-js";

export function useDocumentPreview(props: {
	version: Accessor<string>;
	document: Accessor<InternalCollectionDocument | undefined>;
	autoSaveMetadata: Accessor<DocumentVersionUpdateResponse | null>;
	locale: Accessor<string | null>;
}) {
	// ----------------------------------
	// Memos
	const mode = createMemo<PreviewMode>(() =>
		props.version() === "revision" ||
		props.version() === "snapshot" ||
		props.version() === "proposal"
			? "scoped"
			: "perspective",
	);
	const locale = createMemo(() => props.locale() ?? undefined);
	//* Use the latest save so the autosave refetch doesn't refresh the preview twice.
	const saveStamp = createMemo(() => {
		const document = props.document();
		const autoSave = props.autoSaveMetadata();
		const savedAt = (value: string | null | undefined) =>
			Date.parse(value ?? "") || 0;
		const saved =
			autoSave && savedAt(autoSave.updatedAt) >= savedAt(document?.updatedAt)
				? autoSave
				: document;
		return `${saved?.updatedAt ?? ""}:${saved?.contentId ?? ""}`;
	});

	return {
		mode,
		locale,
		saveStamp,
	};
}

export type UseDocumentPreview = ReturnType<typeof useDocumentPreview>;
