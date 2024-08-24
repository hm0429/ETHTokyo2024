// SPDX-License-Identifier: UNLICENSE

pragma solidity >=0.8.2 <0.9.0;

interface ENS {
    function resolver(bytes32 node) external view returns (address);
}

interface ReverseRegistrar {
    function node(address addr) external view returns (bytes32);
}

interface PublicResolver {
    function name(bytes32 node) external view returns (string memory);
}

contract ENSuica {
    // idmHash => address
    mapping (bytes32 => address) public addresses;

    ENS ens = ENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);
    ReverseRegistrar reverseRegistrar = ReverseRegistrar(0xA0a1AbcDAe1a2a4A2EF8e9113Ff0e02DD81DC0C6);

    function register(bytes32 idmHash)
        public
    {
        require(addresses[idmHash] == address(0x0), "idmHash has already been registered");
        addresses[idmHash] = msg.sender;
    }

    function unregister(bytes32 idmHash) 
        public
    {
        require(addresses[idmHash] == msg.sender, "You don't have permission to unregister idmHash");
        addresses[idmHash] = address(0x0);
    }

    function name(bytes32 idmHash) 
        view
        public
        returns (string memory)
    {
        require(addresses[idmHash] != address(0x0), "idmHash has not been registered");
        bytes32 node = reverseRegistrar.node(addresses[idmHash]);
        PublicResolver resolver = PublicResolver(ens.resolver(node));
        return resolver.name(node);    
    }

}