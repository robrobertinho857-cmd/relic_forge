// Driven only by the world's rAF. All durations are presentation milliseconds.
// Hidden-tab gaps are discarded, not caught up; speed is applied exactly once.
type Job = {
	elapsed: number;
	duration: number;
	token: number;
	scaled: boolean;
	update?: (p: number) => void;
	finish: (ok: boolean) => void;
};
export class PresentationTimeline {
	private jobs: Job[] = [];
	private generation = 0;
	get pending() {
		return this.jobs.length;
	}
	animate(
		duration: number,
		token: number,
		update?: (progress: number) => void,
		scaled = true,
	): Promise<boolean> {
		return new Promise((resolve) => {
			const job: Job = {
				elapsed: 0,
				duration: Math.max(1, duration),
				token,
				scaled,
				update,
				finish: resolve,
			};
			this.jobs.push(job);
			update?.(0);
		});
	}
	tick(seconds: number, speed: number, token: number, hidden = false) {
		const milliseconds = hidden ? 0 : Math.max(0, Math.min(seconds, 0.05)) * 1000;
		const generation = this.generation;
		const jobs = this.jobs;
		this.jobs = [];
		for (const job of jobs) {
			if (job.token !== token || generation !== this.generation) {
				job.finish(false);
				continue;
			}
			job.elapsed += milliseconds * (job.scaled ? Math.max(0.1, Math.min(speed, 2)) : 1);
			const progress = Math.min(1, job.elapsed / job.duration);
			job.update?.(progress);
			if (generation !== this.generation) job.finish(false);
			else if (progress === 1) job.finish(true);
			else this.jobs.push(job);
		}
	}
	cancel() {
		this.generation++;
		const jobs = this.jobs;
		this.jobs = [];
		for (const job of jobs) job.finish(false);
	}
}
export const easeOut = (p: number) => 1 - (1 - p) ** 3;
export const presentationSpeed = (selected: number, restricted: boolean) =>
	restricted ? 1 : Math.max(1, Math.min(selected, 2));
