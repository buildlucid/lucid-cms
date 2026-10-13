import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { AgentToolAuthority } from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import addToLibrary from "../../add-to-library.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Adds the acting user's personal media to the library, rejecting system actors. */
const addMediaToLibrary: ServiceFn<
	[{ input: z.output<typeof inputSchema>; authority: AgentToolAuthority }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const { principal } = props.authority;
	if (principal.type !== "user") {
		return {
			error: {
				type: "basic",
				status: 403,
				message: copy("server:core.media.personal.not.owner"),
			},
			data: undefined,
		};
	}

	const locale = context.config.localization.defaultLocale;
	const translation = (value: string | undefined) =>
		value === undefined ? undefined : [{ localeCode: locale, value }];

	const moved = await addToLibrary(context, {
		id: props.input.mediaId,
		userId: principal.userId,
		public: props.input.public,
		title: translation(props.input.title),
		alt: translation(props.input.alt),
	});
	if (moved.error) return moved;

	return {
		error: undefined,
		data: {
			output: { media: { id: moved.data, public: props.input.public } },
		},
	};
};

export default addMediaToLibrary;
