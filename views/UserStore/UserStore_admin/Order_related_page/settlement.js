function selectOp(id) {
    setTimeout(() => {
        window.location.href = `Select_menuop/espreeso_op.html?id=${id}`;
    }, 300);
}
function calculateForMenu() {
           const resultBox = document.getElementById("settle-result");
           resultBox.innerHTML = ''; // 초기화

           const cards = document.querySelectorAll('.table-card');
           let grandTotal = 0;
           let hasData = false;
          //현재 문제, card.dataset.table이 undefined로 나옴, 이에 따라 총합계가 NaN으로 나옴
           cards.forEach(card => {
               const checkbox = card.querySelector('.table-check');
               if (checkbox.checked) {
                   hasData = true;
                   const tableNum = card.dataset.table;
                   const total = parseInt(card.dataset.total);
                   const items = Array.from(card.querySelectorAll('ul li')).map(li => li.textContent);

                   grandTotal += total;

                   resultBox.innerHTML += `
                       <div style="margin-bottom: 15px;">
                           <strong>테이블 ${tableNum}</strong><br/>
                           주문 목록:<br/>
                           ${items.map(item => `- ${item}`).join('<br/>')}<br/>
                           <strong>합계: ${total.toLocaleString()}원</strong>
                       </div>
                   `;
               }
           });

    if (!hasData) {
        resultBox.innerHTML = `<p>선택된 테이블이 없습니다.</p>`;
    } else {
        resultBox.innerHTML += `<hr><strong>총 합계: ${grandTotal.toLocaleString()}원</strong>`;
    }

    document.getElementById("settle-modal").style.display = "flex";
}


//정산하기 버튼 관련 스크립트

//정산하기 버튼 로직테스트,
function calculateForMenuProcess() {
    const cards = document.querySelectorAll('.table-card');
    let grandTotal = 0;
    let hasData = false;
    const menusToSend = [];
    cards.forEach(card => {
        const checkbox = card.querySelector('.table-check');
        if (checkbox.checked) {
            hasData = true;
            const tableNum = card.dataset.table;
            const total = parseInt(card.dataset.total);
            const items = Array.from(card.querySelectorAll('ul li')).map(li => li.textContent);
            items.forEach(item => {
            //여기 진짜 공부할 내용이 좋다야
                const menuMatch = item.match(/메뉴:\s*([^\n]+)/);
                const menu = menuMatch ? menuMatch[1].trim() : item.trim();
                menusToSend.push({
                    menu,
                    tableNum,
                    total
                });
            });
        }
    });
    if(!document.getElementById("storeName").textContent.trim()){
        alert("가게를 인식할 수 없습니다.\n 다시 로그인 해주세요");
        return;
    }
    const storeName = document.getElementById("storeName").textContent.trim();
    if (!hasData) {
        alert("정산할 테이블이 없습니다.");
    }
    fetch('/calcuDailySales', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
         },
        body: JSON.stringify({ dailySales: menusToSend, storeName })
    })
    .then(response => response.json())
        .then(data => {
            // 서버 응답 처리
            if (data.success) {
                alert('정산이 완료되었습니다.');
                document.querySelectorAll('.table-card input.table-check:checked').forEach(checkbox => {
                    const card = checkbox.closest('.table-card'); // 체크박스가 속한 table-card 찾기
                    if (card) {
                        card.remove(); // table-card를 DOM에서 제거
                    }
                });
                document.getElementById("settle-modal").style.display = "none";
                document.getElementById("DeleteConfirmModal").style.display = "none";
            } else {
                alert('정산에 실패했습니다.');
            }
        })
        .catch(error => {
            console.error('정산 요청 실패:', error);
    });
}






//체크된 메뉴 취소하는 모달창 띄우기
function OpenDeleteConfirmModal(form) {
    console.log(document.querySelectorAll('.table-card input.table-check:checked'));
    if(document.querySelectorAll('.table-card input.table-check:checked').length === 0){
        alert("체크된 메뉴가 없습니다.");
        return;
    }
    else{
    document.getElementById("DeleteConfirmModal").style.display = "block";
    }
}
//위에서 나온 모달창에서 확인 버튼 클릭 시 체그된 메뉴 삭제하는 함수
function removeCheckedMenu() {
/*
    //form데이터에 선택한 메뉴를 담고, 이를 서버에 전송해, 서버 메모리 안에 있는 메뉴를 삭제 요청
    const formData = new FormData();
    const menuItems = document.querySelectorAll('.table-card input.table-check:checked');

    if (menuItems.length > 0) {
        const checkbox = menuItems[0];
        const card = checkbox.closest('.table-card');

        const menu = card.querySelector('h2').textContent.replace('메뉴: ', '').trim();
        const tableNum = card.dataset.table;

        formData.append('menu', menu);
        formData.append('tableNum', tableNum);

        fetch('/DoCancelOrder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ menu, tableNum })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('서버 응답:', data);
                }
            })
            .catch(error => {
                console.error('취소 요청 실패:', error);
            });
    }*/
        const menuItems = document.querySelectorAll('.table-card input.table-check:checked');

        if (menuItems.length > 0) {
            const itemsToDelete = [];

            menuItems.forEach(checkbox => {
                const card = checkbox.closest('.table-card');
                const menu = card.querySelector('h2').textContent.replace('메뉴: ', '').trim();
                const tableNum = card.dataset.table;

                itemsToDelete.push({ menu, tableNum });
            });

            fetch('/DoCancelOrder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: itemsToDelete })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('삭제 성공:', data);
                    }
                })
                .catch(error => {
                    console.error('삭제 요청 실패:', error);
                });
        }
    // 체크된 table-card 요소를 모두 찾음
    document.querySelectorAll('.table-card input.table-check:checked').forEach(checkbox => {
        const card = checkbox.closest('.table-card'); // 체크박스가 속한 table-card 찾기
        if (card) {
            card.remove(); // table-card를 DOM에서 제거
        }
    });
    document.getElementById("DeleteConfirmModal").style.display = "none";
}


//일일매출 확인
function oneTimeCalculateModalOpen() {
    document.getElementById("one-time_calculate").style.display = "block";

    fetch('/getDailySales')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('오늘 매출 데이터:', data.results);

                const container = document.getElementById('sales-results');
                container.innerHTML = '';

                data.results.forEach(row => {
                    const div = document.createElement('div');
                    //요게 일일정산 데이터 보여주는 부분
                    div.innerHTML = `
                        <p>${row.created_at} | ${row.menu_name} | ${row.one_time_calculate}원</p>
                        <hr/>
                    `;
                    container.appendChild(div);
                });
            } else {
                console.warn('서버에서 응답을 받지 못함');
            }
        })
        .catch(error => {
            console.error('매출 데이터 요청 실패:', error);
        });
}


function closeModal() {
    document.getElementById("settle-modal").style.display = "none";
    document.getElementById("DeleteConfirmModal").style.display = "none";
    document.getElementById("one-time_calculate").style.display = "none";
}