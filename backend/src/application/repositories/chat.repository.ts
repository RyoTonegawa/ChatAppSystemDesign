import { ChannelType } from '../../domain/models/types';

export interface CreateChannelInput {
  type: ChannelType;
  memberIds: string[];
}

export interface MessageInput {
  channelId: string;
  senderId: string;
  body: string;
  clientMessageId: string;
}

export interface MessageRecord {
  id: string;
  channelId: string;
  senderId: string;
  body: string;
  createdAt: Date;
  seq: number;
}

export abstract class ChatRepository {
  abstract createChannel(input: CreateChannelInput): Promise<{ id: string; createdAt: Date }>;
  abstract addMembership(channelId: string, userId: string): Promise<void>;
  abstract removeMembership(channelId: string, userId: string): Promise<void>;
  abstract listChannelMembers(channelId: string): Promise<string[]>;
  abstract saveMessage(input: MessageInput): Promise<MessageRecord>;
}
