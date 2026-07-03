import type { FieldError, InternalDocumentField } from "@types";
import {
	batch,
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import { MediaSelect } from "@/components/Groups/Form";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import brickStore from "@/store/brickStore";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import { getChangedItemErrorStartIndex } from "@/utils/field-error-helpers";
import helpers from "@/utils/helpers";

interface MediaFieldProps {
	state: {
		fieldConfig: CollectionFieldConfigByType<"media">;
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

export const MediaField: Component<MediaFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const [getValue, setValue] = createSignal<number[] | undefined>();
	const fieldRenderState = useFieldRenderState();

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<number[]>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: fieldRenderState.contentLocale(),
		});
	});
	const fieldRef = createMemo(() => {
		return brickHelpers.getFieldRefs({
			fieldType: "media",
			fieldValue: fieldValue(),
		});
	});
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
		<MediaSelect
			id={brickHelpers.customFieldId({
				key: props.state.fieldConfig.key,
				brickIndex: fieldRenderState.brickIndex(),
				groupRef: props.state.groupRef,
			})}
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
							(left, right) => left === right,
						)
					: undefined;

				batch(() => {
					if (refs.length) brickStore.get.addRef("media", refs);
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
			altLocaleError={props.state.altLocaleError}
			localised={props.state.localised}
			disabled={disabled()}
			extensions={props.state.fieldConfig.validation?.extensions}
			type={props.state.fieldConfig.validation?.type}
			errors={isMultiple() ? props.state.fieldErrors : props.state.fieldError}
			required={props.state.fieldConfig.validation?.required || false}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
			hideOptionalText
		/>
	);
};
