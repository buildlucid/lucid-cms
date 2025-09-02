import useGetStatus from "./useGetStatus";
import useUpdate from "./useUpdate";
import useVerify from "./useVerify";

const exportObject: {
	useGetStatus: typeof useGetStatus;
	useUpdate: typeof useUpdate;
	useVerify: typeof useVerify;
} = {
	useGetStatus,
	useUpdate,
	useVerify,
};

export default exportObject;
