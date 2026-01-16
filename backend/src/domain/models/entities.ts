import { ChannelType, MessageStatus, PresenceStatus } from './types';

export interface User {
  id: string;
  name: string;
}

export interface Channel {
  id: string;
  type: ChannelType;
  createdAt: string;
}

export interface Membership {
  userId: string;
  channelId: string;
  joinedAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  body: string;
  createdAt: string;
  seq: number;
  status: MessageStatus;
}

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastEventAt: string;
}
