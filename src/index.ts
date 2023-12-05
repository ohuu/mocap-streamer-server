import express, { Application } from "express";
import dotenv from "dotenv";
import { ExpressPeerServer, IClient } from "peer";
import cors from "cors";

//For env File
dotenv.config();

const app: Application = express();
const port = !isNaN(Number(process.env.PORT)) ? Number(process.env.PORT) : 8000;

// app.use(
//   "*",
//   cors({
//     origin: ["*", "localhost"],
//     methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//     preflightContinue: true,
//     // optionsSuccessStatus: 204,
//   })
// );
app.use(cors());

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

interface Room {
  server: ReturnType<typeof ExpressPeerServer>;
  connections: IClient[];
}

const rooms: Record<string, Room> = {};

const setupRoom = (roomName: string) => {
  const room: Room = (rooms[roomName] = {
    server: ExpressPeerServer(server, { path: "/", allow_discovery: true }),
    connections: [],
  });

  app.use(`/room/${roomName}`, room.server);

  room.server.on("connection", (client) => {
    console.log("Connecting", client.getId(), "to room", roomName);
    room.connections.push(client);
  });

  room.server.on("disconnect", (client) => {
    console.log("Disconnecting", client.getId(), "from room", roomName);
    room.connections = room.connections.filter(
      (other) => other.getId() !== client.getId()
    );
  });

  return room;
};

app.post("/setup-room/:roomName", (req, res) => {
  if (rooms[req.params.roomName] == null) {
    console.log("Setting up", req.params.roomName);
    rooms[req.params.roomName] = setupRoom(req.params.roomName);
    res.send("init");
  } else {
    console.log("Room already running", req.params.roomName);
    res.send("running");
  }
});

// app.use("/room/:roomName", (req, _res, next) => {
//   console.log("Calling", req.params.roomName, req.url);
//   next();
// });
