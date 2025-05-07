const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const path = require('path');
const multer  = require('multer')

let testPageConnect = false; // db연결 안되면 자동으로 test.ejs열리게 설정
//const upload = multer({ dest: 'test_img_upload/' }) //multer를 사용해 이미지 저장할 경로,테스트용임

//7~23 line : multer를 사용해 이미지 저장할 경로
const upload = multer({  
    storage: multer.diskStorage({
      	filename(req, file, done) {
          	console.log(file);
			done(null, file.originalname);
        },
        //파일저장 위치 지정, file의 이름을 로그에 출력하고 test_img_upload파일에 이미지를 저장하게 될거야, 그래야만 해
		destination(req, file, done) {
      		console.log(file);
		    done(null, path.join(__dirname, "test_img_upload/"));
		    //17line 지금은 모든 상점이 같은 폴더를 공유하나, 이후 각 상점 이미지 폴저인 menu_img폴더로 옳길 방법을 찾아야해,
		    //어디  상점 어드민인지, 거기서 쿼리 쏘면 그 경로로 오는 뭐라쓰는거냐 어쨋든 그런 방식이 필요해보임
            //path.join(__dirname, "test_img_upload/") 이건 변수로도 선언이 가능하나 어차피 나중에 여러 상점 늘린다면 이걸로 쓸 수 밖에 없음
	    },
    }),
});

//26~33 line : 필요 변수 선언
const bodyParser = require('body-parser');
const app = express();

app.use(express.static('views'));
app.set('view engine', 'ejs');
app.set('views', './views'); // 뷰 파일 디렉토리 설정
app.use(bodyParser.urlencoded({ extended: true })); //url인코딩 데이터 파싱
app.use(bodyParser.json()); // json 데이터 파싱


//39~74 line : db 접속코드
require('dotenv').config();
const db = mysql.createConnection({
    host: process.env.TAGORDER_DB_HOST,
    user: process.env.TAGORDER_DB_USER,
    password: process.env.TAGORDER_DB_PASSWORD,
    database: process.env.TAGORDER_DB,
    port: process.env.TAGORDER_DB_PORTNUM,
    multipleStatements: true // 여러 쿼리 실행을 허용
});

//세션환경설정
/*
로그인할때 써먹자, 테이블 번호는 쿼리마라메터만 사용하도록 하지
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { masAge: 300000} // 세션 유지 시간 (5분)}
  )};*/

db.connect((err) => {
    if (err) {
        console.error('데이터베이스 연결 실패: ' + err.stack);
        const readline = require('readline'); //readline 활성화
        const tsuzukeru = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        });

        tsuzukeru.question('계속 진행하겠습니까? (Y/N)', (answer) => {
        if(answer=='Y' || answer=='y'){
            console.log('계속 진행합니다');
            testPageConnect=true;
            tsuzukeru.close();
        }
        else{
             console.log('잘못 입력했어도 종료합니다.')
             tsuzukeru.close();
             process.exit(1);
        }
        });
    }
    else{
    console.log('데이터베이스와 연결 성공!');
    }
});


// 기본 경로 : 상점 접속을 위한 페이지 로드용, 일단 이런식으로 밖에 못고치겠어
app.get('/', (req, res) => { // 주소?table_num=1 같은 형식으로 넘어올거야
    const table_num= req.query.tableNum;
    res.render('main', {TestPageConnect: testPageConnect, tableNum: table_num});// main으로 최초접근 후 다른 곳으로 이동하는 용}
});

/*
태그마다 id 구현
태그마다 1,2,3,4,5와 같은 아이디를 지닌 주소를 nfc태그에 부여하고 그걸 토대로 테이블 번호를 지정하는 방식이 어떨까

*/

//60~177line firstStore 관리자 페이지
app.get('/firstStore/admin', (req, res) => {
    const sql = 'SELECT * FROM menu';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('쿼리가 제대로 명시되지 않았습니다.: ' + err.stack);
            res.status(500).send('데이터베이스 쿼리 실패');
            return;
        }
        res.render('firstStore/admin', { items1: results });
        //items1 -> admin.ejs to line 12
    });
});


