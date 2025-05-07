const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors'); // ⭐ 추가 (ngrok 등 외부 요청 허용용)

const app = express();

// ✅ 기본 미들웨어
app.use(express.static('views'));
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors()); // ⭐ 외부 fetch 허용
app.use(session({
    secret: 'tagorder-secret-key',
    resave: false,
    saveUninitialized: false
}));

// ✅ 파일 업로드 설정
const upload = multer({
    storage: multer.diskStorage({
        filename(req, file, done) {
            console.log(file);
            done(null, file.originalname);
        },
        destination(req, file, done) {
            console.log(file);
            done(null, path.join(__dirname, "test_img_upload/"));
        },
    }),
});

// ✅ DB 연결
require('dotenv').config();
const db = mysql.createConnection({
    host: process.env.TAGORDER_DB_HOST,
    user: process.env.TAGORDER_DB_USER,
    password: process.env.TAGORDER_DB_PASSWORD,
    database: process.env.TAGORDER_DB,
    port: process.env.TAGORDER_DB_PORTNUM,
    multipleStatements: true
});

db.connect((err) => {
    if (err) {
        console.error('데이터베이스 연결 실패: ' + err.stack);
        process.exit(1);
    }
    console.log('데이터베이스와 연결 성공!');
});

// ✅ 메모리 저장용 (기본 위치)
const storeLocations = {
    firstStore: { lat: 36.625688, lng: 127.465233 },
};

// 거리 계산 함수
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

// ✅ 위치 인증 라우트
app.post('/verifyLocation2', (req, res) => {
    const { lat, lng, store } = req.body;
    const storeGPS = storeLocations[store];
    if (!storeGPS) return res.json({ allowed: false });

    const distance = getDistanceFromLatLonInMeters(lat, lng, storeGPS.lat, storeGPS.lng);
    console.log(`[위치인증] ${distance.toFixed(2)}m 거리`);

    if (distance <= 50) {
        req.session.locationVerified = true;
        res.json({ allowed: true });
    } else {
        res.json({ allowed: false });
    }
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

// ✅ 가게 GPS 저장 라우트
app.post('/saveStoreLocation2', (req, res) => {
    const { store, lat, lng } = req.body;
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

        storeLocations[store] = { lat: parseFloat(lat), lng: parseFloat(lng) }; // 메모리에도 저장
        console.log(`✅ [${store}] 위치 DB 저장 완료 → ${lat}, ${lng}`);
        return res.json({ success: true });
    });
});
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

// ✅ 메인 진입
app.get('/', (req, res) => {
    const table_num = req.query.tableNum;
    res.render('main', { TestPageConnect: true, tableNum: table_num });
});

// ✅ 고객용 메뉴 페이지 (GPS 인증 필수)
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

// ✅ 고객: 메뉴 옵션 불러오기
app.get('/getMenuOptions', (req, res) => {
    const menuId = req.query.id;
    const sql = 'SELECT * FROM menu_option WHERE menu_id = ?';
    db.query(sql, [menuId], (err, options) => {
        if (err) return res.status(500).send('옵션 조회 실패');
        res.json({ options });
    });
});

// ✅ 고객: 주문 전송
app.post('/DoSendOrder', (req, res) => {
    const { menu, options, totalPrice, tableNum } = req.body;
    console.log('주문 완료:', menu, options, totalPrice, tableNum);
    global.orders = global.orders || [];
    global.orders.push({ menu, options, totalPrice, tableNum });
    res.json({ success: true });
});

// ✅ 관리자 페이지
app.get('/firstStore/admin', (req, res) => {
    db.query('SELECT * FROM menu', (err, results) => {
        if (err) return res.status(500).send('DB 오류');
        res.render('firstStore/admin', { items1: results });
    });
});

// ✅ 테스트 관리자 메인 페이지
app.get('/TestStore/TestStore_admin/TestStore_admin_main', (req, res) => {
    res.render('./TestStore/TestStore_admin/TestStore_admin_main');
});

// ✅ 테스트 메뉴 수정 페이지
app.get('/TestStore/TestStore_admin/Modifying_menu_page/TestStore_menu_modify', (req, res) => {
    db.query('SELECT * FROM menu', (err, results) => {
        if (err) return res.status(500).send('DB 오류');
        res.render('./TestStore/TestStore_admin/Modifying_menu_page/TestStore_menu_modify', { items: results });
    });
});

// ✅ 테스트 주문 내역 보기
app.get('/TestStore/TestStore_admin/Order_related_page/test', (req, res) => {
    res.render('./TestStore/TestStore_admin/Order_related_page/test', { orders: global.orders || [] });
});

// ✅ 정적 이미지 경로
app.use("/test_img_upload", express.static(path.join(__dirname, "test_img_upload/")));

// ✅ 서버 실행
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
