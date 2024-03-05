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

app.use(cors());

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

interface Room {
  server: ReturnType<typeof ExpressPeerServer>;
  connections: IClient[];
}

const rooms: Record<string, Room> = {};

const setupRoom = (roomName: string) => {
  let socket: WebSocketServer;
  const room: Room = (rooms[roomName] = {
    server: ExpressPeerServer(server, {
      path: "/",
      allow_discovery: true,
      createWebSocketServer: (options) => {
        console.log(options);
        return (socket = new WebSocketServer(options));
      },
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
      const pathIndex = (app._router.stack as any[]).findIndex(
        (layer) => layer.path === `/room/${roomName}`
      );
      app._router.stack.splice(pathIndex, pathIndex >= 0 ? 1 : 0);
      socket?.close();
      delete rooms[roomName];
    }
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
