import type { RequestUser } from "../../../../types/response.js";

const formatUser = (user: RequestUser) => ({
	id: user.id,
	name:
		[user.firstName, user.lastName].filter(Boolean).join(" ") ||
		user.username ||
		user.email ||
		`#${user.id}`,
});

export default formatUser;
