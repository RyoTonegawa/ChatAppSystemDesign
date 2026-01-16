import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaBus implements OnModuleInit, OnModuleDestroy {
  private producer: Producer | null = null;

  async onModuleInit() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const kafka = new Kafka({ clientId: 'chat-service', brokers });
    this.producer = kafka.producer();
    await this.producer.connect();
  }

  async onModuleDestroy() {
    if (this.producer) {
      await this.producer.disconnect();
    }
  }

  async publish(topic: string, payload: Record<string, unknown>) {
    if (!this.producer) {
      return;
    }
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }]
    });
  }
}
