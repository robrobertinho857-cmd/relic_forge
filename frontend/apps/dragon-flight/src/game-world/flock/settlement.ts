// Deduplicate concurrent finalization without changing the server settlement API.
export async function settleRoundOnce(
	id: number,
	settle: () => Promise<void>,
	pending: Map<number, Promise<void>>,
	settled: Set<number>,
) {
	if (settled.has(id)) return;
	let operation = pending.get(id);
	if (!operation) {
		operation = settle().then(() => {
			settled.add(id);
		});
		pending.set(id, operation);
	}
	try {
		await operation;
	} finally {
		if (pending.get(id) === operation) pending.delete(id);
	}
}
