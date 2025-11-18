// "testUser"의 ID (로그인 시 body 태그에서 가져옴)
let MY_USER_ID;

// HTML 문서가 모두 로드되면 실행
document.addEventListener("DOMContentLoaded", () => {
    // 1. 유저 ID 설정
    MY_USER_ID = document.body.dataset.userId;
    
    // 로그인 안 되어 있으면 로그인 페이지로
    if (!MY_USER_ID) {
        window.location.href = "/login";
        return;
    }

    // 2. 버튼 이벤트 리스너
    const likeBtn = document.getElementById("like-btn");
    const passBtn = document.getElementById("pass-btn");
    
    // [수정] 함수 이름만 등록 (괄호 없음)
    if (likeBtn) likeBtn.addEventListener("click", () => handleLikeClick());
    if (passBtn) passBtn.addEventListener("click", () => handlePassClick());

    // 3. 설명 펼치기 및 스와이프 초기화
    setupReadMore();
    initSwipe(); // 스와이프 기능 시작
});

// --- [수정됨] 좋아요/싫어요 처리 함수 (공통 로직) ---

// "좋아요" 처리
async function handleLikeClick() {
    // [핵심 수정] 'this' 대신 HTML 요소에서 직접 ID를 가져옵니다.
    // 스와이프에서도 이 함수를 쓰기 때문에 this를 쓰면 안 됩니다.
    const btn = document.getElementById("like-btn");
    const videoId = btn ? btn.dataset.id : null;
    
    if (!videoId) return console.error("비디오 ID를 찾을 수 없습니다.");

    try {
        await fetch(`/api/users/${MY_USER_ID}/like/${videoId}`, { method: 'POST' });
        loadNextVideo(); // 다음 비디오 로드
    } catch (err) {
        console.error("좋아요 처리 에러:", err);
    }
}

// "싫어요" 처리
async function handlePassClick() {
    // [핵심 수정] HTML 요소에서 직접 ID 가져오기
    const btn = document.getElementById("pass-btn");
    const videoId = btn ? btn.dataset.id : null;

    if (!videoId) return console.error("비디오 ID를 찾을 수 없습니다.");

    try {
        await fetch(`/api/users/${MY_USER_ID}/pass/${videoId}`, { method: 'POST' });
        loadNextVideo(); // 다음 비디오 로드
    } catch (err) {
        console.error("싫어요 처리 에러:", err);
    }
}

// --- 다음 비디오 로드 및 화면 갱신 ---
async function loadNextVideo() {
    try {
        const response = await fetch("/api/videos/next");
        const data = await response.json();
        const cardContainer = document.querySelector(".card-container");

        // 비디오가 없을 때 (메시지 처리)
        if (!response.ok || data.message) {
            cardContainer.innerHTML = `<h2>${data.message || "더 이상 볼 비디오가 없습니다."}</h2>`;
            document.querySelector(".action-buttons").style.display = 'none';
            return;
        }

        // [UI 갱신] 카드 정보 교체
        const card = cardContainer.querySelector('.video-card');
        if (card) {
            // 1. 카드 위치 및 스타일 초기화 (애니메이션 제거 후 복귀)
            card.classList.remove('moving'); 
            card.style.transition = 'none'; // 이동 애니메이션 끄기
            card.style.transform = 'translateX(-50%) rotate(0deg)'; // 중앙 정렬 (CSS와 동일하게)
            card.style.boxShadow = "0 10px 20px rgba(0, 0, 0, 0.4)"; // 그림자 초기화 (색상 제거)

            // 2. 데이터 교체
            card.querySelector(".card-image img").src = data.posterImageUrl;
            card.querySelector(".card-info h2").innerText = data.title;
            card.querySelector(".ott-tag").innerText = data.ottPlatform;
            card.querySelector(".genre-tag").innerText = data.genre;
            
            const descElement = card.querySelector(".description");
            descElement.innerText = data.description;
            descElement.classList.remove('expanded', 'truncated');

            // 3. 버튼 데이터 ID 갱신
            document.getElementById("pass-btn").dataset.id = data._id;
            document.getElementById("like-btn").dataset.id = data._id;

            setupReadMore();

            // 4. 약간의 딜레이 후 애니메이션 기능 다시 켜기 (부드러운 UI)
            setTimeout(() => {
                card.style.transition = 'transform 0.3s ease';
            }, 50);
        }
    } catch (err) {
        console.error("다음 비디오 로드 실패:", err);
    }
}

