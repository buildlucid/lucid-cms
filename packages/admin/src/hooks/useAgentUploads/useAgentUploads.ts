import { type Accessor, createMemo, createSignal, onCleanup } from "solid-js";
import api from "@/services/api";
import { mediaSaveReq } from "@/services/api/ai/useMediaSave";
import type { MediaGenerationFileMeta } from "@/store/aiModalsStore/aiModalsStore";
import T from "@/translations";
import {
	type AgentReferenceItem,
	type AgentUpload,
	mediaReferenceItem,
} from "@/utils/agent-references";
import { LucidError } from "@/utils/error-handling";
import helpers from "@/utils/helpers";
import { uploadMediaFile } from "@/utils/upload-session";
import { captureVideoPosterFrame } from "@/utils/video-frame";

/** Uploads private personal media outside the library, preserving video posters and AI provenance. */
const useAgentUploads = (props: {
	agentKey: Accessor<string | undefined>;
	onUploaded: (reference: AgentReferenceItem) => void;
}) => {
	// ----------------------------------------
	// State & Hooks
	const [uploads, setUploads] = createSignal<AgentUpload[]>([]);
	const controllers = new Map<string, AbortController>();

	// ----------------------------------------
	// Memos
	//* failed uploads stay until removed, but don't hold up sending
	const uploading = createMemo(() =>
		uploads().some((upload) => upload.error === undefined),
	);

	// ----------------------------------------
	// Functions
	const update = (id: string, change: Partial<AgentUpload>) =>
		setUploads((current) =>
			current.map((upload) =>
				upload.id === id ? { ...upload, ...change } : upload,
			),
		);
	const remove = (id: string) => {
		controllers.get(id)?.abort();
		controllers.delete(id);
		setUploads((current) => current.filter((upload) => upload.id !== id));
	};
	const store = (
		agentKey: string,
		file: File,
		options: { signal: AbortSignal; onProgress?: (progress: number) => void },
	) =>
		uploadMediaFile({
			file,
			scope: `agent-upload:${agentKey}`,
			start: () =>
				api.agent.createUploadSessionReq({
					agentKey,
					fileName: file.name,
					mimeType: file.type || "application/octet-stream",
					size: file.size,
				}),
			onProgress: options.onProgress,
			signal: options.signal,
		});
	/** Attempts to upload a video poster while allowing the video upload to succeed without one. */
	const uploadPoster = async (
		agentKey: string,
		file: File,
		signal: AbortSignal,
	) => {
		const poster = await captureVideoPosterFrame(file).catch(() => null);
		if (!poster || signal.aborted) return undefined;

		const uploaded = await store(agentKey, poster, { signal });
		if (uploaded.error) return undefined;

		try {
			const media = await api.agent.createUploadReq({
				agentKey,
				key: uploaded.data,
				fileName: poster.name,
				signal,
			});
			return media.data.id;
		} catch {
			return undefined;
		}
	};
	const upload = async (
		agentKey: string,
		file: File,
		ai?: MediaGenerationFileMeta,
	) => {
		const id = crypto.randomUUID();
		const controller = new AbortController();
		controllers.set(id, controller);
		setUploads((current) => [
			...current,
			{ id, name: file.name, progress: ai ? null : 0 },
		]);

		try {
			let key: string;
			if (ai) {
				//* Server-side copies of generated files have no upload progress.
				const saved = await mediaSaveReq({
					requestId: ai.aiGenerationRequestId,
					public: false,
					signal: controller.signal,
				});
				key = saved.data.key;
				update(id, { progress: 100 });
			} else {
				const uploaded = await store(agentKey, file, {
					signal: controller.signal,
					onProgress: (progress) => update(id, { progress }),
				});
				if (controller.signal.aborted) return;
				if (uploaded.error) {
					update(id, {
						error: uploaded.error.message ?? T()("media.upload.failed"),
					});
					return;
				}
				key = uploaded.data;
			}

			//* Upload the poster only after its video is stored.
			const posterId =
				helpers.getMediaType(file.type) === "video"
					? await uploadPoster(agentKey, file, controller.signal)
					: undefined;
			if (controller.signal.aborted) return;

			const media = await api.agent.createUploadReq({
				agentKey,
				key,
				fileName: file.name,
				posterId,
				ai,
				signal: controller.signal,
			});
			if (controller.signal.aborted) return;
			props.onUploaded(mediaReferenceItem(media.data, { label: file.name }));
			remove(id);
		} catch (error) {
			if (controller.signal.aborted) return;
			update(id, {
				error:
					(error instanceof LucidError ? error.errorRes.message : undefined) ??
					T()("media.upload.failed"),
			});
		}
	};

	// ----------------------------------------
	// Effects
	onCleanup(() => {
		for (const controller of controllers.values()) controller.abort();
	});

	return {
		uploads,
		uploading,
		/** Starts uploading each file. Does nothing without an agent to upload for. */
		add: (files: File[]) => {
			const agentKey = props.agentKey();
			if (!agentKey) return;
			for (const file of files) void upload(agentKey, file);
		},
		addGenerated: (file: File, ai: MediaGenerationFileMeta) => {
			const agentKey = props.agentKey();
			if (agentKey) void upload(agentKey, file, ai);
		},
		/** Cancels an upload or dismisses a failed one. */
		remove,
		/** Cancels every upload, such as when switching chats. */
		clear: () => {
			for (const { id } of uploads()) remove(id);
		},
	};
};

export default useAgentUploads;
