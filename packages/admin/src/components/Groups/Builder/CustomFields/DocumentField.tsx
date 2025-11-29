import {
	type Component,
	createSignal,
	createMemo,
	batch,
	createEffect,
} from "solid-js";
import type { CFConfig, FieldResponse, FieldError, DocumentRef } from "@types";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";
import { DocumentSelect } from "@/components/Groups/Form";

interface DocumentFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"document">;
		fieldData?: FieldResponse;
		groupRef?: string;
		repeaterKey?: string;
		contentLocale: string;
		fieldError: FieldError | undefined;
		altLocaleError: boolean;
		localised: boolean;
		fieldColumnIsMissing: boolean;
	};
}

export const DocumentField: Component<DocumentFieldProps> = (props) => {
	// -------------------------------
	// State
	const [getValue, setValue] = createSignal<number | undefined>();

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<number>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: props.state.contentLocale,
		});
	});
	const fieldRef = createMemo(() => {
		return brickHelpers.getFieldRef<DocumentRef>({
			fieldType: "document",
			fieldValue: fieldValue(),
			collection: props.state.fieldConfig.collection,
		});
	});
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
			collection={props.state.fieldConfig.collection}
			value={getValue()}
			ref={fieldRef}
			onChange={(value, ref) => {
				batch(() => {
					if (ref) brickStore.get.addRef("document", ref);
					brickStore.get.setFieldValue({
						brickIndex: props.state.brickIndex,
						fieldConfig: props.state.fieldConfig,
						key: props.state.fieldConfig.key,
						ref: props.state.groupRef,
						repeaterKey: props.state.repeaterKey,
						value: !value ? null : Number(value),
						contentLocale: props.state.contentLocale,
					});
					setValue(value ?? undefined);
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
			errors={props.state.fieldError}
			altLocaleError={props.state.altLocaleError}
			localised={props.state.localised}
			disabled={isDisabled()}
			required={props.state.fieldConfig.validation?.required || false}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
		/>
	);
};
