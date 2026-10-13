import { formatPerson } from "../../../libs/tools/person.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getDisplayUsers from "../../users/helpers/get-display-users.js";

/** Names the person holding a document version, falling back to their ID when they can't be shown. */
const getHolderName: ServiceFn<[{ userId: number }], string> = async (
	context,
	data,
) => {
	const users = await getDisplayUsers(context, { ids: [data.userId] });
	if (users.error) return users;

	const user = users.data.get(data.userId);
	return {
		error: undefined,
		data: user ? formatPerson(user).name : `#${data.userId}`,
	};
};

export default getHolderName;
