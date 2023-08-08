// require("@nomicfoundation/hardhat-toolbox");

// /** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: "0.8.17",
// };



require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');
/** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: "0.8.9", 
// };

module.exports = {   solidity: {
  compilers: [
    {
      version: "0.8.11",
    },
    {
      version: "0.8.13",
      settings: {},
    },
  ],   
}, 
networks: {
  local: {
    url: 'http://localhost:8545'
  },
  goerli: {
    url: 'https://goerli.infura.io/v3/065e3fecde7f4e429b842d224a570156',
    accounts: ['c6a5ebc6508e6c2f99f738ad40d9922d6c9579d0dbcb3057b423b1fd5bba0ff0'],
  },
  hardhat: {
  allowUnlimitedContractSize: true
  }
}

};