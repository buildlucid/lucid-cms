import useGetMultiple from "./useGetMultiple";
import useGetSingle from "./useGetSingle";
import useUpdateSingle from "./useUpdateSingle";
import useCreateSingle from "./useCreateSingle";
import useDeleteSingle from "./useDeleteSingle";
import useRestore from "./useRestore";
import useDeleteSinglePermanently from "./useDeleteSinglePermanently";
import useResendInvitation from "./useResendInvitation";

const exportObject = {
	useGetMultiple,
	useGetSingle,
	useUpdateSingle,
	useCreateSingle,
	useDeleteSingle,
	useRestore,
	useDeleteSinglePermanently,
	useResendInvitation,
};

export default exportObject;
