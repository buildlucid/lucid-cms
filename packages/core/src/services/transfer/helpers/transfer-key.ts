/** Identifies an entry by its resource and uid, as uids only need to be unique within a resource. */
const transferKey = (resource: string, uid: string) =>
	JSON.stringify([resource, uid]);

export default transferKey;
