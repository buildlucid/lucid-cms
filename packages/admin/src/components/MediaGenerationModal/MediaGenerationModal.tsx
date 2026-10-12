import { useQueryClient } from "@tanstack/solid-query";
import type {
	MediaGenerateCompletionPollResponse,
	MediaGenerateCompletionResponse,
	MediaGenerationType,
} from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
	Show,
} from "solid-js";
import AiGenerationHistory, {
	type AiGenerationHistoryItem,
} from "@/components/AiGenerationHistory/AiGenerationHistory";
import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/Modal";
import Select from "@/components/Select/Select";
import useMediaGeneration from "@/hooks/useMediaGeneration/useMediaGeneration";
import { usePollingLoop } from "@/hooks/usePollingLoop/usePollingLoop";
import api from "@/services/api";
import { mediaCompletionReq } from "@/services/api/ai/useMediaCompletion";
import type { MediaImageGenerateBody } from "@/services/api/ai/useMediaImageGenerate";
import { queryKeys } from "@/services/query-keys";
import aiModalsStore, {
	type AiImageSource,
} from "@/store/aiModalsStore/aiModalsStore";
import T from "@/translations";
import { prepareAiImage } from "@/utils/ai-image";
import { LucidError } from "@/utils/error-handling";
import { getBodyError, getErrorObject } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import spawnToast from "@/utils/spawn-toast";
import AudioGenerationForm from "./parts/AudioGenerationForm";
import CompletedGeneration from "./parts/CompletedGeneration";
import GenerationModelPicker from "./parts/GenerationModelPicker";
import ImageGenerationForm from "./parts/ImageGenerationForm";
import PendingGeneration from "./parts/PendingGeneration";
import TypeOption from "./parts/TypeOption";
import type {
	AudioGenerationValues,
	ImageGenerationValues,
	MediaGenerationCandidate,
	MediaGenerationSettings,
	MediaImageGenerationSource,
	PendingMediaGeneration,
	WorkingMediaGeneration,
} from "./types";
import {
	generationFileName,
	generationNumber,
	normalizeMimeType,
} from "./utils/generation-helpers";
import {
	clearStoredPendingMediaGeneration,
	getPendingMediaGenerationStorageKey,
	initialCompletionPollDelayMs,
	loadStoredPendingMediaGeneration,
	steadyCompletionPollAfterMs,
	steadyCompletionPollDelayMs,
	storePendingMediaGeneration,
} from "./utils/pending-generation";

