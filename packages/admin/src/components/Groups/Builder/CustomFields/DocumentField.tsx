import type {
	CFConfig,
	DocumentFieldValue,
	DocumentRef,
	FieldError,
	FieldResponse,
} from "@types";
import {
	batch,
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import { DocumentSelect } from "@/components/Groups/Form";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import { getChangedItemErrorStartIndex } from "@/utils/field-error-helpers";
import helpers from "@/utils/helpers";

interface DocumentFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"document">;
		fieldData?: FieldResponse;
		groupRef?: string;
		repeaterKey?: string;
		contentLocale: string;
		fieldError: FieldError | undefined;
		fieldErrors: FieldError[];
		altLocaleError: boolean;
		localised: boolean;
		fieldColumnIsMissing: boolean;
	};
}

export const DocumentField: Component<DocumentFieldProps> = (props) => {
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
			contentLocale: props.state.contentLocale,
		});
	});
	const fieldRef = createMemo(() => {
		return brickHelpers.getFieldRefs({
			fieldType: "document",
			fieldValue: fieldValue(),
		});
	});
	const primaryCollectionKey = createMemo(
		() => props.state.fieldConfig.collection,
	);
	const isMultiple = createMemo(
		() => props.state.fieldConfig.config.multiple === true,
	);
	const isDisabled = createMemo(
		() => props.state.fieldConfig.config.isDisabled || brickStore.get.locked,
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
				brickIndex: props.state.brickIndex,
				groupRef: props.state.groupRef,
			})}
			collection={primaryCollectionKey()}
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
						brickIndex: props.state.brickIndex,
						fieldConfig: props.state.fieldConfig,
						key: props.state.fieldConfig.key,
						ref: props.state.groupRef,
						repeaterKey: props.state.repeaterKey,
						value: value,
						contentLocale: props.state.contentLocale,
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
			disabled={isDisabled()}
			required={props.state.fieldConfig.validation?.required || false}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
			hideOptionalText
		/>
	);
};
