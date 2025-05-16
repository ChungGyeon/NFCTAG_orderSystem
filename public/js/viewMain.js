// 페이지 로드 후 1초 뒤에 다른 페이지로 이동
//TestPageConnect가 true면 test상점으로
//아니면 메인으로
const TestConnect = window.TestConnect;
const storeID = window.storeID;
const tableNum = window.tableNum;
console.log("연결 테스트, 아이디, 테이블 넘버:",TestConnect,storeID, tableNum);
//testConnect가 담기는 방식이랑 storeID랑 tableNum이 담기는 방식이 다른데, 이게 도대체 왜 이따구로 디는지 도당채 알수가 없다
//const tableNum = <%= tableNum %>; //테이블 번호를 받아옴
//const storeID = <%= JSON.stringify(storeID) %>; //파라메터에 적힌 매장 이름을 가져옴
if(TestConnect){
    setTimeout(() => {
        window.location.href = './TestStore/TestStore_admin/TestStore_admin_main';
    }, 500); // 500ms = 0.5초
}
else{
    navigator.geolocation.getCurrentPosition(success, error);
    function success(position) {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        console.log("아이디 체크:", storeID);

        fetch('/verifyLocation2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                store: storeID,
                lat: userLat,
                lng: userLng,
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.allowed) {
                    window.location.href = `/UserStore/UserStore_guest/menulist?storeID=${encodeURIComponent(storeID)}&tableNum=${encodeURIComponent(tableNum)}`;
                } else {
                    alert("현재 위치가 반경 50m 밖입니다.\n접속이 제한됩니다.");
                }
            })
            .catch(err => {
                console.error("요청 실패:", err);
                alert("서버 통신 오류 발생");
            });
    }

    function error() {
        alert("위치 정보를 가져올 수 없습니다. 위치 권한을 허용해 주세요.");
    }
}
