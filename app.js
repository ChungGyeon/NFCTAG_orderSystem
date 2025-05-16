const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const path = require('path');
const multer  = require('multer');

let testPageConnect = false; // db연결 안되면 자동으로 test.ejs열리게 설정
//const upload = multer({ dest: 'test_img_upload/' }) //multer를 사용해 이미지 저장할 경로,테스트용임

//12~28 line : multer를 사용해 이미지 저장할 경로
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

//30~44 line : 필요 변수 선언
const bodyParser = require('body-parser');
const app = express();

//웹소켓 관련 32~50line
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3001", // 요청을 허용할 클라이언트 주소
        methods: ["GET", "POST"]
    }
});

io.on('connection', socket => {
    console.log('클라이언트 접속됨');

    socket.on('disconnect', () => {
        console.log('클라이언트 연결 해제됨');
    });
});


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

//gps 설정 관련, gps라우터는  112 line부터
//메모리 저장용 (기본 위치), 서버컴퓨터는 storeLocations를 주석처리해서 사용할 수 있도록
const storeLocations = {
    firstStore: { lat: 36.625688, lng: 127.465233 },
};
//관리자 외에는 접속이 불가 하도록 하는 관리자 인증 미들 웨어 52~58line
function checkAdminAuth(req, res, next) {
    if (req.session.isAdmin) {
        return next();
    } else {
        res.status(403).send("관리자 로그인이 필요합니다.");
    }
}
//위도 경도 거리 계산 함수 60~70line
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

//mysql DB 연결 72~80line
const db = mysql.createConnection({
    host: process.env.TAGORDER_DB_HOST,
    user: process.env.TAGORDER_DB_USER,
    password: process.env.TAGORDER_DB_PASSWORD,
    database: process.env.TAGORDER_DB,
    port: process.env.TAGORDER_DB_PORTNUM,
    multipleStatements: true // 여러 쿼리 실행을 허용
});

//db 연결 83~108line
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


//위치 인증 라우트 111~139line
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

//구형 위치 인증 라우트 142~156line
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

//가게 GPS 저장 + sql연동될때 사용하는 위치 저장 라우터 159~183line
app.post('/saveStoreLocation2', (req, res) => {
    const store = req.session.storeID;  // ← 세션에서 로그인한 사용자 ID 사용
    const { lat, lng } = req.body;

    if (!store || !lat || !lng) {
        return res.status(400).json({ success: false, message: "요청 정보 누락" });
    }
   //하기싫다 살려주라
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

//구형 gps 위치 저장 처리 186~202line
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

//상점 관리자용 메인 페이지 라우트 204~213line
app.get('/UserStore/UserStore_admin/UserStore_admin_main', (req, res) => {
    if (!req.session.storeID) {
        return res.redirect('/login');
    }
    res.render('./UserStore/UserStore_admin/UserStore_admin_main', {
        username: req.session.username,
        storeID: req.session.storeID,
    });
});


// 기본 경로 : 이젠 main페이지가 고객이 접근시 gps인증 라우터로 날려주고, 개발자(db연결 안될때)는 이전 그대로 settlementPage.ejs로 날려줌, 216~226line
app.get('/', (req, res) => { // 주소/?storeID=firstStore&tableNum=1 형식으로 파라메터를 주어지면 고객으로 접근, 아니면 관리자용 로그인으로 이동
if(!req.query.storeID && !req.query.tableNum){
       res.render('./login/intro', {TestPageConnect: testPageConnect});// test.ejs로 날려줌
    }
    else{
    const storeId =req.query.storeID;
    const table_num= req.query.tableNum;

    res.render('main', {TestPageConnect: testPageConnect, tableNum: table_num, storeID: storeId});// main으로 최초접근 후 다른 곳으로 이동하는 용}
    }
});

//메뉴 페이지 접속 라우트 229~249line
app.get('/UserStore/UserStore_guest/menulist', (req, res) => {
    if (!req.session.locationVerified) {
        return res.status(403).send("🚫 위치 인증이 필요합니다.");
    }

    const storeId = req.query.storeID;
    const tableNum= req.query.tableNum;
    const sql=`SELECT * FROM menu WHERE store_name="${storeId}";`;
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
        res.render('UserStore/UserStore_guest/menulist', { items:menuResults, tableNum:tableNum, storeID:storeId});//items: menuResults, options: menuOptionResults
    });
});

//개발자 admin 페이지 용 옵션전달 252~264line
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

