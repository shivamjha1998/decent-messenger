import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { generateKeys, exportKey } from './identity';
import './App.css';

// Connect to our Signaling Server
const socket = io.connect('http://localhost:5000');

function App() {
  // Identity State
  const [myKeys, setMyKeys] = useState(null);

  // Connection State
  const [me, setMe] = useState(""); // My Socket ID (Phone Number)
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  // References (to keep values across renders without re-triggering)
  const connectionRef = useRef();

  useEffect(() => {
    // 1. Generate Identity (Phase 1 Logic)
    async function initIdentity() {
      const keys = await generateKeys();
      setMyKeys(keys);
    }
    initIdentity();

    // 2. Listen for Socket Events (Phase 2 Logic)
    socket.on("me", (id) => {
      setMe(id);
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });
  }, []);

  // --- ACTIONS ---

  // A. Initiate Connection (I am calling someone)
  const callUser = (id) => {
    // We are the initiator
    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: { iceServers: [] } // Local network only for speed/simplicity
    });

    // When we generate a "signal" (map), send it to the server
    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me
      });
    });

    // When the connection opens
    peer.on("connect", () => {
      setConnectionStatus("Connected P2P!");
      console.log("P2P Channel Established!");
    });

    // Listen for answer
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  // B. Answer Connection (Someone called me)
  const answerCall = () => {
    setCallAccepted(true);

    // We are NOT the initiator
    const peer = new Peer({
      initiator: false,
      trickle: false
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("connect", () => {
      setConnectionStatus("Connected P2P!");
      console.log("P2P Channel Established!");
    });

    // Process the signal we received from the caller
    peer.signal(callerSignal);

    connectionRef.current = peer;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Decentralized Messenger</h1>

        {/* MY ID CARD */}
        <div className="card">
          <h3>My Connection ID</h3>
          <p className="address-box">{me}</p>
          <small>Share this with a friend to chat</small>
        </div>

        {/* CONNECTION STATUS */}
        <div style={{ margin: '20px', color: connectionStatus === "Connected P2P!" ? '#4caf50' : 'orange' }}>
          <strong>Status: {connectionStatus}</strong>
        </div>

        {/* INCOMING CALL NOTIFICATION */}
        {receivingCall && !callAccepted ? (
          <div className="card call-alert">
            <h3>Incoming Connection...</h3>
            <p>User {caller} wants to connect.</p>
            <button onClick={answerCall}>Accept</button>
          </div>
        ) : null}

        {/* CALL INTERFACE */}
        {!callAccepted ? (
          <div className="card">
            <input
              type="text"
              placeholder="Paste Friend's ID"
              value={idToCall}
              onChange={(e) => setIdToCall(e.target.value)}
            />
            <button onClick={() => callUser(idToCall)}>Connect</button>
          </div>
        ) : null}

      </header>
    </div>
  );
}

export default App;
