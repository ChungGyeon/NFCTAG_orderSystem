const express=require('express')
const app=express()
const port=3001
//컨트롤+c로 서버 종료
//node backserver.js로 실행
const ejs = require('ejs'); //ejs 사용

app.set('view engine','ejs'); //뷰 엔진 ejs로 세팅
app.set('views', './'+'/views'); //views파일이란게 루트/views에 있다고 지정
app.engine("html", ejs.renderFile); //거기에 읽혀지는게 html이면 그건 랜더링

app.use(express.static("views")) //views파일에 있는 모든 html에 있는건 불러와 써라


//메인주소 (원룸 : 115.20.142.157:3001)로 열리는 곳 설정
app.get("/",function(req,res){
    res.render("test.html") //localhost:위에서정한 포트번호/  로 요청(브라우저에 해당주소입력)시 test.html을 거기에 줘라
})

app.listen(port,()=>{   //서버시작 지정한 포트를 계속 듣는다.
    console.log(`Server started on port ${port}`)
})