//modifying_menu_page 용 옵션전달 267~279line
app.post('/test_adTooption', (req, res) => {
    const { targetOfAdditionalMenu_id: menu_id, name, additional_price, description} = req.body;

    const sql = 'INSERT INTO menu_option (menu_id, name, additional_price, description) VALUES (?, ?, ?, ?)';
    db.query(sql, [menu_id, name, additional_price, description], (err, result) => {
        if (err) {
            console.error('옵션 추가 실패:', err);
            return res.status(500).send('옵션 추가 실패');
        }
        console.log('옵션 추가 성공:', result);
        res.redirect('/UserStore/UserStore_admin/Modifying_menu_page/UserStore_menu_modify'); // 성공 후 관리자 페이지로 이동
    });
});


// 개발자 용 메뉴 삭제 라우트 282~295line
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
        res.redirect('./UserStore/UserStore_admin/Modifying_menu_page/UserStore_menu_modify');
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
//menu_modify.ejs에서 이미지 선택 후 업로드 클릭 시 서버 로그에 파일 디테일을 출력함, 336~342line
app.post('/StoreImg_upload', upload.single('myFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });
    }
    //res.json({ filename: req.file.originalname });
    res.redirect(`UserStore/UserStore_admin/Modifying_menu_page/UserStore_menu_modify?filename=${encodeURIComponent(req.file.originalname)}`);
});

/*이미지 전송과, 메뉴 정보를 동시에 처리하는 로직, 혼자 도전해볼게 25/05/04 완성하긴 했다. 근데 위에 기본 메뉴추가 라우터랑 헷갈리니 주의할 것
347~380line
*/
app.post('/addToMenuInfo', upload.single('myFile'),(req, res) => {
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
        const storeName = req.session.storeID;
        const sql = 'INSERT INTO menu (id, name, price, description, image_url, store_name) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(sql, [id, name, price,description, image_url, storeName], (err, result) => {
            if (err) {
                console.error('쿼리가 제대로 명시되지 않았습니다.: ' + err.stack);
                res.status(500).send('데이터베이스 쿼리 실패');
                return;
            }
            res.redirect('/UserStore/UserStore_admin/Modifying_menu_page/UserStore_menu_modify');
        });
    }
});


//클라이언트가 이미지를 요청할 때 사용할 경로를 추가, 보안에 주의요구됨
app.use("/test_img_upload", express.static(path.join(__dirname, "test_img_upload/")));

// 손님이 메뉴를 선택시 추가옵션을 불러오는 코드, 386~398line
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

//주문 완료 처리 401~417line
app.post('/DoSendOrder', (req, res) => {
    const {menu, options, totalPrice, tableNum, storeID} = req.body;
    console.log('storeID 테스트 :', storeID); // 주문 정보 로그
    //storeID없으면 주문하는 가게가 없다는걸 알림
    if (!storeID) {
        return res.status(400).json({success: false, message: '죄송합니다 ㅠ \n주문하는 가게를 인식을 못했어요... 다시한번만 알려주시겠어요?'});
    } else {
        console.log('주문 완료:', menu, options, totalPrice, tableNum); // 주문 완료 로그

        const order = {menu, options, totalPrice, tableNum};

        global.orders = global.orders || {};
        global.orders[storeID] = global.orders[storeID] || [];
        global.orders[storeID].push(order);

        //웹소켓이 storeID에 대한 실시간 알림 전송
        io.emit(`new-order-${storeID}`, order);

        res.json({success: true});
    }
});

/*
//파라메터 확인용 Dosendorder, db 연결을 통한 메뉴 저장하려고 했는데 개 빡세네
app.post('/DoSendOrderTest', (req, res) => {
    const { menu, options, totalPrice, tableNum } = req.body;
    const storeID = req.session?.storeID;
    //storeID없으면 주문하는 가게가 없다는걸 알림
    if(!storeID){return res.status(400).json({success: false, message: '죄송합니다 ㅠ \n주문하는 가게를 인식을 못했어요... 다시한번만 알려주시겠어요?'});}

    if(options.length === 0){ //옵션 없을때 실행하는 sql
    const sql= 'INSERT INTO order_status(store_id ,menu_name, totalprice, tableNum) VALUES (?, ?, ?, ?)';
    db.query(sql, [storeID, menu, totalPrice, tableNum], (err, result) => {
            if (err) {
                console.error('옵션 없을 때, 주문 현황을 집어 넣는 곳에서 쿼리 인식을 못했어: ' + err.stack);
                res.status(500).send('데이터베이스 쿼리 실패');
                return;
            }
        });
    }
    else{
    //optionValues : options의 id, name, price를 각각 option_id, option_name, option_price로 변환, 여러개 있어도 대응 가능
    if(!options[0].id || !options[0].name || !options[0].price){return res.status(400).json({success: false, message: '옵션이 없어요'});}
    const optionValues = options.map(option => {option_id, option_name, option_price});

    const sql= 'INSERT INTO order_status(store_id, menu_name, totalprice, option_id, option_name, option_price, tableNum) VALUES (?, ?, ?, ?, ?, ?, ?)';

    db.query(sql, [storeID, menu, totalPrice, option_id, option_name, option_price, tableNum], (err, result) => {
             if (err) {
                 console.error('옵션 있을 때, 주문 현황을 집어 넣는 곳에서 쿼리 인식을 못했어: ' + err.stack);
                 res.status(500).send('데이터베이스 쿼리 실패');
                 return;
             }
         });
    }

}
    res.json({ success: true });
});
*/