// post방식 admin_adTomenu /버튼으로 추가하기
app.post('/admin_adTomenu', (req, res) => {
    var id = 0;
    if (req.body.id == 0) {
        id = 1;
        insertMenu();
    } else {
        const fInd_max_id_from_menu = 'SELECT MAX(id) as max_id FROM menu';
        db.query(fInd_max_id_from_menu, (err, result) => {
            if (err) {
                console.error('id 조회 실패: ' + err.stack);
                res.status(500).send('데이터베이스 쿼리 실패');
                return;
            }
            id = (result[0].max_id || 0) + 1;
            insertMenu();
        });
    }

    function insertMenu() {
        const { name, price, description, image_url } = req.body;
        const sql = 'INSERT INTO menu (id, name, price, description, image_url) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [id, name, price,description, image_url], (err, result) => {
            if (err) {
                console.error('쿼리가 제대로 명시되지 않았습니다.: ' + err.stack);
                res.status(500).send('데이터베이스 쿼리 실패');
                return;
            }
            res.redirect('/TestStore/TestStore_admin/Modifying_menu_page/TestStore_menu_modify');
        });
    }
});


// post방식 admin_adTooption /버튼으로 추가하기
app.post('/admin_adTooption', (req, res) => {
    const { targetOfAdditionalMenu_id: menu_id, name, additional_price, description} = req.body;

    const sql = 'INSERT INTO menu_option (menu_id, name, additional_price, description) VALUES (?, ?, ?, ?)';
    db.query(sql, [menu_id, name, additional_price, description], (err, result) => {
        if (err) {
            console.error('옵션 추가 실패:', err);
            return res.status(500).send('옵션 추가 실패');
        }
        console.log('옵션 추가 성공:', result);
        res.redirect('/firstStore/admin'); // 성공 후 관리자 페이지로 이동
    });
});

//테스트용 거시기
app.post('/test_adTooption', (req, res) => {
    const { menu_id, name, additional_price, description} = req.body;

    const sql = 'INSERT INTO menu_option (menu_id, name, additional_price, description) VALUES (?, ?, ?, ?)';
    db.query(sql, [menu_id, name, additional_price, description], (err, result) => {
        if (err) {
            console.error('옵션 추가 실패:', err);
            return res.status(500).send('옵션 추가 실패');
        }
        console.log('옵션 추가 성공:', result);
        res.redirect('/firstStore/admin'); // 성공 후 관리자 페이지로 이동
    });
});


//흠..이건 메뉴 옵션을 불러오는 코드
//modal test랑 합칠때 쓰면 될
app.get('/여기 뭘로 이름을 정하지', (req, res) => {
    const menuId = req.params.menuId;
    const sql = 'SELECT mo.id, mo.name, mo.price, mo.description FROM menu_option mo JOIN menu m ON m.id = mo.menu_id WHERE m.id = ?';
    db.query(sql, [menuId], (err, results) => {
        if (err) {
            console.error('옵션 조회 실패:', err.stack);
            res.status(500).send('옵션 조회 실패');
            return;
        }
        res.json(results);
    });
});

// post방식 admin_addel /버튼으로 삭제 시켜버리기
app.post('/admin_addel', (req, res) => { 
    const { id } = req.body;
    console.log('버튼삭제 요청:', req.body); //일단 수시로 확인하기 위한 로그
    const sql = 'DELETE FROM menu WHERE id = ?;'
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('쿼리가 제대로 명시되지 않았습니다.: ' + err.stack);
            res.status(500).send('데이터베이스 쿼리 실패');
            return;
        }
        res.redirect('./TestStore/TestStore_admin/Modifying_menu_page/TestStore_menu_modify');
    });
});


