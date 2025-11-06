import useGetMultiple from "./useGetMultiple";
import useGetSingle from "./useGetSingle";
import useUpdateSingle from "./useUpdateSingle";
import useCreateSingle from "./useCreateSingle";
import useDeleteSingle from "./useDeleteSingle";
import useRestore from "./useRestore";
import useDeleteSinglePermanently from "./useDeleteSinglePermanently";
import useResendInvitation from "./useResendInvitation";
import useUnlinkAuthProvider from "./useUnlinkAuthProvider";

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
