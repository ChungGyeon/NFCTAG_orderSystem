let selectedMenu = '';//선택한 메뉴 이름 저장
let selectedMenuPrice = 0;
function openModal(id, name, price, description) {
    document.getElementById('myModal').style.display = 'block';
    selectedMenu=name;
    selectedMenuPrice = parseInt(price, 10); // 가격을 정수로 변환
    document.getElementById('modal-menu-name').textContent = name;
    document.getElementById('modal-price').textContent = price + '원';
    document.getElementById('modal-description').textContent = description;
    document.getElementById('myModal').style.display = 'block';

    // 모달을 열면 그 메뉴에 맞는 옵션들을 가져옴
    fetch(`/getMenuOptions?id=${id}`)
        .then(response => response.json())
        .then(data => {
            console.log('옵션 데이터:', data.options);
            const optionsContainer = document.getElementById('modal-options');
            optionsContainer.innerHTML = ''; // 이전옵션을 초기화
            data.options.forEach(option => {
                const label = document.createElement('label');
                label.innerHTML = `<p class="modal-selection"><input type="checkbox" id="option-${option.id}" data-price="${option.additional_price}">${option.name} (${option.additional_price}원)</p>`;
                optionsContainer.appendChild(label);
            });
        })
        .catch(error => {
            console.error('추가옵션을 가져오는데 실패하였습니다. :', error);
        });
}

//모달 외부 클릭 시 모달이 닫힘, 이벤트 참 봐도봐도 모르겠단 말이지, 고마워 gpt야~
myModal.addEventListener('click', function(event) {
    if (event.target==this){
        closeModal();
    }
});
function closeModal() {
    document.getElementById('myModal').style.display = 'none';
}

function DoSendOrder(name) {
    const tableNum= window.tableNum; //테이블 번호를 받아옴
    const storeID = window.storeID; //가게 아이디를 받아옴
    const selectedOptions = [];
    let totalPrice = selectedMenuPrice;
    document.querySelectorAll('#modal-options input[type="checkbox"]:checked').forEach(checkbox => {
        const optionId = checkbox.id.replace('option-', ''); // ID 추출
        let opTionname = checkbox.parentElement.textContent.trim(); // 이름 추출
        const optionName = opTionname.split('(')[0].trim(); // 괄호 앞 부분만 추출
        const optionPrice = parseInt(checkbox.getAttribute('data-price'), 10); // 가격 추출
        totalPrice += optionPrice; // 가격 합산
        selectedOptions.push({ id: optionId, name: optionName, price: optionPrice });

    });//아래 개발 다하면 DosendOrder 로 변경
    fetch('/DoSendOrder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json' //HTTP의 요청이 JSON형식임을 알리는 헤더
        },

        body: JSON.stringify({ menu: selectedMenu, options: selectedOptions, totalPrice: totalPrice, tableNum: tableNum, storeID: storeID})
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('주문이 완료되었습니다. \n총 가격 : ' + totalPrice + '원');
                closeModal();
            } else {
                alert('죄송해요! 주문하신 내용을 전달하던 중 사고가 났습니다 ㅠㅠ \n 다시 주문하면 실패하지 않을게요!');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('주문에 실패했습니다.');
        });
}