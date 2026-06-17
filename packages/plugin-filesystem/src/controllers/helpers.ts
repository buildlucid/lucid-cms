import type {
	Config,
	FileSystemMediaAdapterOptions,
	MediaAdapterInstance,
} from "@lucidcms/core/types";

export type FileSystemMediaAdapterInstance =
	MediaAdapterInstance<FileSystemMediaAdapterOptions>;

export const resolveFileSystemMediaAdapter = async (
	config: Config,
): Promise<FileSystemMediaAdapterInstance | null> => {
	if (!config.media.adapter) {
		return null;
	}

	const adapter =
		typeof config.media.adapter === "function"
			? await config.media.adapter()
			: config.media.adapter;
	const resolved = await adapter;

	if (!resolved || resolved.key !== "file-system") {
		return null;
	}

	return resolved as FileSystemMediaAdapterInstance;
};
