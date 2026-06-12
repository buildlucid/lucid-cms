import { HoverCard } from "@kobalte/core";
import { useQueryClient } from "@tanstack/solid-query";
import type {
	ErrorResultObj,
	MediaImageGenerateCompletionResponse,
	MediaImageGenerateResponse,
} from "@types";
import {
	FaSolidArrowRotateLeft,
	FaSolidArrowUpFromBracket,
	FaSolidImage,
	FaSolidMagicWandSparkles,
	FaSolidPaperPlane,
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
import { Label } from "@/components/Groups/Form/Label";
import { Select } from "@/components/Groups/Form/Select";
import { Textarea } from "@/components/Groups/Form/Textarea";
import { Modal } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import DetailsList from "@/components/Partials/DetailsList";
import Pill, { type PillButtonProps } from "@/components/Partials/Pill";
import { usePollingLoop } from "@/hooks/usePollingLoop";
import api from "@/services/api";
import { mediaImageCompletionReq } from "@/services/api/ai/useMediaImageCompletion";
import type {
	MediaImageGenerateBody,
	MediaImageGenerationOutputFormat,
	MediaImageGenerationQuality,
	MediaImageGenerationSize,
} from "@/services/api/ai/useMediaImageGenerate";
import aiModalsStore, { type AiImageSource } from "@/store/aiModalsStore";
import siteStore from "@/store/siteStore";
import T from "@/translations";
import { prepareAiImage } from "@/utils/ai-image";
import { LucidError } from "@/utils/error-handling";
import { getBodyError, getErrorObject } from "@/utils/error-helpers";
import formatAiCost from "@/utils/format-ai-cost";
import helpers from "@/utils/helpers";
import {
	clearStoredPendingMediaImageGeneration,
	type GenerateOptions,
	type GenerateValues,
	generationFileName,
	getPendingMediaImageGenerationStorageKey,
	imageGuidanceOptions,
	initialCompletionPollDelayMs,
	loadStoredPendingMediaImageGeneration,
	type MediaImageGenerationCandidate,
	type MediaImageGenerationGuidanceKey,
	type MediaImageGenerationPresetSize,
	type MediaImageGenerationResolutionPreset,
	type MediaImageGenerationSource,
	type PendingMediaImageGeneration,
	resolutionPresets,
	type SupportedImageMimeType,
	steadyCompletionPollAfterMs,
	steadyCompletionPollDelayMs,
	storePendingMediaImageGeneration,
} from "@/utils/media-image-generation";
import spawnToast from "@/utils/spawn-toast";
import GenerationHistory, {
	type AiGenerationHistoryItem,
} from "./GenerationHistory";

type WorkingMediaImageGeneration = {
	id: string;
	instruction: string;
	guidance?: MediaImageGenerationGuidanceKey;
	sourceLabel: string;
	source?: MediaImageGenerationSource;
	previousInstructions: string[];
	includeInPreviousInstructions: boolean;
	size: MediaImageGenerationSize;
	quality: MediaImageGenerationQuality;
	outputFormat: MediaImageGenerationOutputFormat;
};

const MediaImageGenerationModal: Component = () => {
	// -----------------------------
	// Hooks & State
	const queryClient = useQueryClient();

	const [generations, setGenerations] = createSignal<
		MediaImageGenerationCandidate[]
	>([]);
	const [workingGeneration, setWorkingGeneration] =
		createSignal<WorkingMediaImageGeneration>();
	const [pendingGeneration, setPendingGeneration] =
		createSignal<PendingMediaImageGeneration>();
	const [resumablePendingGenerationId, setResumablePendingGenerationId] =
		createSignal<string>();
	const [pollingRequestId, setPollingRequestId] = createSignal<string>();
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
	const [idempotencyKey, setIdempotencyKey] = createSignal(crypto.randomUUID());

	let responseColumnRef: HTMLDivElement | undefined;
	let sourceInputRef: HTMLInputElement | undefined;
	let generationId = 0;
	let abortController: AbortController | undefined;

	const completionPoller = usePollingLoop<PendingMediaImageGeneration>({
		poll: pollImageCompletion,
		onStart: (pending) => {
			setPollingRequestId(pending.requestId);
			aiModalsStore.setLoading(true);
		},
		onContinue: (pending) => {
			setPendingGeneration(pending);
			storePendingMediaImageGeneration(pending);
		},
		onStop: () => {
			setPollingRequestId(undefined);
			aiModalsStore.setLoading(false);
		},
		onError: handleCompletionPollingError,
	});

	// -----------------------------
	// Mutations
	const generateImage = api.ai.useMediaImageGenerate();

	// -----------------------------
	// Memos
	const featureEnabled = createMemo(() =>
		siteStore.get.isAiFeatureEnabled("imageGeneration"),
	);
	const modal = createMemo(() =>
		aiModalsStore.getModal("mediaImageGeneration"),
	);
	const target = createMemo(() => modal()?.data.target);
	const targetId = createMemo(() => modal()?.data.targetId);
	const isOpen = createMemo(() => modal() !== undefined);
	const isPollingCompletion = createMemo(
		() => pollingRequestId() !== undefined,
	);
	const isLoading = createMemo(
		() =>
			generateImage.action.isPending ||
			isPollingCompletion() ||
			workingGeneration() !== undefined,
	);
	const hasPendingGeneration = createMemo(
		() =>
			pendingGeneration() !== undefined || workingGeneration() !== undefined,
	);
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
	const selectedPendingGeneration = createMemo(() => {
		const pending = pendingGeneration();
		return pending?.id === selectedGenerationId() ? pending : undefined;
	});
	const selectedWorkingGeneration = createMemo(() => {
		const working = workingGeneration();
		if (working?.id === selectedGenerationId()) return working;

		return selectedPendingGeneration();
	});
	const selectedPendingGenerationIsResumable = createMemo(() => {
		const pending = selectedPendingGeneration();
		return (
			pending !== undefined && pending.id === resumablePendingGenerationId()
		);
	});
	const resumableSelectedPendingGeneration = createMemo(() => {
		if (!selectedPendingGenerationIsResumable()) return undefined;
		return selectedPendingGeneration();
	});
	const hasInstruction = createMemo(() => instruction().trim().length > 0);
	const canGenerate = createMemo(
		() =>
			!hasPendingGeneration() &&
			(hasInstruction() ||
				(guidance() !== undefined && source() !== undefined)),
	);
	const isCustomResolution = createMemo(() => resolutionPreset() === "custom");
	const generationSize = createMemo<MediaImageGenerationSize>(() => {
		if (isCustomResolution()) {
			return [Number(customWidth()), Number(customHeight())];
		}

		return resolutionPreset() as MediaImageGenerationPresetSize;
	});
	const historyItems = createMemo<AiGenerationHistoryItem[]>(() => {
		const items = generations().map((generation, index) => ({
			id: generation.id,
			label: generationLabel(index),
			meta: formatAiCost(generation.cost) ?? generationMeta(generation),
		}));
		const working = workingGeneration();
		if (working) {
			return [
				...items,
				{
					id: working.id,
					label: generationLabelFromId(working.id, items.length),
					meta: T()("ai.media.image.generate.history.generating.meta"),
				},
			];
		}

		const pending = pendingGeneration();
		if (!pending) return items;

		return [
			...items,
			{
				id: pending.id,
				label: generationLabelFromId(pending.id, items.length),
				meta: isPollingCompletion()
					? T()("ai.media.image.generate.history.generating.meta")
					: T()("ai.media.image.generate.response.inflight.title"),
			},
		];
	});
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
	function generationSourceLabel(generation: MediaImageGenerationCandidate) {
		return T()("ai.media.image.generate.source.generation.label", {
			id: generation.id.replace("generation-", ""),
		});
	}
	function nextGenerationId() {
		return `generation-${generationId + 1}`;
	}
	function syncGenerationId(id: string) {
		const numericId = Number(id.replace("generation-", ""));
		if (Number.isFinite(numericId) && numericId > generationId) {
			generationId = numericId;
		}
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
	function generationLabelFromId(id: string, fallbackIndex: number) {
		const numericId = Number(id.replace("generation-", ""));
		if (Number.isFinite(numericId) && numericId > 0) {
			return generationLabel(numericId - 1);
		}
		return generationLabel(fallbackIndex);
	}
	function guidanceLabel(key?: MediaImageGenerationGuidanceKey) {
		const option = imageGuidanceOptions.find((option) => option.key === key);
		return option ? T()(option.label) : undefined;
	}
	function generationSummary(generation: {
		instruction: string;
		guidance?: MediaImageGenerationGuidanceKey;
	}) {
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
	function generationSizeLabel(size: MediaImageGenerationSize | string) {
		if (Array.isArray(size)) return `${size[0]}x${size[1]}`;
		return size;
	}
	function generationQualityLabel(
		currentQuality: MediaImageGenerationQuality | string,
	) {
		switch (currentQuality) {
			case "medium":
				return T()("ai.media.image.generate.quality.option.medium");
			case "low":
				return T()("ai.media.image.generate.quality.option.low");
			case "high":
				return T()("ai.media.image.generate.quality.option.high");
			case "auto":
				return T()("ai.media.image.generate.quality.option.auto");
			default:
				return currentQuality;
		}
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
	function pendingGenerationDetails(
		generation: WorkingMediaImageGeneration | PendingMediaImageGeneration,
	) {
		return [
			{
				label: T()("ai.media.image.generate.source.label"),
				value: generation.sourceLabel,
				wrap: true,
			},
			{
				label: T()("ai.media.image.generate.resolution.label"),
				value: generationSizeLabel(generation.size),
			},
			{
				label: T()("ai.media.image.generate.quality.label"),
				value: generationQualityLabel(generation.quality),
			},
			{
				label: T()("ai.media.image.generate.format.label"),
				value: generationFormatLabel(generation.outputFormat),
			},
		];
	}
	function completedGenerationDetails(
		generation: MediaImageGenerationCandidate,
	) {
		const cost = formatAiCost(generation.cost);
		return [
			{
				label: T()("ai.media.image.generate.source.label"),
				value: generation.sourceLabel,
				wrap: true,
			},
			{
				label: T()("ai.media.image.generate.resolution.label"),
				value: generation.output.size,
			},
			{
				label: T()("ai.media.image.generate.quality.label"),
				value: generationQualityLabel(generation.output.quality),
			},
			{
				label: T()("ai.media.image.generate.format.label"),
				value: generationFormatLabel(generation.output.outputFormat),
			},
			{
				label: T()("ai.media.image.generate.response.size"),
				value: helpers.bytesToSize(generation.output.byteSize),
			},
			{
				label: T()("ai.media.image.generate.cost.label"),
				value: cost,
				show: cost !== undefined,
			},
		];
	}
	function createIdempotencyKey() {
		return crypto.randomUUID();
	}
	function resetIdempotencyKey() {
		setIdempotencyKey(createIdempotencyKey());
	}
	function isCompletionResponse(
		data: MediaImageGenerateResponse | MediaImageGenerateCompletionResponse,
	): data is MediaImageGenerateCompletionResponse {
		return "output" in data && "usage" in data;
	}
	function getNextCompletionPollDelay(pending: PendingMediaImageGeneration) {
		return Date.now() - pending.createdAt >= steadyCompletionPollAfterMs
			? steadyCompletionPollDelayMs
			: initialCompletionPollDelayMs;
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
		completionPoller.stop();
		abortController?.abort();
		abortController = undefined;
		setPollingRequestId(undefined);
	};
	const clear = () => {
		setGenerations([]);
		setWorkingGeneration(undefined);
		setPendingGeneration(undefined);
		setResumablePendingGenerationId(undefined);
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
	function buildCandidateFromCompletion(
		pending: PendingMediaImageGeneration,
		response: MediaImageGenerateCompletionResponse,
	): MediaImageGenerationCandidate {
		return {
			id: pending.id,
			requestId: response.requestId,
			instruction: pending.instruction,
			guidance: pending.guidance,
			sourceLabel: pending.sourceLabel,
			source: pending.source,
			previousInstructions: pending.previousInstructions,
			includeInPreviousInstructions: pending.includeInPreviousInstructions,
			size: pending.size,
			quality: pending.quality,
			outputFormat: pending.outputFormat,
			cost: response.usage.cost,
			output: response.output,
		};
	}
	function finishPendingGeneration(
		pending: PendingMediaImageGeneration,
		response: MediaImageGenerateCompletionResponse,
	) {
		const candidate = buildCandidateFromCompletion(pending, response);

		setGenerations((previous) => [...previous, candidate]);
		setSelectedGenerationId(candidate.id);
		setPendingGeneration(undefined);
		setResumablePendingGenerationId(undefined);
		setPollingRequestId(undefined);
		clearStoredPendingMediaImageGeneration(pending, targetId());
		resetIdempotencyKey();
		aiModalsStore.setLoading(false);

		if (aiModalsStore.isOpen("mediaImageGeneration")) {
			spawnToast({
				title: T()("toasts.ai.media.image.generate.success.title"),
				message: T()("toasts.ai.media.image.generate.success.message"),
				status: "success",
			});
		}
	}
	function scheduleCompletionPoll(
		pending: PendingMediaImageGeneration,
		delay = getNextCompletionPollDelay(pending),
	) {
		completionPoller.start(pending, delay);
	}
	async function pollImageCompletion(
		pending: PendingMediaImageGeneration,
		signal: AbortSignal,
	) {
		if (
			pendingGeneration()?.requestId !== pending.requestId ||
			!aiModalsStore.isOpen("mediaImageGeneration")
		) {
			return { type: "complete" as const };
		}

		setClientError(undefined);

		const response = await mediaImageCompletionReq({
			requestId: pending.requestId,
			signal,
		});
		if (!aiModalsStore.isOpen("mediaImageGeneration")) {
			return { type: "complete" as const };
		}

		if (isCompletionResponse(response.data)) {
			finishPendingGeneration(pending, response.data);
			for (const query of ["ai.getUsage", "ai.getUsageChart"]) {
				queryClient.invalidateQueries({
					queryKey: [query],
				});
			}
			return { type: "complete" as const };
		}

		const updatedPending = {
			...pending,
			status: response.data.status,
		} satisfies PendingMediaImageGeneration;

		return {
			type: "continue" as const,
			item: updatedPending,
			delay: getNextCompletionPollDelay(updatedPending),
		};
	}
	function handleCompletionPollingError(
		error: unknown,
		pending: PendingMediaImageGeneration,
	) {
		const message =
			error instanceof LucidError
				? error.message
				: error instanceof Error
					? error.message
					: T()("toasts.ai.media.image.generate.error.message");
		setClientError(message);

		if (error instanceof LucidError) {
			clearStoredPendingMediaImageGeneration(pending, targetId());
			setPendingGeneration(undefined);
			setResumablePendingGenerationId(undefined);
		}

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
	}
	function resumePendingGeneration(pending: PendingMediaImageGeneration) {
		setSelectedGenerationId(pending.id);
		setResumablePendingGenerationId(undefined);
		setPendingGeneration(pending);
		scheduleCompletionPoll(pending, 0);
	}
	function discardPendingGeneration(pending = pendingGeneration()) {
		if (!pending) return;

		abortRequest();
		clearStoredPendingMediaImageGeneration(pending, targetId());
		setPendingGeneration(undefined);
		setResumablePendingGenerationId(undefined);
		if (selectedGenerationId() === pending.id) {
			const completedGenerations = generations();
			setSelectedGenerationId(
				completedGenerations[completedGenerations.length - 1]?.id,
			);
		}
	}
	const generateImageRequest = async (
		values: GenerateValues,
		options: GenerateOptions = {},
		requestTarget = target(),
		requestTargetId = targetId(),
	) => {
		if (!requestTarget || !requestTargetId) return;

		const id = nextGenerationId();
		const requestSource = options.source ?? source();
		const previousInstructions =
			options.previousInstructions ?? buildPreviousInstructions();
		const draft: WorkingMediaImageGeneration = {
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
		};

		try {
			abortRequest();
			setWorkingGeneration(draft);
			setSelectedGenerationId(id);
			setResumablePendingGenerationId(undefined);
			abortController = new AbortController();
			setClientError(undefined);
			generateImage.reset();
			aiModalsStore.setLoading(true);

			const image = await buildRequestImage(
				requestSource,
				abortController.signal,
			);
			const storageKey =
				getPendingMediaImageGenerationStorageKey(requestTargetId);
			if (!storageKey) {
				setWorkingGeneration(undefined);
				return;
			}

			const currentIdempotencyKey = idempotencyKey();
			const response = await generateImage.action.mutateAsync({
				signal: abortController.signal,
				shouldToast: () => false,
				idempotencyKey: currentIdempotencyKey,
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

			const pending: PendingMediaImageGeneration = {
				...draft,
				requestId: response.data.requestId,
				idempotencyKey: currentIdempotencyKey,
				targetId: requestTargetId,
				status: response.data.status,
				createdAt: Date.now(),
				storageKey,
			};

			syncGenerationId(id);
			setWorkingGeneration(undefined);
			setPendingGeneration(pending);
			setSelectedGenerationId(id);
			storePendingMediaImageGeneration(pending);
			scheduleCompletionPoll(pending, initialCompletionPollDelayMs);
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") return;

			const message =
				error instanceof LucidError
					? error.message
					: error instanceof Error
						? error.message
						: T()("toasts.ai.media.image.generate.error.message");
			setClientError(message);
			setWorkingGeneration(undefined);
			if (selectedGenerationId() === id) {
				const completedGenerations = generations();
				setSelectedGenerationId(
					completedGenerations[completedGenerations.length - 1]?.id,
				);
			}
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
				if (!completionPoller.isActive()) {
					aiModalsStore.setLoading(false);
				}
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

			await requestTarget.setFile(file, {
				origin: generation.source ? "ai_modified" : "ai_generated",
				aiGenerationRequestId: generation.requestId,
			});
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
		resetIdempotencyKey();
	});

	createEffect(
		on(
			() => [
				instruction(),
				guidance() ?? "",
				resolutionPreset(),
				customWidth(),
				customHeight(),
				quality(),
				outputFormat(),
				source()?.id ?? "",
				generations()
					.map(
						(generation) =>
							`${generation.id}:${generation.includeInPreviousInstructions}:${generation.instruction}`,
					)
					.join("|"),
			],
			() => resetIdempotencyKey(),
			{ defer: true },
		),
	);

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
		if (!featureEnabled() && isOpen()) close(false);
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

			abortRequest();
			clear();
			const targetSource = buildTargetSource(activeTarget.image());
			setInitialSource(targetSource);
			setSource(targetSource);

			const storedPending = loadStoredPendingMediaImageGeneration(id);
			if (storedPending) {
				syncGenerationId(storedPending.id);
				setPendingGeneration(storedPending);
				setResumablePendingGenerationId(storedPending.id);
				setSelectedGenerationId(storedPending.id);
			}
		}),
	);

	onCleanup(() => {
		abortRequest();
		aiModalsStore.reset();
	});

	// -----------------------------
	// Render
	return (
		<Show when={featureEnabled()}>
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
				<div class="grid min-w-0 w-full items-stretch gap-0 lg:grid-cols-[minmax(27rem,0.72fr)_minmax(0,1fr)]">
					<div class="flex min-h-130 min-w-0 w-full flex-col gap-4 border-b border-border bg-card-base p-4 md:p-6 lg:border-r lg:border-b-0">
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
													source() === undefined &&
													initialSource() !== undefined
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
												aria-label={T()(
													"ai.media.image.generate.source.replace",
												)}
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
							<Label
								id="ai-media-image-generation-guidance"
								label={T()("ai.generation.guidance.label")}
								theme="basic"
								hideOptionalText
							/>
							<div class="flex min-w-0 flex-wrap gap-2">
								<For each={imageGuidanceOptions}>
									{(option) => {
										const selected = createMemo(
											() => guidance() === option.key,
										);
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
													theme={selected() ? "primary-opaque" : "outline"}
													aria-pressed={selected()}
													disabled={isLoading()}
													onClick={() =>
														setGuidance(selected() ? undefined : option.key)
													}
												>
													{optionLabel()}
												</HoverCard.Trigger>
												<HoverCard.Portal>
													<HoverCard.Content class="z-70 bg-card-base w-80 mt-2 rounded-md border border-border p-3 shadow-xs">
														<p class="mb-1 text-sm font-semibold text-title">
															{optionLabel()}
														</p>
														<p class="text-sm text-card-contrast">
															{optionInstruction()}
														</p>
													</HoverCard.Content>
												</HoverCard.Portal>
											</HoverCard.Root>
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
									if (
										(event.metaKey || event.ctrlKey) &&
										event.key === "Enter"
									) {
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
								{(error) => (
									<div class="mt-3 min-w-0 rounded-md border border-error-base/30 bg-error-base/10 p-3">
										<p class="text-sm text-error-base">{error()}</p>
									</div>
								)}
							</Show>
							<div class="mt-4">
								<Button
									type="submit"
									theme="secondary"
									size="medium"
									classes="w-full min-w-0! gap-2"
									loading={isLoading()}
									disabled={!canGenerate()}
								>
									<FaSolidPaperPlane size={12} aria-hidden="true" />
									{isLoading()
										? T()("ai.media.image.generate.modal.generating")
										: T()("ai.media.image.generate.modal.generate")}
								</Button>
							</div>
						</form>
					</div>
					<div class="dotted-background relative flex max-h-[min(86vh,820px)] min-h-130 min-w-0 flex-col self-stretch overflow-hidden px-4 md:px-6">
						<div class="relative min-h-0 min-w-0 flex-1">
							<div
								class={
									historyItems().length > 0
										? "relative z-10 flex h-full min-h-0 min-w-0 flex-col gap-3 md:grid md:grid-cols-[116px_minmax(0,1fr)] md:gap-4"
										: "relative z-10 flex h-full min-h-0 min-w-0 flex-col"
								}
							>
								<Show when={historyItems().length > 0}>
									<GenerationHistory
										id="ai-media-image-generation-history"
										items={historyItems()}
										activeItemId={selectedGenerationId()}
										onSelect={setSelectedGenerationId}
									/>
								</Show>
								<div
									ref={responseColumnRef}
									class="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto pt-0 pr-1 pb-0 md:py-6"
								>
									<Show
										when={selectedWorkingGeneration()}
										fallback={
											<Show when={selectedGeneration()}>
												{(generation) => (
													<div class="min-w-0 space-y-3">
														<div class="rectangle-background relative flex min-h-72 w-full items-center justify-center overflow-hidden rounded-md border border-border bg-card-base">
															<img
																src={generation().output.url}
																alt=""
																class="relative z-10 h-full max-h-96 w-full object-contain p-4"
															/>
														</div>
														<div class="space-y-3">
															<Show when={generationSummary(generation())}>
																{(summary) => (
																	<div class="min-w-0 rounded-lg border border-border bg-background-base p-3">
																		<p class="line-clamp-3 text-sm leading-5 text-body">
																			{summary()}
																		</p>
																	</div>
																)}
															</Show>
															<div class="min-w-0 rounded-lg border border-border bg-background-base p-3">
																<DetailsList
																	type="text"
																	theme="contained"
																	items={completedGenerationDetails(
																		generation(),
																	)}
																/>
															</div>
															<div class="flex min-w-0 flex-wrap gap-2">
																<Button
																	type="button"
																	theme="secondary"
																	size="small"
																	classes="gap-2"
																	onClick={() =>
																		useGenerationAsSource(generation())
																	}
																>
																	<FaSolidImage size={12} aria-hidden="true" />
																	{T()("ai.media.image.generate.source.use")}
																</Button>
																<Button
																	type="button"
																	theme="border-outline"
																	size="small"
																	classes="gap-2"
																	disabled={isLoading()}
																	onClick={() => retryGeneration(generation())}
																>
																	<FaSolidArrowRotateLeft
																		size={12}
																		aria-hidden="true"
																	/>
																	{T()(
																		"ai.media.image.generate.response.retry",
																	)}
																</Button>
															</div>
														</div>
													</div>
												)}
											</Show>
										}
									>
										{(pending) => (
											<div class="min-w-0 space-y-3">
												<div class="rectangle-background relative flex min-h-72 w-full items-center justify-center overflow-hidden rounded-md border border-border bg-card-base">
													<span class="skeleton absolute inset-0 z-10 opacity-80" />
													<div class="relative z-20 flex min-w-0 max-w-xs flex-col items-center gap-2 px-4 text-center">
														<span
															class="ai-action-button__surface flex h-8 min-w-8 items-center justify-center rounded-md border border-border text-primary-base"
															data-loading={isLoading()}
														>
															<FaSolidMagicWandSparkles
																size={12}
																aria-hidden="true"
															/>
														</span>
														<div class="min-w-0 max-w-60">
															<p class="text-xs font-medium text-unfocused">
																{T()(
																	"ai.media.image.generate.response.inflight.title",
																)}
															</p>
														</div>
													</div>
												</div>
												<div class="space-y-3">
													<Show when={generationSummary(pending())}>
														{(summary) => (
															<div class="min-w-0 rounded-lg border border-border bg-background-base p-3">
																<p class="line-clamp-3 text-sm leading-5 text-body">
																	{summary()}
																</p>
															</div>
														)}
													</Show>
													<div class="min-w-0 rounded-lg border border-border bg-background-base p-3">
														<DetailsList
															type="text"
															theme="contained"
															items={pendingGenerationDetails(pending())}
														/>
													</div>
													<Show when={resumableSelectedPendingGeneration()}>
														{(resumablePending) => (
															<div class="flex min-w-0 flex-wrap gap-2">
																<Button
																	type="button"
																	theme="border-outline"
																	size="small"
																	classes="gap-2"
																	disabled={isLoading()}
																	onClick={() =>
																		resumePendingGeneration(resumablePending())
																	}
																>
																	<FaSolidArrowRotateLeft
																		size={12}
																		aria-hidden="true"
																	/>
																	{T()(
																		"ai.media.image.generate.response.inflight.resume",
																	)}
																</Button>
																<Button
																	type="button"
																	theme="danger-outline"
																	size="small"
																	classes="gap-2"
																	disabled={isLoading()}
																	onClick={() =>
																		discardPendingGeneration(resumablePending())
																	}
																>
																	<FaSolidXmark size={12} aria-hidden="true" />
																	{T()(
																		"ai.media.image.generate.response.inflight.discard",
																	)}
																</Button>
															</div>
														)}
													</Show>
												</div>
											</div>
										)}
									</Show>
								</div>
							</div>
						</div>
						<div class="relative z-10 -mx-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card-base/95 p-6 backdrop-blur-sm md:-mx-6">
							<div class="min-w-0 flex-1">
								<Show when={sessionCost()}>
									{(cost) => (
										<p class="text-xs text-body">
											{T()("ai.media.image.generate.cost.total", {
												cost: cost(),
											})}
										</p>
									)}
								</Show>
							</div>
							<div class="flex shrink-0 items-center gap-3">
								<Button
									type="button"
									theme="border-outline"
									size="medium"
									onClick={() => close(false)}
								>
									{T()("common.cancel")}
								</Button>
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
						</div>
					</div>
				</div>
			</Modal>
		</Show>
	);
};

export default MediaImageGenerationModal;