//테스트 이미지 업로드 
//firststore admin에서 이미지 선택 후 업로드 클릭 시 서버 로그에 파일 디테일을 출력함
//동시에 NodeJsver_ORDERTAG/test_img_upload에 파일이 랜덤한 이름으로 저장됨. 파일확장자도 지워지니 그건 주의
//line 3~4부분이 multer와 파일 저장 위치 이다.
//multipart/form-data 형식의 body를 파싱해서 파일로 다시 변환하고 dest에 등록된 경로에 업로드 된다.
//upload.single() : 파일이 하나일 때 사용 하는 함수, 인수로는 html상에서 전달하는 객체의 name을 적는다.
//예시로 admin.ejs에는 input의 name태그가 myFilef로 되어있다.
//////////// 
//이건 업로드 파일 확장자명을 지키기 위한 로직 위에서 변경요구
/*
const upload = multer({
    storage: multer.diskStorage({
      	filename(req, file, done) {
          	console.log(file);
			done(null, file.originalname);
        },
		destination(req, file, done) {
      		console.log(file);
		    done(null, path.join(__dirname, "public"));
	    },
    }),
});

////////////
const uploadMiddleware = upload.single('myFile');
app.use(uploadMiddleware);

app.post('/upload', (req, res) => {
    console.log(req.file);
    res.status(200).send('uploaded');
});


*/


//////////
//이곳에 firstStore 어드민 이미지 업로드 로직 구현 예정

/*
upload.single() : 파일이 하나일 때 사용 하는 함수, 인수로는 html상에서 전달하는 객체의 name을 적는다.
인수인 myFile은 나중에 수정예정, html에서도 수정요구
*/
//firstStore 어드민용 메뉴추가 이미지 업로드 구축
/*
app.post('/StoreImg_upload', upload.single('myFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });
    }
    //res.json({ filename: req.file.originalname });
    res.redirect(`firstStore/admin?filename=${encodeURIComponent(req.file.originalname)}`);
});*/
//test-menu-modify용 메뉴추가 이미지 업로드 구축
app.post('/StoreImg_upload', upload.single('myFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });
    }
    //res.json({ filename: req.file.originalname });
    res.redirect(`TestStore/TestStore_admin/Modifying_menu_page/TestStore_menu_modify?filename=${encodeURIComponent(req.file.originalname)}`);
});

/*이미지 전송과, 메뉴 정보를 동시에 처리하는 로직, 혼자 도전해볼게 25/05/04*/
app.post('/addToMenuInfo', upload.single('myFile'),(req, res) => {
    console.log('보디 내용물', req.body);
    console.log('req.file:', req.file);
    var id = 0;
        if (req.body.id == 0) {
            id = 1;
            insertMenu();
        } else {
            const fInd_max_id_from_menu = 'SELECT MAX(id) as max_id FROM menu';
            db.query(fInd_max_id_from_menu, (err, result) => {
                if (err) {
                    console.error('id 조회 실패: ' + err.stack);
                    res.status(500).send('데이터베이스 쿼리 실패');
                    return;
                }
                id = (result[0].max_id || 0) + 1;
                insertMenu();
            });
        }

    function insertMenu() {
        const { name, price, description } = req.body;
        const image_url = req.file? req.file.filename : null;
        const sql = 'INSERT INTO menu (id, name, price, description, image_url) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [id, name, price,description, image_url], (err, result) => {
            if (err) {
                console.error('쿼리가 제대로 명시되지 않았습니다.: ' + err.stack);
                res.status(500).send('데이터베이스 쿼리 실패');
                return;
            }
            res.redirect('/TestStore/TestStore_admin/Modifying_menu_page/TestStore_menu_modify');
        });
    }
});
/* 메뉴 추가옵션은 잠시 미룸
//firstStore 어드민용 옵션추가 이미지 업로드 구축
app.post('/option_StoreImg_upload', upload.single('myFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });
    }
    //res.json({ filename: req.file.originalname });
    res.redirect(`firstStore/admin?filename=${encodeURIComponent(req.file.originalname)}`);
});
*/
//클라이언트가 이미지를 요청할 때 사용할 경로를 추가, 보안에 주의요구됨
app.use("/test_img_upload", express.static(path.join(__dirname, "test_img_upload/")));




