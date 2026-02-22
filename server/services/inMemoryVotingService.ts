import { VotingService, Vote } from '../repositories/types';

export class InMemoryVotingService implements VotingService {
    // Key: roomId:round -> Array of Votes
    private votes = new Map<string, Vote[]>();

    async castVote(
        roomId: string,
        round: number,
        voterId: string,
        targetPlayerId: string,
        targetWord: string,
        isApproved: boolean,
        eligibleCount: number
    ) {
        const key = `${roomId}:${round}`;
        if (!this.votes.has(key)) {
            this.votes.set(key, []);
        }

        const roundVotes = this.votes.get(key)!;

        // Check if already voted for this word
        const existing = roundVotes.find(v => v.voterId === voterId && v.targetPlayerId === targetPlayerId && v.targetWord === targetWord);
        if (!existing) {
            roundVotes.push({
                voterId,
                targetPlayerId,
                targetWord,
                isApproved
            });
        }

        // Calculate majority
        const wordVotes = roundVotes.filter(v => v.targetPlayerId === targetPlayerId && v.targetWord === targetWord);
        const totalVotes = wordVotes.length;
        const yesCount = wordVotes.filter(v => v.isApproved).length;
        const noCount = totalVotes - yesCount;

        // Strict majority logic matching gameManager
        const majorityReached = (yesCount > eligibleCount / 2) || (noCount > eligibleCount / 2) || (totalVotes === eligibleCount);

        return {
            majorityReached,
            yesCount,
            totalVotes
        };
    }

    async getCurrentVotes(roomId: string, round: number) {
        return this.votes.get(`${roomId}:${round}`) || [];
    }
}
