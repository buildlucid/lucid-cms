import type { ErrorResultObj, MediaImageGenerateResponse } from "@types";
import classnames from "classnames";
import {
	FaSolidArrowRotateLeft,
	FaSolidArrowUpFromBracket,
	FaSolidImage,
	FaSolidXmark,
} from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	onCleanup,
	Show,
} from "solid-js";
import { Input } from "@/components/Groups/Form/Input";
import { Select } from "@/components/Groups/Form/Select";
import { Textarea } from "@/components/Groups/Form/Textarea";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import Pill from "@/components/Partials/Pill";
import api from "@/services/api";
import type {
	MediaImageGenerateBody,
	MediaImageGenerationOutputFormat,
	MediaImageGenerationQuality,
	MediaImageGenerationSize,
} from "@/services/api/ai/useMediaImageGenerate";
import aiModalsStore, { type AiImageSource } from "@/store/aiModalsStore";
import T from "@/translations";
import { prepareAiImage } from "@/utils/ai-image";
import { LucidError } from "@/utils/error-handling";
import { getBodyError, getErrorObject } from "@/utils/error-helpers";
import formatAiCost from "@/utils/format-ai-cost";
import helpers from "@/utils/helpers";
import spawnToast from "@/utils/spawn-toast";

type SupportedImageMimeType = "image/webp" | "image/png" | "image/jpeg";

type GenerateValues = {
	instruction?: string;
	guidance?: MediaImageGenerationGuidanceKey;
	size: MediaImageGenerationSize;
	quality: MediaImageGenerationQuality;
	outputFormat: MediaImageGenerationOutputFormat;
};

type GenerateOptions = {
	source?: MediaImageGenerationSource;
	previousInstructions?: string[];
	includeInPreviousInstructions?: boolean;
};

type MediaImageGenerationSource = {
	id: string;
	type: "target" | "upload" | "generation";
	label: string;
	image: AiImageSource;
};

type MediaImageGenerationPresetSize = Exclude<
	MediaImageGenerationSize,
	[number, number]
>;
type MediaImageGenerationResolutionPreset =
	| "custom"
	| MediaImageGenerationPresetSize;

const resolutionPresets: Array<{
	value: MediaImageGenerationResolutionPreset;
	label: string;
	width?: number;
	height?: number;
}> = [
	{
		value: "custom",
		label: "ai.media.image.generate.resolution.option.custom",
	},
	{
		value: "1024x1024",
		label: "ai.media.image.generate.size.option.square",
		width: 1024,
		height: 1024,
	},
	{
		value: "1536x1024",
		label: "ai.media.image.generate.size.option.landscape",
		width: 1536,
		height: 1024,
	},
	{
		value: "1024x1536",
		label: "ai.media.image.generate.size.option.portrait",
		width: 1024,
		height: 1536,
	},
	{
		value: "2048x1152",
		label: "ai.media.image.generate.size.option.wide",
		width: 2048,
		height: 1152,
	},
	{
		value: "2048x2048",
		label: "ai.media.image.generate.size.option.square.large",
		width: 2048,
		height: 2048,
	},
	{
		value: "3840x2160",
		label: "ai.media.image.generate.size.option.large.wide",
		width: 3840,
		height: 2160,
	},
	{
		value: "2160x3840",
		label: "ai.media.image.generate.size.option.large.portrait",
		width: 2160,
		height: 3840,
	},
	{
		value: "auto",
		label: "ai.media.image.generate.size.option.auto",
	},
];

const imageGuidanceOptions = [
	{
		key: "natural",
		label: "ai.media.image.generate.guidance.option.natural",
	},
	{
		key: "editorial",
		label: "ai.media.image.generate.guidance.option.editorial",
	},
	{
		key: "product",
		label: "ai.media.image.generate.guidance.option.product",
	},
	{
		key: "illustration",
		label: "ai.media.image.generate.guidance.option.illustration",
	},
	{
		key: "cinematic",
		label: "ai.media.image.generate.guidance.option.cinematic",
	},
] as const;

