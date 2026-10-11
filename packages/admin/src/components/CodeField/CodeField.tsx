import type { FieldError, FieldValue, InternalDocumentField } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	lazy,
	Suspense,
	untrack,
} from "solid-js";
import { FieldLabelMarkers } from "@/components/FieldLabelMarkers/FieldLabelMarkers";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import { useFieldRenderState } from "@/hooks/useFieldRenderState/useFieldRenderState";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

const CodeEditor = lazy(() => import("@/components/CodeEditor/CodeEditor"));

interface CodeFieldProps {
	state: {
		fieldConfig: CollectionFieldConfigByType<"code">;
		fieldData?: InternalDocumentField;
		groupRef?: string;
		repeaterKey?: string;
		fieldError: FieldError | undefined;
		altLocaleError: boolean;
		localised: boolean;
		fieldColumnIsMissing: boolean;
	};
}

type CodeFieldValue = {
	language: string;
	value: string;
} | null;

export const CodeField: Component<CodeFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const brickStore = useBrickStore();
	const [getValue, setValue] = createSignal("");
	const [getLanguage, setLanguage] = createSignal<string | undefined>(
		undefined,
	);
	const fieldRenderState = useFieldRenderState();

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<CodeFieldValue>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: fieldRenderState.contentLocale(),
		});
	});
	const languages = createMemo(() => {
		const configured = props.state.fieldConfig.languages ?? [];
		return configured.length > 0 ? configured : ["text"];
	});
	const language = createMemo(() => {
		return getLanguage() ?? fieldValue()?.language ?? languages()[0] ?? "text";
	});
	const disabled = createMemo(
		() => props.state.fieldConfig.ui?.disabled || brickStore.get.locked,
	);

	// -------------------------------
	// Functions
	const setStoreValue = (value: CodeFieldValue) => {
		brickStore.get.setFieldValue({
			brickIndex: fieldRenderState.brickIndex(),
			fieldConfig: props.state.fieldConfig,
			key: props.state.fieldConfig.key,
			ref: props.state.groupRef,
			repeaterKey: props.state.repeaterKey,
			value: value as FieldValue,
			contentLocale: fieldRenderState.contentLocale(),
		});
	};

	// -------------------------------
	// Effects
	createEffect(() => {
		const storeVal = fieldValue();

		const currentValue = untrack(getValue);
		const currentLanguage = untrack(getLanguage);

		const storeText = typeof storeVal?.value === "string" ? storeVal.value : "";

		if (storeText !== currentValue) {
			setValue(storeText);
		}
		if (storeVal?.language && storeVal.language !== currentLanguage) {
			setLanguage(storeVal.language);
		}
	});

	// -------------------------------
	// Render
	return (
		<Suspense
			fallback={
				<div class="w-full">
					<div class="h-36 bg-input border border-border rounded-md animate-pulse" />
				</div>
			}
		>
			<CodeEditor
				id={brickHelpers.customFieldId({
					scope: brickStore.idPrefix,
					key: props.state.fieldConfig.key,
					brickIndex: fieldRenderState.brickIndex(),
					groupRef: props.state.groupRef,
				})}
				value={getValue()}
				language={language()}
				languages={languages()}
				onChange={(value) => {
					setValue(value);
					setStoreValue(
						value.trim() === ""
							? null
							: {
									language: language(),
									value,
								},
					);
				}}
				onLanguageChange={(newLanguage) => {
					setLanguage(newLanguage);
					const currentValue = getValue();
					if (currentValue.trim() !== "") {
						setStoreValue({
							language: newLanguage,
							value: currentValue,
						});
					}
				}}
				name={props.state.fieldConfig.key}
				label={helpers.getLocaleValue({
					value: props.state.fieldConfig.details.label,
				})}
				description={helpers.getLocaleValue({
					value: props.state.fieldConfig.details.description,
				})}
				placeholder={helpers.getLocaleValue({
					value: props.state.fieldConfig.details.placeholder,
				})}
				disabled={disabled()}
				errors={props.state.fieldError}
				required={props.state.fieldConfig.validation?.required || false}
				labelStart={
					<FieldLabelMarkers
						altLocaleError={props.state.altLocaleError}
						localised={props.state.localised}
						fieldColumnIsMissing={props.state.fieldColumnIsMissing}
					/>
				}
			/>
		</Suspense>
	);
};
