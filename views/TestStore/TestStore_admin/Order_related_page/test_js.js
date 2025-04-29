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

//정산하기 버튼 로직테스트
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



function closeModal() {
    document.getElementById("settle-modal").style.display = "none";
}