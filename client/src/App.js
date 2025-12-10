import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { generateKeys } from './identity';
import './App.css';

// Connect to Signaling Server
const socket = io.connect('https://decent-messenger-production.up.railway.app');

function App() {
  const [me, setMe] = useState("");
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  // --- Chat State ---
  const [msgText, setMsgText] = useState("");
  const [messages, setMessages] = useState([]);

  const connectionRef = useRef();

  useEffect(() => {
    // 1. Generate Keys
    async function initIdentity() {
      await generateKeys();
    }
    initIdentity();

    // 2. Socket Listeners
    socket.on("me", (id) => setMe(id));

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });
  }, []);

  // --- Helper to append messages ---
  const addMessage = (text, sender) => {
    setMessages((prev) => [...prev, { text, sender }]);
  };

  // --- Initiate Call ---
  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: { iceServers: [] }
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", { userToCall: id, signalData: data, from: me });
    });

    peer.on("connect", () => {
      setConnectionStatus("Connected P2P!");
    });

    // --- Listen for Data (Chat Messages) ---
    peer.on("data", (data) => {
      const str = new TextDecoder("utf-8").decode(data);
      addMessage(str, "Partner");
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  // --- Answer Call ---
  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("connect", () => {
      setConnectionStatus("Connected P2P!");
    });

    // --- Listen for Data ---
    peer.on("data", (data) => {
      const str = new TextDecoder("utf-8").decode(data);
      addMessage(str, "Partner");
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  // --- Send Message Function ---
  const sendMessage = () => {
    if (!msgText) return;

    // 1. Send through P2P Wire
    if (connectionRef.current) {
      connectionRef.current.send(msgText);
    }

    // 2. Update Local UI
    addMessage(msgText, "Me");
    setMsgText("");
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Decentralized Messenger</h1>

        {/* Status Bar */}
        <div style={{ padding: '10px', background: connectionStatus === "Connected P2P!" ? '#2e7d32' : '#333', width: '100%' }}>
          Status: {connectionStatus} | My ID: {me}
        </div>

        {/* --- Connection Setup --- */}
        {!callAccepted && (
          <div className="setup-container">
            {receivingCall && !callAccepted ? (
              <div className="card call-alert">
                <h3>Incoming Connection...</h3>
                <button onClick={answerCall}>Answer</button>
              </div>
            ) : (
              <div className="card">
                <input
                  type="text"
                  placeholder="Paste Friend's ID"
                  value={idToCall}
                  onChange={(e) => setIdToCall(e.target.value)}
                />
                <button onClick={() => callUser(idToCall)}>Connect</button>
              </div>
            )}
          </div>
        )}

        {/* --- The Chat Room --- */}
        {callAccepted && (
          <div className="chat-container">
            <div className="messages-list">
              {messages.map((msg, index) => (
                <div key={index} className={`message-bubble ${msg.sender === "Me" ? "mine" : "theirs"}`}>
                  <strong>{msg.sender}:</strong> {msg.text}
                </div>
              ))}
            </div>

            <div className="input-area">
              <input
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        )}

      </header>
    </div>
  );
}

export default App;