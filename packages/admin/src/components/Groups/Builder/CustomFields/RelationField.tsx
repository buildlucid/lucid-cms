import type {
	DocumentRef,
	FieldError,
	InternalDocumentField,
	RelationFieldValue,
} from "@types";
import {
	batch,
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import { DocumentSelect } from "@/components/Groups/Form";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import brickStore from "@/store/brick-store";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import { getChangedItemErrorStartIndex } from "@/utils/field-error-helpers";
import helpers from "@/utils/helpers";

interface RelationFieldProps {
	state: {
		fieldConfig: CollectionFieldConfigByType<"relation">;
		fieldData?: InternalDocumentField;
		groupRef?: string;
		repeaterKey?: string;
		fieldError: FieldError | undefined;
		fieldErrors: FieldError[];
		altLocaleError: boolean;
		localised: boolean;
		fieldColumnIsMissing: boolean;
	};
}

export const RelationField: Component<RelationFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const fieldRenderState = useFieldRenderState();

	// -------------------------------
	// State
	const [getValue, setValue] = createSignal<RelationFieldValue[] | undefined>();

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<RelationFieldValue[]>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: fieldRenderState.contentLocale(),
		});
	});
	const fieldRef = createMemo(() => {
		return brickHelpers.getFieldRefs({
			fieldType: "relation",
			fieldValue: fieldValue(),
		});
	});
	const allowedCollectionKeys = createMemo(() =>
		Array.isArray(props.state.fieldConfig.collection)
			? props.state.fieldConfig.collection
			: [props.state.fieldConfig.collection],
	);
	const isMultiple = createMemo(
		() => props.state.fieldConfig.multiple === true,
	);
	const disabled = createMemo(
		() => props.state.fieldConfig.ui?.disabled || brickStore.get.locked,
	);

	// -------------------------------
	// Effects
	createEffect(() => {
		setValue(fieldValue());
	});

	// -------------------------------
	// Render
	return (
		<DocumentSelect
			id={brickHelpers.customFieldId({
				key: props.state.fieldConfig.key,
				brickIndex: fieldRenderState.brickIndex(),
				groupRef: props.state.groupRef,
			})}
			collectionKeys={allowedCollectionKeys()}
			value={getValue()}
			refs={fieldRef}
			multiple={isMultiple()}
			minItems={props.state.fieldConfig.validation?.minItems}
			maxItems={props.state.fieldConfig.validation?.maxItems}
			onChange={(value, refs) => {
				const currentValue = getValue() ?? fieldValue() ?? [];
				const removedSelection = value.length < currentValue.length;
				const clearFromItemIndex = isMultiple()
					? getChangedItemErrorStartIndex(
							currentValue,
							value,
							(left, right) =>
								left?.id === right?.id &&
								left?.collectionKey === right?.collectionKey,
						)
					: undefined;

				batch(() => {
					if (refs.length) {
						brickStore.get.addRef("relation", refs as DocumentRef[]);
					}
					if (removedSelection) {
						brickStore.get.clearFieldErrors({
							brickIndex: fieldRenderState.brickIndex(),
							fieldConfig: props.state.fieldConfig,
							key: props.state.fieldConfig.key,
							ref: props.state.groupRef,
							contentLocale: fieldRenderState.contentLocale(),
							clearFromItemIndex,
						});
					}
					brickStore.get.setFieldValue({
						brickIndex: fieldRenderState.brickIndex(),
						fieldConfig: props.state.fieldConfig,
						key: props.state.fieldConfig.key,
						ref: props.state.groupRef,
						repeaterKey: props.state.repeaterKey,
						value: value,
						contentLocale: fieldRenderState.contentLocale(),
						clearFromItemIndex,
					});
					setValue(value);
				});
			}}
			copy={{
				label: helpers.getLocaleValue({
					value: props.state.fieldConfig.details.label,
				}),
				describedBy: helpers.getLocaleValue({
					value: props.state.fieldConfig.details.summary,
				}),
			}}
			errors={isMultiple() ? props.state.fieldErrors : props.state.fieldError}
			altLocaleError={props.state.altLocaleError}
			localised={props.state.localised}
			disabled={disabled()}
			required={props.state.fieldConfig.validation?.required || false}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
			hideOptionalText
		/>
	);
};
