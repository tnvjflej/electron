'use strict';

/* ===== 설정 ===== */
const CFG = {
    WALK_SPEED_MPM: 50,   // 3 km/h ÷ 60 = 50 m/min (반려견 산책 속도)
    SEARCH_KEYWORD: '애견카페',
    FALLBACK_CATEGORY: 'CE7',  // 카카오 카페 카테고리
    DEFAULT_LAT: 37.5665,
    DEFAULT_LNG: 126.9780,
};

/* ===== 데모 반려견 동반 조건 풀
   실제 서비스에서는 자체 DB(Firestore 등)에서 place_id로 조회합니다.
===== */
const DOG_POOL = [
    { indoor: true,  maxKg: null, kennel: false, lead: true,  tags: ['indoor'] },
    { indoor: false, maxKg: 10,   kennel: false, lead: true,  tags: ['terrace', 'small'] },
    { indoor: true,  maxKg: 7,    kennel: true,  lead: true,  tags: ['indoor', 'small'] },
    { indoor: false, maxKg: null, kennel: false, lead: false, tags: ['terrace', 'large'] },
    { indoor: true,  maxKg: 15,   kennel: false, lead: true,  tags: ['indoor', 'small', 'large'] },
];

/* ===== 앱 상태 ===== */
const S = {
    map: null,
    ps: null,               // Places 서비스
    userLoc: null,          // { lat, lng }
    userOverlay: null,
    circle: null,
    overlays: [],           // 마커 역할 CustomOverlay 배열
    cafes: [],              // 검색 결과 + 동반 조건 병합
    activeFilter: 'all',
    walkMin: 15,
    sheetSnap: 'default',   // default | half | expanded
    stamps: JSON.parse(localStorage.getItem('ddg_stamps') || '[]'),
    pet:    JSON.parse(localStorage.getItem('ddg_pet')    || '{"name":"우리 댕댕이","size":"small","breed":"믹스견"}'),
};

/* ===== DOM 캐시 ===== */
const $ = id => document.getElementById(id);
const EL = {};

/* ===== 초기화 ===== */
document.addEventListener('DOMContentLoaded', () => {
    EL.setupModal  = $('setupModal');
    EL.kakaoInput  = $('kakaoKeyInput');
    EL.startBtn    = $('startBtn');
    EL.radiusSlider= $('radiusSlider');
    EL.radiusDisp  = $('radiusDisplay');
    EL.sheet       = $('sheet');
    EL.sheetTitle  = $('sheetTitle');
    EL.sheetBadge  = $('sheetBadge');
    EL.sheetBody   = $('sheetBody');
    EL.toast       = $('toast');

    wireEvents();

    const savedKey = localStorage.getItem('ddg_kakao_key');
    if (savedKey) {
        EL.setupModal.classList.add('hidden');
        boot(savedKey);
    }
});

function wireEvents() {
    // 모달 시작
    EL.startBtn.addEventListener('click', () => {
        const key = EL.kakaoInput.value.trim();
        if (!key) { toast('API 키를 입력해주세요.'); return; }
        localStorage.setItem('ddg_kakao_key', key);
        EL.setupModal.classList.add('hidden');
        boot(key);
    });
    EL.kakaoInput.addEventListener('keydown', e => { if (e.key === 'Enter') EL.startBtn.click(); });

    // 헤더 버튼
    $('stampBtn').addEventListener('click', openStampPanel);
    $('petBtn').addEventListener('click', openPetPanel);

    // 필터 칩
    $('filterBar').addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        S.activeFilter = chip.dataset.filter;
        renderList();
    });

    // 슬라이더
    EL.radiusSlider.addEventListener('input', e => {
        S.walkMin = +e.target.value;
        EL.radiusDisp.textContent = `${S.walkMin}분`;
        if (S.userLoc) { updateCircle(); debouncedSearch(); }
    });

    // 내 위치 버튼
    $('locateBtn').addEventListener('click', locateUser);

    // 바텀 시트 드래그
    setupSheetDrag();

    // 패널 닫기
    $('detailBackBtn').addEventListener('click', () => closePanel('detailPanel'));
    $('stampCloseBtn').addEventListener('click', () => closePanel('stampPanel'));
    $('petCloseBtn').addEventListener('click', () => closePanel('petPanel'));

    // 지도 클릭 → 시트 최소화
    // (지도가 로드된 후 kakao 이벤트로 등록)
}

