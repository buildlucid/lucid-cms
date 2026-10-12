import { HoverCard } from "@kobalte/core";
import type { ErrorResultObj, MediaGenerationModels } from "@types";
import {
	TbOutlinePhoto,
	TbOutlineRotate,
	TbOutlineUpload,
	TbOutlineX,
} from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	type JSXElement,
	on,
	onCleanup,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import Pill, { type PillButtonProps } from "@/components/Pill/Pill";
import Select from "@/components/Select/Select";
import T from "@/translations";
import {
	fitImageOptions,
	type ImageOptions,
	imageGuidanceOptions,
	imageOptionSelects,
	imageSelectOptions,
	type MediaImageGenerationGuidanceKey,
} from "@/utils/media-generation";
import type {
	ImageGenerationValues,
	MediaImageGenerationSource,
} from "../types";
import { normalizeMimeType } from "../utils/generation-helpers";
import GenerationError from "./GenerationError";
import PromptField from "./PromptField";

/** Edits image generation settings, showing only options and source images the selected model supports. */
const ImageGenerationForm: Component<{
	model?: MediaGenerationModels["image"];
	source?: MediaImageGenerationSource;
	/** The target's own image, which can be restored after removing the source. */
	initialSource?: MediaImageGenerationSource;
	onSourceChange: (_source?: MediaImageGenerationSource) => void;
	loading: boolean;
	disabled: boolean;
	error?: string;
	fieldError: (
		_key: "aspectRatio" | "resolution" | "quality" | "outputFormat",
	) => ErrorResultObj | undefined;
	instructionError?: ErrorResultObj;
	/** The model picker, shown beside the send button. */
	modelPicker: JSXElement;
	/** Called whenever a value changes, so a new request gets a new idempotency key. */
	onChange: () => void;
	onGenerate: (_values: ImageGenerationValues) => void;
}> = (props) => {
	// -----------------------------
	// State & Hooks
	const [instruction, setInstruction] = createSignal("");
	const [guidance, setGuidance] =
		createSignal<MediaImageGenerationGuidanceKey>();
	const [chosenOptions, setChosenOptions] = createSignal<Partial<ImageOptions>>(
		{},
	);
	const [sourcePreviewUrl, setSourcePreviewUrl] = createSignal<string>();
	const [sourceError, setSourceError] = createSignal<string>();
	let sourceInputRef: HTMLInputElement | undefined;

	// -----------------------------
	// Memos
	const options = createMemo(() =>
		props.model ? fitImageOptions(props.model, chosenOptions()) : undefined,
	);
	const optionSelects = createMemo(() =>
		props.model ? imageOptionSelects(props.model) : [],
	);
	const acceptsSource = createMemo(() => props.model?.sourceImage !== false);
	const canGenerate = createMemo(
		() => !props.disabled && instruction().trim().length > 0,
	);

	// -----------------------------
	// Functions
	const chooseOption = (key: keyof ImageOptions, value: string) =>
		setChosenOptions((current) => ({ ...current, [key]: value }));
	const selectSourceFile: JSX.ChangeEventHandler<HTMLInputElement, Event> = (
		event,
	) => {
		const input = event.currentTarget;
		const file = input.files?.[0];
		input.value = "";
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			setSourceError(T()("ai.media.image.generate.source.invalid"));
			return;
		}

		props.onSourceChange({
			id: `upload-source-${Date.now()}`,
			type: "upload",
			label: file.name,
			image: {
				file,
				filename: file.name,
				mimeType: normalizeMimeType(file.type),
			},
		});
	};
	const submit = (event?: SubmitEvent) => {
		event?.preventDefault();
		const current = options();
		if (!canGenerate() || !current) return;

		props.onGenerate({
			...current,
			instruction: instruction().trim(),
			guidance: guidance(),
		});
	};

	// -----------------------------
	// Effects
	createEffect(
		on(
			() => [instruction(), guidance(), options(), props.source?.id],
			() => props.onChange(),
			{ defer: true },
		),
	);
	createEffect(
		on(
			() => props.source,
			() => setSourceError(undefined),
			{ defer: true },
		),
	);
	createEffect(() => {
		const file = props.source?.image.file;
		if (file) {
			const objectUrl = URL.createObjectURL(file);
			setSourcePreviewUrl(objectUrl);
			onCleanup(() => URL.revokeObjectURL(objectUrl));
			return;
		}

		setSourcePreviewUrl(props.source?.image.url ?? undefined);
	});

	// -----------------------------
	// Render
	return (
		<>
			<Show when={acceptsSource()}>
				<div class="min-w-0">
					<div class="mb-1.5 flex items-center justify-between gap-2">
						<span class="text-sm text-body">
							{T()("ai.media.image.generate.source.label")}
						</span>
					</div>
					<input
						ref={sourceInputRef}
						type="file"
						accept="image/*"
						class="hidden"
						onChange={selectSourceFile}
					/>
					<Show
						when={props.source}
						fallback={
							<div class="grid min-h-20.5 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-dashed border-border bg-background p-2">
								<p class="min-w-0 ml-2 truncate text-sm text-body">
									{T()("ai.media.image.generate.source.empty")}
								</p>
								<div class="flex items-center gap-1">
									<Show when={props.initialSource}>
										{(initialSource) => (
											<Button
												type="button"
												variant="ghost"
												size="xs"
												shape="square"
												title={T()("ai.media.image.generate.source.restore")}
												aria-label={T()(
													"ai.media.image.generate.source.restore",
												)}
												onClick={() => props.onSourceChange(initialSource())}
											>
												<TbOutlineRotate size={14} />
											</Button>
										)}
									</Show>
									<Button
										type="button"
										variant="ghost"
										size="xs"
										shape="square"
										title={T()("ai.media.image.generate.source.add")}
										aria-label={T()("ai.media.image.generate.source.add")}
										onClick={() => sourceInputRef?.click()}
									>
										<TbOutlineUpload size={14} />
									</Button>
								</div>
							</div>
						}
					>
						{(source) => (
							<div class="grid min-w-0 grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-input p-2">
								<div class="rectangle-background flex h-16 min-w-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-background">
									<Show
										when={sourcePreviewUrl()}
										fallback={
											<TbOutlinePhoto
												class="relative z-10 h-5 w-5 text-muted"
												aria-hidden="true"
											/>
										}
									>
										{(url) => (
											<img
												src={url()}
												alt=""
												class="relative z-10 h-full w-full object-contain"
											/>
										)}
									</Show>
								</div>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-title">
										{source().label}
									</p>
									<p class="mt-1 text-xs text-body">
										{T()(`ai.media.image.generate.source.${source().type}`)}
									</p>
								</div>
								<div class="flex items-center gap-1">
									<Button
										type="button"
										variant="ghost"
										size="xs"
										shape="square"
										title={T()("ai.media.image.generate.source.replace")}
										aria-label={T()("ai.media.image.generate.source.replace")}
										onClick={() => sourceInputRef?.click()}
									>
										<TbOutlineUpload size={14} />
									</Button>
									<Button
										type="button"
										variant="danger-ghost"
										size="xs"
										shape="square"
										title={T()("common.remove")}
										aria-label={T()("common.remove")}
										onClick={() => props.onSourceChange(undefined)}
									>
										<TbOutlineX size={14} />
									</Button>
								</div>
							</div>
						)}
					</Show>
				</div>
			</Show>
			<div class="grid min-w-0 gap-3 sm:grid-cols-2">
				<Select
					id="ai-media-image-generation-aspect-ratio"
					name="ai-media-image-generation-aspect-ratio"
					value={options()?.aspectRatio}
					onChange={(value) => {
						if (typeof value === "string") chooseOption("aspectRatio", value);
					}}
					options={imageSelectOptions(props.model?.aspectRatios ?? [])}
					label={T()("ai.media.image.generate.aspect.ratio.label")}
					errors={props.fieldError("aspectRatio")}
					disabled={!props.model}
				/>
				<For each={optionSelects()}>
					{(select) => (
						<Select
							id={`ai-media-image-generation-${select.key}`}
							name={`ai-media-image-generation-${select.key}`}
							value={options()?.[select.key] ?? undefined}
							onChange={(value) => {
								if (typeof value === "string") chooseOption(select.key, value);
							}}
							options={select.options}
							label={select.label}
							errors={props.fieldError(select.key)}
						/>
					)}
				</For>
			</div>
			<div class="min-w-0">
				<FormLabel
					id="ai-media-image-generation-guidance"
					label={T()("ai.generation.guidance.label")}
					theme="basic"
				/>
				<div class="flex min-w-0 flex-wrap gap-2">
					<For each={imageGuidanceOptions}>
						{(option) => {
							const selected = createMemo(() => guidance() === option.key);
							const optionLabel = createMemo(() => T()(option.label));
							const optionInstruction = createMemo(() =>
								T()(option.instruction),
							);

							return (
								<HoverCard.Root>
									<HoverCard.Trigger
										as={(triggerProps: Omit<PillButtonProps, "as">) => (
											<Pill {...triggerProps} as="button" />
										)}
										variant={selected() ? "primary-subtle" : "outline"}
										aria-pressed={selected()}
										disabled={props.loading}
										onClick={() =>
											setGuidance(selected() ? undefined : option.key)
										}
									>
										{optionLabel()}
									</HoverCard.Trigger>
									<HoverCard.Portal>
										<HoverCard.Content class="z-70 bg-card w-80 mt-2 rounded-md border border-border p-3 shadow-xs">
											<p class="mb-1 text-sm font-semibold text-title">
												{optionLabel()}
											</p>
											<p class="text-sm text-body">{optionInstruction()}</p>
										</HoverCard.Content>
									</HoverCard.Portal>
								</HoverCard.Root>
							);
						}}
					</For>
				</div>
			</div>
			<form class="flex min-w-0 flex-col gap-3" onSubmit={submit}>
				<PromptField
					id="ai-media-image-generation-instruction"
					name="ai-media-image-generation-instruction"
					value={instruction()}
					onChange={setInstruction}
					label={T()("ai.generation.instruction.label")}
					placeholder={T()("ai.media.image.generate.instruction.placeholder")}
					errors={props.instructionError}
					toolbar={props.modelPicker}
					submitDisabled={!canGenerate()}
					onSubmit={submit}
				/>
				<GenerationError message={sourceError() ?? props.error} />
			</form>
		</>
	);
};

export default ImageGenerationForm;
