import useCreateSingle from "./useCreateSingle";
import useDeleteSingle from "./useDeleteSingle";
import useGetAll from "./useGetAll";
import useGetScopes from "./useGetScopes";
import useGetSingle from "./useGetSingle";
import useRegenerateAPIKey from "./useRegenerateAPIKey";
import useUpdateSingle from "./useUpdateSingle";

const exportObject = {
	useGetAll,
	useGetScopes,
	useCreateSingle,
	useDeleteSingle,
	useRegenerateAPIKey,
	useGetSingle,
	useUpdateSingle,
};
export default exportObject;