/* ===== 카카오 SDK 동적 로드 ===== */
async function boot(apiKey) {
    try {
        await loadKakaoSDK(apiKey);
        initMap();
        await locateUser();
    } catch (err) {
        console.error(err);
        toast('⚠️ 지도 로드 실패: ' + err.message);
        localStorage.removeItem('ddg_kakao_key');
        EL.setupModal.classList.remove('hidden');
    }
}

function loadKakaoSDK(key) {
    return new Promise((resolve, reject) => {
        const prev = document.querySelector('script[src*="dapi.kakao.com"]');
        if (prev) prev.remove();

        const s = document.createElement('script');
        s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
        s.addEventListener('load',  () => kakao.maps.load(resolve));
        s.addEventListener('error', () => reject(new Error('API 키가 유효하지 않거나 도메인 설정이 필요합니다.')));
        document.head.appendChild(s);
    });
}

/* ===== 지도 초기화 ===== */
function initMap() {
    S.map = new kakao.maps.Map($('map'), {
        center: new kakao.maps.LatLng(CFG.DEFAULT_LAT, CFG.DEFAULT_LNG),
        level: 4,
    });
    S.ps = new kakao.maps.services.Places();

    kakao.maps.event.addListener(S.map, 'click', () => snapSheet('default'));
}

/* ===== GPS 위치 ===== */
function locateUser() {
    setTitle('📍 위치 확인 중...');
    EL.sheetBadge.textContent = '';

    if (!navigator.geolocation) {
        setTitle('⚠️ 위치 서비스를 지원하지 않는 브라우저입니다');
        return Promise.resolve();
    }

    return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude: lat, longitude: lng } = pos.coords;
                S.userLoc = { lat, lng };
                const ll = new kakao.maps.LatLng(lat, lng);
                S.map.setCenter(ll);
                S.map.setLevel(4);
                drawUserDot(ll);
                updateCircle();
                searchCafes();
                resolve();
            },
            err => {
                const msgs = { 1: '위치 권한을 허용해주세요.', 2: '위치를 찾을 수 없습니다.' };
                const msg = msgs[err.code] || '위치 오류가 발생했습니다.';
                setTitle('⚠️ ' + msg);
                toast(msg);
                resolve();
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
        );
    });
}

function drawUserDot(latlng) {
    if (S.userOverlay) S.userOverlay.setMap(null);
    S.userOverlay = new kakao.maps.CustomOverlay({
        map: S.map, position: latlng,
        content: '<div style="width:18px;height:18px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 2px 8px rgba(66,133,244,.55);"></div>',
        yAnchor: 0.5, xAnchor: 0.5, zIndex: 10,
    });
}

function updateCircle() {
    if (S.circle) S.circle.setMap(null);
    const radius = S.walkMin * CFG.WALK_SPEED_MPM;
    S.circle = new kakao.maps.Circle({
        center: new kakao.maps.LatLng(S.userLoc.lat, S.userLoc.lng),
        radius,
        strokeWeight: 2, strokeColor: '#A0785A',
        strokeOpacity: 0.55, strokeStyle: 'dashed',
        fillColor: '#A0785A', fillOpacity: 0.06,
    });
    S.circle.setMap(S.map);
}

/* ===== 카페 검색 ===== */
let _searchTimer = null;
function debouncedSearch() {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(searchCafes, 400);
}

