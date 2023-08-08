// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol"; 
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "./ERC2771ContextUpgradeable.sol";
import "./OperatorRegistry/DefaultOperatorFiltererUpgradeable.sol";
import "./MinimalForwarder.sol";

contract Certifi is Initializable, ERC721Upgradeable, ERC721URIStorageUpgradeable, PausableUpgradeable, 
    AccessControlUpgradeable, ERC721BurnableUpgradeable,ReentrancyGuardUpgradeable, 
    UUPSUpgradeable, ERC2981Upgradeable, ERC2771ContextUpgradeable , DefaultOperatorFiltererUpgradeable { 

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    address public redeemAddress; //Escrow Wallet 
    address public deployerAddress; //Deployer Wallet 
    address public minterAddress; //Minter Wallet 
    address public costCollectorAddr; //It is the address where the amt will be sent by the user.

    address public msgSenderAddr;
    address public _msgSenderAddr;
    address public minForwarder;

    uint256 public contractBalInWei;

    struct redeemNFT {
        uint256 id;
        address owner;
    }
    redeemNFT redeemNFTInst;
    mapping(uint256 => redeemNFT) public redeemMapping;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    modifier isAdmin() {
        hasRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _;
    }

    function initialize(address trustedForwarder
                        // address _deployerAddress,
                        // address _minterAddress,
                        // address _costCollectorAddr
                    ) initializer public {

        __ERC721_init("Certifi", "CTF");
        __ERC721URIStorage_init();
        __Pausable_init();
        __AccessControl_init();
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();
        __ERC2981_init();
        deployerAddress = _msgSender(); //_deployerAddress
        minterAddress = _msgSender();//_minterAddress;//_msgSender();
        costCollectorAddr = _msgSender();//_costCollectorAddr;//_msgSender();
         __ERC2771Context_init(trustedForwarder);
        _setDefaultRoyalty(_msgSender(), 700);
        __ReentrancyGuard_init(); 
        __DefaultOperatorFilterer_init();
         minForwarder = trustedForwarder;
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(PAUSER_ROLE, _msgSender());
        _grantRole(MINTER_ROLE, _msgSender());
        _grantRole(UPGRADER_ROLE, _msgSender());
        
    }

    
    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable,ERC2771ContextUpgradeable)
        returns (address sender)
    {
        sender = ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpgradeable._msgData();
    }
    

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function safeMint(address to, uint256[] calldata tokenId, string[] memory uri, uint256 nftCostsInWei)
        external 
        payable
        onlyRole(MINTER_ROLE)
    {
      
        for(uint256 i=0;i<tokenId.length;i++) {
            _safeMint(to, tokenId[i]);
            _setTokenURI(tokenId[i], uri[i]);
        }

        msgSenderAddr = msg.sender;
        _msgSenderAddr = _msgSender();
        contractBalInWei = contractBalInWei + nftCostsInWei;

    }

 function gaslessSafeMint(address to, uint256[] calldata tokenId, string[] memory uri, uint256 nftCostsInWei)
        external 
        payable
    {
        require(msg.sender == minForwarder,"It must be invoked by MinimumForwarder for gasless mint");

        for(uint256 i=0;i<tokenId.length;i++) {
            _safeMint(to, tokenId[i]);
            _setTokenURI(tokenId[i], uri[i]);
        }

        msgSenderAddr = msg.sender;
        _msgSenderAddr = _msgSender();
        contractBalInWei = contractBalInWei + nftCostsInWei;

    }

    function burn(uint256 tokenId) public override {
        require(_msgSender() == redeemAddress,"Only Escrow wallet can burn the NFT");
        _burn(tokenId);
    }

    function addAdmin(address account) external virtual isAdmin {
        grantRole(DEFAULT_ADMIN_ROLE, account);
    }

    function removeAdmin(address account) external virtual isAdmin {
        revokeRole(DEFAULT_ADMIN_ROLE, account);
    }

    function redeem(uint256[] calldata tokenId) external {
       
        for(uint256 i=0;i<tokenId.length;i++) {
            redeemNFTInst = redeemNFT(tokenId[i], _msgSender());
            redeemMapping[tokenId[i]] = redeemNFTInst;
            transferFrom(_msgSender(), redeemAddress, tokenId[i]);
        }
       
    }

    function setCostCollectorAddr(address addr) external isAdmin {
        costCollectorAddr = addr;
    }

    function setRedeemAddress(address addr) external isAdmin {
        redeemAddress = addr;
    }

    function getRedeemAddress() external view returns(address)  {
        return redeemAddress;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // function _authorizeUpgrade(address newImplementation) internal override {
    // }

    ////////////////
    // royalty
    ////////////////
    /**
     * @dev See {ERC2981-_setDefaultRoyalty}.
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @dev See {ERC2981-_deleteDefaultRoyalty}.
     */
    function deleteDefaultRoyalty() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _deleteDefaultRoyalty();
    }

    /**
     * @dev See {ERC2981-_setTokenRoyalty}.
     */
    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    /**
     * @dev See {ERC2981-_resetTokenRoyalty}.
     */
    function resetTokenRoyalty(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _resetTokenRoyalty(tokenId);
    }

    //OpenSea Operator Registry
    function transferFrom(address from, address to, uint256 tokenId) public override onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
        public
        override
        onlyAllowedOperator(from)
    {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function setMinter(address addr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE,addr);
    }

    function updateTokenUri(uint256 tokenId, string memory _tokenURI) external {
        require(ownerOf(tokenId) == _msgSender(),"User must be a token owner"); // to be checked 
        _setTokenURI( tokenId,  _tokenURI);
    }

    function setMinForwarderAddr(address minforwarder) external {
        minForwarder = minforwarder;
    }


}



