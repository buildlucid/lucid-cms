/** Every key a definition may set, across the variants of a union. */
type KnownKeys<T> = T extends unknown ? keyof T : never;

/**
 * Keeps the literal type of a definition while still refusing keys outside its shape, which a
 * generic parameter alone would let through.
 */
export type ExactDefinition<TDefinition, TShape> = TDefinition & {
	[Key in Exclude<keyof TDefinition, KnownKeys<TShape>>]: never;
};

/** The variants of a definition union that a `slot` value belongs to. */
export type SlotVariant<TShape, TSlot> = TShape extends {
	slot: infer TVariantSlot;
}
	? TSlot extends TVariantSlot
		? TShape
		: never
	: never;
