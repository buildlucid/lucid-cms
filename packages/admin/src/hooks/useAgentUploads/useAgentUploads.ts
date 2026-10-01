import type { Media } from "@types";
import { type Accessor, createMemo, createSignal, onCleanup } from "solid-js";
import api from "@/services/api";
import T from "@/translations";
import type { AgentReferenceItem, AgentUpload } from "@/utils/agent-references";
import { LucidError } from "@/utils/error-handling";
import mediaUrl from "@/utils/media-url";
import { uploadMediaFile } from "@/utils/upload-session";

const toReference = (media: Media, fileName: string): AgentReferenceItem => ({
	type: "media",
	mediaId: media.id,
	label: fileName,
	mimeType: media.meta.mimeType,
	...(media.type === "image" && media.url
		? { previewUrl: mediaUrl(media, "thumbnail-small") }
		: {}),
});

/**
 * Uploads files picked or dropped in the agent composer as the user's personal
 * media, then hands each back as a reference to attach. Uploads run in the
 * background, stay private and never appear in the media library.
 */
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
	const upload = async (agentKey: string, file: File) => {
		const id = crypto.randomUUID();
		const controller = new AbortController();
		controllers.set(id, controller);
		setUploads((current) => [...current, { id, name: file.name, progress: 0 }]);

		const uploaded = await uploadMediaFile({
			file,
			scope: `agent-upload:${agentKey}`,
			start: () =>
				api.agent.createUploadSessionReq({
					agentKey,
					fileName: file.name,
					mimeType: file.type || "application/octet-stream",
					size: file.size,
				}),
			onProgress: (progress) => update(id, { progress }),
			signal: controller.signal,
		});
		if (controller.signal.aborted) return;
		if (uploaded.error) {
			update(id, {
				error: uploaded.error.message ?? T()("media.upload.failed"),
			});
			return;
		}

		try {
			const media = await api.agent.createUploadReq({
				agentKey,
				key: uploaded.data,
				fileName: file.name,
				signal: controller.signal,
			});
			if (controller.signal.aborted) return;
			props.onUploaded(toReference(media.data, file.name));
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
		/** Cancels an upload or dismisses a failed one. */
		remove,
		/** Cancels every upload, such as when switching chats. */
		clear: () => {
			for (const { id } of uploads()) remove(id);
		},
	};
};

export default useAgentUploads;
