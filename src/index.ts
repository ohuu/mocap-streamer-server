import express, { Request, Response, Application } from "express";
import dotenv from "dotenv";
import { AccessToken } from "livekit-server-sdk";

//For env File
dotenv.config();

const app: Application = express();
const port = process.env.PORT || 8000;
const apiKey = process.env.LK_API_KEY || "livekit";
const apiSecret = process.env.LK_API_SECRET || "secret";

const createToken = (
  roomName: string,
  participantName: string,
  apiKey: string,
  apiSecret: string
) => {
  // if this room doesn't exist, it'll be automatically created when the first
  // client joins
  //   const roomName = "quickstart-room";

  // identifier to be used for participant.
  // it's available as LocalParticipant.identity with livekit-client SDK
  //   const participantName = "quickstart-username";

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
  });
  at.addGrant({ roomJoin: true, room: roomName });

  return at.toJwt();
};

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Express & TypeScript Server");
});

app.get("/getToken/:roomName/:participantName", (req, res) => {
  const roomName = req.params.roomName;
  const participantName = req.params.participantName;

  res.send(createToken(roomName, participantName, apiKey, apiSecret));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
