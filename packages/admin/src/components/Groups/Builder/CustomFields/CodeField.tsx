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
import useCustomFieldGeneration from "@/hooks/ai/useCustomFieldGeneration";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import brickStore from "@/store/brickStore";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import { getCodeDraftValue } from "@/utils/custom-field-generation";
import helpers from "@/utils/helpers";

const CodeEditor = lazy(() =>
	import("@/components/Groups/Form/CodeEditor").then((m) => ({
		default: m.CodeEditor,
	})),
);

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
	const [getValue, setValue] = createSignal("");
	const [getLanguage, setLanguage] = createSignal<string | undefined>(
		undefined,
	);
	const customFieldGeneration = useCustomFieldGeneration();
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

	// -------------------------------
	// Functions
	const setStoreValue = (value: CodeFieldValue, contentLocale?: string) => {
		brickStore.get.setFieldValue({
			brickIndex: fieldRenderState.brickIndex(),
			fieldConfig: props.state.fieldConfig,
			key: props.state.fieldConfig.key,
			ref: props.state.groupRef,
			repeaterKey: props.state.repeaterKey,
			value: value as FieldValue,
			contentLocale: contentLocale ?? fieldRenderState.contentLocale(),
		});
	};

	const AiGenerationButton = customFieldGeneration.createActionButton({
		field: () => ({
			key: props.state.fieldConfig.key,
			type: "code" as const,
			label: helpers.getLocaleValue({
				value: props.state.fieldConfig.details.label,
				fallback: props.state.fieldConfig.key,
			}),
			localized: props.state.localised,
			guidance: aiGuidance(),
			languages: languages(),
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
			brickHelpers.getFieldValue<CodeFieldValue>({
				fieldData: fieldData(),
				fieldConfig: props.state.fieldConfig,
				contentLocale: localeCode ?? fieldRenderState.contentLocale(),
			}),
		document: () => ({
			fields: brickHelpers.getCollectionPseudoBrickFields(),
			bricks: brickHelpers.getUpsertBricks(),
		}),
		setValue: (value: unknown, localeCode?: string) => {
			const targetLocale = localeCode ?? fieldRenderState.contentLocale();
			const codeValue = getCodeDraftValue(value);
			const storeValue =
				codeValue && codeValue.value.trim() !== "" ? codeValue : null;
			setStoreValue(storeValue, targetLocale);
			if (
				!props.state.localised ||
				targetLocale === fieldRenderState.contentLocale()
			) {
				setValue(storeValue?.value ?? "");
				if (codeValue?.language) setLanguage(codeValue.language);
			}
		},
		disabled,
	});

	// -------------------------------
	// Effects
	createEffect(() => {
		const storeVal = fieldValue();

		const currentValue = untrack(getValue);
		const currentLanguage = untrack(getLanguage);

		const storeText = storeVal?.value ?? "";
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
				<div class="w-full mb-3 last:mb-0">
					<div class="h-36 bg-input-base border border-border rounded-md animate-pulse" />
				</div>
			}
		>
			<CodeEditor
				id={brickHelpers.customFieldId({
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
			/>
		</Suspense>
	);
};
