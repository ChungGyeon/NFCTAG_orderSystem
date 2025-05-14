const express=require('express');
const app = require('./app');
const port=3001;


app.listen(port, () => {
    console.log(`테스트 서버가 ${port} 실행됩니다.`);
});