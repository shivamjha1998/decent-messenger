// server/index.js
const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");

const io = require("socket.io")(server, {
    cors: {
        origin: "*", // Allow connections from any origin (React runs on 3000)
        methods: ["GET", "POST"]
    }
});

app.use(cors());

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("Server is running.");
});

io.on("connection", (socket) => {
    // 1. Send the user their own Socket ID (The "Phone Number")
    socket.emit("me", socket.id);

    // 2. User disconnects
    socket.on("disconnect", () => {
        socket.broadcast.emit("callEnded");
    });

    // 3. Initiate Call: User A wants to call User B
    socket.on("callUser", ({ userToCall, signalData, from }) => {
        // Forward the signal to User B
        io.to(userToCall).emit("callUser", { signal: signalData, from });
    });

    // 4. Answer Call: User B accepts User A
    socket.on("answerCall", (data) => {
        // Forward the acceptance signal back to User A
        io.to(data.to).emit("callAccepted", data.signal);
    });
});

server.listen(PORT, () => console.log(`Signaling Server listening on port ${PORT}`));