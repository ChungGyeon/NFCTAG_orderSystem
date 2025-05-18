const express=require('express');
const app = require('./app');
const socketIo = require('socket.io');
const http = require('http');

const port=3001;

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3001", // 요청을 허용할 클라이언트 주소
        methods: ["GET", "POST"]
    }
});

app.set('io', io);

io.on('connection', socket => {
    console.log('클라이언트 접속됨');

    socket.on('disconnect', () => {
        console.log('클라이언트 연결 해제됨');
    });
});



server.listen(port, () => {
    console.log(`테스트 서버가 ${port} 실행됩니다.`);
});