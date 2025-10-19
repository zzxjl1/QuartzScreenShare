const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8123;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));


// 存储连接的客户端
const clients = new Map();
const rooms = new Map();

// 获取房间成员列表
function getRoomMembers(roomId) {
  const members = [];
  if (rooms.has(roomId)) {
    for (const socketId of rooms.get(roomId)) {
      const client = clients.get(socketId);
      if (client) {
        members.push({
          id: socketId,
          name: `用户${socketId.slice(-4)}`,
          isSharing: client.isScreenSharing,
          connectionStatus: 'connected'
        });
      }
    }
  }
  return members;
}

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log('新客户端连接:', socket.id);
  
  clients.set(socket.id, {
    id: socket.id,
    isScreenSharing: false,
    room: null
  });

  // 检查房间是否存在（用于验证）
  socket.on('check-room', (roomId, callback) => {
    const exists = rooms.has(roomId) && rooms.get(roomId).size > 0;
    callback({
      exists,
      roomId,
      userCount: exists ? rooms.get(roomId).size : 0
    });
  });

  // 加入房间
  socket.on('join-room', (roomId) => {
    const client = clients.get(socket.id);
    if (client) {
      client.room = roomId;
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      rooms.get(roomId).add(socket.id);
      
      console.log(`客户端 ${socket.id} 加入房间 ${roomId}`);
      
      // 通知房间内其他成员有新用户加入
      socket.to(roomId).emit('user-joined', {
        userId: socket.id,
        userCount: rooms.get(roomId).size
      });
      
      // 发送当前房间用户数给新加入的用户
      const roomMembers = getRoomMembers(roomId);
      socket.emit('room-info', {
        roomId,
        userCount: rooms.get(roomId).size,
        members: roomMembers
      });
      
      // 通知房间内所有成员更新用户计数和成员列表
      io.to(roomId).emit('room-info', {
        roomId,
        userCount: rooms.get(roomId).size,
        members: roomMembers
      });
      
      // 检查房间内是否有正在共享屏幕的用户
      const sharingUsers = [];
      for (const [userId, userClient] of clients) {
        if (userClient.room === roomId && userClient.isScreenSharing && userId !== socket.id) {
          sharingUsers.push(userId);
        }
      }
      
      // 如果有用户在共享屏幕，通知新加入的用户
      if (sharingUsers.length > 0) {
        setTimeout(() => {
          sharingUsers.forEach(userId => {
            socket.emit('screen-share-started', {
              userId: userId
            });
          });
        }, 1000); // 延迟1秒确保客户端完全准备好
      }
    }
  });

  // 开始屏幕共享
  socket.on('start-screen-share', (roomId) => {
    const client = clients.get(socket.id);
    if (client) {
      client.isScreenSharing = true;
      console.log(`客户端 ${socket.id} 开始屏幕共享`);
      
      // 通知房间内其他成员
      socket.to(roomId).emit('screen-share-started', {
        userId: socket.id
      });
      
      // 更新房间成员列表
      if (rooms.has(roomId)) {
        const roomMembers = getRoomMembers(roomId);
        io.to(roomId).emit('room-info', {
          roomId,
          userCount: rooms.get(roomId).size,
          members: roomMembers
        });
      }
    }
  });

  // 停止屏幕共享
  socket.on('stop-screen-share', (roomId) => {
    const client = clients.get(socket.id);
    if (client) {
      client.isScreenSharing = false;
      console.log(`客户端 ${socket.id} 停止屏幕共享`);
      
      // 通知房间内其他成员
      socket.to(roomId).emit('screen-share-stopped', {
        userId: socket.id
      });
      
      // 更新房间成员列表
      if (rooms.has(roomId)) {
        const roomMembers = getRoomMembers(roomId);
        io.to(roomId).emit('room-info', {
          roomId,
          userCount: rooms.get(roomId).size,
          members: roomMembers
        });
      }
    }
  });

  // WebRTC 信令
  socket.on('offer', (data) => {
    socket.to(data.target).emit('offer', {
      offer: data.offer,
      sender: socket.id
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.target).emit('answer', {
      answer: data.answer,
      sender: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  // 客户端断开连接
  socket.on('disconnect', () => {
    console.log('客户端断开连接:', socket.id);
    
    const client = clients.get(socket.id);
    if (client && client.room) {
      const roomId = client.room;
      const room = rooms.get(roomId);
      
      if (room) {
        room.delete(socket.id);
        console.log(`客户端 ${socket.id} 离开房间 ${roomId}, 剩余用户: ${room.size}`);
        
        // 通知房间内其他成员有用户离开
        socket.to(roomId).emit('user-left', {
          userId: socket.id,
          userCount: room.size
        });
        
        // 通知房间内所有剩余成员更新用户计数和成员列表
        if (room.size > 0) {
          const roomMembers = getRoomMembers(roomId);
          console.log(`更新房间 ${roomId} 成员列表:`, roomMembers.map(m => m.id));
          io.to(roomId).emit('room-info', {
            roomId,
            userCount: room.size,
            members: roomMembers
          });
        }
        
        // 如果房间为空，删除房间
        if (room.size === 0) {
          console.log(`房间 ${roomId} 已空，删除房间`);
          rooms.delete(roomId);
        }
      }
    }
    
    clients.delete(socket.id);
  });
});

// API 路由
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Screen Share Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.entries()).map(([roomId, clients]) => ({
    roomId,
    userCount: clients.size
  }));
  
  res.json({ rooms: roomList });
});

// 检查房间是否存在
app.get('/api/rooms/:roomId/exists', (req, res) => {
  const { roomId } = req.params;
  const exists = rooms.has(roomId) && rooms.get(roomId).size > 0;
  
  console.log(`检查房间 ${roomId} 是否存在: ${exists}, 用户数量: ${rooms.get(roomId)?.size || 0}`);
  
  res.json({ 
    exists,
    roomId,
    userCount: exists ? rooms.get(roomId).size : 0
  });
});

// SPA 路由回退 - 对于所有非API路由，返回index.html
app.get('*', (req, res) => {
  // 排除API路由
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // 对于所有其他路由，返回index.html让前端路由处理
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 投屏服务器运行在端口 ${PORT}`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
});