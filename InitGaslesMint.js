//this file can be used in the react project along with the '@web3-react/injected-connector'.

import { InjectedConnector } from '@web3-react/injected-connector';
import { ethers } from 'ethers';

import { DefenderRelaySigner, DefenderRelayProvider } from 'defender-relay-client/lib/ethers';

import { params } from '../constants';

let web3;

export const injected = new InjectedConnector({
	supportedChainIds: [1, 3, 4, 5, 42],
});


let contract;

const minforwarder = params.MIN_FORWARDER
const minforwarderABI = params.MIN_FORWARDER_ABI
const gaslessNFT = params.CERTIFI_CONTRACT;
const gaslessNFTABI = params.ABI;
const autoTaskWebHook = params.webhookUrl;
const EIP712Domain = [
	{ name: 'name', type: 'string' },
	{ name: 'version', type: 'string' },
	{ name: 'chainId', type: 'uint256' },
	{ name: 'verifyingContract', type: 'address' }
];

const ForwardRequest = [
	{ name: 'from', type: 'address' },
	{ name: 'to', type: 'address' },
	{ name: 'value', type: 'uint256' },
	{ name: 'gas', type: 'uint256' },
	{ name: 'nonce', type: 'uint256' },
	{ name: 'data', type: 'bytes' },
];



function getMetaTxTypeData(chainId, verifyingContract) {
	const typedata = {
		types: {
			EIP712Domain,
			ForwardRequest,
		},
		domain: {
			name: 'MinimalForwarder',
			version: '0.0.1',
			chainId,
			verifyingContract,
		},
		primaryType: 'ForwardRequest',
	}
	return typedata;
};


async function buildRequest(forwarder, input) {

	const nonce = await forwarder.getNonce(input.acc).then(nonce => nonce.toString());

	return { value: 0, gas: 1e6, nonce, ...input };
}

async function buildTypedData(forwarder, request) {
	const chainId = await forwarder.provider.getNetwork().then(n => n.chainId);

	const typeData = getMetaTxTypeData(chainId, forwarder.address);
	const retval = { ...typeData, message: request }

	return { ...typeData, message: request };

}

async function signTypedData(signer, from, data) {

	// If signer is a private key, use it to sign


	// Otherwise, send the signTypedData RPC call
	// Note that hardhatvm and metamask require different EIP712 input
	const isHardhat = data.domain.chainId == 31337;

)

	const [method, argData] = isHardhat
		? ['eth_signTypedData', data]
		: ['eth_signTypedData_v4', JSON.stringify(data)]

	return await signer.send(method, [from, argData]);
}

async function signMetaTxRequest(signer, forwarder, input) {


	const request = await buildRequest(forwarder, input);

	const toSign = await buildTypedData(forwarder, request);


	const signature = await signTypedData(signer, input.acc, toSign);

	return { signature, request };

}




export const redeem = async (connector, _tokenids) => {
	

	const acc = await connector.getAccount();
	const prov = await connector.getProvider();
	const provider = new ethers.providers.Web3Provider(prov);
	const signer = provider.getSigner(acc);
	const nftContract = new ethers.Contract(
		params.CERTIFI_CONTRACT,
		params.ABI,
		signer
	);


	const redeemtx = await nftContract.redeem(_tokenids);

	await redeemtx.wait();
	


	const msg = 'https://goerli.etherscan.io/tx/' + redeemtx['hash'];
	return msg;


};

export const burn = async (connector, tokenid) => {

	const acc = await connector.getAccount();
	const prov = await connector.getProvider();
	const provider = new ethers.providers.Web3Provider(prov);
	const signer = provider.getSigner(acc);
	const nftContract = new ethers.Contract(
		params.CERTIFI_CONTRACT,
		params.ABI,
		signer
	);
	const burntx = await nftContract.burn(tokenid);
	burntx.wait();
	const msg =
		'Transaction has been initaited. You can view it by accessing https://goerli.etherscan.io/tx/' +
		burntx['hash'];

	return msg;
};


export const uploaddata2 = async(certids) => {

  const cid=[]
    try {
  
     
      const auth = 'Basic ' + Buffer.from(params.INFURA_IPFS_PROJECT_ID + ':' + params.INFURA_IPFS_SECRET).toString('base64');
       
        for(let i=0;i<certids.length;i++) {

          const metadata  = await pullCertData(certids[i])
       
          const client = create({
            host: params.INFURA_HOST_URL,
            port: 5001,
            protocol: 'https',
            apiPath: '/api/v0',
            headers: {
              authorization: auth,
            }
          })
          const added = await client.add(JSON.stringify(metadata))
        
          cid.push("ipfs://"+added.path)
          
        }
        return cid;
      

    } catch(ex) {
      return false
    }
    

}


export const checkUSDCBal = async(connector,totalNFTCostINUSD) => {
	
    try {
        totalNFTCostINUSD= 1
        const acc = await connector.getAccount();
        const prov = await connector.getProvider();
        const provider = new ethers.providers.Web3Provider(prov);
        const signer = provider.getSigner(acc);
        const usdcContract = new ethers.Contract(
            params.USDC_ADDR,
            params.USDC_CONTRACT_ABI,
            signer
        );
        const certifiNFT = params.CERTIFI_CONTRACT;
        const certifiNFTABI = params.ABI;
        const certifiContract = new ethers.Contract(
            certifiNFT,
            certifiNFTABI,
            signer
        );

       
        let costCollectorAddr = (await certifiContract.costCollectorAddr()).toString()


        let balance = await usdcContract.balanceOf(acc);
        

        balance =  balance / Math.pow(10, 6);

        if(balance > totalNFTCostINUSD) {
            let tx = await usdcContract.transfer(costCollectorAddr, 1000000);
            
            const txReceipt = await tx.wait(1)
            const txHash = txReceipt["transactionHash"];
            if (txReceipt["status"] == 1) {
                return txReceipt["status"] //"Successfully paid via USDC"
            } else {
                return "Issue during payment"
            }
        } else {
            alert("Minimum USDC balance is required to initiate the transaction");
        }

      //  return balance;

        } catch(e) {
            return "Issue during payment"
        }
        
}