function searchCafes() {
    if (!S.userLoc) return;

    const radius = S.walkMin * CFG.WALK_SPEED_MPM;
    const ll     = new kakao.maps.LatLng(S.userLoc.lat, S.userLoc.lng);
    const opts   = { location: ll, radius, sort: kakao.maps.services.SortBy.DISTANCE };

    setTitle('🔍 애견카페 검색 중...');
    setBody('<div class="loading"><div class="spinner"></div><p>주변 애견카페 탐색 중...</p></div>');

    // 1차: '애견카페' 키워드 검색
    S.ps.keywordSearch(CFG.SEARCH_KEYWORD, (res, st) => {
        if (st === kakao.maps.services.Status.OK && res.length > 0) {
            processCafes(res);
        } else {
            // 2차: 카페 카테고리 전체 (일반 카페 포함 데모)
            S.ps.categorySearch(CFG.FALLBACK_CATEGORY, (res2, st2) => {
                if (st2 === kakao.maps.services.Status.OK) processCafes(res2);
                else showEmpty('검색 결과가 없어요', '도보 반경을 늘려보거나<br>잠시 후 다시 시도해주세요.');
            }, opts);
        }
    }, opts);
}

function processCafes(places) {
    // 기존 마커 제거
    S.overlays.forEach(o => o.setMap(null));
    S.overlays = [];

    S.cafes = places.map((p, i) => {
        const idx    = Number(p.id.slice(-2)) % DOG_POOL.length;
        const dogInfo= DOG_POOL[idx];
        const dist   = haversine(S.userLoc.lat, S.userLoc.lng, +p.y, +p.x);
        const walkMin= Math.max(1, Math.round(dist / CFG.WALK_SPEED_MPM));
        const stamped= S.stamps.some(s => s.placeId === p.id);
        return { ...p, dogInfo, dist, walkMin, stamped };
    });

    S.cafes.sort((a, b) => a.dist - b.dist);
    S.cafes.forEach(addMarker);

    setTitle(`🐾 ${S.cafes.length}곳 찾았어요!`);
    EL.sheetBadge.textContent = `도보 ${S.walkMin}분 이내`;
    renderList();
    snapSheet('half');
}

function addMarker(cafe) {
    const stamped = S.stamps.some(s => s.placeId === cafe.id);
    const color   = stamped ? '#4CAF50' : '#6B4C3B';
    const icon    = stamped ? '✅' : (cafe.dogInfo.indoor ? '🏠' : '🌿');

    const el = document.createElement('div');
    el.style.cssText = `
        background:${color};color:#fff;border-radius:12px;padding:5px 10px;
        font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.3);
        white-space:nowrap;cursor:pointer;border:2px solid #fff;
        transition:transform .15s;user-select:none;
    `;
    el.textContent = `${icon} ${cafe.walkMin}분`;
    el.addEventListener('mouseover',  () => { el.style.transform = 'scale(1.1)'; });
    el.addEventListener('mouseout',   () => { el.style.transform = ''; });
    el.addEventListener('click',      () => openDetail(cafe.id));

    const overlay = new kakao.maps.CustomOverlay({
        map: S.map,
        position: new kakao.maps.LatLng(+cafe.y, +cafe.x),
        content: el,
        yAnchor: 1.35, zIndex: 3,
    });
    S.overlays.push(overlay);
}

/* ===== 카페 목록 렌더링 ===== */
function renderList() {
    const filtered = S.cafes.filter(c => {
        if (S.activeFilter === 'all') return true;
        return c.dogInfo.tags.includes(S.activeFilter);
    });

    if (filtered.length === 0) {
        showEmpty('해당 조건의 카페가 없어요', '다른 필터를 선택하거나<br>도보 반경을 늘려보세요.');
        return;
    }

    setBody(filtered.map(buildCard).join(''));

    // 이벤트 위임
    EL.sheetBody.addEventListener('click', e => {
        const card = e.target.closest('.cafe-card[data-id]');
        if (card) openDetail(card.dataset.id);
    }, { once: true });

    // 다음 번 클릭을 위해 재등록 (once 덕분에 무한 중첩 없음)
    EL.sheetBody.addEventListener('click', handleCardClick);
}

