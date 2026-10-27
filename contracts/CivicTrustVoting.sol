// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ISemaphore} from "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import {ISemaphoreGroups} from "@semaphore-protocol/contracts/interfaces/ISemaphoreGroups.sol";

/// @title CivicTrustVoting
/// @notice Demo local de presupuesto participativo con voto anónimo Semaphore.
/// @dev La elegibilidad del padrón se administra manualmente en esta demo; no integra miBA/DNI.
contract CivicTrustVoting {
    address public immutable owner;
    ISemaphore public immutable semaphore;
    ISemaphoreGroups public immutable semaphoreGroups;
    uint256 public immutable groupId;
    uint256 public nextPollId;

    struct Poll {
        string title;
        string description;
        uint64 startsAt;
        uint64 endsAt;
        uint256 totalVotes;
        uint256 scope;
        bool active;
    }

    struct Option {
        string label;
        uint256 votes;
    }

    mapping(uint256 pollId => Poll poll) private polls;
    mapping(uint256 pollId => Option[] options) private pollOptions;
    mapping(uint256 identityCommitment => bool isRegistered) public registeredCommitments;
    uint256[] private eligibleCommitments;

    event PollCreated(uint256 indexed pollId, string title, uint64 startsAt, uint64 endsAt, uint256 scope);
    event MemberRegistered(uint256 indexed identityCommitment);
    event AnonymousVoteCast(uint256 indexed pollId, uint256 indexed optionIndex, uint256 nullifier);
    event PollClosed(uint256 indexed pollId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el administrador puede realizar esta accion");
        _;
    }

    constructor(address semaphoreAddress) {
        require(semaphoreAddress != address(0), "Falta la direccion de Semaphore");
        owner = msg.sender;
        semaphore = ISemaphore(semaphoreAddress);
        semaphoreGroups = ISemaphoreGroups(semaphoreAddress);
        groupId = semaphore.createGroup(address(this), 0);
    }

    /// @notice Agrega compromisos de identidad al padrón sin guardar nombres ni direcciones.
    function addEligibleMembers(uint256[] calldata commitments) external onlyOwner {
        require(commitments.length > 0 && commitments.length <= 100, "Ingrese entre 1 y 100 identidades");
        for (uint256 i = 0; i < commitments.length; i++) {
            uint256 commitment = commitments[i];
            require(commitment > 0, "El compromiso de identidad no puede ser cero");
            require(!registeredCommitments[commitment], "Una identidad ya esta registrada");
            registeredCommitments[commitment] = true;
            eligibleCommitments.push(commitment);
        }
        semaphore.addMembers(groupId, commitments);
        for (uint256 i = 0; i < commitments.length; i++) {
            emit MemberRegistered(commitments[i]);
        }
    }

    /// @notice Crea una consulta. Todos los votos usan el padrón de la comuna, con un scope distinto por consulta.
    function createPoll(
        string calldata title,
        string calldata description,
        string[] calldata optionLabels,
        uint64 durationHours
    ) external onlyOwner returns (uint256 pollId) {
        require(bytes(title).length > 0 && bytes(title).length <= 120, "El titulo debe tener entre 1 y 120 bytes");
        require(bytes(description).length <= 1000, "La descripcion no puede superar 1000 bytes");
        require(optionLabels.length >= 2 && optionLabels.length <= 6, "Se requieren entre 2 y 6 opciones");
        require(durationHours >= 1 && durationHours <= 720, "La duracion debe ser de 1 a 720 horas");

        pollId = nextPollId++;
        uint64 startsAt = uint64(block.timestamp);
        uint64 endsAt = uint64(block.timestamp + uint256(durationHours) * 1 hours);
        uint256 scope = uint256(keccak256(abi.encode(address(this), block.chainid, pollId)));

        polls[pollId] = Poll({
            title: title,
            description: description,
            startsAt: startsAt,
            endsAt: endsAt,
            totalVotes: 0,
            scope: scope,
            active: true
        });

        for (uint256 i = 0; i < optionLabels.length; i++) {
            require(bytes(optionLabels[i]).length > 0 && bytes(optionLabels[i]).length <= 100, "Cada opcion debe tener entre 1 y 100 bytes");
            pollOptions[pollId].push(Option({label: optionLabels[i], votes: 0}));
        }

        emit PollCreated(pollId, title, startsAt, endsAt, scope);
    }

    /// @notice Verifica una prueba Semaphore. No almacena la dirección que envió el voto.
    function voteAnonymous(uint256 pollId, ISemaphore.SemaphoreProof calldata proof) external {
        require(pollId < nextPollId, "La consulta no existe");
        Poll storage poll = polls[pollId];
        require(poll.active && block.timestamp >= poll.startsAt && block.timestamp < poll.endsAt, "La votacion no esta abierta");
        require(semaphoreGroups.getMerkleTreeSize(groupId) >= 3, "Se requieren al menos 3 identidades para votar con anonimato practico");
        require(proof.scope == poll.scope, "La prueba no corresponde a esta consulta");
        require(proof.message < pollOptions[pollId].length, "La opcion no existe");

        semaphore.validateProof(groupId, proof);
        pollOptions[pollId][proof.message].votes++;
        poll.totalVotes++;

        emit AnonymousVoteCast(pollId, proof.message, proof.nullifier);
    }

    function closePoll(uint256 pollId) external onlyOwner {
        require(pollId < nextPollId, "La consulta no existe");
        require(polls[pollId].active, "La consulta ya esta cerrada");
        polls[pollId].active = false;
        emit PollClosed(pollId);
    }

    function getPollCount() external view returns (uint256) {
        return nextPollId;
    }

    function getPoll(uint256 pollId)
        external
        view
        returns (
            string memory title,
            string memory description,
            uint64 startsAt,
            uint64 endsAt,
            uint256 totalVotes,
            uint256 scope,
            bool active
        )
    {
        require(pollId < nextPollId, "La consulta no existe");
        Poll storage poll = polls[pollId];
        return (poll.title, poll.description, poll.startsAt, poll.endsAt, poll.totalVotes, poll.scope, poll.active);
    }

    function getOptions(uint256 pollId)
        external
        view
        returns (string[] memory labels, uint256[] memory voteCounts)
    {
        require(pollId < nextPollId, "La consulta no existe");
        Option[] storage options = pollOptions[pollId];
        labels = new string[](options.length);
        voteCounts = new uint256[](options.length);
        for (uint256 i = 0; i < options.length; i++) {
            labels[i] = options[i].label;
            voteCounts[i] = options[i].votes;
        }
    }

    function getEligibleCommitments() external view returns (uint256[] memory) {
        return eligibleCommitments;
    }

    function eligibleMemberCount() external view returns (uint256) {
        return eligibleCommitments.length;
    }
}