export const initGaslessMint = async (connector, ids, mintids, minforwarder) => {

	try {
		
		const certforward = minforwarder
		const certCont =  gaslessNFT 

		const acc = await connector.getAccount();
	
		const prov = await connector.getProvider();
	
		const provider = new ethers.providers.Web3Provider(prov);
	
		const signer = provider.getSigner(acc);
		
		let tokenidsToMint=[]

		for (var i = 0; i < ids.length; i++) {
			const randomNum =  Math.floor(Math.random() * (100000 - 10 + 1) + 10);;
			tokenidsToMint.push(randomNum);
		}

	
		
		const forwarder = new ethers.Contract(
			certforward,
			minforwarderABI,
			signer
		);
		const nftContract = new ethers.Contract(
			certCont,
			gaslessNFTABI,
			signer
		);
		const tokens = tokenidsToMint

		const ipfmetadatasurls = await uploaddata2(ids) 
	
		let metadatauris = ipfmetadatasurls
		
			
		
		const data = nftContract.interface.encodeFunctionData('gaslessSafeMint', [acc, tokens, metadatauris, 0]);
		
		const input = {
			to: certCont,
			from: acc,
			data: data
		}

		const nonce = await forwarder.getNonce(acc).then(nonce => nonce.toString());
		const request = { value: 0, gas: 1e6, nonce, ...input };


		const chainId = await forwarder.provider.getNetwork().then(n => n.chainId);
		const typeData = getMetaTxTypeData(chainId, forwarder.address);
		const retval = { ...typeData, message: request }
		const toSign = { ...typeData, message: request };
		

		const isHardhat = toSign.domain.chainId == 31337;
		
		const [method, argData] = isHardhat
			? ['eth_signTypedData', toSign]
			: ['eth_signTypedData_v4', JSON.stringify(toSign)]

		

		const signature = await signer.provider.send(method, [acc, argData]);


		// api call to get the challenge
		const challengeID= "challenge01"
		const challenge = { value: challengeID }
		//

		const respis = { challenge, signature, request }
		
		

    const resp = await fetch(autoTaskWebHook, {
				method: 'POST',
				body: JSON.stringify(respis),
				headers: { 'Content-Type': 'application/json' },
		});

		const tojsonresp = await resp.json()


		if (tojsonresp["status"] == "success") {
				const txid = await JSON.parse(tojsonresp["result"])
			
						
				return "https://goerli.etherscan.io/tx/" + txid["txHash"]
		} else {
				const txid = await JSON.parse(tojsonresp["result"])
				
				return "https://goerli.etherscan.io/tx/" + txid["txHash"]
		}
		
	} catch(e){
		return "issue in gasless minting"
	}

}

export const payViaUSDC = async (connector, ids, mintids) => {

	let totalNFTCostINUSD = 0;
	try {
		for (var i = 0; i < ids.length; i++) {
		
			totalNFTCostINUSD = totalNFTCostINUSD + params.NFT_COST_IN_USD
		}

		const payResp =  await checkUSDCBal(connector,totalNFTCostINUSD)
		
		if(payResp == 1) {
			return "Successfully paid via USDC"
			

		} else {
			return "Issue during payment"
		}

	} 
		
	catch(e) {
			return "issue with paying NFT cost via tokens"
	}

}



export const mint = async (connector, ids, mintids) => {

	try {

    const gaslessMintResp = await initGaslessMint(connector, ids, mintids);
	
    return gaslessMintResp;
		
	} catch (e) {

		return "issue with minting tokens"
	}

};



export const getNFTs = async (connector) => {
	const tokens = [];



	const acc = await connector.getAccount();
	
	const url =
		params.ALCHEMY_GOERLI_NFT_BASE_URL +
		params.ALCHEMY_API_KEY +
		'/getNFTs?owner=' +
		acc +
		'&contractAddresses[]=' + params.CERTIFI_CONTRACT +
		'&withMetadata=true';

	const response = await fetch(url);
	const myJson = await response.json();
	
	for (var i = 0; i < myJson.ownedNfts.length; i++) {
		let tokenJSON = {};
		tokenJSON['id'] = parseInt(myJson.ownedNfts[i]['id']['tokenId'], 16);
		tokenJSON['name'] =  myJson.ownedNfts[i]["metadata"]['name'];
		tokenJSON['description'] = myJson.ownedNfts[i]["metadata"]["description"] //metadata"]["data"]["PSACert"]['Brand'];
		tokenJSON['gatewayurl'] = myJson.ownedNfts[i]["metadata"]['image'];
		tokenJSON['contract'] = myJson.ownedNfts[i]['contract']['address'];
		tokens.push(tokenJSON);
		
		
	}

	return tokens;

};




export const calculateNFTPrice = async () => {

	const ethPrice = await fetch(params.COINGECKO_API)
	const toJson = await ethPrice.json()
	return toJson["ethereum"]["usd"]

}
