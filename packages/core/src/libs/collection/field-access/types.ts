/** What an actor can do with a field, tab, section, collapsible or brick. */
export type FieldAccess = "editable" | "locked" | "hidden";

/** Permissions checked for field access, accepting users, agent run authorities and the system actor. */
export type FieldAccessActor = {
	superAdmin: boolean;
	permissions: readonly string[] | undefined;
};

/** Brick access with field access keyed by name and already restricted by the brick's permissions. */
export type BrickAccess = {
	access: FieldAccess;
	fields: ReadonlyMap<string, FieldAccess>;
};

/** Access to a collection's fields and bricks for one actor. */
export type ContentAccess = {
	/** Access to the collection's own fields by key. */
	fields: ReadonlyMap<string, FieldAccess>;
	/** Access to each brick by key. */
	bricks: ReadonlyMap<string, BrickAccess>;
	/** False when the actor can see and change everything, so callers can skip filtering. */
	restricted: boolean;
};
