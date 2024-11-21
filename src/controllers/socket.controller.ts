import { Server as HttpServer } from "http";
import { Server } from "socket.io";

class SocketService {
    private static instance: SocketService;
    private io: Server;

    private constructor() {}

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public initialize(server: HttpServer): void {
        if (this.io) {
            throw new Error("Socket.io is already initialized.");
        }
        this.io = new Server(server, { cors: { origin: "*" } });

        this.io.on("connection", (socket) => {
            socket.on("joinRoom", (token: string) => {
                socket.join(token);
                socket.emit("roomJoined", { room: token });
            });
        });  
    }

    public getIO(): Server {
        if (!this.io) {
            throw new Error("Socket.io is not initialized.");
        }
        return this.io;
    }
}

export const socket = SocketService.getInstance();
