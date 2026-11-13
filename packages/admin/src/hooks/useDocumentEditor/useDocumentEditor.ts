import { batch, createMemo } from "solid-js";
import { createFieldScope } from "@/extensions/editor/field-scope";
import type { DocumentEditor, EditorBrick } from "@/extensions/editor/types";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import { useDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import { useDocumentRoute } from "@/hooks/useDocumentRoute/useDocumentRoute";
import {
	useFieldEnvironment,
	useFieldScope,
} from "@/hooks/useFieldScope/useFieldScope";
import { usePageBuilderState } from "@/hooks/usePageBuilderState/usePageBuilderState";
import type { CollectionBrickConfig } from "@/types/collection-config";
import helpers from "@/utils/helpers";
import resolveFieldAccess from "@/utils/resolve-field-access";

/**
 * The open document, for field, brick and preview slots and the components they render.
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
			"useDocumentEditor() only works inside the document editor, eg. in a field, brick or preview slot.",
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
	//* handles are kept per brick, so ones a slot holds stay the same while the bricks change around them
	let brickHandles = new Map<string, EditorBrick>();
	const createBrick = (
		brick: { key: string; ref: string; kind: "fixed" | "builder" },
		config: CollectionBrickConfig,
	): EditorBrick => {
		const brickIndex = () =>
			store.get.bricks.findIndex((stored) => stored.ref === brick.ref);
		return {
			...brick,
			config,
			fields: createFieldScope(environment, {
				brickIndex,
				configs: () => config.fields,
				fields: () =>
					store.get.bricks.find((stored) => stored.ref === brick.ref)?.fields ??
					[],
				errors: () =>
					store.get.brickErrors.find(
						(error) => error.key === brick.key && error.ref === brick.ref,
					)?.fields,
				//* a kept handle stops writing once its brick is removed
				access: () =>
					brickIndex() === -1
						? "hidden"
						: resolveFieldAccess(config.permissions),
			}),
		};
	};
	const bricks = createMemo(() => {
		const collection = documentState.collection();
		const next = new Map<string, EditorBrick>();
		const list = (["fixed", "builder"] as const).flatMap((kind) => {
			const configs =
				kind === "fixed" ? collection?.fixedBricks : collection?.builderBricks;
			return store.get.bricks
				.filter((brick) => brick.type === kind)
				.toSorted((a, b) => a.order - b.order)
				.flatMap((brick) => {
					const config = configs?.find((option) => option.key === brick.key);
					if (!config) return [];
					const kept = brickHandles.get(brick.ref);
					const handle =
						kept?.config === config && kept.kind === kind
							? kept
							: createBrick({ key: brick.key, ref: brick.ref, kind }, config);
					next.set(brick.ref, handle);
					return [handle];
				});
		});
		brickHandles = next;
		return list;
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
		get bricks() {
			return bricks();
		},
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
