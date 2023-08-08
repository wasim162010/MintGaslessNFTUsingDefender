# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```


# PREREQUISITES to run the project :
1. Create an .env file at the root level by referring to '.env-example'
2. In 'PRIVATE_KEY','INFURA_API_KEY' and 'ETHERSCAN_API_KEY', put your account private key, infura api key and etherscan API key. For etherscan API key, create an account in etherscan[it's free] and copy api key. It is required to verify the source code of the smart contract so that 'Read as proxy' and 'write as proxy' smart contract option can come in the etherscan.

# To run local hardhat node :
npx hardhat node


# To compile :
npx hardhat compile

# to deploy in localhost[local hardhat env]
npx hardhat run scripts/deployCertifi.js --network localhost

# to deploy in goerli
npx hardhat run scripts/deployCertifi.js --network goerli 

# To verify post deployment :
npx hardhat verify --network goerli <certiti contract address>
ex:
npx hardhat verify --network goerli 0xd9E0b816aB7f433c47f9C745dB3678e02E62cB1A

# to upgrade the contract
Follow the 'deployCertifiv2.js' under 'scripts' and run 'npx harhdat run' by providing required params. For ex :
npx hardhat run scripts/deployCertifiv2.js --network localhost