function handleCardClick(e) {
    const card = e.target.closest('.cafe-card[data-id]');
    if (card) openDetail(card.dataset.id);
}

function buildCard(c) {
    const stamped = S.stamps.some(s => s.placeId === c.id);
    return `
    <div class="cafe-card" data-id="${c.id}">
        <div class="cafe-thumb">${c.dogInfo.indoor ? '🏠' : '🌿'}</div>
        <div class="cafe-info">
            <div class="cafe-name">${esc(c.place_name)}</div>
            <div class="cafe-addr">${esc(c.road_address_name || c.address_name)}</div>
            <div class="cafe-tags">
                ${c.dogInfo.indoor
                    ? '<span class="tag tag-indoor">🏠 실내가능</span>'
                    : '<span class="tag tag-terrace">🌿 테라스</span>'}
                ${c.dogInfo.maxKg === null
                    ? '<span class="tag tag-large">🐕 모든 견종</span>'
                    : `<span class="tag tag-small">🐶 ${c.dogInfo.maxKg}kg 이하</span>`}
                ${stamped ? '<span class="tag tag-stamp">✅ 방문완료</span>' : ''}
            </div>
        </div>
        <div class="cafe-walk">
            <span class="walk-time">🐾${c.walkMin}분</span>
            <span class="walk-label">도보</span>
        </div>
    </div>`;
}

/* ===== 카페 상세 ===== */
function openDetail(placeId) {
    const c = S.cafes.find(x => x.id === placeId);
    if (!c) return;

    const stamped = S.stamps.some(s => s.placeId === c.id);
    const rows = [
        ['실내 동반',   c.dogInfo.indoor  ? '✅ 가능'      : '🌿 테라스/외부만'],
        ['몸무게 제한', c.dogInfo.maxKg === null ? '제한 없음' : `${c.dogInfo.maxKg}kg 이하`],
        ['켄넬 필요',   c.dogInfo.kennel  ? '✅ 필요'      : '❌ 불필요'],
        ['목줄 필수',   c.dogInfo.lead    ? '✅ 필수 착용' : '⭕ 권장'],
    ];

    $('detailBody').innerHTML = `
        <div class="detail-hero">
            <span>${c.dogInfo.indoor ? '🏠' : '🌿'}</span>
            <div class="detail-hero-badge">🐾 애견동반</div>
        </div>
        <div class="detail-content">
            <div>
                <div class="detail-name">${esc(c.place_name)}</div>
                <div class="detail-addr">${esc(c.road_address_name || c.address_name)}</div>
            </div>

            <div class="walk-banner">
                <div class="walk-banner-dog">🦮</div>
                <div>
                    <div class="walk-banner-main">댕댕 걸음으로 약 ${c.walkMin}분</div>
                    <div class="walk-banner-sub">우리 집에서 도보 ${c.walkMin}분 · 약 ${Math.round(c.dist)}m</div>
                </div>
            </div>

            <div>
                <div class="section-title">🐾 반려견 동반 조건</div>
                <table class="cond-table">
                    ${rows.map(([k,v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}
                </table>
            </div>

            <div class="detail-actions">
                <button class="action-btn btn-sec" onclick="navigate(${c.y}, ${c.x}, '${esc(c.place_name)}')">
                    🗺️ 길 찾기
                </button>
                <button
                    class="action-btn btn-stamp ${stamped ? 'earned' : ''}"
                    id="stampBtn_${c.id}"
                    onclick="earnStamp('${c.id}')"
                    ${stamped ? 'disabled' : ''}
                >
                    ${stamped ? '✅ 방문완료!' : '🏆 스탬프 획득'}
                </button>
            </div>
            ${c.phone ? `<button class="action-btn btn-sec" style="margin-top:-8px" onclick="window.location='tel:${c.phone}'">📞 ${esc(c.phone)}</button>` : ''}
        </div>`;

    openPanel('detailPanel');
}

