// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract AccessToken is ERC20 {
    constructor(address recipient) ERC20("AccessToken", "AT") {
        _mint(recipient, 1000000000 * 10 ** decimals());
    }
}
