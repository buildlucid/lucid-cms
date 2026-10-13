import { useQueryClient } from "@tanstack/solid-query";
import type {
	MediaGenerateCompletionPollResponse,
	MediaGenerateCompletionResponse,
} from "@types";
import { type Accessor, createMemo, createSignal } from "solid-js";
import type {
	MediaGenerationCandidate,
	MediaGenerationSettings,
	MediaImageGenerationSource,
	PendingMediaGeneration,
	WorkingMediaGeneration,
} from "@/components/MediaGenerationModal/types";
import {
	generationFileName,
	generationNumber,
} from "@/components/MediaGenerationModal/utils/generation-helpers";
import {
	clearStoredPendingMediaGeneration,
	getPendingMediaGenerationStorageKey,
	initialCompletionPollDelayMs,
	steadyCompletionPollAfterMs,
	steadyCompletionPollDelayMs,
	storePendingMediaGeneration,
} from "@/components/MediaGenerationModal/utils/pending-generation";
import { usePollingLoop } from "@/hooks/usePollingLoop/usePollingLoop";
import api from "@/services/api";
import { mediaCompletionReq } from "@/services/api/ai/useMediaCompletion";
import type { MediaImageGenerateBody } from "@/services/api/ai/useMediaImageGenerate";
import { queryKeys } from "@/services/query-keys";
import aiModalsStore, {
	type MediaGenerationTarget,
} from "@/store/aiModalsStore/aiModalsStore";
import T from "@/translations";
import { prepareAiImage } from "@/utils/ai-image";
import { LucidError } from "@/utils/error-handling";
import spawnToast from "@/utils/spawn-toast";

/** Submits, polls and resumes media generations, then applies the selected result to its target. */
const useMediaGenerationSession = (props: {
	target: Accessor<MediaGenerationTarget | undefined>;
	targetId: Accessor<string | undefined>;
}) => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();

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
	const [clientError, setClientError] = createSignal<string>();
	const [idempotencyKey, setIdempotencyKey] = createSignal(crypto.randomUUID());

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

	// ----------------------------------------
	// Queries & Mutations
	const generateImage = api.ai.useMediaImageGenerate();
	const generateAudio = api.ai.useMediaAudioGenerate();

	// ----------------------------------------
	// Memos
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

	// ----------------------------------------
	// Functions
	function nextGenerationId() {
		return `generation-${generationId + 1}`;
	}
	function syncGenerationId(id: string) {
		const numericId = generationNumber(id);
		if (Number.isFinite(numericId) && numericId > generationId) {
			generationId = numericId;
		}
	}
	function resetIdempotencyKey() {
		setIdempotencyKey(crypto.randomUUID());
	}
	function resetErrors() {
		setClientError(undefined);
		generateImage.reset();
		generateAudio.reset();
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
		resetErrors();
		aiModalsStore.setLoading(false);
		aiModalsStore.setApplying(false);
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
		clearStoredPendingMediaGeneration(pending, props.targetId());
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
			clearStoredPendingMediaGeneration(pending, props.targetId());
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
	/** Shows a stored pending generation, waiting for people to resume or discard it. */
	function restorePendingGeneration(pending: PendingMediaGeneration) {
		syncGenerationId(pending.id);
		setPendingGeneration(pending);
		setResumablePendingGenerationId(pending.id);
		setSelectedGenerationId(pending.id);
	}
	function resumePendingGeneration() {
		const pending = resumableSelectedPendingGeneration();
		if (!pending) return;

		setSelectedGenerationId(pending.id);
		setResumablePendingGenerationId(undefined);
		setPendingGeneration(pending);
		scheduleCompletionPoll(pending, 0);
	}
	function discardPendingGeneration() {
		const pending = resumableSelectedPendingGeneration();
		if (!pending) return;

		abortRequest();
		clearStoredPendingMediaGeneration(pending, props.targetId());
		setPendingGeneration(undefined);
		setResumablePendingGenerationId(undefined);
		if (selectedGenerationId() === pending.id) selectLatestGeneration();
	}
	/** Sends a generation to Lucid and polls for it until it finishes. */
	const generate = async (
		settings: MediaGenerationSettings,
		requestTarget = props.target(),
		requestTargetId = props.targetId(),
	) => {
		if (!requestTarget || !requestTargetId) return;

		const id = nextGenerationId();
		try {
			abortRequest();
			setWorkingGeneration({ id, settings });
			setSelectedGenerationId(id);
			setResumablePendingGenerationId(undefined);
			abortController = new AbortController();
			resetErrors();
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
			if (requestTargetId === props.targetId()) {
				if (!completionPoller.isActive()) {
					aiModalsStore.setLoading(false);
				}
				abortController = undefined;
			}
		}
	};
	/** Downloads and applies the selected generation, resolving `true` on success. */
	const accept = async (requestTarget = props.target()) => {
		const generation = selectedGeneration();
		if (!generation || !requestTarget) return false;

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
			return true;
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				return false;
			}

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
			return false;
		} finally {
			aiModalsStore.setApplying(false);
			abortController = undefined;
		}
	};

	return {
		/** Finished generations, oldest first. */
		generations,
		/** The generation being sent to Lucid, before it has a request ID. */
		workingGeneration,
		/** The generation Lucid is working on, polled or waiting to be resumed. */
		pendingGeneration,
		isPollingCompletion,
		isLoading,
		/** Whether a generation is being submitted, polled or waiting to resume. */
		hasPendingGeneration,
		selectedGenerationId,
		selectGeneration: setSelectedGenerationId,
		selectedGeneration,
		/** The selected generation when it is still being sent or worked on. */
		selectedWorkingGeneration,
		/** The selected generation when it was restored from storage and has not been resumed. */
		resumableSelectedPendingGeneration,
		/** Errors raised by the session itself rather than by request validation. */
		clientError,
		imageErrors: generateImage.errors,
		audioErrors: generateAudio.errors,
		generate,
		accept,
		restorePendingGeneration,
		resumePendingGeneration,
		discardPendingGeneration,
		/** Stops polling and aborts the session's current HTTP request. */
		abortRequest,
		/** Starts a new session, forgetting every generation. */
		clear,
		resetErrors,
		/** Starts a new idempotency key, so the next generation is not treated as a retry. */
		resetIdempotencyKey,
	};
};

export default useMediaGenerationSession;