window.navigate = function(lat, lng, name) {
    window.open(`https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`, '_blank', 'noopener');
};

/* ===== 스탬프 ===== */
window.earnStamp = function(placeId) {
    if (S.stamps.some(s => s.placeId === placeId)) return;
    const c = S.cafes.find(x => x.id === placeId);
    if (!c) return;

    S.stamps.push({
        placeId,
        cafeName: c.place_name,
        address:  c.road_address_name || c.address_name,
        walkMin:  c.walkMin,
        date:     new Date().toISOString().split('T')[0],
    });
    localStorage.setItem('ddg_stamps', JSON.stringify(S.stamps));

    const btn = $(`stampBtn_${placeId}`);
    if (btn) { btn.textContent = '✅ 방문완료!'; btn.classList.add('earned'); btn.disabled = true; }

    // 마커 갱신
    S.overlays.forEach(o => o.setMap(null));
    S.overlays = [];
    S.cafes.forEach(addMarker);

    toast('🎉 스탬프를 획득했어요! 잘 다녀오셨나요?');
};

function openStampPanel() {
    const total   = S.stamps.length;
    const weekly  = weeklyCount();
    const wTarget = 3;
    const pct     = Math.min(100, (weekly / wTarget) * 100).toFixed(0);

    const grid = S.stamps.length === 0
        ? `<div class="empty-state"><div class="empty-emoji">🗺️</div>
           <div class="empty-title">아직 방문한 카페가 없어요</div>
           <div class="empty-desc">주변 카페를 찾아 스탬프를 모아보세요!</div></div>`
        : `<div class="stamps-grid">
            ${S.stamps.map(s => `
              <div class="stamp-item earned">
                <div class="stamp-emoji">☕</div>
                <div class="stamp-name">${esc(s.cafeName)}</div>
                <div class="stamp-date">${s.date}</div>
              </div>`).join('')}
            ${Array(Math.max(0, 9 - total)).fill(0).map(() => `
              <div class="stamp-item locked">
                <div class="stamp-lock">🔒</div>
                <div class="stamp-name" style="color:#CCC">비어있음</div>
              </div>`).join('')}
           </div>`;

    $('stampBody').innerHTML = `
        <div class="stamp-total">
            <div>
                <div class="stamp-total-label">총 스탬프</div>
                <div class="stamp-total-sub">10개 모으면 할인 쿠폰 🎁</div>
            </div>
            <div class="stamp-total-count">${total} 🐾</div>
        </div>

        <div class="mission-card">
            <div class="mission-head">
                <div class="mission-name">🎯 이번 주 미션</div>
                <div class="mission-badge">주간 도전</div>
            </div>
            <div class="mission-desc">도보 15분 이내 애견카페 ${wTarget}곳 방문하기</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div class="progress-text">${weekly} / ${wTarget}곳 완료</div>
        </div>

        <div class="stamps-section">
            <div class="stamps-section-title">📋 방문한 카페 컬렉션</div>
            ${grid}
        </div>`;

    openPanel('stampPanel');
}

function weeklyCount() {
    const mon = new Date();
    mon.setDate(mon.getDate() - mon.getDay() + (mon.getDay() === 0 ? -6 : 1));
    mon.setHours(0, 0, 0, 0);
    return S.stamps.filter(s => new Date(s.date) >= mon).length;
}

