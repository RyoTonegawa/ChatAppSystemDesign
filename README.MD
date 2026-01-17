# In this repository
スケーラブルなチャットアプリの構築方法を学ぶ。

## 学習内容
- WebSocket(WS)による双方向通信のスケーラビリティ確保
- ConsistentHashingを利用し、均等にクライアントをWSノードへ割り当てる方法

# 技術構成
- frontend: NextJS
- backend: NestJS
- EventBus: Kafka KRaftモードで利用。

