import { uploads } from "../constants.js";
import type { FormFieldSettings } from "../types.js";

/**
 * Reads a file field's `accept` setting as lowercase extensions without dots. Takes a list, or
 * the comma-separated text editors type, such as "pdf, .png". Defaults to `uploads.defaultAccept`.
 */
const readAccept = (settings: FormFieldSettings): string[] => {
	const { accept } = settings;
	const items =
		typeof accept === "string"
			? accept.split(",")
			: Array.isArray(accept)
				? accept
				: [];
	const extensions = items.flatMap((item: unknown) => {
		if (typeof item !== "string") return [];
		const extension = item.trim().replace(/^\./, "").toLowerCase();
		return /^[a-z0-9]+$/.test(extension) ? [extension] : [];
	});

	return extensions.length > 0 ? extensions : [...uploads.defaultAccept];
};

export default readAccept;
