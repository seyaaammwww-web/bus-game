// Vote type used by HybridStorage services (not in shared schema)
export interface Vote {
    voterId: string;
    targetPlayerId: string;
    targetWord: string;
    isApproved: boolean;
}

export interface VotingService {
    castVote(
        roomId: string,
        round: number,
        voterId: string,
        targetPlayerId: string,
        targetWord: string,
        isApproved: boolean,
        eligibleCount: number
    ): Promise<{ majorityReached: boolean; yesCount: number; totalVotes: number }>;

    getCurrentVotes(roomId: string, round: number): Promise<Vote[]>;
}

export interface ReconnectService {
    issueToken(playerId: string, roomId: string): Promise<string>;
    restore(token: string): Promise<{ roomId: string; playerId: string; newToken: string } | null>;
}
