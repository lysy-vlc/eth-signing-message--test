<script>
	import { config, modal, signData } from '$lib/walletConnect';
	import { onDestroy, onMount } from 'svelte';
	import {
		deployContract,
		getAccount,
		getBalance,
		getChains, simulateContract,
		waitForTransactionReceipt,
		watchAccount, writeContract
	} from '@wagmi/core';
	import DIAOracleV2 from 'dia-oracle'

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
			account.chainId,
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

	let contractAddress = null

	async function deployFirstStep() {
		const account = getAccount(config)

		const { abi, bytecode } = DIAOracleV2

		const deployConfig = { abi: abi, account: account.address, bytecode: bytecode }

		if (account.chainId === 11155111 || account.chainId === 5) {
			deployConfig.gas = 1081872
		}
		const hash = await deployContract(config, {
			...deployConfig,
		})

		console.log('deployed contract hash', hash)

		const transaction = await waitForTransactionReceipt(
			config,
			{
				hash,
				pollingInterval: 2_000
			}
		)

		console.log('deployed contract transaction', transaction.contractAddress)

		contractAddress = transaction.contractAddress
	}

	let registeredOracleData = null

	async function deploySecondStep() {
		const account = getAccount(config)

		const signedData = await signData(
			account.chainId,
			'Verify its your address to call oracle builder',
			contractAddress,
			account.address
		)

		if (!signedData) {
			console.error('Error signing data - address verification')
		}

		try {
			registeredOracleData = await registerOracle({
				oracleAddress: contractAddress,
				chainId: account.chainId,
				creator: account.address,
				signedData,
				symbols: 'Solana-0x0000000000000000000000000000000000000000-SOL',
				frequency: 10000,
				deviationPermille: 0,
				feederID: ''
			})
		} catch (error) {
			console.error(error)
		}
	}

	// const registerOracle = async (request) => {
	// 	const formdata = new FormData()
	// 	formdata.append('oracleaddress', request.oracleAddress)
	// 	formdata.append('chainID', request.chainId)
	// 	formdata.append('creator', request.creator)
	// 	formdata.append('signeddata', request.signedData)
	// 	formdata.append('symbols', request.symbols)
	// 	formdata.append('sleepseconds', '')
	// 	formdata.append('feederID', request.feederID)
	//
	// 	if (request.deviationPermille > 0) {
	// 		formdata.append('mandatoryfrequency', request.frequency)
	// 		formdata.append('frequency', 0)
	// 	} else {
	// 		formdata.append('mandatoryfrequency', 0)
	// 		formdata.append('frequency', request.frequency)
	// 	}
	//
	// 	const fs = []
	// 	processStore.priceFeeds.forEach((feed) => {
	// 		let sourcesArray = []
	// 		feed.sources?.forEach((source) => {
	// 			let pairsArray = []
	// 			source.Pairs?.forEach((pair) => {
	// 				if (pair.status) {
	// 					pairsArray.push(pair.pair)
	// 				}
	// 			})
	// 			if (pairsArray.length > 0) {
	// 				sourcesArray.push({
	// 					Exchange: source.Exchange,
	// 					Pairs: pairsArray
	// 				})
	// 			}
	// 		})
	//
	// 		const fsItem = {
	// 			Methodology: feed.methodology.value,
	// 			Symbol: feed.symbol + '-' + feed.address,
	// 			FeedSelection: [
	// 				{
	// 					Address: feed.address,
	// 					Blockchain: feed.network,
	// 					Exchangepairs: sourcesArray
	// 				}
	// 			]
	// 		}
	// 		fs.push(fsItem)
	// 	})
	//
	// 	formdata.append('feedselection', JSON.stringify(fs))
	//
	// 	formdata.append('deviationpermille', request.deviationPermille)
	//
	// 	const requestOptions = {
	// 		method: 'POST',
	// 		body: formdata,
	// 		redirect: 'follow'
	// 	}
	//
	// 	try {
	// 		const res = await fetch(
	// 			`${config.public.ORACLE_API_BASE_URL}/create`,
	// 			requestOptions
	// 		)
	// 		const d = await res.json()
	// 		return d.publicKey
	// 	} catch (err) {
	// 		console.error(err)
	// 		throw new Error('Failed to create and register oracle')
	// 	}
	// }

	let oracleExplorerUrl = null

	const assignOwnership = async () => {
		const account = getAccount(config)

		try {
			const chains = getChains(config)

			const currentChain = chains.find(
				(chain) => chain.id === account.chainId
			)

			const { hash } = await writeContract(
				config,
				{
					abi: DIAOracleV2.abi,
					address: contractAddress,
					functionName: 'changeOwner',
					args: [registeredOracleData],
					chainId: currentChain.id
				}
			)

			await waitForTransactionReceipt(config, {
				hash: hash
			})

			oracleExplorerUrl = `${currentChain.blockExplorers.default.url}/tx/${hash}`
		} catch (error) {
			console.error(error)
		}
	}
</script>

<h1>Welcome to wagmi latest test</h1>
<!--<w3m-button></w3m-button>-->

<button on:click="{connectWallet}">manually connect</button>
<button on:click="{disconnectWallet}">manually disconnect</button>
<button on:click="{handleGetBalance}">get balance</button>
<button on:click={createAccount}>create account</button>
<button on:click={deployFirstStep}>deployFirstStep</button>
<button on:click={deploySecondStep}>deploySecondStep</button>
<button on:click={assignOwnership}>assignOwnership</button>