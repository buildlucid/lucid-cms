import useGetStatus from "./useGetStatus";
import useUpdate from "./useUpdate";

const exportObject: {
	useGetStatus: typeof useGetStatus;
	useUpdate: typeof useUpdate;
} = {
	useGetStatus,
	useUpdate,
};

export default exportObject;