//주문 취소 처리
/* 여긴 DoCancelOrder 이전 코드
app.post('/DoCancelOrder', (req, res) => {
    const { menu, tableNum } = req.body;
    console.log('주문 취소 요청:', menu, tableNum); // 주문 취소 요청 로그
    const storeID = req.session.storeID;
    if(!storeID){return res.status(400).json({success: false, message: '죄송합니다 ㅠ \n주문취소하려는 가게를 인식 못했어요... 다시한번만 알려주시겠어요?'});}
    //global.orders에 storeID키 없이 접근하거나, orders[storeID]가 비어있으면 주문이 없다고 알림
    if (!global.orders || !global.orders[storeID]) {return res.status(400).json({ success: false, message: '취소할 주문이 없습니다.' });}
    global.orders[storeID] = global.orders[storeID].filter(order =>
        !(order.menu == menu && order.tableNum == tableNum)
    );
    console.log('테이블번호 :',tableNum,', ',menu,'주문 취소'); // 주문 완료 로그
    res.json({ success: true });
});*/

//주문 취소 처리 474~491line
app.post('/DoCancelOrder', (req, res) => {
    const Itemss = req.body.items; // [{ menu: 'X', tableNum: '1' }, ...]
    const storeID = req.session.storeID;
    if(!storeID){return res.status(400).json({success: false, message: '죄송합니다 ㅠ \n주문취소하려는 가게를 인식 못했어요... 다시한번만 알려주시겠어요?'});}
    if (!global.orders || !global.orders[storeID]) {return res.status(400).json({ success: false, message: '취소할 주문이 없습니다.' });}
    //주문 취소 요청 잘 날라오나 확인용 로그
    Itemss.forEach(item => {
        console.log('주문 취소 요청:', item.menu, item.tableNum);
    });
    for (const { menu, tableNum } of Itemss) {
            global.orders[storeID] = global.orders[storeID].filter(order =>
                !(order.menu === menu && Number(order.tableNum) === Number(tableNum))
            );
            console.log('테이블번호 :',tableNum,', ',menu,'주문 취소'); // 주문 완료 로그
    }

    res.json({ success: true });
});


//메뉴 정산하는 라우트 495~517line
app.post('/calcuDailySales', (req, res) => {
    const storeID = req.session.storeID;
    if(!storeID){return res.status(400).json({success: false, message: '죄송합니다 ㅠ \n정산하려는 가게를 인식 못했어요... 다시한번만 알려주시겠어요?'});}
    const soldMenus = req.body.dailySales;
    const storeName = req.body.storeName;
    console.log('storename : ', storeName);
    // 메뉴 데이터가 없으면 종료
    if (!Array.isArray(soldMenus) || soldMenus.length === 0) {
        return res.status(400).json({ success: false, message: '정산할 데이터가 없습니다.' });
    }

    // 여러 행을 한 번에 저장하는 쿼리 준비
    const values = soldMenus.map(menuObj => [menuObj.total,storeName, menuObj.menu]);
    const sql = 'INSERT INTO Sales (one_time_calculate, store_name, menu_name) VALUES ?';

    db.query(sql, [values], (err, result) => {
        if (err) {
            console.error('정산 저장 실패:', err);
            return res.status(500).json({ success: false, message: 'DB 저장 실패' });
        }
        // 정산된 메뉴들을 메모리에서 제거
        if (global.orders && global.orders[storeID]) {
            soldMenus.forEach(menuObj => {
                const menuName = menuObj.menu;

                // 해당 메뉴를 모두 제거
                global.orders[storeID] = global.orders[storeID].filter(order => order.menu !== menuName);
                console.log(`정산 후 '${menuName}' 삭제 완료`);
            });
        }
    });
    res.json({ success: true });
});

