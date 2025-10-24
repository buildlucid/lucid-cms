import slug from "slug";
import T from "../../translations/index.js";
import type { ServiceResponse } from "../services/types.js";

/**
 * Generates a unique key for a media file.
 */
const generateKey = (props: {
	name: string;
	extension: string | null;
	public: boolean;
}): Awaited<ServiceResponse<string>> => {
	const [name, extension] = props.name.split(".");
	const ext = props.extension || extension;

	if (!name || !ext) {
		return {
			error: {
				type: "basic",
				name: T("media_name_invalid"),
				message: T("media_name_invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	let filename = slug(name, {
		lower: true,
	});
	if (filename.length > 254) filename = filename.slice(0, 254);
	const uuid = Math.random().toString(36).slice(-6);

	return {
		error: undefined,
		data: `${props.public ? "public/" : "private/"}${uuid}-${filename}.${ext}`,
	};
};

export default generateKey;
