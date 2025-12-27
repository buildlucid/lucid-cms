import useCreateSingle from "./useCreateSingle";
import useDeleteSingle from "./useDeleteSingle";
import useDeleteSinglePermanently from "./useDeleteSinglePermanently";
import useGetMultiple from "./useGetMultiple";
import useGetSingle from "./useGetSingle";
import useResendInvitation from "./useResendInvitation";
import useRestore from "./useRestore";
import useUnlinkAuthProvider from "./useUnlinkAuthProvider";
import useUpdateSingle from "./useUpdateSingle";

const exportObject = {
	useGetMultiple,
	useGetSingle,
	useUpdateSingle,
	useCreateSingle,
	useDeleteSingle,
	useRestore,
	useDeleteSinglePermanently,
	useResendInvitation,
	useUnlinkAuthProvider,
};

export default exportObject;
