'use strict';

/* ===== 설정 ===== */
const CFG = {
    WALK_SPEED_MPM: 50,
    DEFAULT_LAT: 37.5665,
    DEFAULT_LNG: 126.9780,
    OVERPASS_URL: 'https://overpass-api.de/api/interpreter',
};

/* ===== 데모 반려견 동반 조건 풀 ===== */
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
    userLoc: null,
    userMarker: null,
    circle: null,
    markers: [],
    cafes: [],
    activeFilter: 'all',
    walkMin: 15,
    sheetSnap: 'default',
    stamps: JSON.parse(localStorage.getItem('ddg_stamps') || '[]'),
    pet:    JSON.parse(localStorage.getItem('ddg_pet')    || '{"name":"우리 댕댕이","size":"small","breed":"믹스견"}'),
};

/* ===== DOM 캐시 ===== */
const $ = id => document.getElementById(id);
const EL = {};

/* ===== 초기화 ===== */
document.addEventListener('DOMContentLoaded', () => {
    EL.radiusSlider = $('radiusSlider');
    EL.radiusDisp   = $('radiusDisplay');
    EL.sheet        = $('sheet');
    EL.sheetTitle   = $('sheetTitle');
    EL.sheetBadge   = $('sheetBadge');
    EL.sheetBody    = $('sheetBody');
    EL.toast        = $('toast');

    initMap();
    wireEvents();
    locateUser();
});

/* ===== 지도 초기화 (Leaflet + OpenStreetMap) ===== */
function initMap() {
    S.map = L.map('map', {
        center: [CFG.DEFAULT_LAT, CFG.DEFAULT_LNG],
        zoom: 15,
        zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
    }).addTo(S.map);

    S.map.on('click', () => snapSheet('default'));
}

/* ===== 이벤트 연결 ===== */
function wireEvents() {
    $('stampBtn').addEventListener('click', openStampPanel);
    $('petBtn').addEventListener('click', openPetPanel);

    $('filterBar').addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        S.activeFilter = chip.dataset.filter;
        renderList();
    });

    EL.radiusSlider.addEventListener('input', e => {
        S.walkMin = +e.target.value;
        EL.radiusDisp.textContent = `${S.walkMin}분`;
        if (S.userLoc) { updateCircle(); debouncedSearch(); }
    });

    $('locateBtn').addEventListener('click', locateUser);
    setupSheetDrag();

    $('detailBackBtn').addEventListener('click', () => closePanel('detailPanel'));
    $('stampCloseBtn').addEventListener('click',  () => closePanel('stampPanel'));
    $('petCloseBtn').addEventListener('click',    () => closePanel('petPanel'));
}

/* ===== GPS 위치 ===== */
function locateUser() {
    setTitle('📍 위치 확인 중...');
    EL.sheetBadge.textContent = '';

    if (!navigator.geolocation) {
        useDefaultLoc('위치 서비스를 지원하지 않는 브라우저입니다');
        return Promise.resolve();
    }

    return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude: lat, longitude: lng } = pos.coords;
                S.userLoc = { lat, lng };
                S.map.setView([lat, lng], 15);
                drawUserDot(lat, lng);
                updateCircle();
                searchCafes();
                resolve();
            },
            err => {
                const msgs = { 1: '위치 권한을 허용해주세요.', 2: '위치를 찾을 수 없습니다.' };
                const msg = msgs[err.code] || '위치 오류가 발생했습니다.';
                toast(msg);
                useDefaultLoc(msg);
                resolve();
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
        );
    });
}

function useDefaultLoc(msg) {
    setTitle('⚠️ ' + msg + ' (서울 기준 데모)');
    S.userLoc = { lat: CFG.DEFAULT_LAT, lng: CFG.DEFAULT_LNG };
    S.map.setView([CFG.DEFAULT_LAT, CFG.DEFAULT_LNG], 15);
    drawUserDot(CFG.DEFAULT_LAT, CFG.DEFAULT_LNG);
    updateCircle();
    searchCafes();
}

function drawUserDot(lat, lng) {
    if (S.userMarker) S.map.removeLayer(S.userMarker);
    const icon = L.divIcon({
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 2px 8px rgba(66,133,244,.55);"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        className: '',
    });
    S.userMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(S.map);
}

function updateCircle() {
    if (S.circle) S.map.removeLayer(S.circle);
    const radius = S.walkMin * CFG.WALK_SPEED_MPM;
    S.circle = L.circle([S.userLoc.lat, S.userLoc.lng], {
        radius,
        color: '#A0785A', weight: 2, opacity: 0.55,
        dashArray: '6, 6',
        fillColor: '#A0785A', fillOpacity: 0.06,
    }).addTo(S.map);
}

/* ===== 카페 검색 ===== */
let _searchTimer = null;
function debouncedSearch() {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(searchCafes, 400);
}

