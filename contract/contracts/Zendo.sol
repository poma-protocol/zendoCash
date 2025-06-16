// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Zendo {
    struct Deal {
        uint32 id;
        string dealName;
        address creator;
        uint32 maxParticipants;
        uint256 rewards;
        uint256 goal;
        uint16 numberOfDays;
        uint256 startDate;
        uint256 endDate;
        uint32 currentParticipantCount;
        bool isActive;
        address tokenAddress;
    }

    struct Participant {
        address participantAddress;
        uint256 rewardsClaimed;
        bool isRewarded;
        bool isRegistered;
    }

    mapping(uint32 => Deal) public deals;
    mapping(uint32 => mapping(address => Participant)) public dealParticipants;

    event DealCreated(
        uint32 id,
        string dealName,
        address creator,
        uint32 maxParticipants,
        uint256 rewards,
        uint256 goal,
        uint16 numberOfDays,
        uint256 startDate,
        uint256 endDate,
        address tokenAddress
    );

    function createDeal(
        uint32 _id,
        string memory _dealName,
        uint32 _maxParticipants,
        address _creator,
        uint256 _rewards,
        uint256 _goal,
        uint16 _numberOfDays,
        uint256 _startDate,
        uint256 _endDate,
        address _tokenAddress
    ) public returns (uint32) {
        Deal storage newDeal = deals[_id];
        newDeal.id = _id;
        newDeal.dealName = _dealName;
        newDeal.creator = _creator;
        newDeal.maxParticipants = _maxParticipants;
        newDeal.rewards = _rewards;
        newDeal.goal = _goal;
        newDeal.numberOfDays = _numberOfDays;
        newDeal.startDate = _startDate;
        newDeal.endDate = _endDate;
        newDeal.isActive = false;
        newDeal.tokenAddress = _tokenAddress;
        newDeal.currentParticipantCount = 0;

        emit DealCreated(
            _id,
            _dealName,
            _creator,
            _maxParticipants,
            _rewards,
            _goal,
            _numberOfDays,
            _startDate,
            _endDate,
            _tokenAddress
        );

        return _id;
    }

    function activateDeal(uint32 _id, address tokenAddress) external {
        Deal storage deal = deals[_id];
        require(deal.id == _id, "Deal does not exist");
        require(!deal.isActive, "Deal is already active");
        require(deal.endDate >= block.timestamp, "Deal has ended");

        IERC20 token = IERC20(tokenAddress);
        uint256 amount = deal.rewards;
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        deal.isActive = true;
    }

    function addParticipant(uint32 _id, address participant) external {
        Deal storage deal = deals[_id];
        require(deal.id == _id, "Deal does not exist");
        require(deal.isActive, "Deal is not active");
        require(deal.currentParticipantCount < deal.maxParticipants, "Max participants reached");
        require(
            block.timestamp >= deal.startDate && block.timestamp <= deal.endDate,
            "Deal is not active"
        );

        Participant storage p = dealParticipants[_id][participant];
        require(!p.isRegistered, "Participant already registered");

        dealParticipants[_id][participant] = Participant({
            participantAddress: participant,
            rewardsClaimed: 0,
            isRewarded: false,
            isRegistered: true
        });

        deal.currentParticipantCount += 1;
    }

    function rewardUser(uint32 _id, address participant) external {
        Deal storage deal = deals[_id];
        require(deal.id == _id, "Deal does not exist");
        require(deal.isActive, "Deal is not active");
        require(deal.endDate > block.timestamp, "Deal has ended");

        Participant storage p = dealParticipants[_id][participant];
        require(p.isRegistered, "Participant not found");
        require(!p.isRewarded, "User already rewarded");

        uint256 amount = deal.rewards / deal.maxParticipants;
        IERC20 token = IERC20(deal.tokenAddress);
        bool success = token.transfer(participant, amount);
        require(success, "Transfer failed");

        p.rewardsClaimed = amount;
        p.isRewarded = true;
    }
}
