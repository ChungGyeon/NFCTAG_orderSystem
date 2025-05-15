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
function calculateForMenutest() {
    let grandTotal = 0; // 총 합계 초기화

    // 체크된 박스 찾기
    document.querySelectorAll('.table-card input.table-check:checked').forEach(checkbox => {
        const card = checkbox.closest('.table-card'); // 체크박스가 속한 카드 찾기
        const totalPriceElement = card.querySelector('p:nth-child(3)'); // 총 결제금액 요소 찾기
        if (totalPriceElement) {
            const totalPrice = parseInt(totalPriceElement.textContent.replace(/[^0-9]/g, ''), 10); // 숫자만 추출
            grandTotal += totalPrice; // 총 합계에 추가
        }
    });

    console.log(`총 합계는 ${grandTotal.toLocaleString()}원입니다.`);
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

function oneTimeCalculateModalOpen() {
    document.getElementById("one-time_calculate").style.display = "block";
}
function closeModal() {
    document.getElementById("settle-modal").style.display = "none";
    document.getElementById("DeleteConfirmModal").style.display = "none";
    document.getElementById("one-time_calculate").style.display = "none";
}