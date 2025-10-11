import useGetMultiple from "./useGetMultiple";
import useGetSingle from "./useGetSingle";
import useUpdateSingle from "./useUpdateSingle";
import useCreateSingle from "./useCreateSingle";
import useDeleteSingle from "./useDeleteSingle";
import useRestore from "./useRestore";
import useDeleteSinglePermanently from "./useDeleteSinglePermanently";

const exportObject: {
	useGetMultiple: typeof useGetMultiple;
	useGetSingle: typeof useGetSingle;
	useUpdateSingle: typeof useUpdateSingle;
	useCreateSingle: typeof useCreateSingle;
	useDeleteSingle: typeof useDeleteSingle;
	useRestore: typeof useRestore;
	useDeleteSinglePermanently: typeof useDeleteSinglePermanently;
} = {
	useGetMultiple,
	useGetSingle,
	useUpdateSingle,
	useCreateSingle,
	useDeleteSingle,
	useRestore,
	useDeleteSinglePermanently,
};

export default exportObject;
