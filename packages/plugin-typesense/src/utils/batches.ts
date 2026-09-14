/** Splits bounded work without copying the full input. Callers supply a positive batch size. */
function* batches<T>(items: readonly T[], size: number) {
	for (let offset = 0; offset < items.length; offset += size) {
		yield items.slice(offset, offset + size);
	}
}

export default batches;
