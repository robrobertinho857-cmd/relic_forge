import type { WorldBounds } from '../types';

export type HunterShot = { target: { x: number; y: number }; progress: number; hit: boolean };

// Visual trajectory only. A hit is authored by the round's elimination event.
export function hunterTrajectory(bounds: WorldBounds, shot: HunterShot) {
	const scale = bounds.width < 700 ? 0.48 : 0.75;
	const origin = { x: bounds.width * 0.88, y: bounds.height - 12 - 166 * scale };
	const angle = Math.atan2(shot.target.y - origin.y, shot.target.x - origin.x);
	const muzzle = {
		x: origin.x + Math.cos(angle) * 70 * scale,
		y: origin.y + Math.sin(angle) * 70 * scale,
	};
	const progress = Math.max(0, Math.min(1, shot.progress));
	return {
		scale,
		origin,
		muzzle,
		angle: (angle * 180) / Math.PI - 180,
		bullet: {
			x: muzzle.x + (shot.target.x - muzzle.x) * progress,
			y: muzzle.y + (shot.target.y - muzzle.y) * progress,
		},
	};
}
