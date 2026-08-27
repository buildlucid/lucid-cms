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
	locale: Accessor<string>;
}) {
	// ----------------------------------
	// Memos
	const mode = createMemo<PreviewMode>(() =>
		props.version() === "revision" || props.version() === "snapshot"
			? "scoped"
			: "perspective",
	);
	const locale = createMemo(() => props.locale());
	const saveStamp = createMemo(() => {
		const autoSaveMetadata = props.autoSaveMetadata();
		return [
			props.document()?.updatedAt ?? "",
			autoSaveMetadata?.updatedAt ?? "",
			autoSaveMetadata?.contentId ?? "",
		].join(":");
	});

	return {
		mode,
		locale,
		saveStamp,
	};
}

export type UseDocumentPreview = ReturnType<typeof useDocumentPreview>;
