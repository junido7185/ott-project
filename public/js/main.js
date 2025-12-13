// public/js/main.js
let MY_USER_ID;
let selectedRating = 0;

document.addEventListener("DOMContentLoaded", () => {
    MY_USER_ID = document.body.dataset.userId;
    
    if (!MY_USER_ID) {
        window.location.href = "/login";
        return;
    }

    setupReadMore();
    setupStarRating();
    setupReviewSubmit();
    loadReviews();
    initSwipe();
});

// 별점 선택 기능
function setupStarRating() {
    const stars = document.querySelectorAll('.star');
    const selectedRatingText = document.querySelector('.selected-rating');
    
    if (!stars.length) return;
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            
            stars.forEach(s => s.classList.remove('active'));
            
            stars.forEach(s => {
                if (parseInt(s.dataset.rating) <= selectedRating) {
                    s.classList.add('active');
                    s.textContent = '★';
                } else {
                    s.textContent = '☆';
                }
            });
            
            selectedRatingText.textContent = `${selectedRating}점 선택됨`;
        });
    });
}

// 한줄평 등록
function setupReviewSubmit() {
    const submitBtn = document.querySelector('.submit-review-btn');
    const reviewInput = document.querySelector('.review-input');
    const videoCard = document.querySelector('.video-card');
    
    if (!submitBtn || !reviewInput || !videoCard) return;
    
    const videoId = videoCard.dataset.videoId;
    
    submitBtn.addEventListener('click', async () => {
        const comment = reviewInput.value.trim();
        
        if (selectedRating === 0) {
            alert('평점을 선택해주세요.');
            return;
        }
        
        if (!comment) {
            alert('한줄평을 작성해주세요.');
            return;
        }
        
        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId,
                    rating: selectedRating,
                    comment
                })
            });
            
            if (response.ok) {
                alert('한줄평이 등록되었습니다!');
                reviewInput.value = '';
                selectedRating = 0;
                
                document.querySelectorAll('.star').forEach(s => {
                    s.textContent = '☆';
                    s.classList.remove('active');
                });
                document.querySelector('.selected-rating').textContent = '평점을 선택하세요';
                
                loadReviews();
            } else {
                alert('한줄평 등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('한줄평 등록 실패:', error);
            alert('오류가 발생했습니다.');
        }
    });
}

