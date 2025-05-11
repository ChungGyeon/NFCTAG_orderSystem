const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const path = require('path');
const multer  = require('multer');
const https = require('https');
const http = require('http');
const fs = require('fs');

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
require('dotenv').config(); //dotenv 사용 설정, .env파일 사용하게 하는 그거
app.use(session({ // 세션 설정
    secret: 'tagorder-secret-key',
    resave: false,
    saveUninitialized: false
}));

//ssl관련, 작동 안되면은 47~51라인 주석 처리 후, 540~545라인 주석 해제, 그 아래 내용은 주석처리
/*
const options = {
  key: fs.readFileSync(process.env.TAGORDER_PRIBUSY_SSL_PATH),
  cert: fs.readFileSync(process.env.TAGORDER_CA_SSL_PATH)
};*/
//gps 설정 관련, gps라우터는  112 line부터
//메모리 저장용 (기본 위치)
const storeLocations = {
    firstStore: { lat: 36.625688, lng: 127.465233 },
};
//관리자 외에는 접속이 불가 하도록 하는 관리자 인증 미들 웨어
function checkAdminAuth(req, res, next) {
    if (req.session.isAdmin) {
        return next();
    } else {
        res.status(403).send("관리자 로그인이 필요합니다.");
    }
}

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

//39~74 line : db 접속코드
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


// ✅ 위치 인증 라우트
app.post('/verifyLocation2', (req, res) => {
    const { store, lat, lng } = req.body;
    const sql = `SELECT latitude, longitude FROM store_location WHERE store_id = ?`;

    db.query(sql, [store], (err, result) => {
        if (err) {
            console.error('식당 ID 전송 실패:', err);
            return res.status(500).json({ allowed: false, message: 'DB 오류 - 삭당 ID 전송' });
        }

        if (result.length === 0) {
            return res.json({ allowed: false, message: '매장 정보 없음' });
        }

        const storeLat = result[0].latitude;
        const storeLng = result[0].longitude;

        const distance = getDistanceFromLatLonInMeters(lat, lng, storeLat, storeLng);
        console.log(`[위치인증] ${distance.toFixed(2)}m 거리`);

        if (distance <= 50) {
            req.session.locationVerified = true;
            res.json({ allowed: true });
        } else {
            res.json({ allowed: false });
        }
    });
});


app.post('/verifyLocation', (req, res) => {
    const { lat, lng, store } = req.body;
    const storeGPS = storeLocations[store];
    if (!storeGPS) return res.json({ allowed: false });

    const distance = getDistanceFromLatLonInMeters(lat, lng, storeGPS.lat, storeGPS.lng);
    console.log(`${store} 위치 확인 거리: ${distance.toFixed(2)}m`);

    if (distance <= 50) {
        req.session.locationVerified = true;
        res.json({ allowed: true });
    } else {
        res.json({ allowed: false });
    }
});

//가게 GPS 저장 라우트 아마 sql연동될때 사용하는 위치 저장 라우터
app.post('/saveStoreLocation2', (req, res) => {
    const store = req.session.storeId;  // ← 세션에서 로그인한 사용자 ID 사용
    const { lat, lng } = req.body;

    if (!store || !lat || !lng) {
        return res.status(400).json({ success: false, message: "요청 정보 누락" });
    }

    const sql = `
        INSERT INTO store_location (store_id, latitude, longitude)
        VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE latitude = ?, longitude = ?, updated_at = NOW()
    `;

    db.query(sql, [store, lat, lng, lat, lng], (err, result) => {
        if (err) {
            console.error('[DB] 위치 저장 실패:', err);
            return res.status(500).json({ success: false, message: 'DB 저장 실패' });
        }

        storeLocations[store] = { lat: parseFloat(lat), lng: parseFloat(lng) };
        console.log(`✅ [${store}] 위치 저장 완료 → ${lat}, ${lng}`);
        return res.json({ success: true });
    });
});
//gps 위치 저장 처리
app.post('/saveStoreLocation', (req, res) => {
    const { store, lat, lng } = req.body;

    if (!store || !lat || !lng) {
        return res.status(400).json({ success: false, message: "요청 정보 누락" });
    }

    // ✅ 메모리에 저장 (DB는 사용하지 않음)
    storeLocations[store] = {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
    };

    console.log(`✅ [${store}] 위치 메모리 저장 완료 → 위도: ${lat}, 경도: ${lng}`);
    return res.json({ success: true });
});
//관리용 페이지 로그인 여부 체크
app.get('/TestStore/TestStore_admin/TestStore_admin_main', (req, res) => {
    if (!req.session.storeId) {
        return res.redirect('/login');
    }
    res.render('TestStore/TestStore_admin/TestStore_admin_main');
});


