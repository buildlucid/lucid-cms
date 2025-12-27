import useCreateSingle from "./useCreateSingle";
import useDeleteSingle from "./useDeleteSingle";
import useGetAll from "./useGetAll";
import useGetSingle from "./useGetSingle";
import useRegenerateAPIKey from "./useRegenerateAPIKey";
import useUpdateSingle from "./useUpdateSingle";

const exportObject = {
	useGetAll,
	useCreateSingle,
	useDeleteSingle,
	useRegenerateAPIKey,
	useGetSingle,
	useUpdateSingle,
};
export default exportObject;
