
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io'; 
import harperSaveMessage from './services/harper-save-message.js';
import harperGetMessages from './services/harper-get-messages.js';
import http from 'http';
import leaveRoom from './utils/leave-room.js'
const app = express();
const server = http.createServer(app);


// Create an io server and allow for CORS from http://localhost:3000 with GET and POST methods
const io = new Server(server);
io.eio.pingTimeout = 120000; // 2 minutes
io.eio.pingInterval = 5000;  // 5 seconds
const CHAT_BOT = 'ChatBot'


app.use(cors()); // Add cors middleware

let chatRoom = '';
let allUsers = []; // All users in current chat room

// Listen for when the client connects via socket.io-client
io.on('connection', (socket) => {
  console.log(`User connected ${socket.id}`);

  // Add a user to a room
  socket.on('join_room', (data) => {
    const { username, room } = data; // Data sent from client when join_room event emitted
    socket.join(room); // Join the user to a socket room

    let __createdtime__ = Date.now(); // Current timestamp

    let existingUserInRoom = allUsers.find(user => user.username === username && user.room === room)
    
    if (!existingUserInRoom) {
      // Send message to all users currently in the room, apart from the user that just joined
      socket.to(room).emit('receive_message', {
        message: `${username} has joined the chat room`,
        username: CHAT_BOT,
        __createdtime__,
      });
      // Send welcome msg to user that just joined chat only
      socket.emit('receive_message', {
        message: `Welcome ${username}`,
        username: CHAT_BOT,
        __createdtime__,
      });
    } else {
      allUsers.push({ id: socket.id, username, room });
    }

    chatRoom = room;
    // allUsers.push({ id: socket.id, username, room });
    let chatRoomUsers = allUsers.filter((user) => user.room === room);
    socket.to(room).emit('chatroom_users', chatRoomUsers);
    socket.emit('chatroom_users', chatRoomUsers);

    harperGetMessages(room)
      .then((last100Messages) => {
        socket.emit('last_100_messages', last100Messages);
      })
      .catch((err) => console.log(err));

  });

  socket.on('send_message', (data) => {
    const { message, username, room, __createdtime__, message_id } = data;
    io.in(room).emit('receive_message', data); // Send to all users in room, including sender
    harperSaveMessage(message, username, room, message_id) // Save message in db
      .then((response) => console.log(response))
      .catch((err) => console.log(err));
  });
  
  socket.on('leave_room', (data) => {
    const { username, room } = data;
    socket.leave(room);
    const __createdtime__ = Date.now();
    // Remove user from memory
    allUsers = leaveRoom(socket.id, allUsers);
    socket.to(room).emit('chatroom_users', allUsers);
    socket.to(room).emit('receive_message', {
      username: CHAT_BOT,
      message: `${username} has left the chat`,
      __createdtime__,
    });
    console.log(`${username} has left the chat`);
  });

});

server.listen(4000, () => 'Server is running on port 3000');