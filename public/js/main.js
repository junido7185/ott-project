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

    // 2. 설명 펼치기 및 스와이프 초기화
    setupReadMore();
    initSwipe(); // 스와이프 기능 시작
});

// --- 좋아요/싫어요 처리 함수 ---

// "좋아요" 처리
async function handleLikeClick(videoId) {
    if (!videoId) return console.error("비디오 ID를 찾을 수 없습니다.");

    try {
        await fetch(`/api/users/${MY_USER_ID}/like/${videoId}`, { method: 'POST' });
        loadNextVideo(); // 다음 비디오 로드
    } catch (err) {
        console.error("좋아요 처리 에러:", err);
    }
}

// "싫어요" 처리
async function handlePassClick(videoId) {
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
        // [추가] URL에서 OTT 파라미터 가져오기
        const urlParams = new URLSearchParams(window.location.search);
        const selectedOtt = urlParams.get('ott');
        
        // [수정] API 호출 시 OTT 파라미터 포함
        const apiUrl = selectedOtt 
            ? `/api/videos/next?ott=${selectedOtt}` 
            : `/api/videos/next`;
            
        const response = await fetch(apiUrl);
        const data = await response.json();
        const cardContainer = document.querySelector(".card-container");

        // 비디오가 없을 때 (메시지 처리)
        if (!response.ok || data.message) {
            cardContainer.innerHTML = `<h2>${data.message || "더 이상 볼 비디오가 없습니다."}</h2>`;
            return;
        }

        // [UI 갱신] 카드 정보 교체
        const card = cardContainer.querySelector('.video-card');
        if (card) {
            // 1. 카드 위치 및 스타일 초기화
            card.classList.remove('moving'); 
            card.style.transition = 'none';
            card.style.transform = 'translateX(-50%)'; /* [수정] Y축 제거 */
            card.style.boxShadow = "0 10px 20px rgba(0, 0, 0, 0.4)";
            card.style.opacity = "1";
            
            // [추가] 스크롤을 맨 위로 리셋
            card.scrollTop = 0;

            // 2. 데이터 교체
            card.querySelector(".card-image img").src = data.posterImageUrl;
            card.querySelector(".card-info h2").innerText = data.title;
            card.querySelector(".ott-tag").innerText = data.ottPlatform;

            // [추가] 평점 텍스트 교체
            const ratingEl = card.querySelector(".rating-tag");
            if (ratingEl) {
                // 데이터가 있으면 소수점 1자리, 없으면 0.0
                const score = data.rating ? data.rating.toFixed(1) : '0.0';
                ratingEl.innerText = `★ ${score}`;
            }


            const descElement = card.querySelector(".description");
            descElement.innerText = data.description;
            descElement.classList.remove('expanded', 'truncated');

            // 3. 카드에 비디오 ID 저장 (data-id 속성)
            card.dataset.videoId = data._id;

            setupReadMore();

            // 4. 약간의 딜레이 후 애니메이션 기능 다시 켜기
            setTimeout(() => {
                card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            }, 50);
        }
    } catch (err) {
        console.error("다음 비디오 로드 실패:", err);
    }
}

// --- 설명 펼치기/접기 로직 ---
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
        
        const newBtn = btnElement.cloneNode(true);
        btnElement.parentNode.replaceChild(newBtn, btnElement);
        
        newBtn.addEventListener('click', () => toggleReadMore(descElement, newBtn));
    }
}

