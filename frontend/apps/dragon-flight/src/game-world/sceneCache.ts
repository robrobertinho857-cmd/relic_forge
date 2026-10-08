// Scene decoding is shared across mounts and rounds, not reactive UI state.
const decodedScenes = new Map<string, Promise<void>>();
export function decodeScene(src: string) {
	let pending = decodedScenes.get(src);
	if (!pending) {
		const image = new Image();
		image.src = src;
		pending = image.decode().catch((error) => {
			decodedScenes.delete(src);
			throw error;
		});
		decodedScenes.set(src, pending);
	}
	return pending;
}
