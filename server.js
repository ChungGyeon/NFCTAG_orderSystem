const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const path = require('path');
const multer  = require('multer');
const https = require('https');
const http = require('http');
const fs = require('fs');

const socketIo = require('socket.io');

const app = require('./app');

require('dotenv').config(); //dotenv 사용 설정, .env파일 사용하게 하는 그거


const options = {
  key: fs.readFileSync(process.env.TAGORDER_PRIBUSY_SSL_PATH),
  cert: fs.readFileSync(process.env.TAGORDER_CA_SSL_PATH)
};


http.createServer((req, res) => {
  res.writeHead(301, { "Location": "https://" + req.headers.host + req.url });
  res.end();
}).listen(80);

const server = https.createServer(options, app);

// Socket.IO 연결
const io = socketIo(server, {
  cors: {
    origin: "https://tagorder.duckdns.org",
    methods: ["GET", "POST"],
    credentials: true
  }
});


const SubpoRt = 443;

io.on('connection', socket => {
  console.log('클라이언트 접속됨');
  socket.on('disconnect', () => {
    console.log('클라이언트 연결 해제됨');
  });
});

// app에서 io 사용 가능하게 전달
app.set('io', io);

server.listen(SubpoRt, () => {
  console.log(`서버가 ${SubpoRt} 실행됩니다.`);
});
