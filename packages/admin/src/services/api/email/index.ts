import useGetMultiple from "./useGetMultiple";
import useGetSingle from "./useGetSingle";
import useDeleteSingle from "./useDeleteSingle";
import useResendSingle from "./useResendSingle";

const exportObject: {
	useGetMultiple: typeof useGetMultiple;
	useGetSingle: typeof useGetSingle;
	useDeleteSingle: typeof useDeleteSingle;
	useResendSingle: typeof useResendSingle;
} = {
	useGetMultiple,
	useGetSingle,
	useDeleteSingle,
	useResendSingle,
};

export default exportObject;