type MediaImageGenerationGuidanceKey =
	(typeof imageGuidanceOptions)[number]["key"];

export type MediaImageGenerationCandidate = {
	id: string;
	instruction: string;
	guidance?: MediaImageGenerationGuidanceKey;
	sourceLabel?: string;
	source?: MediaImageGenerationSource;
	previousInstructions: string[];
	includeInPreviousInstructions: boolean;
	size: MediaImageGenerationSize;
	quality: MediaImageGenerationQuality;
	outputFormat: MediaImageGenerationOutputFormat;
	cost: MediaImageGenerateResponse["usage"]["cost"];
	output: MediaImageGenerateResponse["output"];
};

const MediaImageGenerationModal: Component = () => {
	// -----------------------------
	// State
	const [generations, setGenerations] = createSignal<
		MediaImageGenerationCandidate[]
	>([]);
	const [selectedGenerationId, setSelectedGenerationId] =
		createSignal<string>();
	const [source, setSource] = createSignal<MediaImageGenerationSource>();
	const [initialSource, setInitialSource] =
		createSignal<MediaImageGenerationSource>();
	const [sourcePreviewUrl, setSourcePreviewUrl] = createSignal<string>();
	const [clientError, setClientError] = createSignal<string>();
	const [instruction, setInstruction] = createSignal("");
	const [guidance, setGuidance] =
		createSignal<MediaImageGenerationGuidanceKey>();
	const [resolutionPreset, setResolutionPreset] =
		createSignal<MediaImageGenerationResolutionPreset>("1024x1024");
	const [customWidth, setCustomWidth] = createSignal("1024");
	const [customHeight, setCustomHeight] = createSignal("1024");
	const [quality, setQuality] =
		createSignal<MediaImageGenerationQuality>("medium");
	const [outputFormat, setOutputFormat] =
		createSignal<MediaImageGenerationOutputFormat>("webp");
	let responseColumnRef: HTMLDivElement | undefined;
	let sourceInputRef: HTMLInputElement | undefined;
	let generationId = 0;
	let abortController: AbortController | undefined;

	// -----------------------------
	// Mutations
	const generateImage = api.ai.useMediaImageGenerate();

	// -----------------------------
	// Memos
	const modal = createMemo(() =>
		aiModalsStore.getModal("mediaImageGeneration"),
	);
	const target = createMemo(() => modal()?.data.target);
	const targetId = createMemo(() => modal()?.data.targetId);
	const isOpen = createMemo(() => modal() !== undefined);
	const isLoading = createMemo(() => generateImage.action.isPending);
	const responseError = createMemo(() => {
		return clientError() ?? generateImage.errors()?.message;
	});
	const generationErrors = createMemo(() =>
		getErrorObject(getBodyError("generation", generateImage.errors)),
	);
	const instructionError = createMemo(() =>
		getBodyError("instruction", generateImage.errors),
	);
	const generationFieldError = (key: string) => {
		return generationErrors()?.[key] as ErrorResultObj | undefined;
	};
	const selectedGeneration = createMemo(() => {
		return generations().find(
			(generation) => generation.id === selectedGenerationId(),
		);
	});
	const hasInstruction = createMemo(() => instruction().trim().length > 0);
	const canGenerate = createMemo(
		() =>
			hasInstruction() || (guidance() !== undefined && source() !== undefined),
	);
	const isCustomResolution = createMemo(() => resolutionPreset() === "custom");
	const generationSize = createMemo<MediaImageGenerationSize>(() => {
		if (isCustomResolution()) {
			return [Number(customWidth()), Number(customHeight())];
		}

		return resolutionPreset() as MediaImageGenerationPresetSize;
	});
	const selectedPreviewUrl = createMemo(() => selectedGeneration()?.output.url);
	const sessionCost = createMemo(() => {
		const firstGeneration = generations()[0];
		if (!firstGeneration) return undefined;

		const currency = firstGeneration.cost.currency;
		const totalCostMinor = generations()
			.filter((generation) => generation.cost.currency === currency)
			.reduce((total, generation) => total + generation.cost.totalCostMinor, 0);

		return formatAiCost({ currency, totalCostMinor });
	});

	// -----------------------------
	// Functions
	function normalizeMimeType(mimeType?: string): SupportedImageMimeType {
		if (
			mimeType === "image/webp" ||
			mimeType === "image/png" ||
			mimeType === "image/jpeg"
		) {
			return mimeType;
		}
		return "image/webp";
	}
	function buildTargetSource(
		image?: AiImageSource | null,
	): MediaImageGenerationSource | undefined {
		if (!image?.file && !image?.url) return undefined;

		return {
			id: "target-source",
			type: "target",
			label:
				image.filename ??
				image.file?.name ??
				T()("ai.media.image.generate.source.current"),
			image,
		};
	}
	function generationFileName(output: MediaImageGenerateResponse["output"]) {
		const extension = output.extension || output.outputFormat || "webp";
		return `lucid-ai-image-${output.id}.${extension.replace(/^\./, "")}`;
	}
	function generationSourceLabel(generation: MediaImageGenerationCandidate) {
		return T()("ai.media.image.generate.source.generation.label", {
			id: generation.id.replace("generation-", ""),
		});
	}
	function sourceDescription(currentSource?: MediaImageGenerationSource) {
		if (!currentSource) return T()("ai.media.image.generate.source.none");
		return currentSource.label;
	}
	function generationLabel(index: number) {
		return T()("ai.media.image.generate.response.item.label", {
			count: index + 1,
		});
	}
	function guidanceLabel(key?: MediaImageGenerationGuidanceKey) {
		const option = imageGuidanceOptions.find((option) => option.key === key);
		return option ? T()(option.label) : undefined;
	}
	function generationSummary(generation: MediaImageGenerationCandidate) {
		return generation.instruction || guidanceLabel(generation.guidance) || "";
	}
	function generationMeta(generation: MediaImageGenerationCandidate) {
		return [
			generation.output.size,
			generation.output.quality,
			helpers.bytesToSize(generation.output.byteSize),
			generationFormatLabel(generation.output.outputFormat),
		]
			.filter(Boolean)
			.join(" · ");
	}
	function generationFormatLabel(
		format: MediaImageGenerationOutputFormat | string,
	) {
		switch (format) {
			case "webp":
				return T()("ai.media.image.generate.format.option.webp");
			case "png":
				return T()("ai.media.image.generate.format.option.png");
			case "jpeg":
				return T()("ai.media.image.generate.format.option.jpeg");
			default:
				return format;
		}
	}
	function updateResolutionPreset(value: MediaImageGenerationResolutionPreset) {
		setResolutionPreset(value);
		const preset = resolutionPresets.find((preset) => preset.value === value);
		if (value === "auto") {
			setCustomWidth("");
			setCustomHeight("");
			return;
		}
		if (!preset?.width || !preset.height) return;

		setCustomWidth(String(preset.width));
		setCustomHeight(String(preset.height));
	}
	function submitGenerate(event?: SubmitEvent) {
		event?.preventDefault();
		const trimmedInstruction = instruction().trim();
		if (!canGenerate()) return;

		void generateImageRequest({
			instruction:
				trimmedInstruction.length > 0 ? trimmedInstruction : undefined,
			guidance: guidance(),
			size: generationSize(),
			quality: quality(),
			outputFormat: outputFormat(),
		});
	}
	function selectSourceFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		uploadSource(file);
		input.value = "";
	}
	function buildPreviousInstructions() {
		return generations()
			.filter((generation) => generation.includeInPreviousInstructions)
			.map((generation) => generation.instruction)
			.filter((instruction) => instruction.trim().length > 0)
			.slice(-10);
	}
	async function buildRequestImage(
		currentSource: MediaImageGenerationSource | undefined,
		signal: AbortSignal,
	): Promise<MediaImageGenerateBody["image"]> {
		if (!currentSource) return undefined;

		if (currentSource.type === "generation" && currentSource.image.url) {
			return {
				type: "url",
				url: currentSource.image.url,
				detail: "auto",
				filename: currentSource.image.filename,
				mimeType: normalizeMimeType(currentSource.image.mimeType),
			};
		}

		const prepared = await prepareAiImage(currentSource.image, {
			maxEdge: 1536,
			quality: 0.9,
			signal,
		});

		return {
			type: "base64",
			data: prepared.data,
			mimeType: prepared.mimeType,
			detail: "auto",
			filename: prepared.filename,
		};
	}
	const abortRequest = () => {
		abortController?.abort();
		abortController = undefined;
	};
	const clear = () => {
		setGenerations([]);
		setSelectedGenerationId(undefined);
		setSource(undefined);
		setInitialSource(undefined);
		setClientError(undefined);
		generateImage.reset();
		aiModalsStore.setLoading(false);
		aiModalsStore.setApplying(false);
	};
	const close = (open: boolean) => {
		if (open) return;

		abortRequest();
		clear();
		aiModalsStore.close();
	};
	const uploadSource = (file: File) => {
		if (!file.type.startsWith("image/")) {
			setClientError(T()("ai.media.image.generate.source.invalid"));
			return;
		}

		setClientError(undefined);
		setSource({
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
	const useGenerationAsSource = (generation: MediaImageGenerationCandidate) => {
		setSource({
			id: `source-${generation.id}`,
			type: "generation",
			label: generationSourceLabel(generation),
			image: {
				url: generation.output.url,
				filename: generationFileName(generation.output),
				mimeType: normalizeMimeType(generation.output.mimeType),
			},
		});
	};
	const restoreSource = () => {
		const targetSource = initialSource();
		if (!targetSource) return;
		setSource(targetSource);
	};
	const generateImageRequest = async (
		values: GenerateValues,
		options: GenerateOptions = {},
		requestTarget = target(),
		requestTargetId = targetId(),
	) => {
		if (!requestTarget || !requestTargetId) return;

		try {
			abortRequest();
			abortController = new AbortController();
			setClientError(undefined);
			generateImage.reset();
			aiModalsStore.setLoading(true);

			const requestSource = options.source ?? source();
			const image = await buildRequestImage(
				requestSource,
				abortController.signal,
			);
			const previousInstructions =
				options.previousInstructions ?? buildPreviousInstructions();
			const response = await generateImage.action.mutateAsync({
				signal: abortController.signal,
				shouldToast: () => aiModalsStore.isOpen("mediaImageGeneration"),
				body: {
					instruction: values.instruction,
					guidance: values.guidance,
					previousInstructions:
						previousInstructions.length > 0 ? previousInstructions : undefined,
					image,
					generation: {
						size: values.size,
						quality: values.quality,
						outputFormat: values.outputFormat,
					},
				},
			});
			if (!aiModalsStore.isOpen("mediaImageGeneration")) return;

			const id = `generation-${generationId + 1}`;
			generationId += 1;
			const candidate: MediaImageGenerationCandidate = {
				id,
				instruction: values.instruction ?? "",
				guidance: values.guidance,
				sourceLabel: sourceDescription(requestSource),
				source: requestSource,
				previousInstructions,
				includeInPreviousInstructions:
					options.includeInPreviousInstructions ?? true,
				size: values.size,
				quality: values.quality,
				outputFormat: values.outputFormat,
				cost: response.data.usage.cost,
				output: response.data.output,
			};

			setGenerations((previous) => [...previous, candidate]);
			setSelectedGenerationId(id);
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") return;

			const message =
				error instanceof LucidError
					? error.message
					: error instanceof Error
						? error.message
						: T()("toasts.ai.media.image.generate.error.message");
			setClientError(message);
			if (
				!(error instanceof LucidError) &&
				aiModalsStore.isOpen("mediaImageGeneration")
			) {
				spawnToast({
					title: T()("toasts.ai.media.image.generate.error.title"),
					message,
					status: "error",
				});
			}
		} finally {
			if (requestTargetId === targetId()) {
				aiModalsStore.setLoading(false);
				abortController = undefined;
			}
		}
	};
	const retryGeneration = (generation: MediaImageGenerationCandidate) => {
		void generateImageRequest(
			{
				instruction: generation.instruction,
				guidance: generation.guidance,
				size: generation.size,
				quality: generation.quality,
				outputFormat: generation.outputFormat,
			},
			{
				source: generation.source,
				previousInstructions: generation.previousInstructions,
				includeInPreviousInstructions: false,
			},
		);
	};
	const accept = async (requestTarget = target()) => {
		const generation = selectedGeneration();
		if (!generation || !requestTarget) return;

		try {
			abortRequest();
			abortController = new AbortController();
			setClientError(undefined);
			aiModalsStore.setApplying(true);

			const response = await fetch(generation.output.url, {
				signal: abortController.signal,
			});
			if (!response.ok) {
				throw new Error(T()("ai.media.image.generate.accept.download.failed"));
			}

			const blob = await response.blob();
			const file = new File([blob], generationFileName(generation.output), {
				type: blob.type || generation.output.mimeType || "image/webp",
			});

			await requestTarget.setFile(file);
			close(false);
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") return;

			const message =
				error instanceof Error
					? error.message
					: T()("ai.media.image.generate.accept.download.failed");
			setClientError(message);
			spawnToast({
				title: T()("toasts.ai.media.image.generate.accept.error.title"),
				message,
				status: "error",
			});
		} finally {
			aiModalsStore.setApplying(false);
			abortController = undefined;
		}
	};

	// -----------------------------
	// Effects
	createEffect(() => {
		if (!isOpen()) return;
		setInstruction("");
		setGuidance(undefined);
		updateResolutionPreset("1024x1024");
		setQuality("medium");
		setOutputFormat("webp");
	});

	createEffect(() => {
		if (!isOpen() || !selectedGenerationId()) return;

		requestAnimationFrame(() => {
			responseColumnRef?.scrollTo({
				top: 0,
				behavior: "smooth",
			});
		});
	});

	createEffect(() => {
		const currentSource = source();
		if (currentSource?.image.file) {
			const objectUrl = URL.createObjectURL(currentSource.image.file);
			setSourcePreviewUrl(objectUrl);
			onCleanup(() => URL.revokeObjectURL(objectUrl));
			return;
		}

		setSourcePreviewUrl(currentSource?.image.url ?? undefined);
	});

	createEffect(
		on(targetId, (id) => {
			const activeTarget = target();
			if (!id || !activeTarget) return;

			clear();
			const targetSource = buildTargetSource(activeTarget.image());
			setInitialSource(targetSource);
			setSource(targetSource);
		}),
	);

	onCleanup(() => {
		abortRequest();
		aiModalsStore.reset();
	});

	// -----------------------------
	// Render
	return (
		<Modal
			state={{
				open: isOpen(),
				setOpen: close,
			}}
			options={{
				size: "large",
				noPadding: true,
			}}
		>
			<div class="flex min-w-0 items-start justify-between gap-4 border-b border-border px-4 py-4 md:px-6 md:py-5">
				<div class="min-w-0">
					<h2>{T()("ai.media.image.generate.modal.title")}</h2>
					<p class="mt-1 text-sm text-body">
						{T()("ai.media.image.generate.modal.description")}
					</p>
				</div>
				<button
					type="button"
					class="flex h-8 min-w-8 w-8 items-center justify-center rounded-full text-body transition-colors duration-200 hover:text-title focus:outline-hidden focus-visible:ring-1 focus-visible:ring-error-base"
					onClick={() => close(false)}
					aria-label={T()("common.close")}
				>
					<FaSolidXmark class="fill-current" />
				</button>
			</div>
			<div class="grid min-w-0 w-full gap-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
				<div class="flex min-h-130 min-w-0 w-full flex-col gap-4 border-b border-border bg-card-base p-4 lg:border-b-0 lg:border-r md:p-6">
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
							when={source()}
							fallback={
								<div class="grid min-h-20.5 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-dashed border-border bg-background-base p-2">
									<p class="min-w-0 ml-2 truncate text-sm text-body">
										{T()("ai.media.image.generate.source.empty")}
									</p>
									<div class="flex items-center gap-1">
										<Show
											when={
												source() === undefined && initialSource() !== undefined
											}
										>
											<Button
												type="button"
												theme="secondary-subtle"
												size="icon-subtle"
												title={T()("ai.media.image.generate.source.restore")}
												aria-label={T()(
													"ai.media.image.generate.source.restore",
												)}
												onClick={restoreSource}
											>
												<FaSolidArrowRotateLeft size={14} />
											</Button>
										</Show>
										<Button
											type="button"
											theme="secondary-subtle"
											size="icon-subtle"
											title={T()("ai.media.image.generate.source.add")}
											aria-label={T()("ai.media.image.generate.source.add")}
											onClick={() => sourceInputRef?.click()}
										>
											<FaSolidArrowUpFromBracket size={14} />
										</Button>
									</div>
								</div>
							}
						>
							{(source) => (
								<div class="grid min-w-0 grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-input-base p-2">
									<div class="rectangle-background flex h-16 min-w-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-background-base">
										<Show
											when={sourcePreviewUrl()}
											fallback={
												<FaSolidImage
													class="relative z-10 h-5 w-5 text-icon-fade"
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
											theme="secondary-subtle"
											size="icon-subtle"
											title={T()("ai.media.image.generate.source.replace")}
											aria-label={T()("ai.media.image.generate.source.replace")}
											onClick={() => sourceInputRef?.click()}
										>
											<FaSolidArrowUpFromBracket size={14} />
										</Button>
										<Button
											type="button"
											theme="danger-subtle"
											size="icon-subtle"
											title={T()("common.remove")}
											aria-label={T()("common.remove")}
											onClick={() => setSource(undefined)}
										>
											<FaSolidXmark size={14} />
										</Button>
									</div>
								</div>
							)}
						</Show>
					</div>
					<div class="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(78px,0.32fr)_minmax(78px,0.32fr)] gap-3">
						<Select
							id="ai-media-image-generation-resolution"
							value={resolutionPreset()}
							onChange={(value) =>
								updateResolutionPreset(
									(value ??
										"1024x1024") as MediaImageGenerationResolutionPreset,
								)
							}
							options={resolutionPresets.map((option) => ({
								value: option.value,
								label: T()(option.label),
							}))}
							name="ai-media-image-generation-resolution"
							copy={{
								label: T()("ai.media.image.generate.resolution.label"),
							}}
							noClear
							noMargin
							hideOptionalText
							errors={generationFieldError("size")}
						/>
						<Input
							id="ai-media-image-generation-width"
							name="ai-media-image-generation-width"
							value={customWidth()}
							onChange={setCustomWidth}
							type="number"
							min={16}
							max={3840}
							step={16}
							disabled={!isCustomResolution()}
							copy={{
								label: T()("ai.media.image.generate.resolution.width"),
							}}
							noMargin
							hideOptionalText
						/>
						<Input
							id="ai-media-image-generation-height"
							name="ai-media-image-generation-height"
							value={customHeight()}
							onChange={setCustomHeight}
							type="number"
							min={16}
							max={3840}
							step={16}
							disabled={!isCustomResolution()}
							copy={{
								label: T()("ai.media.image.generate.resolution.height"),
							}}
							noMargin
							hideOptionalText
						/>
					</div>
					<div class="grid min-w-0 gap-3 sm:grid-cols-2">
						<Select
							id="ai-media-image-generation-quality"
							value={quality()}
							onChange={(value) =>
								setQuality((value ?? "medium") as MediaImageGenerationQuality)
							}
							options={[
								{
									value: "medium",
									label: T()("ai.media.image.generate.quality.option.medium"),
								},
								{
									value: "low",
									label: T()("ai.media.image.generate.quality.option.low"),
								},
								{
									value: "high",
									label: T()("ai.media.image.generate.quality.option.high"),
								},
								{
									value: "auto",
									label: T()("ai.media.image.generate.quality.option.auto"),
								},
							]}
							name="ai-media-image-generation-quality"
							copy={{ label: T()("ai.media.image.generate.quality.label") }}
							noClear
							noMargin
							hideOptionalText
							errors={generationFieldError("quality")}
						/>
						<Select
							id="ai-media-image-generation-format"
							value={outputFormat()}
							onChange={(value) =>
								setOutputFormat(
									(value ?? "webp") as MediaImageGenerationOutputFormat,
								)
							}
							options={[
								{
									value: "webp",
									label: T()("ai.media.image.generate.format.option.webp"),
								},
								{
									value: "png",
									label: T()("ai.media.image.generate.format.option.png"),
								},
								{
									value: "jpeg",
									label: T()("ai.media.image.generate.format.option.jpeg"),
								},
							]}
							name="ai-media-image-generation-format"
							copy={{ label: T()("ai.media.image.generate.format.label") }}
							noClear
							noMargin
							hideOptionalText
							errors={generationFieldError("outputFormat")}
						/>
					</div>
					<div class="min-w-0">
						<span class="text-sm text-body">
							{T()("ai.generation.guidance.label")}
						</span>
						<div class="mt-2 flex min-w-0 flex-wrap gap-2">
							<For each={imageGuidanceOptions}>
								{(option) => {
									const selected = createMemo(() => guidance() === option.key);

									return (
										<button
											type="button"
											class="focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base rounded-full disabled:cursor-not-allowed disabled:opacity-60"
											aria-pressed={selected()}
											disabled={isLoading()}
											onClick={() =>
												setGuidance(selected() ? undefined : option.key)
											}
										>
											<Pill theme={selected() ? "primary-opaque" : "outline"}>
												{T()(option.label)}
											</Pill>
										</button>
									);
								}}
							</For>
						</div>
					</div>
					<form class="min-w-0" onSubmit={submitGenerate}>
						<Textarea
							id="ai-media-image-generation-instruction"
							name="ai-media-image-generation-instruction"
							value={instruction()}
							onChange={setInstruction}
							onKeyUp={(event) => {
								if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
									submitGenerate();
								}
							}}
							copy={{
								label: T()("ai.generation.instruction.label"),
								placeholder: T()(
									"ai.media.image.generate.instruction.placeholder",
								),
							}}
							rows={8}
							noMargin
							hideOptionalText
							errors={instructionError()}
						/>
						<Show when={responseError()}>
							{(error) => <p class="mt-3 text-sm text-error-base">{error()}</p>}
						</Show>
						<div class="mt-4">
							<Button
								type="submit"
								theme="secondary"
								size="medium"
								classes="w-full min-w-0!"
								disabled={isLoading() || !canGenerate()}
							>
								{isLoading()
									? T()("ai.media.image.generate.modal.generating")
									: T()("ai.media.image.generate.modal.generate")}
							</Button>
						</div>
					</form>
				</div>
				<div
					ref={responseColumnRef}
					class="relative flex max-h-[min(72vh,760px)] min-h-130 min-w-0 w-full flex-col overflow-y-auto p-4 md:p-6"
				>
					<div class="min-w-0 pr-1">
						<div class="rectangle-background relative flex min-h-72 w-full items-center justify-center overflow-hidden rounded-md border border-border bg-card-base">
							<Show
								when={selectedPreviewUrl()}
								fallback={
									<Show
										when={isLoading()}
										fallback={
											<div class="relative z-10 max-w-xs px-4 text-center text-sm text-body">
												{T()("ai.media.image.generate.response.empty")}
											</div>
										}
									>
										<span class="skeleton absolute inset-0 z-10 opacity-80" />
										<div class="relative z-20 max-w-xs px-4 text-center">
											<p class="text-sm font-medium text-title">
												{T()(
													"ai.media.image.generate.response.generating.title",
												)}
											</p>
											<p class="mt-1 text-xs text-body">
												{T()(
													"ai.media.image.generate.response.generating.description",
												)}
											</p>
										</div>
									</Show>
								}
							>
								{(url) => (
									<img
										src={url()}
										alt=""
										class="relative z-10 h-full max-h-96 w-full object-contain p-4"
									/>
								)}
							</Show>
							<Show when={isLoading() && selectedPreviewUrl()}>
								<div class="absolute inset-0 z-20 bg-card-base/90">
									<span class="skeleton absolute inset-0 opacity-80" />
									<div class="relative z-10 flex h-full w-full items-center justify-center px-4 text-center">
										<div class="max-w-xs">
											<p class="text-sm font-medium text-title">
												{T()(
													"ai.media.image.generate.response.generating.title",
												)}
											</p>
											<p class="mt-1 text-xs text-body">
												{T()(
													"ai.media.image.generate.response.generating.description",
												)}
											</p>
										</div>
									</div>
								</div>
							</Show>
						</div>
						<Show when={generations().length > 0}>
							<div class="mt-4 min-w-0 space-y-2">
								<For each={generations()}>
									{(generation, index) => {
										const selected = createMemo(() => {
											return generation.id === selectedGenerationId();
										});

										return (
											<div
												class={classnames(
													"min-w-0 rounded-md border bg-card-base transition-colors duration-200",
													{
														"border-primary-muted-border": selected(),
														"border-border hover:border-primary-muted-border":
															!selected(),
													},
												)}
											>
												<button
													type="button"
													class="flex min-w-0 w-full items-center gap-3 p-3 text-left"
													onClick={() => setSelectedGenerationId(generation.id)}
												>
													<div class="rectangle-background flex h-14 w-18 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-background-base">
														<img
															src={generation.output.url}
															alt=""
															class="relative z-10 h-full w-full object-contain"
														/>
													</div>
													<div class="min-w-0 flex-1">
														<div class="flex min-w-0 items-center gap-3">
															<p class="truncate text-sm font-semibold text-title">
																{generationLabel(index())}
															</p>
														</div>
														<Show when={generationSummary(generation)}>
															{(summary) => (
																<p class="truncate text-xs text-body">
																	{summary()}
																</p>
															)}
														</Show>
														<div class="mt-1 flex min-w-0 items-center justify-between gap-3">
															<p class="min-w-0 truncate text-xs text-unfocused">
																{generationMeta(generation)}
															</p>
															<Show when={formatAiCost(generation.cost)}>
																{(cost) => (
																	<span class="shrink-0 text-xs font-medium text-unfocused">
																		{cost()}
																	</span>
																)}
															</Show>
														</div>
													</div>
												</button>
												<div class="flex min-w-0 items-center gap-4 border-t border-border px-3 py-2">
													<button
														type="button"
														class="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-unfocused underline-offset-2 transition-colors duration-200 hover:text-title hover:underline focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base"
														onClick={() => useGenerationAsSource(generation)}
													>
														<FaSolidImage size={12} aria-hidden="true" />
														{T()("ai.media.image.generate.source.use")}
													</button>
													<button
														type="button"
														class="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-unfocused underline-offset-2 transition-colors duration-200 hover:text-title hover:underline focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60"
														disabled={isLoading()}
														onClick={() => retryGeneration(generation)}
													>
														<FaSolidArrowRotateLeft
															size={12}
															aria-hidden="true"
														/>
														{T()("ai.media.image.generate.response.retry")}
													</button>
												</div>
											</div>
										);
									}}
								</For>
							</div>
						</Show>
					</div>
				</div>
			</div>
			<ModalFooter>
				<div class="flex items-center gap-2">
					<Button
						type="button"
						theme="border-outline"
						size="medium"
						onClick={() => close(false)}
					>
						{T()("common.cancel")}
					</Button>
				</div>
				<div class="flex items-center gap-3">
					<Show when={sessionCost()}>
						{(cost) => (
							<p class="hidden text-xs text-body sm:block">
								{T()("ai.media.image.generate.cost.total", {
									cost: cost(),
								})}
							</p>
						)}
					</Show>
					<Button
						type="button"
						theme="primary"
						size="medium"
						onClick={() => {
							void accept();
						}}
						loading={aiModalsStore.get.isApplying}
						disabled={!selectedGeneration() || isLoading()}
					>
						{T()("ai.media.image.generate.modal.accept")}
					</Button>
				</div>
			</ModalFooter>
		</Modal>
	);
};

export default MediaImageGenerationModal;
