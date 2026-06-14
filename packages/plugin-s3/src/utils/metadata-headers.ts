export const METADATA_EXTENSION_HEADER = "x-amz-meta-extension";
export const METADATA_SIZE_HEADER = "x-amz-meta-size";

export const applyMetadataHeaders = (
	headers: Headers,
	meta: {
		mimeType?: string;
		extension?: string;
		size?: number;
	},
) => {
	if (meta.mimeType) headers.set("Content-Type", meta.mimeType);
	if (meta.extension) headers.set(METADATA_EXTENSION_HEADER, meta.extension);
	if (meta.size !== undefined)
		headers.set(METADATA_SIZE_HEADER, `${meta.size}`);
};

export const parseStoredSize = (value: string | null) => {
	if (!value) return null;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};
