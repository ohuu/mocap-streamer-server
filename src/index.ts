import express, { Application } from "express";
import dotenv from "dotenv";
import { ExpressPeerServer, IClient } from "peer";
import cors from "cors";
import { WebSocketServer } from "ws";

//For env File
dotenv.config();

const app: Application = express();
const envPort = Number(process.env.PORT);
const port = !isNaN(envPort) ? envPort : 8000;
const roomDownTimeMs = 5000;

app.use(cors({ origin: "*" }));

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

interface Room {
  server: ReturnType<typeof ExpressPeerServer>;
  connections: IClient[];
}

const rooms: Record<string, Room> = {};
const roomDisposedTimes: Record<string, number> = {};

const setupRoom = (roomName: string) => {
  let socket: WebSocketServer;
  const room: Room = (rooms[roomName] = {
    server: ExpressPeerServer(server, {
      path: "/",
      createWebSocketServer: (options) =>
        (socket = new WebSocketServer(options)),
    }),
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
    if (room.connections.length === 0) {
      console.log("Disposing of", roomName);
      app._router.stack = (app._router.stack as any[]).filter(
        (layer) =>
          layer.path == null || !layer.path.startsWith(`/room/${roomName}`)
      );
      socket?.close();
      delete rooms[roomName];
      roomDisposedTimes[roomName] = Date.now();
    }
  });

  return room;
};

app.post("/setup-room/:roomName", (req, res) => {
  if (
    roomDisposedTimes[req.params.roomName] != null &&
    roomDisposedTimes[req.params.roomName] + roomDownTimeMs > Date.now()
  ) {
    res.status(409).send("Room closed recently. Please try again later");
  } else if (rooms[req.params.roomName] == null) {
    console.log("Setting up", req.params.roomName);
    rooms[req.params.roomName] = setupRoom(req.params.roomName);
    res.send("init");
  } else {
    console.log("Room already running", req.params.roomName);
    res.send("running");
  }
});

app.get("/room/connections/:roomName", (req, res) =>
  res.json(
    rooms[req.params.roomName]?.connections.map((connection) =>
      connection.getId()
    ) ?? "No room setup!"
  )
);
