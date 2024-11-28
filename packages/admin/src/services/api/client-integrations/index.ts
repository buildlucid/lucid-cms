import useGetAll from "./useGetAll";
import useCreateSingle from "./useCreateSingle";
import useDeleteSingle from "./useDeleteSingle";
import useRegenerateAPIKey from "./useRegenerateAPIKey";
import useGetSingle from "./useGetSingle";
import useUpdateSingle from "./useUpdateSingle";

const exportObject: {
	useGetAll: typeof useGetAll;
	useCreateSingle: typeof useCreateSingle;
	useDeleteSingle: typeof useDeleteSingle;
	useRegenerateAPIKey: typeof useRegenerateAPIKey;
	useGetSingle: typeof useGetSingle;
	useUpdateSingle: typeof useUpdateSingle;
} = {
	useGetAll,
	useCreateSingle,
	useDeleteSingle,
	useRegenerateAPIKey,
	useGetSingle,
	useUpdateSingle,
};
export default exportObject;
