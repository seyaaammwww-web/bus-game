import { randomUUID } from "crypto";

// Simplified storage for game - main game state is handled by gameManager
export interface IStorage {
  // Add any additional storage methods if needed
}

export class MemStorage implements IStorage {
  constructor() {
    // Initialize if needed
  }
}

export const storage = new MemStorage();
