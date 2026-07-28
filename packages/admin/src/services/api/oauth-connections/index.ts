import useCompleteAuthorization from "./useCompleteAuthorization";
import useGetAuthorizationRequest from "./useGetAuthorizationRequest";
import useGetConnections from "./useGetConnections";
import useRevokeConnection from "./useRevokeConnection";
import useUpdateConnection from "./useUpdateConnection";

export type { OAuthConnectionOwner } from "./types";

export default {
	useGetConnections,
	useGetAuthorizationRequest,
	useCompleteAuthorization,
	useRevokeConnection,
	useUpdateConnection,
};
