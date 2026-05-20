import type {
	CFConfig,
	DocumentFieldValue,
	DocumentRef,
	FieldError,
	InternalDocumentField,
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
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import { getChangedItemErrorStartIndex } from "@/utils/field-error-helpers";
import helpers from "@/utils/helpers";

interface DocumentFieldProps {
	state: {
		fieldConfig: CFConfig<"document">;
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

export const DocumentField: Component<DocumentFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const fieldRenderState = useFieldRenderState();

	// -------------------------------
	// State
	const [getValue, setValue] = createSignal<DocumentFieldValue[] | undefined>();

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<DocumentFieldValue[]>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: fieldRenderState.contentLocale(),
		});
	});
	const fieldRef = createMemo(() => {
		return brickHelpers.getFieldRefs({
			fieldType: "document",
			fieldValue: fieldValue(),
		});
	});
	const allowedCollectionKeys = createMemo(() =>
		Array.isArray(props.state.fieldConfig.collection)
			? props.state.fieldConfig.collection
			: [props.state.fieldConfig.collection],
	);
	const isMultiple = createMemo(
		() => props.state.fieldConfig.config.multiple === true,
	);
	const disabled = createMemo(
		() => props.state.fieldConfig.config.disabled || brickStore.get.locked,
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
				const clearFromItemIndex = isMultiple()
					? getChangedItemErrorStartIndex(
							fieldValue(),
							value,
							(left, right) =>
								left?.id === right?.id &&
								left?.collectionKey === right?.collectionKey,
						)
					: undefined;

				batch(() => {
					if (refs.length) {
						brickStore.get.addRef("document", refs as DocumentRef[]);
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