//일일매출 조회 라우트 520~540line
app.get('/getDailySales', (req, res) => {
    const storeID = req.session.storeID;
    if(!storeID){return res.status(400).json({success: false, message: '죄송합니다 ㅠ \n정산하려는 가게를 인식 못했어요... 다시한번만 알려주시겠어요?'});}
    const sql = `SELECT id, created_at, one_time_calculate, store_name, menu_name
                         FROM Sales
                         WHERE store_name = ? AND DATE_FORMAT(created_at, '%m-%d') = ?`
    // 오늘 날짜를 MM-DD 형식으로 가져오기 이건 gpt가 다해줬다 ㅋㅋ
   const pad = n => n.toString().padStart(2, '0');
   const today = new Date();
   const formattedDate = `${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    db.query(sql, [storeID,formattedDate], (err, results) => {
        if (err) {
            console.error('쿼리가 제대로 명시되지 않았습니다.: ' + err.stack);
            res.status(500).send('데이터베이스 쿼리 실패');
            return;
        }
        res.json({ success: true, results: results });
    });

});

//식당 관리자 메인 페이지 이동 스크립트
app.get('/UserStore/UserStore_admin/UserStore_admin_main', (req, res) => {
        res.render('./UserStore/UserStore_admin/UserStore_admin_main');
    });

//식당 관리자 메뉴수정 페이지 이동 스크립트 547~559line
app.get('/UserStore/UserStore_admin/Modifying_menu_page/UserStore_menu_modify', (req, res) => {
const storeId=req.session.storeID;
const sql = `SELECT * FROM menu WHERE store_name="${storeId}"`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('쿼리가 제대로 명시되지 않았습니다.: ' + err.stack);
            res.status(500).send('데이터베이스 쿼리 실패');
            return;
        }
        const menuResults = results;
        res.render('./UserStore/UserStore_admin/Modifying_menu_page/UserStore_menu_modify', { items: menuResults});
    });
});

//주문현황 페이지 이동 스크립트 562~566line
app.get('/UserStore/UserStore_admin/Order_related_page/settlementPage', (req, res) => {
        const store = req.session.storeID;
        const orders = global.orders?.[store] || [];
        res.render('./UserStore/UserStore_admin/Order_related_page/settlementPage', {orders, store});
});
/*
app.get('/UserStore/UserStore_admin/Order_related_page/settlementPage', (req, res) => {
    const sql = 'SELECT * FROM order_status WHERE store_id = ?';
    const storeID= req.session.storeID;
    db.query(sql,[storeID], (err, results) => {
        if (err) {
            console.error('쿼리가 제대로 명시되지 않았습니다.: ' + err.stack);
            res.status(500).send('데이터베이스 쿼리 실패');
            return;
        }
        res.render('.//UserStore/UserStore_admin/Order_related_page/testnotest', { orders: results }); // test.ejs 파일을 렌더링
    });
});*/
// 로그인 페이지
app.get('/login', (req, res) => {
    res.render('login/login');
});
//로그인 처리 스크립트 585~601line
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM store_user WHERE username = ? AND password = ?';

    db.query(sql, [username, password], (err, results) => {
        if (err || results.length === 0) {
            return res.send('<script>alert("로그인 실패"); window.location="/login";</script>');
        }

        const user = results[0]; // 사용자 정보
        req.session.isAdmin = true; //관리자 여부(이거 그 이용자측 관리자가 아니라, 진짜 관리자를 의미할텐데 왜 이게 트루상태입니까)
        req.session.username = user.username;//사용자 이름
        req.session.storeID = user.store_name; //매장 id

        res.redirect('/UserStore/UserStore_admin/UserStore_admin_main');
    });
});

// 회원가입 페이지
app.get('/register', (req, res) => {
    res.render('login/register'); // 파일도 views/login/register.ejs로 넣었을 경우
});
// 회원가입 처리 라우트 608~623line
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

// 로그아웃 후 페이지가 있다면 로그아웃 후 페이지로 이동, 없다면 로그인 페이지로 이동 631~635line
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.render('login/logout'); // logout.ejs가 존재할 경우
    });
});

//개발용 모든 메뉴 페이지 접속, 추후 삭제해야함
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

server.listen(3023, () => {
    console.log('웹소켓서버 실행 중 (3023포트)');
});

//이제 서버컴퓨터에는 server.js에서 실행하며, 아래 코드는 server.js,backserver.js에서 app.js를 쓰기 위한 export설정임
//테스트 환경은 backserver.jsfmf
module.exports = app;