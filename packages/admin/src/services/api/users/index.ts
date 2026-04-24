import useCreateSingle from "./useCreateSingle";
import useDeleteMultiplePermanently from "./useDeleteMultiplePermanently";
import useDeleteProfilePicture from "./useDeleteProfilePicture";
import useDeleteSingle from "./useDeleteSingle";
import useDeleteSinglePermanently from "./useDeleteSinglePermanently";
import useGetMultiple from "./useGetMultiple";
import useGetProfilePicturePresignedUrl from "./useGetProfilePicturePresignedUrl";
import useGetSingle from "./useGetSingle";
import useResendInvitation from "./useResendInvitation";
import useRestore from "./useRestore";
import useRevokeRefreshTokens from "./useRevokeRefreshTokens";
import useUnlinkAuthProvider from "./useUnlinkAuthProvider";
import useUpdateProfilePicture from "./useUpdateProfilePicture";
import useUpdateSingle from "./useUpdateSingle";

const exportObject = {
	useGetMultiple,
	useGetSingle,
	useGetProfilePicturePresignedUrl,
	useUpdateSingle,
	useUpdateProfilePicture,
	useCreateSingle,
	useDeleteSingle,
	useDeleteProfilePicture,
	useDeleteMultiplePermanently,
	useRestore,
	useDeleteSinglePermanently,
	useResendInvitation,
	useRevokeRefreshTokens,
	useUnlinkAuthProvider,
};

export default exportObject;