/* ===== 반려견 프로필 ===== */
function openPetPanel() {
    const p = S.pet;
    $('petBody').innerHTML = `
        <div class="pet-card">
            <div class="pet-avatar">🐕</div>
            <input id="petName" class="pet-name-input" value="${esc(p.name)}" placeholder="반려견 이름" oninput="savePet()">
        </div>
        <div class="pet-options">
            <div class="pet-row">
                <span class="pet-row-label">🐾 크기</span>
                <select id="petSize" onchange="savePet()">
                    <option value="small"  ${p.size==='small'  ? 'selected':''}>소형견 (~7 kg)</option>
                    <option value="medium" ${p.size==='medium' ? 'selected':''}>중형견 (7~15 kg)</option>
                    <option value="large"  ${p.size==='large'  ? 'selected':''}>대형견 (15 kg~)</option>
                </select>
            </div>
            <div class="pet-row">
                <span class="pet-row-label">🐩 견종</span>
                <input id="petBreed" type="text" value="${esc(p.breed)}" placeholder="말티즈, 포메라니안..." oninput="savePet()">
            </div>
        </div>
        <div class="pet-tip">
            💡 <strong>소형견</strong> 필터를 사용하면 몸무게 제한이 있는 카페도<br>
            정확히 필터링돼요. 반려견 정보를 저장해두세요!
        </div>`;
    openPanel('petPanel');
}

window.savePet = function() {
    S.pet = {
        name:  $('petName')?.value  || '우리 댕댕이',
        size:  $('petSize')?.value  || 'small',
        breed: $('petBreed')?.value || '믹스견',
    };
    localStorage.setItem('ddg_pet', JSON.stringify(S.pet));
};

/* ===== 패널 열기/닫기 ===== */
function openPanel(id)  { $(id).classList.add('open'); }
function closePanel(id) { $(id).classList.remove('open'); }

/* ===== 바텀 시트 드래그 ===== */
function setupSheetDrag() {
    const handle = $('sheetHandle');
    const sheet  = EL.sheet;
    let startY = 0, startH = 0, dragging = false;

    function onStart(y) {
        startY = y;
        startH = sheet.getBoundingClientRect().top;
        dragging = true;
        sheet.style.transition = 'none';
    }
    function onMove(y) {
        if (!dragging) return;
        const dy = y - startY;
        const vh = window.innerHeight;
        const raw = startH + dy;
        const clampedTop = Math.max(13, Math.min(vh - 140, raw));
        sheet.style.transform = `translateY(${clampedTop}px)`;
    }
    function onEnd(y) {
        if (!dragging) return;
        dragging = false;
        sheet.style.transition = '';
        sheet.style.transform  = '';
        const dy = y - startY;
        if      (dy < -60) snapSheet('expanded');
        else if (dy >  60) snapSheet('default');
        else               snapSheet(S.sheetSnap);
    }

    handle.addEventListener('touchstart', e => onStart(e.touches[0].clientY), { passive: true });
    handle.addEventListener('touchmove',  e => onMove(e.touches[0].clientY),  { passive: true });
    handle.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientY));

    handle.addEventListener('mousedown',  e => onStart(e.clientY));
    window.addEventListener('mousemove',  e => { if (dragging) onMove(e.clientY); });
    window.addEventListener('mouseup',    e => { if (dragging) onEnd(e.clientY); });

    // 클릭으로 시트 토글
    handle.addEventListener('click', e => {
        if (Math.abs(e.clientY - startY) > 4) return; // 드래그였으면 무시
        const next = { default: 'half', half: 'expanded', expanded: 'default' };
        snapSheet(next[S.sheetSnap]);
    });
}

function snapSheet(snap) {
    S.sheetSnap = snap;
    EL.sheet.classList.remove('half', 'expanded');
    if (snap === 'half')     EL.sheet.classList.add('half');
    if (snap === 'expanded') EL.sheet.classList.add('expanded');
}

/* ===== 유틸 ===== */
function haversine(lat1, lng1, lat2, lng2) {
    const R  = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function setTitle(t) { EL.sheetTitle.textContent = t; }
function setBody(h)  { EL.sheetBody.innerHTML = h; }

function showEmpty(title, desc) {
    setBody(`<div class="empty-state">
        <div class="empty-emoji">🔍</div>
        <div class="empty-title">${title}</div>
        <div class="empty-desc">${desc}</div>
    </div>`);
}

let _toastTimer = null;
function toast(msg, ms = 2800) {
    EL.toast.textContent = msg;
    EL.toast.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => EL.toast.classList.remove('show'), ms);
}
