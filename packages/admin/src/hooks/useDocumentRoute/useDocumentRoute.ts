import { type Accessor, createMemo } from "solid-js";
import { readDocumentRoute } from "@/extensions/editor/field-state";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import { usePageBuilderState } from "@/hooks/usePageBuilderState/usePageBuilderState";

/** Shares the document route with field and brick extensions. */
export const useDocumentRoute = (contentLocale: Accessor<string>) => {
	const brickStore = useBrickStore();
	const { documentState } = usePageBuilderState();

	return createMemo(() => {
		const collection = documentState?.collection();

		return readDocumentRoute({
			field: collection?.routing?.field,
			configs: collection?.fields ?? [],
			fields:
				brickStore.get.bricks.find(
					(brick) => brick.type === "collection-fields",
				)?.fields ?? [],
			contentLocale: contentLocale(),
			localized: brickStore.get.collectionLocalized,
		});
	});
};
