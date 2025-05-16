let addForm;
/*메뉴 추가 모달 관련 함수*/
function openAddMenuModal() {
    document.getElementById('menu_add_section').style.display = 'block';
    document.getElementById('menu-add-name').style.display = 'block';
}

function step2AddMenuModal() {
    document.getElementById('menu-add-name').style.display = 'none';
    document.getElementById('menu-add-price').style.display = 'block';
}

function step3AddMenuModal() {
    document.getElementById('menu-add-price').style.display = 'none';
    document.getElementById('menu-add-description').style.display = 'block';
}
function step4AddMenuModal() {
    document.getElementById('menu-add-description').style.display = 'none';
    document.getElementById('menu-add-imgupload').style.display = 'block';
}
function step5AddMenuModal() {
    document.getElementById('menu-add-imgupload').style.display = 'none';

    const confirmImgPreview = document.getElementById('confirm-img-preview');
    const confirmTextPreview = document.getElementById('confirm-textPreview');
    const textInput = document.getElementById('imageText');

    if (imagePreview) {
        confirmImgPreview.src = imagePreview.src;
        confirmImgPreview.style.display = 'block';
    }
    confirmTextPreview.textContent = textInput.value;
    const name = document.getElementById('menu-add-name-textarea').value;
    const price = document.getElementById('menu-add-price-textarea').value;
    const description = document.getElementById('menu-add-description-textarea').value;

    //화면 표시용
    document.getElementById('menu-name-confirm-text').innerText = name;
    document.getElementById('menu-price-confirm-text').innerText = price;
    document.getElementById('menu-description-confirm-text').innerText = description;

    //서버 전송용
    document.getElementById('menu-name-confirm-input').value = name;
    document.getElementById('menu-price-confirm-input').value = price;
    document.getElementById('menu-description-confirm-input').value = description;

    document.getElementById('confirm_menu_add_process').style.display = 'block';
}

function closeAddMenuModal() {
    document.getElementById('menu_add_section').style.display = 'none';
    document.getElementById('menu-add-name').style.display = 'none';
    document.getElementById('menu-add-price').style.display = 'none';
    document.getElementById('menu-add-description').style.display = 'none';
    document.getElementById('menu-add-imgupload').style.display = 'none';
    document.getElementById('confirm_menu_add_process').style.display = 'none';
    document.getElementById('additionalMenu_section').style.display = 'none';
}


/*관리자 페이지에는 일단 모달 생성, 메뉴 주문 스크립트는 일단 삭제, 아차피 수정,삭제가 주목적인데*/
let deleteForm;

/*삭제 확인 모달 관련 함수*/
function openConfirmModal(form) {
    deleteForm = form;
    document.getElementById('confirmModal').style.display = 'block';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

function confirmDelete() {
    deleteForm.submit();
}


//이미지 관련 스크립트
let selectedFile = null;
let imagePreview = null;
function previewImage() {
    const imageInput = document.getElementById('imageInput');
    imagePreview = document.getElementById('imagePreview');
    const textInput = document.getElementById('imageText');
    const textPreview = document.getElementById('textPreview');
    const uploadButton = document.getElementById('uploadButton');

    // 파일이 제대로 들어왔는지 확인
    if (imageInput.files && imageInput.files[0]) {
        selectedFile = imageInput.files[0];

        //파일이름을 텍스트영역에 할당
        textInput.value = selectedFile.name;

        // 이미지 프리뷰 제공 스크립트
        const reader = new FileReader();
        reader.onload = function (e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(selectedFile);

        // 이미지 이름 미리보기
        textPreview.textContent = textInput.value;

        // 업로드 버튼
        uploadButton.style.display = 'inline-block';
    } else {
        alert('Please select an image first!');
    }
}

//업로드 버튼 클릭 시 서버에 이미지,메뉴 텍스트 인포를 서버에 전송 및 저장
function uploadMenu() {
    const formData = new FormData();
    //const fileInput = document.getElementById('menu-img-confirm-input');
    const fileInput = document.getElementById('imageInput');
    const nameInput = document.getElementById('menu-name-confirm-input');
    const priceInput = document.getElementById('menu-price-confirm-input');
    const descInput = document.getElementById('menu-description-confirm-input');

    formData.append('myFile', fileInput.files[0]);
    formData.append('name', nameInput.value);
    formData.append('price', priceInput.value);
    formData.append('description', descInput.value);

    fetch('/addToMenuInfo', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                return response.text();
            }
        })
        .then(data => {
            if (data) console.log('서버 응답:', data);
        })
        .catch(error => {
            console.error('업로드 실패:', error);
        });
}


//추가메뉴 관련 스크립트
//추가메뉴 정보 로드 스크립트
function loadAdditonalMenu(id, name, price, description) {
    let selectedMenu = '';//선택한 메뉴 이름 저장
    let selectedMenuPrice = 0;
    selectedMenu=name;
    selectedMenuPrice = parseInt(price, 10); // 가격을 정수로 변환
    document.getElementById('menu_id').value = id;
    document.getElementById('modal-menu-name').textContent = name;
    document.getElementById('modal-price').textContent = price + '원';
    document.getElementById('modal-description').textContent = description;
    document.getElementById('additionalMenu_section').style.display = 'block';
    // 모달을 열면 그 메뉴에 맞는 옵션들을 가져옴
    fetch(`/getMenuOptions?id=${id}`)
        .then(response => response.json())
        .then(data => {
            console.log('옵션 데이터:', data.options);
            const optionsContainer = document.getElementById('modal-options');
            optionsContainer.innerHTML = ''; // 이전옵션을 초기화
            data.options.forEach(option => {
                const label = document.createElement('label');
                label.innerHTML = `<p class="additionalMenu_section"><input type="hidden" id="option-${option.id}" data-price="${option.additional_price}">${option.name} (${option.additional_price}원)</input>
                    <button class="moding_menu_delete_button">삭제</button><button class="moding_menu_addiMenu_button">수정</button>`;
                optionsContainer.appendChild(label);
            });
        })
        .catch(error => {
            console.error('추가옵션을 가져오는데 실패하였습니다. :', error);
        });
}

function openAdditionalMenuModal(id,menuName,price){
    /*각,additionalMenu_modal을 활성화,
    loadAdditonalMenu()에서 additionalMenu_section 섹션으로 id를 넘겨주고 이를 openAdditionalMenuModal()안에 넣어 targetOfAdditionalMenu_id로 가져온 menu_id,
    MenuName은 additionalMenu_section에서 id=modal-menu-name의 정보를 그대로 넘겨받아 옴
    * */
    document.getElementById('additionalMenu_modal').style.display = 'block';
    document.getElementById('targetOfAdditionalMenu_id').value = id;
    document.getElementById('MenuName').textContent=menuName;
}

function deleteAdditional_menu(){
    const formData = new FormData();
    const menuId = document.getElementById('menu_id').value;
    formData.append('myFile', fileInput.files[0]);
    formData.append('name', nameInput.value);
    formData.append('price', priceInput.value);
    formData.append('description', descInput.value);

    fetch('/addToMenuInfo', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                return response.text();
            }
        })
        .then(data => {
            if (data) console.log('서버 응답:', data);
        })
        .catch(error => {
            console.error('업로드 실패:', error);
        });
}