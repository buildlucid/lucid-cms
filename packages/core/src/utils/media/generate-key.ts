import T from "../../translations/index.js";
import slug from "slug";
import { getMonth, getYear } from "date-fns";
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
	const date = new Date();
	const month = getMonth(date);
	const monthF = month + 1 >= 10 ? `${month + 1}` : `0${month + 1}`;

	const key = `${getYear(date)}/${monthF}/${uuid}-${filename}.${ext}`;

	return {
		error: undefined,
		data: props.public ? `public/${key}` : `private/${key}`,
	};
};

export default generateKey;