// 기본 경로 : 이젠 main페이지가 고객이 접근시 gps인증 라우터로 날려주고, 개발자(db연결 안될때)는 이전 그대로 test.ejs로 날려줌
app.get('/', (req, res) => { // 주소?table_num=1 같은 형식으로 넘어올거야
    const table_num= req.query.tableNum;
    res.render('main', {TestPageConnect: testPageConnect, tableNum: table_num});// main으로 최초접근 후 다른 곳으로 이동하는 용}
});
//firstStore 주문 페이지 접근 라우터 (GPS 인증 필수)
app.get('/firstStore/menu2', (req, res) => {
    if (!req.session.locationVerified) {
        return res.status(403).send("🚫 위치 인증이 필요합니다.");
    }

    const tableNum = req.query.tableNum;
    db.query('SELECT * FROM menu', (err, results) => {
        if (err) {
            console.error('쿼리 실패:', err);
            return res.status(500).send('DB 오류');
        }
        res.render('firstStore/menu2', { items: results, tableNum });
    });
});

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


// firstStore admin 페이지 용 옵션전달
app.post('/admin_adTooption', (req, res) => {
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

//TestStore modifying_menu_page 용 옵션전달
app.post('/test_adTooption', (req, res) => {
    const { targetOfAdditionalMenu_id: menu_id, name, additional_price, description} = req.body;

    const sql = 'INSERT INTO menu_option (menu_id, name, additional_price, description) VALUES (?, ?, ?, ?)';
    db.query(sql, [menu_id, name, additional_price, description], (err, result) => {
        if (err) {
            console.error('옵션 추가 실패:', err);
            return res.status(500).send('옵션 추가 실패');
        }
        console.log('옵션 추가 성공:', result);
        res.redirect('/TestStore/TestStore_admin/Modifying_menu_page/TestStore_menu_modify'); // 성공 후 관리자 페이지로 이동
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
// 로그인 페이지
app.get('/login', (req, res) => {
    res.render('login/login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM store_user WHERE username = ? AND password = ?';

    db.query(sql, [username, password], (err, results) => {
        if (err || results.length === 0) {
            return res.send('<script>alert("로그인 실패"); window.location="/login";</script>');
        }

        const user = results[0]; // ✅ 사용자 정보
        req.session.isAdmin = true;
        req.session.username = user.username;
        req.session.storeId = user.id;

        res.redirect('/TestStore/TestStore_admin/TestStore_admin_main');
    });
});

// 회원가입 페이지
app.get('/register', (req, res) => {
    res.render('login/register'); // 파일도 views/login/register.ejs로 넣었을 경우
});
// 회원가입 처리 POST
app.post('/register', (req, res) => {
    const { store_name, phone_number, address, username, password } = req.body;

    const sql = `
      INSERT INTO store_user (store_name, phone_number, address, username, password)
      VALUES (?, ?, ?, ?, ?)
  `;

    db.query(sql, [store_name, phone_number, address, username, password], (err, result) => {
        if (err) {
            console.error('회원가입 실패:', err);
            return res.status(500).send('회원가입 중 오류 발생');
        }
        res.redirect('/login'); // 회원가입 후 로그인 페이지로 이동
    });
});
// 소개 페이지
app.get('/intro', (req, res) => {
    res.render('login/intro');
});
// 로그아웃 후 페이지가 있다면
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.render('login/logout'); // logout.ejs가 존재할 경우
    });
});
//서버 실행화면 확인

const SubpoRt = 3001;
app.listen(SubpoRt, () => {
    console.log(`서버가 ${SubpoRt} 실행됩니다.`);
});

/*
http.createServer((req, res) => {
  res.writeHead(301, { "Location": "https://" + req.headers.host + req.url });
  res.end();
}).listen(80);
const SubpoRt = 443;
https.createServer(options, app).listen(SubpoRt, () => {
  console.log(`서버가 ${SubpoRt} 실행됩니다.`);
});*/