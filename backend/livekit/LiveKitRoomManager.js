/**
 * LiveKitRoomManager
 * Manages active LiveKit realtime voice rooms, participant tracking, and room lifecycle.
 */
class LiveKitRoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Create or retrieve an active room descriptor
   */
  getOrCreateRoom(roomName, options = {}) {
    if (!roomName) {
      throw new Error('LiveKitRoomManager: roomName is required.');
    }

    if (this.rooms.has(roomName)) {
      const existing = this.rooms.get(roomName);
      existing.lastActiveAt = Date.now();
      return existing;
    }

    const room = {
      name: roomName,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      status: 'ACTIVE',
      participants: new Map(),
      agentAttached: false,
      metadata: options.metadata || {}
    };

    this.rooms.set(roomName, room);
    return room;
  }

  /**
   * Add participant to room
   */
  addParticipant(roomName, participantId, metadata = {}) {
    const room = this.getOrCreateRoom(roomName);
    const participant = {
      id: participantId,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      isAudioMuted: false,
      isSpeaking: false,
      metadata
    };
    room.participants.set(participantId, participant);
    room.lastActiveAt = Date.now();
    return participant;
  }

  /**
   * Remove participant from room
   */
  removeParticipant(roomName, participantId) {
    const room = this.rooms.get(roomName);
    if (!room) return false;

    const removed = room.participants.delete(participantId);
    if (room.participants.size === 0) {
      room.status = 'EMPTY';
    }
    return removed;
  }

  /**
   * Get room status
   */
  getRoom(roomName) {
    return this.rooms.get(roomName) || null;
  }

  /**
   * Close and delete room
   */
  closeRoom(roomName) {
    const room = this.rooms.get(roomName);
    if (!room) return false;

    room.status = 'CLOSED';
    room.participants.clear();
    this.rooms.delete(roomName);
    return true;
  }

  /**
   * Clean stale empty rooms older than maxAgeMs
   */
  cleanupStaleRooms(maxAgeMs = 1800000) {
    const now = Date.now();
    let cleaned = 0;
    for (const [name, room] of this.rooms.entries()) {
      if (now - room.lastActiveAt > maxAgeMs) {
        this.rooms.delete(name);
        cleaned++;
      }
    }
    return cleaned;
  }
}

const defaultLiveKitRoomManager = new LiveKitRoomManager();

module.exports = {
  LiveKitRoomManager,
  defaultLiveKitRoomManager
};
