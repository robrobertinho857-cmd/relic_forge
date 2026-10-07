import type { CreatureId, FlightRound, LaunchStyle, PlayerBody, WorldBounds } from '../types';
import { getCreature } from '../creatures';
import { clamp, createPlayer, steerPlayer } from '../physics';
import { FLOCK_ORDER, type ActiveBird, type EliminationReason } from './types';

export function createFlock(bounds: WorldBounds, round?: FlightRound): ActiveBird[] {
	const ids: readonly CreatureId[] = round && !round.flock ? [round.creature] : FLOCK_ORDER;
	return ids.map((id, index) => ({
		id,
		body: {
			...createPlayer(bounds),
			position: {
				x: round
					? -60 - index * 15
					: bounds.width * (0.17 + (index % 2) * 0.12 + Math.floor(index / 2) * 0.04),
				y: bounds.floorY * (0.34 + index * 0.14),
			},
		},
		alive: true,
		visible: true,
		launched: !round,
		finished: false,
		launchDelay: index * 0.1,
		age: round ? 0 : 1,
		frame: 1,
		rotation: 0,
		targetY: bounds.floorY * 0.5,
		exiting: false,
	}));
}
export function updateBirdBody(
	birds: ActiveBird[],
	id: CreatureId,
	body: PlayerBody,
): ActiveBird[] {
	return birds.map((bird) => (bird.id === id ? { ...bird, body } : bird));
}
export function eliminateBird(
	birds: ActiveBird[],
	id: CreatureId,
	reason: EliminationReason,
): ActiveBird[] {
	return birds.map((bird) =>
		bird.id === id && bird.alive
			? {
					...bird,
					alive: false,
					elimination: { reason, age: 0 },
					body: { ...bird.body, velocity: { x: -85, y: reason === 'wind' ? -160 : 120 } },
				}
			: bird,
	);
}
export function startChampion(birds: ActiveBird[]): ActiveBird[] {
	return birds.map((bird) => ({
		...bird,
		exiting: bird.id !== 'archaeopteryx',
		finished: false,
		age: 1,
		body: { ...bird.body, velocity: { x: 0, y: 0 } },
	}));
}
export function resizeFlock(
	birds: ActiveBird[],
	before: WorldBounds,
	after: WorldBounds,
): ActiveBird[] {
	return birds.map((bird) => ({
		...bird,
		body: {
			...bird.body,
			radius: clamp(after.width * 0.026, 17, 25),
			position: {
				x: (bird.body.position.x * after.width) / before.width,
				y: (bird.body.position.y * after.height) / before.height,
			},
		},
	}));
}

// Shared presentation tick; never decides survival, financial results or event order.
export function stepFlock(
	birds: ActiveBird[],
	delta: number,
	bounds: WorldBounds,
	targetY: number,
	moving: boolean,
	landing: number,
	launchStyle: LaunchStyle = 'glide',
): ActiveBird[] {
	const living = birds.filter((bird) => bird.alive && !bird.exiting);
	const champion = birds.some((bird) => bird.exiting);
	return birds.map((bird, index) => {
		const profile = getCreature(bird.id);
		const age = bird.age + delta;
		const animation = profile.flightAnimation;
		const frame = animation
			? animation.frameOrder[
					Math.floor((age + index * 0.071) * animation.fps) % animation.frameOrder.length
				]
			: 1;
		if (bird.elimination) {
			const elapsed = bird.elimination.age + delta;
			return {
				...bird,
				age,
				frame,
				visible: elapsed < 1.3,
				rotation: bird.rotation + delta * (bird.elimination.reason === 'wind' ? -110 : 85),
				elimination: { ...bird.elimination, age: elapsed },
				body: {
					...bird.body,
					position: {
						x: bird.body.position.x + bird.body.velocity.x * delta,
						y: bird.body.position.y + bird.body.velocity.y * delta,
					},
				},
			};
		}
		if (bird.exiting)
			return {
				...bird,
				age,
				frame,
				visible: bird.body.position.x < bounds.width + 100,
				body: {
					...bird.body,
					position: {
						x: bird.body.position.x + delta * 520,
						y: bird.body.position.y - delta * (50 + index * 35),
					},
				},
			};
		if (!bird.alive) return bird;
		if (moving && age < bird.launchDelay) return { ...bird, age, frame, visible: false };
		const slot = living.findIndex((other) => other.id === bird.id);
		const top = bounds.height < 360 ? 145 : 150;
		const bottom = bounds.floorY - 32;
		const spacing = Math.min(
			clamp(bounds.height * 0.12, 30, 58),
			(bottom - top) / Math.max(1, living.length - 1),
		);
		const centerY = clamp(
			targetY,
			top + (spacing * (living.length - 1)) / 2,
			bottom - (spacing * (living.length - 1)) / 2,
		);
		const formationY = clamp(
			centerY +
				(slot - (living.length - 1) / 2) * spacing +
				Math.sin(age * (1.5 + index * 0.13) + index * 1.7) * 7,
			top,
			bottom,
		);
		const formationX =
			bounds.width * (champion ? 0.74 : 0.19 + (index % 2) * 0.08 + Math.floor(index / 2) * 0.025);
		if (moving && age < bird.launchDelay + 0.65) {
			const t = clamp((age - bird.launchDelay) / 0.65, 0, 1);
			const eased = 1 - (1 - t) ** 3;
			return {
				...bird,
				age,
				frame,
				visible: true,
				launched: true,
				body: {
					...bird.body,
					position: {
						x: -60 + (formationX + 60) * eased,
						y:
							formationY +
							(1 - eased) *
								(launchStyle === 'dive'
									? -80
									: launchStyle === 'boost'
										? 65
										: index % 2
											? -28
											: 24),
					},
					velocity: { x: 200 * (1 - eased), y: (index % 2 ? 1 : -1) * 90 * (1 - eased) },
				},
				rotation: (index % 2 ? 10 : -15) * (1 - eased),
			};
		}
		let body = bird.body;
		if (moving && !landing) {
			const steps = Math.max(1, Math.ceil(delta / (1 / 60)));
			for (let i = 0; i < steps; i++)
				body = steerPlayer(body, formationY, delta / steps, bounds, profile);
			body = {
				...body,
				position: {
					...body.position,
					x: body.position.x + (formationX - body.position.x) * Math.min(1, delta * 5),
				},
			};
		} else if (landing) {
			body = {
				...body,
				position: {
					x:
						body.position.x +
						(bounds.width * 0.7 + slot * 15 - body.position.x) * Math.min(1, delta * 3),
					y:
						body.position.y +
						(bounds.floorY * 0.75 + slot * 7 - body.position.y) * Math.min(1, delta * 3),
				},
				velocity: { x: 0, y: 0 },
			};
		}
		return {
			...bird,
			body,
			age,
			frame,
			launched: true,
			visible: true,
			targetY: formationY,
			finished: landing === 1,
			rotation: clamp(
				body.velocity.y / profile.rotationDivisor,
				-profile.rotationLimit,
				profile.rotationLimit,
			),
		};
	});
}