// --- [핵심] 스와이프 로직 (낮은 threshold + 자동 처리) ---
function initSwipe() {
    const card = document.querySelector('.video-card');
    if (!card) return;

    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let autoTriggerTimeout = null; // 자동 처리 타이머

    // [추가] 이미지 확대/우클릭 완전 차단
    const cardImage = card.querySelector('.card-image img');
    if (cardImage) {
        cardImage.addEventListener('contextmenu', (e) => e.preventDefault()); // 우클릭 방지
        cardImage.addEventListener('dragstart', (e) => e.preventDefault()); // 드래그 시작 방지
        cardImage.addEventListener('click', (e) => e.preventDefault()); // 클릭 방지
    }

    const startDrag = (e) => {
        // [추가] 이미지 직접 클릭 시 무시
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
        }
        
        // [추가] 스크롤 위치 고정
        e.preventDefault(); // 기본 동작 방지
        
        isDragging = true;
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        card.classList.add('moving'); // CSS transition 끄기
        
        // 기존 타이머 제거
        if (autoTriggerTimeout) {
            clearTimeout(autoTriggerTimeout);
            autoTriggerTimeout = null;
        }
    };

    const moveDrag = (e) => {
        if (!isDragging) return;
        
        const x = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        currentX = x - startX;

        // 직선 이동만
        card.style.transform = `translateX(calc(-50% + ${currentX}px))`;
        
        // [수정] 150px만 이동해도 동작 (화면 크기 무관)
        const threshold = 150; // 픽셀 단위로 고정

        // 색상 힌트
        if (currentX > threshold) {
            card.style.boxShadow = "0 0 30px #4ccc93"; // 초록 (좋아요)
            
            // [추가] 0.5초 유지하면 자동으로 좋아요 처리
            if (!autoTriggerTimeout) {
                autoTriggerTimeout = setTimeout(() => {
                    triggerLike();
                }, 500); // 0.5초
            }
            
        } else if (currentX < -threshold) {
            card.style.boxShadow = "0 0 30px #ff5864"; // 빨강 (싫어요)
            
            // [추가] 0.5초 유지하면 자동으로 싫어요 처리
            if (!autoTriggerTimeout) {
                autoTriggerTimeout = setTimeout(() => {
                    triggerPass();
                }, 500);
            }
            
        } else {
            card.style.boxShadow = "0 10px 20px rgba(0,0,0,0.4)"; // 기본
            
            // threshold 미만이면 타이머 취소
            if (autoTriggerTimeout) {
                clearTimeout(autoTriggerTimeout);
                autoTriggerTimeout = null;
            }
        }
    };

    const triggerLike = () => {
        if (!isDragging) return;
        
        const videoId = card.dataset.videoId;
        isDragging = false;
        card.classList.remove('moving');
        
        // 애니메이션
        card.style.transform = `translateX(calc(-50% + 1000px))`;
        card.style.opacity = "0";
        
        setTimeout(() => handleLikeClick(videoId), 300);
        
        startX = 0;
        currentX = 0;
    };

    const triggerPass = () => {
        if (!isDragging) return;
        
        const videoId = card.dataset.videoId;
        isDragging = false;
        card.classList.remove('moving');
        
        // 애니메이션
        card.style.transform = `translateX(calc(-50% - 1000px))`;
        card.style.opacity = "0";
        
        setTimeout(() => handlePassClick(videoId), 300);
        
        startX = 0;
        currentX = 0;
    };

    const endDrag = async () => {
        if (!isDragging) return;
        
        // 타이머 취소
        if (autoTriggerTimeout) {
            clearTimeout(autoTriggerTimeout);
            autoTriggerTimeout = null;
        }
        
        isDragging = false;
        card.classList.remove('moving');

        const threshold = 150; // 150px 기준
        const videoId = card.dataset.videoId;

        if (currentX > threshold) {
            // 오른쪽 -> 좋아요
            card.style.transform = `translateX(calc(-50% + 1000px))`;
            card.style.opacity = "0";
            
            setTimeout(() => handleLikeClick(videoId), 300); 
            
        } else if (currentX < -threshold) {
            // 왼쪽 -> 싫어요
            card.style.transform = `translateX(calc(-50% - 1000px))`;
            card.style.opacity = "0";
            
            setTimeout(() => handlePassClick(videoId), 300);

        } else {
            // 제자리 복귀
            card.style.transform = `translateX(-50%)`;
            card.style.boxShadow = "0 10px 20px rgba(0,0,0,0.4)";
        }
        
        startX = 0;
        currentX = 0;
    };

    // 이벤트 등록
    card.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', endDrag);

    card.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', moveDrag);
    document.addEventListener('touchend', endDrag);
}