// 다른 사람들의 한줄평 불러오기
async function loadReviews() {
    const videoCard = document.querySelector('.video-card');
    if (!videoCard) return;
    
    const videoId = videoCard.dataset.videoId;
    if (!videoId) return;
    
    try {
        const response = await fetch(`/api/reviews/${videoId}`);
        const reviews = await response.json();
        
        const container = document.querySelector('.reviews-container');
        if (!container) return;
        
        if (reviews.length === 0) {
            container.innerHTML = '<p style="color: #888;">아직 한줄평이 없습니다.</p>';
            return;
        }
        
        container.innerHTML = reviews.map(review => `
            <div class="review-item-card">
                <div class="review-author">${review.username}</div>
                <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
                <div class="review-comment">${review.comment}</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('리뷰 불러오기 실패:', error);
    }
}

// 좋아요 처리
async function handleLikeClick(videoId) {
    if (!videoId) return console.error("비디오 ID를 찾을 수 없습니다.");

    try {
        await fetch(`/api/users/${MY_USER_ID}/like/${videoId}`, { method: 'POST' });
        loadNextVideo();
    } catch (err) {
        console.error("좋아요 처리 에러:", err);
    }
}

// 싫어요 처리
async function handlePassClick(videoId) {
    if (!videoId) return console.error("비디오 ID를 찾을 수 없습니다.");

    try {
        await fetch(`/api/users/${MY_USER_ID}/pass/${videoId}`, { method: 'POST' });
        loadNextVideo();
    } catch (err) {
        console.error("싫어요 처리 에러:", err);
    }
}

// 다음 비디오 로드
async function loadNextVideo() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const selectedOtt = urlParams.get('ott');
        const selectedGenre = urlParams.get('genre');
        
        const apiUrl = selectedOtt 
            ? `/api/videos/next?ott=${selectedOtt}` 
            : `/api/videos/next`;
            
        const response = await fetch(apiUrl);
        const data = await response.json();
        const cardContainer = document.querySelector(".card-container");

        if (!response.ok || data.message) {
            cardContainer.innerHTML = `<h2>${data.message || "더 이상 볼 비디오가 없습니다."}</h2>`;
            return;
        }

        const card = cardContainer.querySelector('.video-card');
        if (card) {
            card.classList.remove('moving'); 
            card.style.transition = 'none';
            card.style.transform = 'translateX(-50%)';
            card.style.boxShadow = "0 10px 20px rgba(0, 0, 0, 0.4)";
            card.style.opacity = "1";
            card.scrollTop = 0;

            card.querySelector(".card-image img").src = data.posterImageUrl;
            card.querySelector(".card-info h2").innerText = data.title;
            
            const ottTag = card.querySelector(".ott-tag");
            // 1. 텍스트 뒤에 화살표 추가 (링크라는 힌트)
            ottTag.innerText = `${data.ottPlatform} ↗`; 
            
            // 2. 마우스 커서를 손가락 모양으로 변경
            ottTag.style.cursor = "pointer";
            
            // 3. 클릭 이벤트 연결
            ottTag.onclick = (e) => {
                // 중요: 카드를 잡고 드래그하는 스와이프 동작이 발생하지 않도록 막음
                e.stopPropagation(); 
                
                // 새 탭에서 검색 결과 열기
                const link = getOttLink(data.ottPlatform, data.title);
                if (link !== '#') {
                    window.open(link, '_blank');
                } else {
                    alert("지원하지 않는 플랫폼입니다.");
                }
            };

            const ratingEl = card.querySelector(".rating-tag");
            if (ratingEl) {
                const score = data.rating ? data.rating.toFixed(1) : '0.0';
                ratingEl.innerText = `★ ${score}`;
            }

            const ourRatingEl = card.querySelector(".our-rating-tag");
            if (ourRatingEl) {
                const ourScore = data.ourRating ? data.ourRating.toFixed(1) : '0.0';
                const reviewCount = data.reviewCount || 0;
                ourRatingEl.innerText = `Our Rating: ★ ${ourScore} (${reviewCount}개)`;
            }

            const descElement = card.querySelector(".description");
            descElement.innerText = data.description;
            descElement.classList.remove('expanded', 'truncated');

            card.dataset.videoId = data._id;

            selectedRating = 0;
            card.querySelectorAll('.star').forEach(s => {
                s.textContent = '☆';
                s.classList.remove('active');
            });
            card.querySelector('.selected-rating').textContent = '평점을 선택하세요';
            card.querySelector('.review-input').value = '';

            setupReadMore();
            setupStarRating();
            setupReviewSubmit();
            loadReviews();

            setTimeout(() => {
                card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            }, 50);
        }
    } catch (err) {
        console.error("다음 비디오 로드 실패:", err);
    }
}

// 설명 펼치기/접기
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

// 스와이프 기능 (드래그 모습 숨김)
function initSwipe() {
    const card = document.querySelector('.video-card');
    if (!card) return;

    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let autoTriggerTimeout = null;

    const cardImage = card.querySelector('.card-image img');
    if (cardImage) {
        cardImage.addEventListener('contextmenu', (e) => e.preventDefault());
        cardImage.addEventListener('dragstart', (e) => e.preventDefault());
        cardImage.addEventListener('click', (e) => e.preventDefault());
    }

    const startDrag = (e) => {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
        }
        
        e.preventDefault();
        
        isDragging = true;
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        card.classList.add('moving');
        
        if (autoTriggerTimeout) {
            clearTimeout(autoTriggerTimeout);
            autoTriggerTimeout = null;
        }
    };

    const moveDrag = (e) => {
        if (!isDragging) return;
        
        const x = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        currentX = x - startX;
        
        const threshold = 150;

        if (currentX > threshold) {
            card.style.boxShadow = "0 0 30px #4ccc93";
            
            if (!autoTriggerTimeout) {
                autoTriggerTimeout = setTimeout(() => {
                    triggerLike();
                }, 500);
            }
            
        } else if (currentX < -threshold) {
            card.style.boxShadow = "0 0 30px #ff5864";
            
            if (!autoTriggerTimeout) {
                autoTriggerTimeout = setTimeout(() => {
                    triggerPass();
                }, 500);
            }
            
        } else {
            card.style.boxShadow = "0 10px 20px rgba(0,0,0,0.4)";
            
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
        
        card.style.transform = `translateX(calc(-50% - 1000px))`;
        card.style.opacity = "0";
        
        setTimeout(() => handlePassClick(videoId), 300);
        
        startX = 0;
        currentX = 0;
    };

    const endDrag = async () => {
        if (!isDragging) return;
        
        if (autoTriggerTimeout) {
            clearTimeout(autoTriggerTimeout);
            autoTriggerTimeout = null;
        }
        
        isDragging = false;
        card.classList.remove('moving');

        const threshold = 150;
        const videoId = card.dataset.videoId;

        if (currentX > threshold) {
            card.style.transform = `translateX(calc(-50% + 1000px))`;
            card.style.opacity = "0";
            setTimeout(() => handleLikeClick(videoId), 300); 
            
        } else if (currentX < -threshold) {
            card.style.transform = `translateX(calc(-50% - 1000px))`;
            card.style.opacity = "0";
            setTimeout(() => handlePassClick(videoId), 300);

        } else {
            card.style.transform = `translateX(-50%)`;
            card.style.boxShadow = "0 10px 20px rgba(0,0,0,0.4)";
        }
        
        startX = 0;
        currentX = 0;
    };

    card.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', endDrag);

    card.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', moveDrag);
    document.addEventListener('touchend', endDrag);
}

// OTT 바로가기 링크 생성 함수
function getOttLink(platform, title) {
    const query = encodeURIComponent(title);
    switch (platform.toLowerCase()) {
        case 'netflix': return `https://www.netflix.com/search?q=${query}`;
        case 'watcha': return `https://watcha.com/search?query=${query}`;
        case 'tving': return `https://www.tving.com/search/total?keyword=${query}`;
        case 'wavve': return `https://www.wavve.com/search/search?searchWord=${query}`;
        default: return '#';
    }
}