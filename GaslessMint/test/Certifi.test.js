


const { expect } = require('chai');
const { ethers } = require("hardhat");
const { upgrades } = require("hardhat");
const ethSigUtil = require('eth-sig-util');
// Start test block


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


async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then(f => f.deployed());
}

async function buildRequest(forwarder, input) {
  const nonce = await forwarder.getNonce(input.from).then(nonce => nonce.toString());
  return { value: 0, gas: 1e6, nonce, ...input };
}

async function buildTypedData(forwarder, request) {
  const chainId = await forwarder.provider.getNetwork().then(n => n.chainId);
  const typeData = getMetaTxTypeData(chainId, forwarder.address);
  return { ...typeData, message: request };
}

async function signTypedData(signer, from, data) {
  // If signer is a private key, use it to sign
  //console.log(" typeof(signer)  ", typeof(signer) )
  if (typeof(signer) === 'string') {
    const privateKey = Buffer.from(signer.replace(/^0x/, ''), 'hex');
    return ethSigUtil.signTypedMessage(privateKey, { data });
  }

  // Otherwise, send the signTypedData RPC call
  // Note that hardhatvm and metamask require different EIP712 input
  const isHardhat = data.domain.chainId == 31337;
 // console.log(" isHardhat  ", isHardhat )

  if(isHardhat) {
    const [method, argData] = ['eth_signTypedData_v4', data]
    // console.log(" method", method  )
    // console.log(" argData  ", argData  )
    return await signer.send(method, [from, argData]);
  }
}

