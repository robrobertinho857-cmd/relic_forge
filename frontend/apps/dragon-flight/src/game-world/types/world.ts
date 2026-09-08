export type Vector2 = {
	x: number;
	y: number;
};

export type PlayerBody = {
	position: Vector2;
	velocity: Vector2;
	radius: number;
};

export type WorldBounds = {
	width: number;
	height: number;
	floorY: number;
};

export type EmberParticle = {
	id: number;
	x: number;
	y: number;
	velocityX: number;
	velocityY: number;
	life: number;
	size: number;
};
