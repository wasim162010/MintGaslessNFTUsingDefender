'use strict';

var ethers = require('ethers');
var require$$0 = require('defender-relay-client/lib/ethers');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var ethers__default = /*#__PURE__*/_interopDefaultLegacy(ethers);
var require$$0__default = /*#__PURE__*/_interopDefaultLegacy(require$$0);

/**
 * ABI of the MinimalForwarder contract . TempRelayerAT
 */

//const ForwarderAbi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"components":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"gas","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct MinimalForwarder.ForwardRequest","name":"req","type":"tuple"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"execute","outputs":[{"internalType":"bool","name":"","type":"bool"},{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"}],"name":"getNonce","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"gas","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct MinimalForwarder.ForwardRequest","name":"req","type":"tuple"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"verify","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}];

const ForwarderAbi = [{"inputs": [],"stateMutability": "nonpayable","type": "constructor"},{"inputs": [{"components": [{"internalType": "address","name": "from","type": "address"},{"internalType": "address","name": "to","type": "address"},{"internalType": "uint256","name": "value","type": "uint256"},{"internalType": "uint256","name": "gas","type": "uint256"},{"internalType": "uint256","name": "nonce","type": "uint256"},{"internalType": "bytes","name": "data","type": "bytes"}],"internalType": "struct MinimalForwarder.ForwardRequest","name": "req","type": "tuple"},{"internalType": "bytes","name": "signature","type": "bytes"}],"name": "execute","outputs": [{"internalType": "bool","name": "","type": "bool"},{"internalType": "bytes","name": "","type": "bytes"}],"stateMutability": "payable","type": "function"},{"inputs": [{"internalType": "address","name": "from","type": "address"}],"name": "getNonce","outputs": [{"internalType": "uint256","name": "","type": "uint256"}],"stateMutability": "view","type": "function"},{"inputs": [{"components": [{"internalType": "address","name": "from","type": "address"},{"internalType": "address","name": "to","type": "address"},{"internalType": "uint256","name": "value","type": "uint256"},{"internalType": "uint256","name": "gas","type": "uint256"},{"internalType": "uint256","name": "nonce",
						"type": "uint256"
					},
					{
						"internalType": "bytes",
						"name": "data",
						"type": "bytes"
					}
				],
				"internalType": "struct MinimalForwarder.ForwardRequest",
				"name": "req",
				"type": "tuple"
			},
			{
				"internalType": "bytes",
				"name": "signature",
				"type": "bytes"
			}
		],
		"name": "verify",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

var forwarder = {
  ForwarderAbi
};

var MinimalForwarder="0x45998006749131BBD34B8f04e483A7BE12f650B2";var Certifi="0xdce43C704d7F961238f67280218D8f780D873325";var require$$2 = {MinimalForwarder:MinimalForwarder,Certifi:Certifi};

const { DefenderRelaySigner, DefenderRelayProvider } = require$$0__default['default'];

const { ForwarderAbi: ForwarderAbi$1 } = forwarder;
const ForwarderAddress = require$$2.MinimalForwarder;

async function relay(forwarder, request, signature, whitelist) {
  // Decide if we want to relay this request based on a whitelist
  const accepts = !whitelist || whitelist.includes(request.to);
  if (!accepts) throw new Error(`Rejected request to ${request.to}`);

  // Validate request on the forwarder contract

  // console.log("verifying request ", request)
  // console.log("verifying signature ", signature)
  const valid = await forwarder.verify(request, signature);
  console.log(`valid`, valid);
  if (!valid) throw new Error(`Invalid request`);
  
  // Send meta-tx through relayer to the forwarder contract
  const gasLimit = (parseInt(request.gas) + 50000).toString();
  console.log(gasLimit);
  const respexecute = await forwarder.execute(request, signature, { gasLimit });
  console.log(respexecute);
  return respexecute

}

async function handler(event) {
  // Parse webhook payload
  if (!event.request || !event.request.body) throw new Error(`Missing payload`);
  const { request, signature } = event.request.body;
  // console.log(`handler request `, request);
  // console.log(`handler signature `, signature);

  console.log(`Relaying`);
  
  // Initialize Relayer provider and signer, and forwarder contract
  const credentials = { ... event };
  console.log(`credentials`, credentials);
  const provider = new DefenderRelayProvider(credentials);
  //console.log(`provider`, provider);
 
  const signer = new DefenderRelaySigner(credentials, provider, { speed: 'fast' });
  console.log(`signer`, signer);
  console.log(`ForwarderAddress`, ForwarderAddress);
   
  const forwarder = new ethers__default['default'].Contract(ForwarderAddress, ForwarderAbi$1, signer);
  console.log(`forwarder`, forwarder);
  
  // Relay transaction!

  const tx = await relay(forwarder, request, signature);
  console.log("tx ", tx);
  console.log(`Sent meta-tx: ${tx.hash}`);
  return { txHash: tx.hash };

}

var relay_1 = {
  handler,
  relay,
};

module.exports = relay_1;