async function searchCafes() {
    if (!S.userLoc) return;

    const radius = S.walkMin * CFG.WALK_SPEED_MPM;
    setTitle('🔍 애견카페 검색 중...');
    setBody('<div class="loading"><div class="spinner"></div><p>주변 애견카페 탐색 중...</p></div>');

    let places = [];
    try {
        places = await Promise.race([
            fetchOverpassCafes(S.userLoc.lat, S.userLoc.lng, radius),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
        ]);
    } catch (e) {
        console.warn('Overpass API 실패, 데모 데이터 사용:', e.message);
    }

    if (places.length < 3) {
        places = generateDemoCafes(S.userLoc.lat, S.userLoc.lng, radius);
    }

    processCafes(places);
}

async function fetchOverpassCafes(lat, lng, radius) {
    const query = `
[out:json][timeout:8];
(
  node["amenity"="cafe"]["dog"~"yes|welcome"](around:${radius},${lat},${lng});
  node["amenity"="cafe"]["name"~"애견|반려견|펫카페|멍멍"](around:${radius},${lat},${lng});
  way["amenity"="cafe"]["name"~"애견|반려견|펫카페|멍멍"](around:${radius},${lat},${lng});
);
out center;
`;
    const resp = await fetch(CFG.OVERPASS_URL, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
    });
    if (!resp.ok) throw new Error('Overpass HTTP error');
    const data = await resp.json();
    return data.elements
        .filter(el => el.tags?.name)
        .map(el => ({
            id: String(el.id),
            place_name: el.tags.name,
            road_address_name: [el.tags['addr:street'], el.tags['addr:housenumber']].filter(Boolean).join(' '),
            address_name: el.tags['addr:city'] || el.tags['addr:district'] || '',
            x: String(el.lon ?? el.center?.lon),
            y: String(el.lat ?? el.center?.lat),
            phone: el.tags.phone || el.tags['contact:phone'] || '',
        }));
}

function generateDemoCafes(lat, lng, radius) {
    const names = [
        '멍멍 브루잉 카페', '포레스트 펫 카페', '댕댕 하우스',
        '반려견 쉼터 카페', '강아지 정원 카페', '해피독 커피',
        '달달 애견 카페', '숲속 멍카페', '펫 팰리스 커피',
        '강아지와 나', '우리 강아지 카페', '멍멍 힐링 카페',
    ];
    const roads = [
        '강남대로 123', '서초대로 456', '역삼로 78', '테헤란로 210',
        '신촌로 35', '홍대입구역 2번 출구 앞', '합정로 55', '마포대로 99',
        '연남로 12', '망원동 34-5', '성수이로 60', '왕십리로 91',
    ];
    const R = radius * 0.9;
    return names.map((name, i) => {
        const angle = (i / names.length) * 2 * Math.PI + (i % 3) * 0.3;
        const dist  = (0.25 + (i % 4) * 0.2) * R;
        const dLat  = (dist / 111320) * Math.cos(angle);
        const dLng  = (dist / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
        return {
            id: `demo_${i}`,
            place_name: name,
            road_address_name: roads[i],
            address_name: '서울시',
            x: String(lng + dLng),
            y: String(lat + dLat),
            phone: `02-${1000 + i * 13}-${1000 + i * 37}`,
        };
    });
}

function processCafes(places) {
    S.markers.forEach(m => S.map.removeLayer(m));
    S.markers = [];

    S.cafes = places.map(p => {
        const hash   = [...String(p.id)].reduce((a, c) => a + c.charCodeAt(0), 0);
        const dogInfo= DOG_POOL[hash % DOG_POOL.length];
        const dist   = haversine(S.userLoc.lat, S.userLoc.lng, +p.y, +p.x);
        const walkMin= Math.max(1, Math.round(dist / CFG.WALK_SPEED_MPM));
        return { ...p, dogInfo, dist, walkMin };
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

    const divIcon = L.divIcon({
        html: `<div style="background:${color};color:#fff;border-radius:12px;padding:5px 10px;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap;cursor:pointer;border:2px solid #fff;">${icon} ${cafe.walkMin}분</div>`,
        className: '',
        iconAnchor: [20, 35],
    });

    const marker = L.marker([+cafe.y, +cafe.x], { icon: divIcon })
        .addTo(S.map)
        .on('click', () => openDetail(cafe.id));

    S.markers.push(marker);
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

    S.markers.forEach(m => S.map.removeLayer(m));
    S.markers = [];
    S.cafes.forEach(addMarker);

    toast('🎉 스탬프를 획득했어요! 잘 다녀오셨나요?');
};

function openStampPanel() {
    const total  = S.stamps.length;
    const weekly = weeklyCount();
    const wTarget= 3;
    const pct    = Math.min(100, (weekly / wTarget) * 100).toFixed(0);

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

    handle.addEventListener('click', e => {
        if (Math.abs(e.clientY - startY) > 4) return;
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
