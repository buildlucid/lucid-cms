import type { RichTextJSON } from "@lucidcms/rich-text";
import type {
	DocumentRef,
	FieldError,
	InternalDocumentField,
	MediaRef,
	RelationFieldValue,
} from "@types";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { RichText } from "@/components/Groups/Form";
import type { RichTextOptions } from "@/components/Groups/Form/RichText";
import AddBrick from "@/components/Modals/Bricks/AddBrick";
import useCustomFieldGeneration from "@/hooks/ai/useCustomFieldGeneration";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import { usePageBuilderState } from "@/hooks/document/usePageBuilderState";
import api from "@/services/api";
import brickStore from "@/store/brick-store";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

interface RichTextFieldProps {
	state: {
		fieldConfig: CollectionFieldConfigByType<"rich-text">;
		fieldData?: InternalDocumentField;
		groupRef?: string;
		repeaterKey?: string;
		fieldError: FieldError | undefined;
		altLocaleError: boolean;
		localised: boolean;
		fieldColumnIsMissing: boolean;
	};
}

export const RichTextField: Component<RichTextFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const customFieldGeneration = useCustomFieldGeneration();
	const fieldRenderState = useFieldRenderState();
	const pageBuilderState = usePageBuilderState();
	const [brickSelectOpen, setBrickSelectOpen] = createSignal(false);
	const [fullscreen, setFullscreen] = createSignal(false);
	let onEmbeddedBrickSelected: ((ref: string) => void) | undefined;

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<RichTextJSON | null>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: fieldRenderState.contentLocale(),
		});
	});
	const disabled = createMemo(
		() => props.state.fieldConfig.ui?.disabled || brickStore.get.locked,
	);
	const editorConfig = createMemo(() => props.state.fieldConfig.editor);
	const usesCollectionMetadata = createMemo(
		() =>
			editorConfig()?.links?.internal === true ||
			Array.isArray(editorConfig()?.links?.internal) ||
			editorConfig()?.variables === true ||
			Array.isArray(editorConfig()?.variables),
	);

	// -------------------------------
	// Queries
	const collections = api.collections.useGetAll({
		queryParams: {},
		enabled: usesCollectionMetadata,
	});

	// -------------------------------
	// Memos
	const currentCollection = createMemo(() =>
		pageBuilderState.documentState?.collection?.(),
	);
	const routedCollectionKeys = createMemo(() => {
		const internal = editorConfig()?.links?.internal;
		if (internal !== true && !Array.isArray(internal)) return [];
		const allowedCollections = Array.isArray(internal)
			? new Set(internal)
			: null;
		return (collections.data?.data ?? [])
			.filter(
				(collection) =>
					collection.routing !== null &&
					(allowedCollections === null ||
						allowedCollections.has(collection.key)),
			)
			.map((collection) => collection.key);
	});
	const variableCollectionKeys = createMemo(() => {
		const variables = editorConfig()?.variables;
		if (Array.isArray(variables)) return variables;
		if (variables === true) {
			return (collections.data?.data ?? []).map((collection) => collection.key);
		}
		return [];
	});
	const embeddedBrickConfigs = createMemo(() => {
		const bricks = editorConfig()?.bricks;
		const configs = currentCollection()?.embeddedBricks ?? [];
		if (bricks === true) return configs;
		if (Array.isArray(bricks)) {
			const allowed = new Set(bricks);
			return configs.filter((config) => allowed.has(config.key));
		}
		return [];
	});

	// -------------------------------
	// Functions
	const getMediaRef = (id: number): NonNullable<MediaRef> | undefined =>
		brickHelpers.getFieldRef({
			fieldType: "media",
			fieldValue: [id],
		}) ?? undefined;
	const getDocumentRef = (
		collectionKey: string,
		documentId: number,
	): DocumentRef | undefined =>
		brickHelpers.getFieldRef({
			fieldType: "relation",
			fieldValue: [{ collectionKey, id: documentId }],
		});

	// -------------------------------
	// Memos
	const richTextOptions = createMemo<RichTextOptions>(() => ({
		...editorConfig(),
		links: {
			...editorConfig()?.links,
			internal:
				routedCollectionKeys().length > 0
					? editorConfig()?.links?.internal
					: false,
		},
		bricks: embeddedBrickConfigs().length > 0 ? editorConfig()?.bricks : false,
		variables:
			variableCollectionKeys().length > 0 ? editorConfig()?.variables : false,
		documentCollectionKeys: routedCollectionKeys(),
		embeddedBrickConfigs: embeddedBrickConfigs(),
		locale: fieldRenderState.contentLocale(),
		references: {
			media: getMediaRef,
			document: getDocumentRef,
			embeddedBrick: (ref) => {
				const brick = brickStore.get.bricks.find(
					(item) => item.type === "embedded" && item.ref === ref,
				);
				return brick ? { ref: brick.ref, key: brick.key } : undefined;
			},
		},
		callbacks: {
			selectMedia: ({ currentId, allowedTypes, onSelect }) => {
				const currentRef =
					typeof currentId === "number" ? getMediaRef(currentId) : undefined;
				pageBuilderModalsStore.open("mediaSelect", {
					data: {
						zIndex: fullscreen() ? 80 : undefined,
						types: allowedTypes,
						multiple: false,
						selected: currentId === undefined ? undefined : [currentId],
						selectedRefs: currentRef ? [currentRef] : undefined,
					},
					onCallback: ({ value, refs }) => {
						const id = value[0];
						const ref = refs[0];
						if (id === undefined || !ref) return;
						brickStore.get.addRef("media", ref);
						onSelect(id);
					},
				});
			},
			uploadMedia: ({ allowedTypes, onUpload }) => {
				pageBuilderModalsStore.open("mediaUpload", {
					data: {
						types: allowedTypes,
						zIndex: fullscreen() ? 80 : undefined,
					},
					onCallback: (media) => {
						if (!allowedTypes.some((type) => type === media.type)) return;
						brickStore.get.addRef("media", media);
						onUpload(media.id);
					},
				});
			},
			selectDocument: ({ collectionKeys, current, onSelect }) => {
				pageBuilderModalsStore.open("documentSelect", {
					data: {
						zIndex: 80,
						collectionKeys,
						multiple: false,
						selected: current
							? [
									{
										collectionKey: current.collectionKey,
										id: current.id,
									} satisfies RelationFieldValue,
								]
							: undefined,
						selectedRefs: current ? [current] : undefined,
					},
					onCallback: ({ refs }) => {
						const document = refs[0];
						if (!document) return;
						brickStore.get.addRef("relation", document);
						onSelect(document);
					},
				});
			},
			selectVariable: ({ current, onSelect }) => {
				pageBuilderModalsStore.open("richTextVariableSelect", {
					data: {
						zIndex: fullscreen() ? 80 : undefined,
						localised: props.state.localised,
						collectionKeys: variableCollectionKeys(),
						selected: current,
						selectedRef: current
							? getDocumentRef(current.collectionKey, current.documentId)
							: undefined,
					},
					onCallback: (selection) => {
						brickStore.get.addRef("relation", selection.document);
						onSelect(selection);
					},
				});
			},
			selectEmbeddedBrick: ({ onSelect }) => {
				onEmbeddedBrickSelected = onSelect;
				setBrickSelectOpen(true);
			},
			editEmbeddedBrick: (ref) =>
				pageBuilderModalsStore.open("embeddedBrickEdit", {
					data: {
						brickRef: ref,
						zIndex: fullscreen() ? 80 : undefined,
						localised: props.state.localised,
					},
					onCallback: () => undefined,
				}),
		},
	}));
	const aiGuidance = createMemo(
		() =>
			props.state.fieldConfig.ai?.guidance?.map((item) => ({
				key: item.key,
				label: helpers.getLocaleValue({
					value: item.label,
					fallback: item.key,
				}),
			})) ?? [],
	);

	const AiGenerationButton = customFieldGeneration.createActionButton({
		field: () => ({
			key: props.state.fieldConfig.key,
			type: "rich-text" as const,
			label: helpers.getLocaleValue({
				value: props.state.fieldConfig.details.label,
				fallback: props.state.fieldConfig.key,
			}),
			localized: props.state.localised,
			guidance: aiGuidance(),
		}),
		request: () => ({
			collectionKey: fieldRenderState.collectionKey(),
			brickKey: fieldRenderState.brickKey(),
			fieldKey: props.state.fieldConfig.key,
			locale: {
				source: fieldRenderState.contentLocale() || undefined,
				target: fieldRenderState.contentLocale()
					? [fieldRenderState.contentLocale()]
					: [],
			},
		}),
		value: (localeCode?: string) =>
			brickHelpers.getFieldValue<RichTextJSON | null>({
				fieldData: fieldData(),
				fieldConfig: props.state.fieldConfig,
				contentLocale: localeCode ?? fieldRenderState.contentLocale(),
			}),
		document: () => ({
			fields: brickHelpers.getCollectionPseudoBrickFields(),
			bricks: brickHelpers.getUpsertBricks(),
		}),
		setValue: (value: unknown, localeCode?: string) => {
			brickStore.get.setFieldValue({
				brickIndex: fieldRenderState.brickIndex(),
				fieldConfig: props.state.fieldConfig,
				key: props.state.fieldConfig.key,
				ref: props.state.groupRef,
				repeaterKey: props.state.repeaterKey,
				value: value as RichTextJSON,
				contentLocale: localeCode ?? fieldRenderState.contentLocale(),
			});
		},
		disabled,
	});
	const setRichTextValue = (value: RichTextJSON, contentLocale: string) => {
		brickStore.get.setFieldValue({
			brickIndex: fieldRenderState.brickIndex(),
			fieldConfig: props.state.fieldConfig,
			key: props.state.fieldConfig.key,
			ref: props.state.groupRef,
			repeaterKey: props.state.repeaterKey,
			value,
			contentLocale,
		});
	};

	// -------------------------------
	// Render
	return (
		<>
			<RichText
				id={brickHelpers.customFieldId({
					key: props.state.fieldConfig.key,
					brickIndex: fieldRenderState.brickIndex(),
					groupRef: props.state.groupRef,
				})}
				value={fieldValue()}
				onChange={(value) =>
					setRichTextValue(value, fieldRenderState.contentLocale())
				}
				copy={{
					label: helpers.getLocaleValue({
						value: props.state.fieldConfig.details.label,
					}),
					describedBy: helpers.getLocaleValue({
						value: props.state.fieldConfig.details.summary,
					}),
					placeholder: helpers.getLocaleValue({
						value: props.state.fieldConfig.details.placeholder,
					}),
				}}
				altLocaleError={props.state.altLocaleError}
				localised={props.state.localised}
				disabled={disabled()}
				errors={props.state.fieldError}
				required={props.state.fieldConfig.validation?.required || false}
				fieldColumnIsMissing={props.state.fieldColumnIsMissing}
				labelRightSlot={
					props.state.fieldConfig.ai?.enabled === true ? (
						<AiGenerationButton />
					) : undefined
				}
				hideOptionalText
				options={richTextOptions()}
				translations={
					props.state.localised
						? {
								value: (contentLocale) =>
									brickHelpers.getFieldValue<RichTextJSON | null>({
										fieldData: fieldData(),
										fieldConfig: props.state.fieldConfig,
										contentLocale,
									}),
								onChange: setRichTextValue,
							}
						: undefined
				}
				onFullscreenChange={setFullscreen}
			/>
			<Show when={embeddedBrickConfigs().length > 0}>
				<AddBrick
					state={{ open: brickSelectOpen(), setOpen: setBrickSelectOpen }}
					data={{ brickConfig: embeddedBrickConfigs() }}
					options={{ nested: fullscreen() }}
					callbacks={{
						onSelect: (brickConfig) => {
							const ref = brickStore.get.addEmbeddedBrick({ brickConfig });
							onEmbeddedBrickSelected?.(ref);
							onEmbeddedBrickSelected = undefined;
						},
					}}
				/>
			</Show>
		</>
	);
};
