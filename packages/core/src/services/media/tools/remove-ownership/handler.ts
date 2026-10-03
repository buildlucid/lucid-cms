import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { AgentToolHandler } from "../../../../libs/tools/types.js";
import removeOwnership from "../../remove-ownership.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Removes the run owner's ownership of their personal media. System runs have no personal media. */
const handler: AgentToolHandler<
	z.output<typeof inputSchema>,
	z.output<typeof outputSchema>
> = async ({ context, input, execution }) => {
	const { principal } = execution.authority;
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

	const moved = await removeOwnership(context, {
		id: input.mediaId,
		userId: principal.userId,
		public: input.public,
		title: translation(input.title),
		alt: translation(input.alt),
	});
	if (moved.error) return moved;

	return {
		error: undefined,
		data: {
			output: { mediaId: moved.data, public: input.public },
			summary: copy(
				input.public
					? "admin:core.tools.media_remove_ownership.public.summary"
					: "admin:core.tools.media_remove_ownership.summary",
				{ data: { id: moved.data } },
			),
		},
	};
};

export default handler;