// 182~210 첫번째 상점 손님페이지
app.get('/firstStore/menu2', (req, res) => {
    const tableNum= req.query.tableNum;
    const sql=`SELECT * FROM menu;`;
    /*
    const sql = `
        SELECT * FROM menu;
        SELECT * FROM menu_option;
    `;*/
    db.query(sql, (err, results) => {
        if (err) {
            console.error('쿼리가 제대로 명시되지 않았습니다.: ' + err.stack);
            res.status(500).send('데이터베이스 쿼리 실패');
            return;
        }
        
        //const menuResults = results[0];
        //const menuOptionResults = results[1];
        const menuResults = results;
        //메인메뉴는 items, 추가옵션은 options, tableNum은 nfc태그에 부여된 테이블 번호를 넘김
        res.render('firstStore/menu2', { items:menuResults, tableNum:tableNum });//items: menuResults, options: menuOptionResults
        //res.render('firstStore/menu2', { items: menuResults, options: menuOptionResults });
    });
});

// 손님이 메뉴를 선택시 추가옵션을 불러오는 코드, 228~240
app.get('/getMenuOptions', (req, res) => {
    const menuId = req.query.id;
    const sql = 'SELECT * FROM menu_option WHERE menu_id = ?';
    db.query(sql, [menuId], (err, options) => {
        if (err) {
            console.error('쿼리가 제대로 명시되지 않았습니다.: ' + err.stack);
            res.status(500).send('데이터베이스 쿼리 실패');
            return;
        }
        res.json({ options: options }); //options로 넘겨줌
    });
});

//주문 완료 처리
app.post('/DoSendOrder', (req, res) => { 
    const { menu, options, totalPrice, tableNum } = req.body;
        console.log('주문 완료:', menu, options, totalPrice,tableNum); // 주문 완료 로그

        const order = { menu, options, totalPrice, tableNum };

        global.orders = global.orders || [];
        global.orders.push(order);

        res.json({ success: true });

});





//295~298 테스트 상점 메인페이지 접속
app.get('/TestStore/TestStore_admin/TestStore_admin_main', (req, res) => {
        res.render('./TestStore/TestStore_admin/TestStore_admin_main'); // test.ejs 파일을 렌더링
    });

//테스트 상점 메인관리자 페이지 이동 스크립트
app.get('/TestStore/TestStore_admin/Modifying_menu_page/TestStore_menu_modify', (req, res) => {
const sql = 'SELECT * FROM menu';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('쿼리가 제대로 명시되지 않았습니다.: ' + err.stack);
            res.status(500).send('데이터베이스 쿼리 실패');
            return;
        }
        const menuResults = results;
        res.render('./TestStore/TestStore_admin/Modifying_menu_page/TestStore_menu_modify', { items: menuResults}); // test.ejs 파일을 렌더링
    });
});


app.get('/TestStore/TestStore_admin/Order_related_page/test', (req, res) => {
        res.render('./TestStore/TestStore_admin/Order_related_page/test', {orders: global.orders || []}); // test.ejs 파일을 렌더링
});

//308~320 테스트용 손님 페이지 임시로 보류
/*
app.get('/TestStore/TestStore_admin/Modifying_menu_page/TestStore_menu_modify', (req, res) => {
    const sql = 'SELECT * FROM menu';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('쿼리가 제대로 명시되지 않았습니다.: ' + err.stack);
            res.status(500).send('데이터베이스 쿼리 실패');
            return;
        }
        const menuResults = results;
        res.render('/TestStore/TestStore_admin/Modifying_menu_page/TestStore_menu_modify', { items: menuResults}); // test.ejs 파일을 렌더링
    });
});
*/




//서버 실행화면 확인
const SubpoRt = 3001;
app.listen(SubpoRt, () => {
    console.log(`서버가 ${SubpoRt} 실행됩니다.`);
});