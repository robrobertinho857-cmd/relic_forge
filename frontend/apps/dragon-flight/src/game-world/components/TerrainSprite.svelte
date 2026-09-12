<script lang="ts">
	import { getTerrainArtwork, type TerrainMaterial, type TerrainSide } from '../terrainArtwork';
	let { material, side, snowy }: { material: TerrainMaterial; side: TerrainSide; snowy: boolean } =
		$props();
	const id = $props.id();
	const art = $derived(getTerrainArtwork(material, side, snowy));
</script>

<svg
	class="terrain-art"
	viewBox={art.viewBox}
	preserveAspectRatio={side === 'upper' ? 'xMidYMax slice' : 'xMidYMin slice'}
	aria-hidden="true"
>
	<defs>
		<filter id={`${id}-edge`} color-interpolation-filters="sRGB">
			<feComponentTransfer><feFuncA type="linear" slope="3" intercept="-1" /></feComponentTransfer>
		</filter>
		<mask
			id={`${id}-shape`}
			maskUnits="userSpaceOnUse"
			x="0"
			y="0"
			width={art.width}
			height={art.height}
			style="mask-type:alpha"
		>
			<image
				href={art.silhouette}
				width={art.width}
				height={art.height}
				filter={`url(#${id}-edge)`}
			/>
		</mask>
	</defs>
	<image
		class="terrain-paint"
		href={art.src}
		width={art.width}
		height={art.height}
		mask={`url(#${id}-shape)`}
	/>
</svg>

<style>
	.terrain-art {
		display: block;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
</style>
