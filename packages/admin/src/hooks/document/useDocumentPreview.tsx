import type {
	DocumentVersionUpdateResponse,
	InternalCollectionDocument,
	PreviewMode,
} from "@types";
import { type Accessor, createMemo } from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";

export function useDocumentPreview(props: {
	version: Accessor<string>;
	document: Accessor<InternalCollectionDocument | undefined>;
	autoSaveMetadata: Accessor<DocumentVersionUpdateResponse | null>;
}) {
	// ----------------------------------
	// Memos
	const mode = createMemo<PreviewMode>(() =>
		props.version() === "revision" || props.version() === "snapshot"
			? "scoped"
			: "perspective",
	);
	const locale = createMemo(
		() =>
			contentLocaleStore.get.contentLocale ??
			contentLocaleStore.get.locales.find((locale) => locale.isDefault)?.code ??
			"",
	);
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
