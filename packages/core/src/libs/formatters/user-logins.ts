import Formatter from "./index.js";
import type { UserLoginResponse } from "../../types/response.js";

interface UserLoginPropT {
	id: number;
	user_id: number | null;
	token_id: number | null;
	auth_method: string;
	ip_address: string | null;
	user_agent: string | null;
	created_at: Date | string | null;
}

export default class UserLoginsFormatter {
	formatMultiple = (props: { userLogins: UserLoginPropT[] }) => {
		return props.userLogins.map((login) =>
			this.formatSingle({
				userLogin: login,
			}),
		);
	};
	formatSingle = (props: { userLogin: UserLoginPropT }): UserLoginResponse => {
		return {
			id: props.userLogin.id,
			userId: props.userLogin.user_id,
			tokenId: props.userLogin.token_id,
			authMethod: props.userLogin.auth_method,
			ipAddress: props.userLogin.ip_address,
			userAgent: props.userLogin.user_agent,
			createdAt: Formatter.formatDate(props.userLogin.created_at),
		};
	};
}
