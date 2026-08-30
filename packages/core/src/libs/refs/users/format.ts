import type { UserRef } from "../../../exports/types.js";
import mediaFormatter from "../../formatters/media.js";
import type { UserRefData, UserRefResolveInput } from "./types.js";

const formatUserRefs = (
	rows: UserRefData,
	context: UserRefResolveInput["format"],
): Array<NonNullable<UserRef>> =>
	rows.flatMap((user) => {
		if (user.id === null || user.id === undefined) return [];

		return [
			{
				id: user.id,
				email: user.email,
				username: user.username,
				firstName: user.first_name,
				lastName: user.last_name,
				profilePicture: mediaFormatter.formatMediaImagePreview({
					poster: user.profile_picture?.[0],
					options: {
						host: context.host,
						delivery: context.mediaDelivery,
					},
				}),
			} satisfies NonNullable<UserRef>,
		];
	});

export default formatUserRefs;
