import { batch } from "solid-js";
import { createFieldScope } from "@/extensions/editor/field-scope";
import type { DocumentEditor } from "@/extensions/editor/types";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import { useDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import { useDocumentRoute } from "@/hooks/useDocumentRoute/useDocumentRoute";
import {
	useFieldEnvironment,
	useFieldScope,
} from "@/hooks/useFieldScope/useFieldScope";
import { usePageBuilderState } from "@/hooks/usePageBuilderState/usePageBuilderState";
import helpers from "@/utils/helpers";

/**
 * The open document, for field and brick slots and the components they render.
 * Its properties stay current as the document changes.
 *
 * @example
 * ```tsx
 * import { useDocumentEditor } from "@lucidcms/admin/hooks";
 * import type { SlotComponent } from "@lucidcms/admin/types";
 * import type productPickerSlot from "./config.js";
 *
 * //* the definition matches `fieldType: "json"`, so `props.field` is a JSON field
 * const ProductPicker: SlotComponent<typeof productPickerSlot> = (props) => {
 * 	// ----------------------------------------
 * 	// State & Hooks
 * 	const editor = useDocumentEditor();
 *
 * 	// ----------------------------------------
 * 	// Functions
 * 	const choose = (product: Product) =>
 * 		editor.batch(() => {
 * 			props.field.setValue({ id: product.id, sku: product.sku });
 * 			props.fields.get("title", "text")?.setValue(product.name);
 * 			props.fields.get("price", "number")?.setValue(product.price);
 * 		});
 *
 * 	// ----------------------------------------
 * 	// Render
 * 	return <ProductSearch locale={editor.locale.current} onChoose={choose} />;
 * };
 * ```
 */
export const useDocumentEditor = (): DocumentEditor => {
	const { documentState, version } = usePageBuilderState();
	if (!documentState) {
		throw new Error(
			"useDocumentEditor() only works inside the document editor, eg. in a field or brick slot.",
		);
	}

	const store = useBrickStore();
	const localization = useDocumentLocalization();
	//* inside a field level, share its locale, which a brick drawer can set apart from the document's
	const environment =
		useFieldScope()?.environment ??
		useFieldEnvironment({
			contentLocale: () => localization.contentLocale() ?? "",
			collectionKey: documentState.collectionKey,
		});
	const route = useDocumentRoute(environment.contentLocale);
	const fields = createFieldScope(environment, {
		brickIndex: () =>
			store.get.bricks.findIndex((brick) => brick.type === "collection-fields"),
		configs: () => documentState.collection()?.fields ?? [],
		fields: () =>
			store.get.bricks.find((brick) => brick.type === "collection-fields")
				?.fields ?? [],
		errors: () => store.get.fieldsErrors,
		access: () => "editable",
	});

	return {
		get collectionKey() {
			return documentState.collectionKey();
		},
		get documentId() {
			return documentState.documentId();
		},
		locale: {
			get current() {
				return environment.contentLocale();
			},
			get default() {
				return localization.defaultLocale() ?? environment.contentLocale();
			},
		},
		get route() {
			return route();
		},
		get readOnly() {
			return store.get.locked;
		},
		get environments() {
			return (documentState.collection()?.publishing.environments ?? []).map(
				(environment) => ({
					key: environment.key,
					label: helpers.getLocaleValue({
						value: environment.label,
						fallback: environment.key,
					}),
				}),
			);
		},
		get environment() {
			const viewed = version?.();
			return documentState
				.collection()
				?.publishing.environments.some(
					(environment) => environment.key === viewed,
				)
				? viewed
				: undefined;
		},
		fields,
		batch: (write) => {
			store.edits.beginBatch();
			try {
				batch(write);
			} finally {
				store.edits.endBatch();
			}
		},
	};
};
