function selectOp(id) {
    setTimeout(() => {
        window.location.href = `Select_menuop/espreeso_op.html?id=${id}`;
    }, 300);
}
function openModal() {
    const resultBox = document.getElementById("settle-result");
    resultBox.innerHTML = ''; // 초기화

    const cards = document.querySelectorAll('.table-card');
    let grandTotal = 0;
    let hasData = false;

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

function closeModal() {
    document.getElementById("settle-modal").style.display = "none";
}