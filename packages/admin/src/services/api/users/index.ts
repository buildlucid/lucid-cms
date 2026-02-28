import useCreateSingle from "./useCreateSingle";
import useDeleteMultiplePermanently from "./useDeleteMultiplePermanently";
import useDeleteSingle from "./useDeleteSingle";
import useDeleteSinglePermanently from "./useDeleteSinglePermanently";
import useGetMultiple from "./useGetMultiple";
import useGetSingle from "./useGetSingle";
import useResendInvitation from "./useResendInvitation";
import useRestore from "./useRestore";
import useRevokeRefreshTokens from "./useRevokeRefreshTokens";
import useUnlinkAuthProvider from "./useUnlinkAuthProvider";
import useUpdateSingle from "./useUpdateSingle";

const exportObject = {
	useGetMultiple,
	useGetSingle,
	useUpdateSingle,
	useCreateSingle,
	useDeleteSingle,
	useDeleteMultiplePermanently,
	useRestore,
	useDeleteSinglePermanently,
	useResendInvitation,
	useRevokeRefreshTokens,
	useUnlinkAuthProvider,
};

export default exportObject;
