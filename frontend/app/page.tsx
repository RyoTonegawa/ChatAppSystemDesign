"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type ChannelType = "direct" | "group";

type EventPayload = Record<string, unknown>;

interface ChatEvent {
  type: string;
  payload: EventPayload;
}

interface MessageItem {
  messageId: string;
  senderId: string;
  body: string;
  createdAt: string;
  seq: number;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

export default function Home() {
  const [userId, setUserId] = useState("user-01");
  const [connected, setConnected] = useState(false);
  const [channelType, setChannelType] = useState<ChannelType>("direct");
  const [memberIds, setMemberIds] = useState("user-01,user-02");
  const [channels, setChannels] = useState<string[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [presence, setPresence] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, MessageItem[]>>({});
  const socketRef = useRef<Socket | null>(null);

  const activeMessages = useMemo(() => {
    if (!activeChannel) return [];
    return messages[activeChannel] || [];
  }, [activeChannel, messages]);

  useEffect(() => {
    const socket = io(WS_URL, { auth: { userId } });
    socketRef.current = socket;

    const heartbeat = setInterval(() => {
      socket.emit("command", {
        type: "heartbeat",
        payload: { userId, status: "online" }
      });
    }, 10000);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("event", (event: ChatEvent) => handleEvent(event));

    return () => {
      clearInterval(heartbeat);
      socket.disconnect();
    };
  }, [userId]);

  const handleEvent = (event: ChatEvent) => {
    switch (event.type) {
      case "channel_created": {
        const channelId = event.payload.channelId as string;
        setChannels((prev) => (prev.includes(channelId) ? prev : [...prev, channelId]));
        setActiveChannel(channelId);
        break;
      }
      case "channel_joined": {
        const channelId = event.payload.channelId as string;
        setChannels((prev) => (prev.includes(channelId) ? prev : [...prev, channelId]));
        setActiveChannel(channelId);
        break;
      }
      case "channel_left": {
        const channelId = event.payload.channelId as string;
        setChannels((prev) => prev.filter((id) => id !== channelId));
        if (activeChannel === channelId) {
          setActiveChannel(null);
        }
        break;
      }
      case "message_sent":
      case "message_received": {
        const channelId = event.payload.channelId as string;
        const item: MessageItem = {
          messageId: (event.payload.messageId as string) || crypto.randomUUID(),
          senderId: event.payload.senderId as string,
          body: event.payload.body as string,
          createdAt: event.payload.createdAt as string,
          seq: Number(event.payload.seq)
        };
        setMessages((prev) => ({
          ...prev,
          [channelId]: [...(prev[channelId] || []), item].sort((a, b) => a.seq - b.seq)
        }));
        break;
      }
      case "presence_updated": {
        const userId = event.payload.userId as string;
        const status = event.payload.status as string;
        setPresence((prev) => ({ ...prev, [userId]: status }));
        break;
      }
      default:
        break;
    }
  };

  const sendCommand = (type: string, payload: Record<string, unknown>) => {
    socketRef.current?.emit("command", { type, payload });
  };

  const handleCreateChannel = () => {
    const ids = memberIds.split(",").map((id) => id.trim()).filter(Boolean);
    if (!ids.includes(userId)) {
      ids.unshift(userId);
    }
    sendCommand("create_channel", { channelType, memberIds: ids });
  };

  const handleJoinChannel = (channelId: string) => {
    if (!channelId) return;
    sendCommand("join_channel", { channelId });
  };

  const handleLeaveChannel = () => {
    if (!activeChannel) return;
    sendCommand("leave_channel", { channelId: activeChannel });
  };

  const handleSendMessage = () => {
    if (!activeChannel || !messageBody.trim()) return;
    sendCommand("send_message", {
      channelId: activeChannel,
      body: messageBody.trim(),
      clientMessageId: crypto.randomUUID()
    });
    setMessageBody("");
  };

  return (
    <div className="page-shell min-h-screen px-6 py-10">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="fade-in grid gap-4 rounded-3xl border border-white/10 bg-[color:var(--surface)] px-6 py-5 shadow-[0_25px_60px_-40px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--muted)]">リアルタイムチャット実験室</p>
              <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold leading-tight text-[color:var(--foreground)] md:text-4xl">
                ChatAppSystemDesign
              </h1>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-black/15 bg-white/70 px-4 py-2">
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-black" : "bg-neutral-500"}`} />
              <span className="text-sm font-medium text-[color:var(--muted)]">
                {connected ? "WebSocket 接続中" : "未接続"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-xs uppercase tracking-[0.32em] text-[color:var(--muted)]">ユーザーID</label>
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className="w-48 rounded-full border border-black/15 bg-white/80 px-4 py-2 text-sm text-black placeholder:text-black/40"
            />
            <button
              onClick={() => sendCommand("heartbeat", { userId, status: "online" })}
              className="rounded-full border border-black/15 bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_-18px_rgba(0,0,0,0.55)]"
            >
              プレゼンス送信
            </button>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[1.1fr_2fr_1fr]">
          <aside className="stagger rounded-3xl border border-black/15 bg-[color:var(--surface)] p-6 shadow-[0_25px_60px_-45px_rgba(0,0,0,0.25)]">
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">チャネル</h2>
            <p className="text-sm text-[color:var(--muted)]">参加や作成をしてメッセージを同期します。</p>

            <div className="mt-4 space-y-3">
              {channels.length === 0 && (
                <p className="text-sm text-[color:var(--muted)]">チャネルはまだありません。</p>
              )}
              {channels.map((channelId) => (
                <button
                  key={channelId}
                  onClick={() => handleJoinChannel(channelId)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    channelId === activeChannel
                      ? "border-black bg-[color:var(--accent-soft)] text-black"
                      : "border-black/10 bg-white/70 hover:border-black/30"
                  }`}
                >
                  <span className="block text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted)]">channel</span>
                  <span className="block font-medium text-[color:var(--foreground)]">{channelId}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-3 rounded-2xl border border-dashed border-black/20 bg-white/70 p-4">
              <div className="flex items-center gap-3">
                <label className="text-xs uppercase tracking-[0.32em] text-[color:var(--muted)]">種別</label>
                <select
                  value={channelType}
                  onChange={(event) => setChannelType(event.target.value as ChannelType)}
                  className="rounded-full border border-black/15 bg-white px-3 py-1 text-sm text-black"
                >
                  <option value="direct">direct</option>
                  <option value="group">group</option>
                </select>
              </div>
              <textarea
                value={memberIds}
                onChange={(event) => setMemberIds(event.target.value)}
                className="min-h-[80px] w-full rounded-2xl border border-black/15 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40"
                placeholder="user-01,user-02"
              />
              <button
                onClick={handleCreateChannel}
                className="w-full rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white"
              >
                チャネルを作成
              </button>
            </div>
          </aside>

          <main className="stagger relative flex min-h-[520px] flex-col rounded-3xl border border-black/15 bg-[color:var(--surface)] p-6 shadow-[0_25px_60px_-45px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--muted)]">アクティブチャネル</p>
                <h2 className="text-xl font-semibold text-[color:var(--foreground)]">
                  {activeChannel || "チャネル未選択"}
                </h2>
              </div>
              <button
                onClick={handleLeaveChannel}
                className="rounded-full border border-black/15 px-4 py-2 text-xs uppercase tracking-[0.32em] text-[color:var(--muted)]"
              >
                退出
              </button>
            </div>

            <div className="mt-6 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-black/15 bg-white/75 p-4">
              {activeMessages.length === 0 ? (
                <p className="text-sm text-[color:var(--muted)]">メッセージがここに表示されます。</p>
              ) : (
                activeMessages.map((message) => (
                  <div key={message.messageId} className="rounded-2xl border border-black/10 bg-[color:var(--surface-strong)] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[color:var(--foreground)]">{message.senderId}</span>
                      <span className="text-xs text-[color:var(--muted)]">#{message.seq}</span>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--foreground)]">{message.body}</p>
                    <p className="mt-2 text-xs text-[color:var(--muted)]">{message.createdAt}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                className="flex-1 rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm text-black placeholder:text-black/40"
                placeholder="メッセージを入力（最大1000文字）"
              />
              <button
                onClick={handleSendMessage}
                className="rounded-2xl bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.6)]"
              >
                送信
              </button>
            </div>
          </main>

          <aside className="stagger rounded-3xl border border-black/15 bg-[color:var(--surface)] p-6 shadow-[0_25px_60px_-45px_rgba(0,0,0,0.25)]">
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">プレゼンス</h2>
            <p className="text-sm text-[color:var(--muted)]">ハートビートは10秒ごとに送信されます。</p>
            <div className="mt-4 space-y-3">
              {Object.keys(presence).length === 0 ? (
                <p className="text-sm text-[color:var(--muted)]">更新はまだありません。</p>
              ) : (
                Object.entries(presence).map(([id, status]) => (
                  <div key={id} className="rounded-2xl border border-black/10 bg-[color:var(--surface-strong)] px-4 py-3">
                    <p className="text-sm font-semibold text-[color:var(--foreground)]">{id}</p>
                    <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--muted)]">{status}</p>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
