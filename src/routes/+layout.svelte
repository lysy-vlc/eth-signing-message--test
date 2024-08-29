<script lang="ts">
	import { onMount } from 'svelte'
	import type { LayoutData } from './$types'

	export let data: LayoutData

	onMount(() => {
		if (data.initializeApp) {
			data.initializeApp()
		}
	})
</script>

<slot></slot>