pragma solidity ^0.5.2;

import "./Core.sol";


contract Proxy is Core {
    constructor(address _master) public {
        setMaster(_master, "0x0");
    }

    function () external payable {
        if (masterAddress != address(0)) {
            // solium-disable-next-line security/no-inline-assembly
            assembly {
                let to  := and(sload(0x0), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) // masterAddress
                let ptr := mload(0x40)
                calldatacopy(ptr, 0, calldatasize)
                let result := delegatecall(gas, to, ptr, calldatasize, 0, 0)
                let size := returndatasize
                returndatacopy(ptr, 0, size)
                switch result
                case 0  { revert (ptr, size) }
                default { return (ptr, size) }
            }
        }
    }
}