/** Generates images or speech for a target, locking the media type when only one is accepted. */
const MediaGenerationModal: Component = () => {
	// -----------------------------
	// State & Hooks
	const queryClient = useQueryClient();
	const mediaGeneration = useMediaGeneration();

	const [type, setType] = createSignal<MediaGenerationType>("image");
	const [modelIds, setModelIds] = createSignal<
		Partial<Record<MediaGenerationType, string>>
	>({});
	const [generations, setGenerations] = createSignal<
		MediaGenerationCandidate[]
	>([]);
	const [workingGeneration, setWorkingGeneration] =
		createSignal<WorkingMediaGeneration>();
	const [pendingGeneration, setPendingGeneration] =
		createSignal<PendingMediaGeneration>();
	const [resumablePendingGenerationId, setResumablePendingGenerationId] =
		createSignal<string>();
	const [pollingRequestId, setPollingRequestId] = createSignal<string>();
	const [selectedGenerationId, setSelectedGenerationId] =
		createSignal<string>();
	const [source, setSource] = createSignal<MediaImageGenerationSource>();
	const [initialSource, setInitialSource] =
		createSignal<MediaImageGenerationSource>();
	const [clientError, setClientError] = createSignal<string>();
	const [idempotencyKey, setIdempotencyKey] = createSignal(crypto.randomUUID());

	let responseColumnRef: HTMLDivElement | undefined;
	let generationId = 0;
	//* Keep one session ID across attempts until the modal is cleared.
	let sessionId = crypto.randomUUID();
	let abortController: AbortController | undefined;

	const completionPoller = usePollingLoop<PendingMediaGeneration>({
		poll: pollCompletion,
		onStart: (pending) => {
			setPollingRequestId(pending.requestId);
			aiModalsStore.setLoading(true);
		},
		onContinue: (pending) => {
			setPendingGeneration(pending);
			storePendingMediaGeneration(pending);
		},
		onStop: () => {
			setPollingRequestId(undefined);
			aiModalsStore.setLoading(false);
		},
		onError: handleCompletionPollingError,
	});

	// -----------------------------
	// Memos
	const modal = createMemo(() => aiModalsStore.getModal("mediaGeneration"));
	const target = createMemo(() => modal()?.data.target);
	const targetId = createMemo(() => modal()?.data.targetId);
	const isOpen = createMemo(() => modal() !== undefined);
	const types = createMemo(() => mediaGeneration.targetTypes(target()));

	// -----------------------------
	// Queries & Mutations
	const models = api.ai.useGetMediaModels({
		type,
		enabled: () => isOpen() && types().includes(type()),
	});
	const generateImage = api.ai.useMediaImageGenerate();
	const generateAudio = api.ai.useMediaAudioGenerate();

	// -----------------------------
	// Memos
	const typeOptions = createMemo(() =>
		types().map((value) => ({
			value,
			label: T()(`ai.media.generate.type.option.${value}`),
		})),
	);
	const model = createMemo(() => modelIds()[type()]);
	const catalog = createMemo(() => models.data?.data);
	const selectedModel = createMemo(() =>
		catalog()?.models.find((option) => option.id === model()),
	);
	const imageModel = createMemo(() => {
		const selected = selectedModel();
		return selected && "aspectRatios" in selected ? selected : undefined;
	});
	const audioModel = createMemo(() => {
		const selected = selectedModel();
		return selected && "voices" in selected ? selected : undefined;
	});
	const isPollingCompletion = createMemo(
		() => pollingRequestId() !== undefined,
	);
	const isLoading = createMemo(
		() =>
			generateImage.action.isPending ||
			generateAudio.action.isPending ||
			isPollingCompletion() ||
			workingGeneration() !== undefined,
	);
	const hasPendingGeneration = createMemo(
		() =>
			pendingGeneration() !== undefined || workingGeneration() !== undefined,
	);
	const responseError = createMemo(
		() =>
			clientError() ??
			(type() === "image"
				? generateImage.errors()?.message
				: generateAudio.errors()?.message) ??
			(models.isError
				? T()("ai.media.generate.models.unavailable")
				: undefined),
	);
	const imageGenerationErrors = createMemo(() =>
		getErrorObject(getBodyError("generation", generateImage.errors)),
	);
	const selectedGeneration = createMemo(() =>
		generations().find(
			(generation) => generation.id === selectedGenerationId(),
		),
	);
	const selectedWorkingGeneration = createMemo(() => {
		const working = workingGeneration();
		if (working?.id === selectedGenerationId()) return working;

		const pending = pendingGeneration();
		return pending?.id === selectedGenerationId() ? pending : undefined;
	});
	const resumableSelectedPendingGeneration = createMemo(() => {
		const pending = pendingGeneration();
		return pending !== undefined &&
			pending.id === selectedGenerationId() &&
			pending.id === resumablePendingGenerationId()
			? pending
			: undefined;
	});
	const historyItems = createMemo<AiGenerationHistoryItem[]>(() => {
		const items = generations().map((generation, index) => ({
			id: generation.id,
			label: generationLabel(index),
			meta: generationMeta(generation),
		}));
		const working = workingGeneration();
		if (working) {
			return [
				...items,
				{
					id: working.id,
					label: generationLabelFromId(working.id, items.length),
					meta: T()("ai.media.generate.history.generating.meta"),
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
					? T()("ai.media.generate.history.generating.meta")
					: T()("ai.media.generate.response.inflight.title"),
			},
		];
	});

	// -----------------------------
	// Functions
	function setModel(modelId?: string) {
		setModelIds((current) => ({ ...current, [type()]: modelId }));
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
	function nextGenerationId() {
		return `generation-${generationId + 1}`;
	}
	function syncGenerationId(id: string) {
		const numericId = generationNumber(id);
		if (Number.isFinite(numericId) && numericId > generationId) {
			generationId = numericId;
		}
	}
	function generationLabel(index: number) {
		return T()("ai.media.generate.response.item.label", {
			count: index + 1,
		});
	}
	function generationLabelFromId(id: string, fallbackIndex: number) {
		const numericId = generationNumber(id);
		if (Number.isFinite(numericId) && numericId > 0) {
			return generationLabel(numericId - 1);
		}
		return generationLabel(fallbackIndex);
	}
	function generationMeta(generation: MediaGenerationCandidate) {
		const { result, settings } = generation;
		const details =
			result.type === "image"
				? [result.output.aspectRatio, result.output.resolution]
				: [settings.type === "audio" ? settings.voiceName : ""];

		return [...details, helpers.bytesToSize(result.output.byteSize)]
			.filter(Boolean)
			.join(" · ");
	}
	function resetIdempotencyKey() {
		setIdempotencyKey(crypto.randomUUID());
	}
	function isCompletionResponse(
		data: MediaGenerateCompletionPollResponse,
	): data is MediaGenerateCompletionResponse {
		return "output" in data && "usage" in data;
	}
	function getNextCompletionPollDelay(pending: PendingMediaGeneration) {
		return Date.now() - pending.createdAt >= steadyCompletionPollAfterMs
			? steadyCompletionPollDelayMs
			: initialCompletionPollDelayMs;
	}
	function buildPreviousInstructions() {
		return generations()
			.flatMap((generation) =>
				generation.settings.type === "image" &&
				generation.settings.includeInPreviousInstructions &&
				generation.settings.instruction.trim().length > 0
					? [generation.settings.instruction]
					: [],
			)
			.slice(-10);
	}
	async function buildRequestImage(
		currentSource: MediaImageGenerationSource | undefined,
		signal: AbortSignal,
	): Promise<MediaImageGenerateBody["image"]> {
		if (!currentSource) return undefined;

		//* Inline image data lets Lucid read sources served behind CMS authentication.
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
		sessionId = crypto.randomUUID();
		setGenerations([]);
		setWorkingGeneration(undefined);
		setPendingGeneration(undefined);
		setResumablePendingGenerationId(undefined);
		setSelectedGenerationId(undefined);
		setSource(undefined);
		setInitialSource(undefined);
		setClientError(undefined);
		generateImage.reset();
		generateAudio.reset();
		aiModalsStore.setLoading(false);
		aiModalsStore.setApplying(false);
	};
	const close = (open: boolean) => {
		if (open) return;

		abortRequest();
		clear();
		aiModalsStore.close();
	};
	const changeType = (value: MediaGenerationType) => {
		if (value === type()) return;
		setType(value);
		setClientError(undefined);
		generateImage.reset();
		generateAudio.reset();
	};
	const useGenerationAsSource = (generation: MediaGenerationCandidate) => {
		if (generation.result.type !== "image") return;

		setSource({
			id: `source-${generation.id}`,
			type: "generation",
			label: T()("ai.media.image.generate.source.generation.label", {
				id: generationNumber(generation.id),
			}),
			image: {
				url: generation.result.output.url,
				filename: generationFileName(generation.result.output),
				mimeType: normalizeMimeType(generation.result.output.mimeType),
			},
		});
	};
	function selectLatestGeneration() {
		const completedGenerations = generations();
		setSelectedGenerationId(
			completedGenerations[completedGenerations.length - 1]?.id,
		);
	}
	function finishPendingGeneration(
		pending: PendingMediaGeneration,
		result: MediaGenerateCompletionResponse,
	) {
		const candidate: MediaGenerationCandidate = {
			id: pending.id,
			requestId: result.requestId,
			settings: pending.settings,
			result,
		};

		setGenerations((previous) => [...previous, candidate]);
		setSelectedGenerationId(candidate.id);
		setPendingGeneration(undefined);
		setResumablePendingGenerationId(undefined);
		setPollingRequestId(undefined);
		clearStoredPendingMediaGeneration(pending, targetId());
		resetIdempotencyKey();
		aiModalsStore.setLoading(false);

		if (aiModalsStore.isOpen("mediaGeneration")) {
			spawnToast({
				title: T()("toasts.ai.media.generate.success.title"),
				message: T()("toasts.ai.media.generate.success.message"),
				status: "success",
			});
		}
	}
	function scheduleCompletionPoll(
		pending: PendingMediaGeneration,
		delay = getNextCompletionPollDelay(pending),
	) {
		completionPoller.start(pending, delay);
	}
	async function pollCompletion(
		pending: PendingMediaGeneration,
		signal: AbortSignal,
	) {
		if (
			pendingGeneration()?.requestId !== pending.requestId ||
			!aiModalsStore.isOpen("mediaGeneration")
		) {
			return { type: "complete" as const };
		}

		setClientError(undefined);

		const response = await mediaCompletionReq({
			requestId: pending.requestId,
			signal,
		});
		if (!aiModalsStore.isOpen("mediaGeneration")) {
			return { type: "complete" as const };
		}

		if (isCompletionResponse(response.data)) {
			finishPendingGeneration(pending, response.data);
			for (const queryKey of [queryKeys.ai.usage(), queryKeys.ai.credits()]) {
				queryClient.invalidateQueries({
					queryKey,
				});
			}
			return { type: "complete" as const };
		}

		const updatedPending = {
			...pending,
			status: response.data.status,
		} satisfies PendingMediaGeneration;

		return {
			type: "continue" as const,
			item: updatedPending,
			delay: getNextCompletionPollDelay(updatedPending),
		};
	}
	function handleCompletionPollingError(
		error: unknown,
		pending: PendingMediaGeneration,
	) {
		const message =
			error instanceof Error
				? error.message
				: T()("toasts.ai.media.generate.error.message");
		setClientError(message);

		if (error instanceof LucidError) {
			clearStoredPendingMediaGeneration(pending, targetId());
			setPendingGeneration(undefined);
			setResumablePendingGenerationId(undefined);
			return;
		}

		if (aiModalsStore.isOpen("mediaGeneration")) {
			spawnToast({
				title: T()("toasts.ai.media.generate.error.title"),
				message,
				status: "error",
			});
		}
	}
	function resumePendingGeneration(pending: PendingMediaGeneration) {
		setSelectedGenerationId(pending.id);
		setResumablePendingGenerationId(undefined);
		setPendingGeneration(pending);
		scheduleCompletionPoll(pending, 0);
	}
	function discardPendingGeneration(pending: PendingMediaGeneration) {
		abortRequest();
		clearStoredPendingMediaGeneration(pending, targetId());
		setPendingGeneration(undefined);
		setResumablePendingGenerationId(undefined);
		if (selectedGenerationId() === pending.id) selectLatestGeneration();
	}
	/** Sends a generation to Lucid and polls for it until it finishes. */
	const generate = async (
		settings: MediaGenerationSettings,
		requestTarget = target(),
		requestTargetId = targetId(),
	) => {
		if (!requestTarget || !requestTargetId) return;

		const id = nextGenerationId();
		try {
			abortRequest();
			setWorkingGeneration({ id, settings });
			setSelectedGenerationId(id);
			setResumablePendingGenerationId(undefined);
			abortController = new AbortController();
			setClientError(undefined);
			generateImage.reset();
			generateAudio.reset();
			aiModalsStore.setLoading(true);

			const storageKey = getPendingMediaGenerationStorageKey(requestTargetId);
			if (!storageKey) {
				setWorkingGeneration(undefined);
				return;
			}

			const currentIdempotencyKey = idempotencyKey();
			const request = {
				signal: abortController.signal,
				shouldToast: () => false,
				idempotencyKey: currentIdempotencyKey,
			};
			const response =
				settings.type === "image"
					? await generateImage.action.mutateAsync({
							...request,
							body: {
								sessionId,
								instruction: settings.instruction,
								guidance: settings.guidance,
								previousInstructions:
									settings.previousInstructions.length > 0
										? settings.previousInstructions
										: undefined,
								image: await buildRequestImage(
									settings.source,
									abortController.signal,
								),
								generation: {
									model: settings.model,
									aspectRatio: settings.aspectRatio,
									resolution: settings.resolution ?? undefined,
									quality: settings.quality ?? undefined,
									outputFormat: settings.outputFormat ?? undefined,
								},
							},
						})
					: await generateAudio.action.mutateAsync({
							...request,
							body: {
								sessionId,
								script: settings.script,
								instruction: settings.instruction || undefined,
								generation: {
									model: settings.model,
									voice: settings.voice,
								},
							},
						});
			if (!aiModalsStore.isOpen("mediaGeneration")) return;

			const pending: PendingMediaGeneration = {
				id,
				settings,
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
			storePendingMediaGeneration(pending);
			scheduleCompletionPoll(pending, initialCompletionPollDelayMs);
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") return;

			const message =
				error instanceof Error
					? error.message
					: T()("toasts.ai.media.generate.error.message");
			setClientError(message);
			setWorkingGeneration(undefined);
			if (selectedGenerationId() === id) selectLatestGeneration();
			if (
				!(error instanceof LucidError) &&
				aiModalsStore.isOpen("mediaGeneration")
			) {
				spawnToast({
					title: T()("toasts.ai.media.generate.error.title"),
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
	const generateImageFrom = (values: ImageGenerationValues) => {
		const selected = imageModel();
		if (!selected) return;

		const currentSource = selected.sourceImage ? source() : undefined;
		void generate({
			...values,
			type: "image",
			model: selected.id,
			modelName: selected.name,
			sourceLabel:
				currentSource?.label ?? T()("ai.media.image.generate.source.none"),
			source: currentSource,
			previousInstructions: buildPreviousInstructions(),
			includeInPreviousInstructions: true,
		});
	};
	const generateAudioFrom = (values: AudioGenerationValues) => {
		const selected = audioModel();
		if (!selected) return;

		void generate({
			type: "audio",
			model: selected.id,
			modelName: selected.name,
			script: values.script,
			instruction: values.instruction ?? "",
			voice: values.voice,
			voiceName:
				selected.voices.find((voice) => voice.id === values.voice)?.name ??
				values.voice,
		});
	};
	const retryGeneration = (generation: MediaGenerationCandidate) => {
		void generate(
			generation.settings.type === "image"
				? { ...generation.settings, includeInPreviousInstructions: false }
				: generation.settings,
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

			const { output } = generation.result;
			const response = await fetch(output.url, {
				signal: abortController.signal,
			});
			if (!response.ok) {
				throw new Error(T()("ai.media.generate.accept.download.failed"));
			}

			const blob = await response.blob();
			const file = new File([blob], generationFileName(output), {
				type: blob.type || output.mimeType,
			});

			await requestTarget.setFile(file, {
				origin:
					generation.settings.type === "image" && generation.settings.source
						? "ai_modified"
						: "ai_generated",
				aiGenerationRequestId: generation.requestId,
			});
			close(false);
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") return;

			const message =
				error instanceof Error
					? error.message
					: T()("ai.media.generate.accept.download.failed");
			setClientError(message);
			spawnToast({
				title: T()("toasts.ai.media.generate.accept.error.title"),
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
		if (isOpen()) resetIdempotencyKey();
	});
	createEffect(on([type, model], () => resetIdempotencyKey(), { defer: true }));
	createEffect(() => {
		const current = catalog();
		if (!current) return;
		if (!current.models.some((option) => option.id === model())) {
			setModel(current.default);
		}
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
		if (isOpen() && types().length === 0) close(false);
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

			const storedPending = loadStoredPendingMediaGeneration(id);
			const pendingType = storedPending?.settings.type;
			changeType(
				pendingType && types().includes(pendingType)
					? pendingType
					: (types()[0] ?? "image"),
			);
			if (storedPending && pendingType === type()) {
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
		<Modal.Root open={isOpen()} onOpenChange={close} size="lg">
			<div class="grid min-w-0 w-full items-stretch gap-0 lg:grid-cols-[minmax(27rem,0.72fr)_minmax(0,1fr)]">
				<div class="flex min-h-130 min-w-0 w-full flex-col border-b border-border bg-card lg:border-r lg:border-b-0">
					<div class="border-b border-border p-4 md:px-6">
						<Select
							id="ai-media-generation-type"
							name="ai-media-generation-type"
							aria-label={T()("ai.media.generate.type.label")}
							value={type()}
							onChange={(value) => {
								const next = types().find((option) => option === value);
								if (next) changeType(next);
							}}
							options={typeOptions()}
							renderValue={({ option }) => (
								<TypeOption type={option.value} label={option.label} />
							)}
							renderOption={({ option }) => (
								<TypeOption type={option.value} label={option.label} />
							)}
							disabled={types().length < 2 || hasPendingGeneration()}
						/>
					</div>
					<div class="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
						{/* both forms stay mounted, so switching type keeps what was typed */}
						<Show when={types().includes("image")}>
							<div
								class="flex min-w-0 flex-col gap-4"
								hidden={type() !== "image"}
							>
								<ImageGenerationForm
									model={imageModel()}
									source={source()}
									initialSource={initialSource()}
									onSourceChange={setSource}
									loading={isLoading()}
									disabled={hasPendingGeneration() || !imageModel()}
									error={responseError()}
									fieldError={(key) =>
										getErrorObject(imageGenerationErrors()?.[key])
									}
									instructionError={getBodyError(
										"instruction",
										generateImage.errors,
									)}
									modelPicker={
										<GenerationModelPicker
											name="ai-media-image-generation-model"
											models={catalog()?.models}
											value={model()}
											onSelect={setModel}
											loading={models.isFetching && !models.isSuccess}
											error={models.isError}
											onRetry={() => void models.refetch()}
											disabled={isLoading()}
										/>
									}
									onChange={resetIdempotencyKey}
									onGenerate={generateImageFrom}
								/>
							</div>
						</Show>
						<Show when={types().includes("audio")}>
							<div
								class="flex min-w-0 flex-col gap-4"
								hidden={type() !== "audio"}
							>
								<AudioGenerationForm
									model={audioModel()}
									loading={isLoading()}
									disabled={hasPendingGeneration()}
									error={responseError()}
									scriptError={getBodyError("script", generateAudio.errors)}
									modelPicker={
										<GenerationModelPicker
											name="ai-media-audio-generation-model"
											models={catalog()?.models}
											value={model()}
											onSelect={setModel}
											loading={models.isFetching && !models.isSuccess}
											error={models.isError}
											onRetry={() => void models.refetch()}
											disabled={isLoading()}
										/>
									}
									onChange={resetIdempotencyKey}
									onGenerate={generateAudioFrom}
								/>
							</div>
						</Show>
					</div>
				</div>
				<div class="dotted-background relative min-h-130 min-w-0 overflow-hidden">
					{/* On large screens, fill the row without increasing its height so the footer stays at the modal bottom. */}
					<div class="flex min-h-130 min-w-0 flex-col px-4 max-lg:max-h-[min(86vh,820px)] md:px-6 lg:absolute lg:inset-0 lg:min-h-0">
						<div class="relative min-h-0 min-w-0 flex-1">
							<div
								class={
									historyItems().length > 0
										? "relative z-10 flex h-full min-h-0 min-w-0 flex-col gap-3 md:grid md:grid-cols-[116px_minmax(0,1fr)] md:gap-4"
										: "relative z-10 flex h-full min-h-0 min-w-0 flex-col"
								}
							>
								<Show when={historyItems().length > 0}>
									<AiGenerationHistory
										id="ai-media-generation-history"
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
													<CompletedGeneration
														generation={generation()}
														loading={isLoading()}
														onRetry={() => retryGeneration(generation())}
														onUseAsSource={
															generation().result.type === "image" &&
															type() === "image" &&
															imageModel()?.sourceImage
																? () => useGenerationAsSource(generation())
																: undefined
														}
													/>
												)}
											</Show>
										}
									>
										{(working) => (
											<PendingGeneration
												generation={working()}
												loading={isLoading()}
												resumable={
													resumableSelectedPendingGeneration() !== undefined
												}
												onResume={() => {
													const pending = resumableSelectedPendingGeneration();
													if (pending) resumePendingGeneration(pending);
												}}
												onDiscard={() => {
													const pending = resumableSelectedPendingGeneration();
													if (pending) discardPendingGeneration(pending);
												}}
											/>
										)}
									</Show>
								</div>
							</div>
						</div>
						<div class="relative z-10 -mx-4 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border bg-card/95 p-6 backdrop-blur-sm md:-mx-6">
							<div class="flex shrink-0 items-center gap-3">
								<Button
									type="button"
									variant="outline"
									size="md"
									onClick={() => close(false)}
								>
									{T()("common.cancel")}
								</Button>
								<Button
									type="button"
									variant="primary"
									size="md"
									onClick={() => {
										void accept();
									}}
									loading={aiModalsStore.get.isApplying}
									disabled={!selectedGeneration() || isLoading()}
								>
									{T()("ai.media.generate.modal.accept")}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Modal.Root>
	);
};

export default MediaGenerationModal;
