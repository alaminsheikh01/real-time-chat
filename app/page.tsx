'use client';
import { useRef, useState } from 'react';

type Message = {
  user: string;
  message: string;
};

type JoinGroupProps = {
  group: string;
  setGroup: (group: string) => void;
  joinGroup: () => void;
};

function JoinGroup({ group, setGroup, joinGroup }: JoinGroupProps) {
  return (
    <div style={{ marginTop: '1rem' }}>
      <input
        placeholder="Enter group name"
        value={group}
        onChange={e => setGroup(e.target.value)}
        style={{ padding: '0.5rem', width: '300px' }}
      />
      <button onClick={joinGroup} style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}>
        Join
      </button>
    </div>
  );
}

type MessageListProps = {
  messages: Message[];
  typing: string | null;
};

function MessageList({ messages, typing }: MessageListProps) {
  return (
    <div
      style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '10px',
        height: '300px',
        overflowY: 'scroll',
        marginTop: '1rem',
      }}
    >
      {messages.map((msg, idx) => (
        <p key={idx}>
          <strong>{msg.user}:</strong> {msg.message}
        </p>
      ))}
      {typing && <p style={{ fontStyle: 'italic', color: '#666' }}>{typing}</p>}
    </div>
  );
}

type MessageInputProps = {
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  handleTyping: () => void;
};

function MessageInput({ input, setInput, sendMessage, handleTyping }: MessageInputProps) {
  return (
    <div style={{ marginTop: '1rem' }}>
      <input
        value={input}
        onChange={e => {
          setInput(e.target.value);
          handleTyping();
        }}
        onKeyDown={e => e.key === 'Enter' && sendMessage()}
        placeholder="Type your message..."
        style={{ width: '75%', padding: '0.5rem' }}
      />
      <button onClick={sendMessage} style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}>
        Send
      </button>
    </div>
  );
}

type ChatProps = {
  group: string;
  messages: Message[];
  typing: string | null;
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  handleTyping: () => void;
};

function Chat({ group, messages, typing, input, setInput, sendMessage, handleTyping }: ChatProps) {
  return (
    <>
      <h2 style={{ marginTop: '1rem' }}>
        Group: <code>{group}</code>
      </h2>

      <MessageList messages={messages} typing={typing} />

      <MessageInput
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        handleTyping={handleTyping}
      />
    </>
  );
}

export default function Home() {
  const [group, setGroup] = useState('');
  const [joined, setJoined] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const username = useRef('User' + Math.floor(Math.random() * 1000));
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const joinGroup = () => {
    ws.current = new WebSocket('ws://localhost:8000');

    ws.current.onopen = () => {
      ws.current?.send(
        JSON.stringify({
          type: 'join',
          group,
          user: username.current,
        })
      );
    };

    ws.current.onmessage = event => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'message') {
        setMessages(prev => [...prev, { user: msg.user, message: msg.message }]);
      } else if (msg.type === 'typing' && msg.user !== username.current) {
        setTyping(`${msg.user} is typing...`);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTyping(null), 2000);
      }
    };

    setJoined(true);
  };

  const sendMessage = () => {
    if (input.trim() && ws.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'message',
        user: username.current,
        message: input,
      };
      ws.current.send(JSON.stringify(message));
      setMessages(prev => [...prev, { user: 'You', message: input }]);
      setInput('');
    }
  };

  const handleTyping = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'typing', user: username.current }));
    }
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h1>💬 Group Chat</h1>

      {!joined ? (
        <JoinGroup group={group} setGroup={setGroup} joinGroup={joinGroup} />
      ) : (
        <Chat
          group={group}
          messages={messages}
          typing={typing}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          handleTyping={handleTyping}
        />
      )}
    </main>
  );
}
