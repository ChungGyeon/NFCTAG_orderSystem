const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const path = require('path');
const multer  = require('multer');
const https = require('https');
const http = require('http');
const fs = require('fs');

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
const SubpoRt = 443;
https.createServer(options, app).listen(SubpoRt, () => {
  console.log(`서버가 ${SubpoRt} 실행됩니다.`);
});
