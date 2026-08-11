import {
	extractEmbeddedBrickRefs,
	type RichTextJSON,
} from "@lucidcms/rich-text";
import type {
	DocumentRef,
	FieldError,
	InternalDocumentField,
	MediaRef,
	RelationFieldValue,
	RichTextFieldErrorReference,
	UserRef,
} from "@types";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { RichText } from "@/components/Groups/Form";
import type { RichTextOptions } from "@/components/Groups/Form/RichText";
import {
	getReadableRichTextUserVariableFields,
	getReadableRichTextVariableCollectionKeys,
} from "@/components/Groups/Form/RichText/helpers";
import AddBrick from "@/components/Modals/Bricks/AddBrick";
import { Permissions } from "@/constants/permissions";
import useCustomFieldGeneration from "@/hooks/ai/useCustomFieldGeneration";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import { usePageBuilderState } from "@/hooks/document/usePageBuilderState";
import api from "@/services/api";
import brickStore from "@/store/brick-store";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";
import { documentResponseToRef } from "@/utils/relation-field-helpers";
import { countFieldErrors } from "@/utils/structural-field-helpers";

const RICH_TEXT_PICKER_Z_INDEX = 80;

interface RichTextFieldProps {
	state: {
		fieldConfig: CollectionFieldConfigByType<"rich-text">;
		fieldData?: InternalDocumentField;
		groupRef?: string;
		repeaterKey?: string;
		fieldErrors: FieldError[];
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
	const mediaTypeFilter = createMemo(() => {
		const media = editorConfig()?.media;
		return Array.isArray(media) ? media : undefined;
	});
	const usesCollectionMetadata = createMemo(
		() =>
			editorConfig()?.links?.internal === true ||
			Array.isArray(editorConfig()?.links?.internal) ||
			editorConfig()?.variables?.document === true ||
			Array.isArray(editorConfig()?.variables?.document) ||
			editorConfig()?.documents === true ||
			Array.isArray(editorConfig()?.documents),
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
	const currentDocumentRef = createMemo(() => {
		const document = pageBuilderState.documentState?.document?.();
		return document ? documentResponseToRef(document) : undefined;
	});
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
	const variableCollectionKeys = createMemo(() =>
		getReadableRichTextVariableCollectionKeys(
			editorConfig()?.variables?.document,
			(collections.data?.data ?? []).map((collection) => collection.key),
		),
	);
	const userVariableFields = createMemo(() =>
		getReadableRichTextUserVariableFields(
			editorConfig()?.variables?.user,
			userStore.get.hasPermission([Permissions.UsersRead]).all,
		),
	);
	const variableOptions = createMemo<RichTextOptions["variables"]>(() => {
		const collectionKeys = variableCollectionKeys();
		const document = collectionKeys.length > 0 ? collectionKeys : undefined;
		const user = userVariableFields();
		if (!document && user.length === 0) return undefined;
		return { document, user };
	});
	const documentNodeCollectionKeys = createMemo(() => {
		const documents = editorConfig()?.documents;
		if (Array.isArray(documents)) return documents;
		if (documents === true) {
			return (collections.data?.data ?? []).map((collection) => collection.key);
		}
		return [];
	});
	const documentCollections = createMemo(() => {
		const allowed = new Set(documentNodeCollectionKeys());
		return (collections.data?.data ?? []).filter((collection) =>
			allowed.has(collection.key),
		);
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
	): DocumentRef | undefined => {
		const current = currentDocumentRef();
		if (current?.collectionKey === collectionKey && current.id === documentId) {
			return current;
		}

		return (
			brickHelpers.getFieldRef({
				fieldType: "relation",
				fieldValue: [{ collectionKey, id: documentId }],
			}) ?? undefined
		);
	};
	const getUserRef = (userId: number): NonNullable<UserRef> | undefined =>
		brickHelpers.getFieldRef({
			fieldType: "user",
			fieldValue: [userId],
		}) ?? undefined;
	const isCurrentDocument = (document: DocumentRef) => {
		const current = currentDocumentRef();
		return (
			current?.collectionKey === document.collectionKey &&
			current.id === document.id
		);
	};
	const getReferenceKey = (reference: RichTextFieldErrorReference) => {
		switch (reference.type) {
			case "rich-text-media":
				return `media:${reference.mediaId}`;
			case "rich-text-variable":
				return reference.source === "document"
					? `variable:document:${reference.collectionKey}:${reference.documentId}:${reference.fieldKey}`
					: `variable:user:${reference.userId}:${reference.fieldKey}`;
			case "rich-text-document-link":
				return `document-link:${reference.collectionKey}:${reference.documentId}`;
			case "rich-text-document":
				return `document:${reference.collectionKey}:${reference.documentId}`;
			case "rich-text-embedded-brick":
				return `embedded-brick:${reference.ref}`;
		}
	};
	const getReferenceErrors = (reference: RichTextFieldErrorReference) => {
		const referenceKey = getReferenceKey(reference);
		const errors = props.state.fieldErrors.filter((error) => {
			const errorReference = error.meta?.reference;
			return errorReference
				? getReferenceKey(errorReference) === referenceKey
				: false;
		});

		if (reference.type !== "rich-text-embedded-brick") return errors;
		const brickError = brickStore.get.brickErrors.find(
			(error) => error.ref === reference.ref,
		);
		return brickError ? [...errors, ...brickError.fields] : errors;
	};

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
		variables: variableOptions(),
		documents:
			documentNodeCollectionKeys().length > 0
				? editorConfig()?.documents
				: false,
		internalLinkCollectionKeys: routedCollectionKeys(),
		documentNodeCollectionKeys: documentNodeCollectionKeys(),
		documentCollections: documentCollections(),
		embeddedBrickConfigs: embeddedBrickConfigs(),
		locale: fieldRenderState.contentLocale(),
		references: {
			media: getMediaRef,
			document: getDocumentRef,
			user: getUserRef,
			embeddedBrick: (ref) => {
				const brick = brickStore.get.bricks.find(
					(item) => item.type === "embedded" && item.ref === ref,
				);
				return brick ? { ref: brick.ref, key: brick.key } : undefined;
			},
		},
		validation: {
			getReferenceErrors,
		},
		callbacks: {
			selectMedia: ({ currentId, onSelect }) => {
				const currentRef =
					typeof currentId === "number" ? getMediaRef(currentId) : undefined;
				pageBuilderModalsStore.open("mediaSelect", {
					data: {
						zIndex: RICH_TEXT_PICKER_Z_INDEX,
						types: mediaTypeFilter(),
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
			uploadMedia: ({ onUpload }) => {
				pageBuilderModalsStore.open("mediaUpload", {
					data: {
						types: mediaTypeFilter(),
						zIndex: RICH_TEXT_PICKER_Z_INDEX,
					},
					onCallback: (media) => {
						const typeFilter = mediaTypeFilter();
						if (typeFilter && !typeFilter.includes(media.type)) return;
						brickStore.get.addRef("media", media);
						onUpload(media.id);
					},
				});
			},
			selectDocument: ({ collectionKeys, current, onSelect }) => {
				pageBuilderModalsStore.open("documentSelect", {
					data: {
						zIndex: RICH_TEXT_PICKER_Z_INDEX,
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
						if (!isCurrentDocument(document)) {
							brickStore.get.addRef("relation", document);
						}
						onSelect(document);
					},
				});
			},
			selectVariable: ({ current, onSelect }) => {
				pageBuilderModalsStore.open("richTextVariableSelect", {
					data: {
						zIndex: RICH_TEXT_PICKER_Z_INDEX,
						collectionKeys: variableCollectionKeys(),
						userFields: userVariableFields(),
						selected: current,
						selectedDocumentRef:
							current?.source === "document"
								? getDocumentRef(current.collectionKey, current.documentId)
								: undefined,
						selectedUserRef:
							current?.source === "user"
								? getUserRef(current.userId)
								: undefined,
					},
					onCallback: (selection) => {
						if (selection.source === "document") {
							if (!isCurrentDocument(selection.document)) {
								brickStore.get.addRef("relation", selection.document);
							}
						} else {
							brickStore.get.addRef("user", selection.user);
						}
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
						zIndex: RICH_TEXT_PICKER_Z_INDEX,
					},
					onCallback: () => undefined,
				}),
		},
	}));
	const richTextErrors = createMemo(() => {
		const errors = [...props.state.fieldErrors];
		for (const ref of extractEmbeddedBrickRefs(fieldValue() ?? null)) {
			const brickError = brickStore.get.brickErrors.find(
				(error) => error.ref === ref,
			);
			if (!brickError) continue;

			if (countFieldErrors(brickError.fields) === 0) continue;

			errors.push({
				key: props.state.fieldConfig.key,
				localeCode: fieldRenderState.contentLocale() || null,
				message: {
					type: "lucid.literal",
					value: T()("editor.rich.text.brick.has.errors"),
				},
				meta: { reference: { type: "rich-text-embedded-brick", ref } },
			});
		}
		return errors;
	});
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
		preview: {
			richTextOptions,
		},
		// TODO: Extend rich-text AI generation once the model contract can safely
		// describe and validate media, document, variable, and embedded-brick refs.
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
				errors={richTextErrors()}
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
			/>
			<Show when={embeddedBrickConfigs().length > 0}>
				<AddBrick
					state={{ open: brickSelectOpen(), setOpen: setBrickSelectOpen }}
					data={{ brickConfig: embeddedBrickConfigs() }}
					options={{ nested: true }}
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
