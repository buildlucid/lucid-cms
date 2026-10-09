import type z from "zod";
import { getPagination } from "../../../../libs/tools/pagination.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getMultiple from "../../get-multiple.js";
import formatMediaItem from "../helpers/format-item.js";
import resolveMediaLocale from "../helpers/resolve-locale.js";
import type { inputSchema, outputSchema } from "./schema.js";

const findMedia: ServiceFn<
	[{ input: z.output<typeof inputSchema> }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const localeRes = resolveMediaLocale(context, props.input.contentLocale);
	if (localeRes.error) return localeRes;

	//* binned media is never searched, whatever the filters ask for
	const query = {
		...props.input.query,
		filter: {
			...props.input.query.filter,
			isDeleted: { value: false, operator: "=" },
		},
	} satisfies Parameters<typeof getMultiple>[1]["query"];

	//* tools only search the media library, so personal files never reach agent or MCP results
	const mediaRes = await getMultiple(context, {
		query,
		actor: { type: "content" },
	});
	if (mediaRes.error) return mediaRes;

	return {
		error: undefined,
		data: {
			output: {
				data: mediaRes.data.data.map((media) =>
					formatMediaItem(media, localeRes.data),
				),
				pagination: getPagination(
					mediaRes.data.count,
					query.page,
					query.perPage,
				),
				meta: { contentLocale: localeRes.data },
			},
		},
	};
};

export default findMedia;
