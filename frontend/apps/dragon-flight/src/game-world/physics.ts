import type { PlayerBody, WorldBounds } from './types';

// Physics for the local Dragon Flight prototype.

const MAX_FRAME_DELTA = 1 / 30;

export const clamp = (value: number, minimum: number, maximum: number) =>
	Math.min(maximum, Math.max(minimum, value));

export const steerPlayer = (
	player: PlayerBody,
	targetY: number,
	deltaSeconds: number,
	bounds: WorldBounds,
	feel: {
		agility: number;
		damping: number;
		maxVerticalSpeed: number;
	} = { agility: 1, damping: 0.94, maxVerticalSpeed: 310 },
): PlayerBody => {
	const delta = Math.min(deltaSeconds, MAX_FRAME_DELTA);
	const verticalError = targetY - player.position.y;
	const velocityY = clamp(
		(player.velocity.y + verticalError * 4.8 * feel.agility * delta) *
			Math.pow(feel.damping, delta * 60),
		-feel.maxVerticalSpeed,
		feel.maxVerticalSpeed,
	);
	const targetX = bounds.width * 0.25;
	const velocityX = clamp(
		(player.velocity.x + (targetX - player.position.x) * 2.1 * delta) *
			Math.pow(0.92, delta * 60),
		-100,
		100,
	);

	return {
		...player,
		position: {
			x: clamp(
				player.position.x + velocityX * delta,
				player.radius,
				bounds.width * 0.48 - player.radius,
			),
			y: clamp(
				player.position.y + velocityY * delta,
				player.radius,
				bounds.floorY - player.radius,
			),
		},
		velocity: { x: velocityX, y: velocityY },
	};
};
