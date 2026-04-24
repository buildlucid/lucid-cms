import mediaFormatter from "../../../../formatters/media.js";
import type { UserPropT } from "../../../../formatters/users.js";
import type { CFResponse, FieldRefParams } from "../../types.js";

const isUserRef = (value: unknown): value is UserPropT => {
	if (typeof value !== "object" || value === null) return false;

	return "id" in value && "email" in value && "username" in value;
};

const formatUserRef = (
	value: unknown,
	params: FieldRefParams,
): CFResponse<"user">["ref"] => {
	if (!isUserRef(value)) return null;

	return {
		id: value.id ?? null,
		email: value.email,
		username: value.username,
		firstName: value.first_name,
		lastName: value.last_name,
		profilePicture: mediaFormatter.formatRef({
			media: value.profile_picture?.[0],
			host: params.host,
			locales: params.localization.locales,
		}),
	} satisfies CFResponse<"user">["ref"];
};

export default formatUserRef;
