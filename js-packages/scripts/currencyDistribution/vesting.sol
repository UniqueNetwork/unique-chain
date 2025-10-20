// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IERC20} from "node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract Vesting is Ownable {
    event UniqueReleased(address indexed beneficiary, uint256 amount);
    event BatchAddBenefitiaries(address indexed beneficiary);
    event UniqueDonated(address indexed donor, uint256 amount);
    event DonationRefunded(address indexed donor, uint256 amount);

    address _uniqueToken;
    mapping(address beneficiary => uint256) private _uniqueReleased;
    mapping(address beneficiary => uint256) private _uniqueAllocated;
    mapping(address donor => uint256) private _uniqueDonated;
    uint256 _uniqueDonatedTotal;
    uint256 _uniqueReleasedTotal;
    uint64 private immutable _start;
    uint64 private immutable _duration;

    /**
     * @dev Sets vested token, the start timestamp and the vesting duration of the vesting wallet.
     */
    constructor(address uniqueToken, uint64 startTimestamp, uint64 durationSeconds) payable Ownable() {
        _start = startTimestamp;
        _duration = durationSeconds;
        _uniqueToken = uniqueToken;
    }

    function batchAddBenefitiaries(
        address[] calldata beneficiaries,
        uint256[] calldata allocatedAmounts
    ) external onlyOwner {
        require(beneficiaries.length == allocatedAmounts.length, "wrong length");
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address beneficiary = beneficiaries[i];
            require(_uniqueAllocated[beneficiary] == 0, "unique is already allocated");
        }
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address beneficiary = beneficiaries[i];
            _uniqueAllocated[beneficiary] = allocatedAmounts[i];
        }
        emit BatchAddBenefitiaries(beneficiaries[beneficiaries.length - 1]);
    }

    receive() external payable onlyOwner {}

    function token() external  view returns (address) {
        return _uniqueToken;
    }
    /**
     * @dev Getter for the start timestamp.
     */
    function start() public view returns (uint256) {
        return _start;
    }

    /**
     * @dev Getter for the vesting duration.
     */
    function duration() public view returns (uint256) {
        return _duration;
    }

    /**
     * @dev Getter for the end timestamp.
     */
    function end() public view returns (uint256) {
        return start() + duration();
    }

    /**
     * @dev Amount of token already released
     */
    function released(address beneficiary) public view returns (uint256) {
        return _uniqueReleased[beneficiary];
    }

    /**
     * @dev Getter for the amount of releasable `token` tokens.
     */
    function releasable(address beneficiary) public view returns (uint256) {
        return vestedAmount(beneficiary, uint64(block.timestamp)) - released(beneficiary);
    }

    /**
     * @dev Release the tokens that have already vested.
     *
     * Emits a {UniqueReleased} event.
     */
    function release() public {
        uint256 amount = releasable(msg.sender);
        require(amount > 0, "nothing to release");
        require(_uniqueReleasedTotal + amount <= _uniqueDonatedTotal, "not enough is donated");
        _uniqueReleased[msg.sender] += amount;
        _uniqueReleasedTotal += amount;
        emit UniqueReleased(msg.sender, amount);
        IERC20(_uniqueToken).transfer(msg.sender, amount);
    }

    function donate(uint amount) public {
        require(amount > 0, "nothing to donate");
        IERC20(_uniqueToken).transferFrom(msg.sender, address(this), amount);
        _uniqueDonated[msg.sender] += amount;
        _uniqueDonatedTotal += amount;
        emit UniqueDonated(msg.sender, amount);
    }

    function refundDonation(uint amount) public {
        require(amount > 0, "nothing to refund");
        require(_uniqueDonated[msg.sender] > amount, "amount should be less or equal to donation");
        require(_uniqueDonatedTotal > _uniqueReleasedTotal && (_uniqueDonatedTotal - _uniqueReleasedTotal) >= amount, "amount exceeds current balance");
        _uniqueDonated[msg.sender] -= amount;
        _uniqueDonatedTotal -= amount;
        emit DonationRefunded(msg.sender, amount);
        SafeERC20.safeTransferFrom(IERC20(_uniqueToken), address(this), msg.sender, amount);
    }

    /**
     * @dev Calculates the amount of tokens that has already vested.
     */
    function vestedAmount(address beneficiary, uint64 timestamp) public view returns (uint256) {
        return _vestingSchedule(_uniqueAllocated[beneficiary], timestamp);
    }

    function allocatedAmount(address beneficiary) external view returns (uint256) {
        return _uniqueAllocated[beneficiary];
    }

    /**
     * @dev Implementation of the vesting formula. This returns the amount vested, as a function of time, for
     * an asset given its total historical allocation.
     */
    function _vestingSchedule(uint256 totalAllocation, uint64 timestamp) internal view returns (uint256) {
        if (timestamp < start()) {
            return 0;
        } else if (timestamp >= end()) {
            return 0;
        } else {
            return totalAllocation;
        }
    }
}