// --- 설명 펼치기/접기 로직 (기존 유지) ---
function toggleReadMore(descElement, btnElement) {
    if (descElement.classList.contains('expanded')) {
        descElement.classList.remove('expanded');
        btnElement.innerText = '...더 보기';
    } else {
        descElement.classList.add('expanded');
        btnElement.innerText = '접기';
    }
}

function setupReadMore() {
    const descElement = document.querySelector(".description");
    const btnElement = document.querySelector(".read-more");

    if (descElement && btnElement) {
        if (descElement.scrollHeight > descElement.clientHeight) {
            descElement.classList.add('truncated');
            btnElement.style.display = 'block';
        } else {
            btnElement.style.display = 'none';
        }
        // 기존 리스너 제거를 위해 cloneNode 사용 (선택사항)
        const newBtn = btnElement.cloneNode(true);
        btnElement.parentNode.replaceChild(newBtn, btnElement);
        
        newBtn.addEventListener('click', () => toggleReadMore(descElement, newBtn));
    }
}

// --- [수정됨] 스와이프 로직 (위치 계산 및 트리거 수정) ---
function initSwipe() {
    const card = document.querySelector('.video-card');
    if (!card) return;

    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    const startDrag = (e) => {
        isDragging = true;
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        card.classList.add('moving'); // CSS transition 끄기 (반응속도 UP)
    };

    const moveDrag = (e) => {
        if (!isDragging) return;
        
        const x = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        currentX = x - startX;

        // 회전 각도 및 이동 (CSS의 left: 50%를 고려하여 calc 계산)
        const rotate = currentX * 0.05; 
        card.style.transform = `translateX(calc(-50% + ${currentX}px)) rotate(${rotate}deg)`;
        
        // 색상 힌트
        if (currentX > 50) card.style.boxShadow = "0 0 20px #4ccc93"; // 초록
        else if (currentX < -50) card.style.boxShadow = "0 0 20px #ff5864"; // 빨강
        else card.style.boxShadow = "0 10px 20px rgba(0,0,0,0.4)";
    };

    const endDrag = async () => {
        if (!isDragging) return;
        isDragging = false;
        card.classList.remove('moving'); // transition 복구

        const threshold = 100; // 100px 이상 움직여야 동작

        if (currentX > threshold) {
            // [오른쪽] -> 좋아요
            card.style.transform = `translateX(calc(-50% + 1000px)) rotate(30deg)`; // 화면 밖으로 날리기
            
            // 애니메이션이 보이는 시간(0.3초) 만큼 기다렸다가 데이터 갱신
            setTimeout(() => handleLikeClick(), 300); 
            
        } else if (currentX < -threshold) {
            // [왼쪽] -> 싫어요
            card.style.transform = `translateX(calc(-50% - 1000px)) rotate(-30deg)`; // 화면 밖으로 날리기
            
            setTimeout(() => handlePassClick(), 300);

        } else {
            // [제자리 복귀]
            card.style.transform = `translateX(-50%) rotate(0deg)`;
            card.style.boxShadow = "0 10px 20px rgba(0,0,0,0.4)";
        }
        
        startX = 0;
        currentX = 0;
    };

    // 이벤트 등록
    card.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', endDrag);
    // 마우스가 카드 밖으로 나갔을 때도 드래그 종료 처리
    document.addEventListener('mouseleave', () => {
        if(isDragging) endDrag();
    });

    card.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', moveDrag);
    document.addEventListener('touchend', endDrag);
}