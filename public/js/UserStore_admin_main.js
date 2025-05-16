function saveStoreLocation() {
    if (!navigator.geolocation) {
        alert("브라우저가 위치 정보를 지원하지 않습니다.");
        return;
    }
    const storeID = window.storeID;
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            fetch('/saveStoreLocation2', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lat: lat,
                    lng: lng
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert(`✅ 위치 저장 완료\n위도: ${lat}\n경도: ${lng}`);
                    } else {
                        alert("❌ 저장 실패: " + data.message);
                    }
                })
                .catch(err => {
                    console.error("🚫 서버 오류:", err);
                    alert("서버 통신 오류 발생");
                });
        },
        (err) => {
            console.error("지오로케이션 오류:", err);
            alert(`위치 정보를 가져올 수 없습니다: [${err.code}] ${err.message}`);
        }
    );
}