function getMetaTxTypeData(chainId, verifyingContract) {
  return {
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
};

async function signMetaTxRequest(signer, forwarder, input) {
  const request = await buildRequest(forwarder, input);
  //console.log(" signMetaTxRequest request ", request)
  const toSign = await buildTypedData(forwarder, request);
  //console.log(" signMetaTxRequest toSign ", toSign)
  const signature = await signTypedData(signer, input.from, toSign);
 // console.log(" signMetaTxRequest signature ", signature)
  return { signature, request };
}


describe('Test Certifi Token', function () {
    
  let deployer, minter, costCollector, forwarderAddr, addrs, forwarderCont, certifiAddr, certifiCont,certifiContV2;
  let signer, relayer, toAddr


  beforeEach(async function () {
    this.signers = await ethers.getSigners();

    [deployer, minter, costCollector,signer,relayer,toAddr, ...addrs] = await ethers.getSigners();

    // console.log("Deployer ", deployer.address)
    // console.log("minter ", minter.address)
    // console.log("costCollector ", costCollector.address)
    // console.log("addrs ", addrs[0].address)
    // console.log(" signer ", addrs[1].address)
    // console.log(" relayer ", addrs[2].address)
   // console.log("forwarderAddr ", forwarderAddr.address)


 
  });


  describe("deploy contracts", function() {

    it('should deploy forwarder', async function () {

      const Token = await ethers.getContractFactory("MinimalForwarder");
      forwarderCont = await Token.deploy();
      forwarderAddr = forwarderCont.address
     // console.log(" forwarderAddr " ,forwarderAddr)
      expect(forwarderAddr!=null);

    })

    it('should deploy nft', async function () {

      const nft = await ethers.getContractFactory("Certifi");
     // console.log(" forwarderAddr " ,forwarderAddr)
      //// console.log(deployer.address)
      //// console.log(minter.address)
      //// console.log(costCollector.address)
      certifiCont = await upgrades.deployProxy(nft,[forwarderAddr], { initializer: 'initialize' });
      console.log("should deploy nft ", certifiCont.address)
      //certifiCont = await upgrades.deployProxy(nft,[forwarderAddr, deployer.address,minter.address,costCollector.address], { initializer: 'initialize' });
     // console.log(certifiCont.address," certifiCont(proxy) address")

    })

    describe('check addresses', function () {
      it('addresses must be not null', async function () {
  
        const deployeris = await certifiCont.deployerAddress()
        const minteris = await certifiCont.minterAddress()
        const collectoris = await certifiCont.costCollectorAddr()

        expect(deployeris!=null)
        expect(minteris!=null)
        expect(collectoris!=null)
  
      })
    })

    it('check roles', async function () {
      const defadmin='0x0000000000000000000000000000000000000000000000000000000000000000'
      const mintrole='0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'

      const deployerois = await certifiCont.deployerAddress()
      const minteris = await certifiCont.minterAddress()
      const collectoris = await certifiCont.costCollectorAddr()
     // console.log("deployerois : " ,deployerois)
     // console.log("minteris : " ,minteris)
     // console.log("collectoris : " ,collectoris)

      for(var i=0;i<this.signers.length;i++) {
       // console.log(this.signers[i].address)
      }

      const isminter = await certifiCont.hasRole(mintrole,minteris)
      expect(isminter)

      const isadmin = await certifiCont.hasRole(defadmin,minteris )
      expect(isadmin)

    })

    it("set redeem address", async function() {

      const redeemAddr = this.signers[1].address
     // console.log(" redeemAddr ", redeemAddr)

      await certifiCont.setRedeemAddress(redeemAddr);

      const checkaddr =await certifiCont.redeemAddress()
     // console.log(" checkaddr ", checkaddr)
      expect(checkaddr == redeemAddr)

    })


    it("mint tokens using safeMint as a minter", async function() {

        await certifiCont.safeMint(this.signers[2].address, [1,2,3], ["one", "two", "three"], 200000);

        const tokbal = await certifiCont.balanceOf(this.signers[2].address);
       // console.log(" tokbal ", tokbal)

        expect(tokbal ==3)
        const contractBalInWei = await certifiCont.contractBalInWei();
       // console.log(" contractBalInWei ", contractBalInWei)

        expect(contractBalInWei ==200000)

    })

    it("redeem token", async function() {

      const forredmeem = await certifiCont.connect(this.signers[2]);
     // console.log(" forredmeem ", forredmeem)

      await forredmeem.redeem([1,2]);

      const tokbal = await certifiCont.balanceOf(this.signers[2].address);
     // console.log(" tokbal ", tokbal)

      expect(tokbal ==1)

    })

    it("upgrade contract", async function() {

      const nftv2 = await ethers.getContractFactory("Certifi");
      certifiContV2 = await upgrades.upgradeProxy(certifiCont.address, nftv2)
    
     // console.log(certifiContV2.address," upgraded certifiCont(proxy) address")
      expect(certifiContV2.address != null)

      const tokbal = await certifiContV2.balanceOf(this.signers[2].address);
     // console.log(" bal post upgrade ", tokbal)
      expect(tokbal ==1)

    })

    it('update token uri', async function() {

      const fortokenURIUpdate = await certifiContV2.connect(this.signers[2]);
     // console.log(" fortokenURIUpdate ", fortokenURIUpdate)

      const tokenuri = await fortokenURIUpdate.tokenURI(3);
      const tokenowner = await fortokenURIUpdate.ownerOf(3);
     // console.log(" tokenowner ", tokenowner)
      expect(tokenowner != null)

      await fortokenURIUpdate.updateTokenUri(3,"updated uri");
      const tokenuri2 = await certifiContV2.tokenURI(3);
     // console.log(" tokenuri2 ", tokenuri2)

      expect(tokenuri!=tokenuri2)
 
    })

    it('initiate gasless Minting', async function () {
      
      let ids=[]
      ids.push(123)
      let uris=[]
      uris.push("google.com")

      const preMintBalance = await certifiCont.balanceOf(toAddr.address);
      console.log("preMintBalance : " ,preMintBalance.toString())

      const { request, signature } = await signMetaTxRequest(
          signer.provider, 
          forwarderCont, 
          {
            from: signer.address,
            to: certifiCont.address,
            data: certifiCont.interface.encodeFunctionData('gaslessSafeMint', 
              [
                toAddr.address,
                ids,
                uris, 
                20000
              ]),
          }
        );

      await forwarderCont.execute(request, signature).then(tx => tx.wait());
      const _ownerOf = await certifiCont.ownerOf(123)
      console.log("_ownerOf ", _ownerOf)

      const postMintBal = await certifiCont.balanceOf(toAddr.address);
      console.log("postMintBal : " ,postMintBal.toString())

      expect(preMintBalance != postMintBal)

    })


  })




});
