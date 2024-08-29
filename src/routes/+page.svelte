<script>
	import { config, modal, signData } from '$lib/walletConnect';
	import { onDestroy, onMount } from 'svelte';
	import { getAccount, getBalance, watchAccount } from '@wagmi/core';

	const connectWallet = async () => {
		await modal.open()
	}

	const disconnectWallet = async () => {
		await modal.close()
	}

	const unwatch = watchAccount(config, {
		onChange(data) {
			console.log('Account changed!', data)
		},
	})

	onMount(() => {
		modal.subscribeState(newState => console.log('wallet State', newState))

		modal.subscribeEvents(event => console.log('wallet event' ,event))


	});

	onDestroy(() => {
		unwatch()
	})

	const handleGetBalance = async () => {
		const account = getAccount(config)

		const balance = await getBalance(config, {
			address: account.address,
		})

		console.log(`Account: ${account.address}\nBalance:`, balance, account)
	}

	const createAccount = async () => {
		const account = getAccount(config)

		const signedData = await signData(
			String(account.chainId),
			'Verify its your address to create Account',
			account.address
		)

		const formdata = new FormData()
		formdata.append('email', 'some@rmail.com')

		formdata.append('chainId', String(account.chainId))

		formdata.append('wallet_public_keys[]', account.address || '')

		formdata.append('creator', account.address || '')

		const requestOptions = {
			method: 'POST',
			body: formdata,
			headers: {
				Authorization: `Bearer ${signedData}`
			},
			'Content-Type': 'multipart/form-data',
		}

		try {
			const res = await fetch(
				`https://api.diadata.org/oraclebuilder-prod/createAccount`,
				requestOptions
			)
			const d = await res.json()
			return d.publicKey
		} catch (err) {
			console.error(err)
			throw new Error('Failed to create and register oracle')
		}
	}
</script>

<h1>Welcome to wagmi latest test</h1>
<!--<w3m-button></w3m-button>-->

<button on:click="{connectWallet}">manually connect</button>
<button on:click="{disconnectWallet}">manually disconnect</button>
<button on:click="{handleGetBalance}">get balance</button>
<button on:click={createAccount}>create account</button>