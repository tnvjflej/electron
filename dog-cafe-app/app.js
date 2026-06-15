'use strict';

const CFG = {
    WALK_SPEED_MPM: 50,
    DEFAULT_LAT: 37.5665,
    DEFAULT_LNG: 126.9780,
    OVERPASS_URL: 'https://overpass-api.de/api/interpreter',
    // ↓ 카카오 개발자 콘솔(developers.kakao.com)에서 발급한 REST API 키를 입력하세요.
    // 앱 설정 → 플랫폼 → 웹 플랫폼 등록 에 https://tnvjflej.github.io 추가 필수.
    KAKAO_KEY: 'd4558eaaeec6ef9b7c7d48b0e6470342',
};

/* ===== 실제 카페 데이터 (주소·좌표 직접 입력) ===== */
const REAL_CAFES = [
    // ── 서울 성동구 성수동 ──
    { id: 'r01', place_name: '어니언 성수', road_address_name: '서울 성동구 아차산로9길 8', address_name: '서울 성동구 성수동', x: '127.0558', y: '37.5444', phone: '070-7543-2105' },
    { id: 'r02', place_name: '블루보틀 성수점', road_address_name: '서울 성동구 아차산로 110', address_name: '서울 성동구 성수동', x: '127.0536', y: '37.5477', phone: '070-8806-3909' },
    { id: 'r03', place_name: '대림창고 갤러리카페', road_address_name: '서울 성동구 연무장길 11', address_name: '서울 성동구 성수동', x: '127.0545', y: '37.5449', phone: '02-498-0710' },
    { id: 'r04', place_name: '카페 할아버지공장', road_address_name: '서울 성동구 서울숲2길 44', address_name: '서울 성동구 성수동', x: '127.0449', y: '37.5448', phone: '02-462-2222' },

    // ── 서울 마포구 홍대·합정·망원·연남 ──
    { id: 'r05', place_name: '앤트러사이트 홍대점', road_address_name: '서울 마포구 토정로 272', address_name: '서울 마포구 합정동', x: '126.9065', y: '37.5492', phone: '02-322-0009' },
    { id: 'r06', place_name: '올드페리도넛 망원점', road_address_name: '서울 마포구 포은로 109', address_name: '서울 마포구 망원동', x: '126.9075', y: '37.5564', phone: '02-333-1555' },
    { id: 'r07', place_name: '연남방앗간', road_address_name: '서울 마포구 연남로1길 12', address_name: '서울 마포구 연남동', x: '126.9259', y: '37.5601', phone: '02-338-0040' },
    { id: 'r08', place_name: '카페 마마스 홍대', road_address_name: '서울 마포구 서교동 365-5', address_name: '서울 마포구 서교동', x: '126.9218', y: '37.5522', phone: '02-323-8595' },
    { id: 'r09', place_name: '핸드드립 카페 취향', road_address_name: '서울 마포구 합정동 370-3', address_name: '서울 마포구 합정동', x: '126.9078', y: '37.5497', phone: '02-3141-7700' },

    // ── 서울 용산구 이태원·한남 ──
    { id: 'r10', place_name: '블루보틀 한남점', road_address_name: '서울 용산구 독서당로 121', address_name: '서울 용산구 한남동', x: '126.9979', y: '37.5348', phone: '070-8806-3901' },
    { id: 'r11', place_name: '테라로사 이태원점', road_address_name: '서울 용산구 이태원로 176', address_name: '서울 용산구 이태원동', x: '126.9977', y: '37.5352', phone: '02-749-5670' },
    { id: 'r12', place_name: '커피바 K 한남', road_address_name: '서울 용산구 한남대로27길 31', address_name: '서울 용산구 한남동', x: '126.9993', y: '37.5351', phone: '02-749-0080' },

    // ── 서울 종로구 익선동·북촌 ──
    { id: 'r13', place_name: '익선다방', road_address_name: '서울 종로구 수표로28길 17-1', address_name: '서울 종로구 익선동', x: '126.9889', y: '37.5741', phone: '02-742-0100' },
    { id: 'r14', place_name: '카페 어니언 익선', road_address_name: '서울 종로구 계동길 5', address_name: '서울 종로구 익선동', x: '126.9897', y: '37.5745', phone: '070-7543-2104' },
    { id: 'r15', place_name: '북촌 손만두 카페', road_address_name: '서울 종로구 북촌로 90', address_name: '서울 종로구 가회동', x: '126.9836', y: '37.5820', phone: '02-741-2455' },

    // ── 서울 강남구 ──
    { id: 'r16', place_name: '폴 바셋 강남점', road_address_name: '서울 강남구 강남대로 396', address_name: '서울 강남구 역삼동', x: '127.0245', y: '37.5048', phone: '02-552-0011' },
    { id: 'r17', place_name: '뚜레쥬르 청담 플래그십', road_address_name: '서울 강남구 도산대로 409', address_name: '서울 강남구 청담동', x: '127.0508', y: '37.5241', phone: '02-543-8700' },
    { id: 'r18', place_name: '카페 드 파리 신사점', road_address_name: '서울 강남구 압구정로 60', address_name: '서울 강남구 신사동', x: '127.0228', y: '37.5249', phone: '02-544-0880' },

    // ── 서울 서초구 ──
    { id: 'r19', place_name: '펠트 커피 서래마을', road_address_name: '서울 서초구 방배로 155', address_name: '서울 서초구 방배동', x: '126.9924', y: '37.4909', phone: '02-532-7671' },

    // ── 서울 광진구 건대 ──
    { id: 'r20', place_name: '카페 베네 건대점', road_address_name: '서울 광진구 능동로 216', address_name: '서울 광진구 화양동', x: '127.0703', y: '37.5403', phone: '02-455-0090' },

    // ── 서울 송파구 잠실 ──
    { id: 'r21', place_name: '투썸플레이스 잠실 롯데월드점', road_address_name: '서울 송파구 올림픽로 240', address_name: '서울 송파구 신천동', x: '127.1003', y: '37.5122', phone: '02-420-5000' },

    // ── 서울 은평구 ──
    { id: 'r22', place_name: '나무사이로 카페', road_address_name: '서울 은평구 진관내로 88', address_name: '서울 은평구 진관동', x: '126.9259', y: '37.6485', phone: '02-357-5660' },

    // ── 인천 송도 ──
    { id: 'r23', place_name: '카페 스탠다드 송도점', road_address_name: '인천 연수구 송도국제대로 189', address_name: '인천 연수구 송도동', x: '126.6362', y: '37.3824', phone: '032-723-0100' },

    // ── 경기 수원 ──
    { id: 'r24', place_name: '행리단길 카페 온도', road_address_name: '경기 수원시 팔달구 행궁로 22', address_name: '경기 수원시 팔달구', x: '127.0125', y: '37.2824', phone: '031-247-0550' },

    // ── 부산 해운대구 ──
    { id: 'r25', place_name: '카페 웨이브온 해운대', road_address_name: '부산 해운대구 달맞이길 30', address_name: '부산 해운대구 중동', x: '129.1603', y: '35.1583', phone: '051-747-0808' },
    { id: 'r26', place_name: '파울로 커피 해운대점', road_address_name: '부산 해운대구 해운대로 30', address_name: '부산 해운대구 우동', x: '129.1558', y: '35.1624', phone: '051-743-2255' },

    // ── 부산 수영구 광안리 ──
    { id: 'r27', place_name: '모모스커피 광안점', road_address_name: '부산 수영구 광안해변로 219', address_name: '부산 수영구 광안동', x: '129.1187', y: '35.1534', phone: '051-756-5000' },

    // ── 부산 남포동·서면 ──
    { id: 'r28', place_name: '모모스커피 서면점', road_address_name: '부산 부산진구 서면로68번길 44', address_name: '부산 부산진구 부전동', x: '129.0598', y: '35.1577', phone: '051-806-5000' },
    { id: 'r29', place_name: '카페 홀썸 남포점', road_address_name: '부산 중구 광복로 70', address_name: '부산 중구 남포동', x: '129.0283', y: '35.0978', phone: '051-245-1000' },

    // ── 대구 동성로 ──
    { id: 'r30', place_name: '커피명가 동성로점', road_address_name: '대구 중구 동성로 27', address_name: '대구 중구 동성로', x: '128.5988', y: '35.8693', phone: '053-254-8033' },
];

const VOTE_PRESETS = [
    { id: 'leash_ok',    emoji: '🐕', label: '목줄로 입장 가능' },
    { id: 'carrier',     emoji: '🎒', label: '이동 가방 필요' },
    { id: 'all_breeds',  emoji: '🐾', label: '모든 견종 환영' },
    { id: 'small_only',  emoji: '🐶', label: '소형견 전용' },
    { id: 'terrace_big', emoji: '🌿', label: '테라스 넓어요' },
    { id: 'parking',     emoji: '🅿️', label: '주차 가능' },
    { id: 'tasty',       emoji: '☕', label: '음료 맛있어요' },
    { id: 'photo_spot',  emoji: '📸', label: '포토존 있어요' },
    { id: 'kind_staff',  emoji: '✅', label: '직원이 친절해요' },
    { id: 'cheap',       emoji: '💰', label: '가격 합리적' },
];

const DOG_POOL = [
    { indoor: true,  maxKg: null, kennel: false, lead: true,  tags: ['indoor'] },
    { indoor: false, maxKg: 10,   kennel: false, lead: true,  tags: ['terrace', 'small'] },
    { indoor: true,  maxKg: 7,    kennel: true,  lead: true,  tags: ['indoor', 'small'] },
    { indoor: false, maxKg: null, kennel: false, lead: false, tags: ['terrace', 'large'] },
    { indoor: true,  maxKg: 15,   kennel: false, lead: true,  tags: ['indoor', 'small', 'large'] },
];

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
    currentDetailId: null,
    stamps: JSON.parse(localStorage.getItem('ddg_stamps') || '[]'),
    pet:    JSON.parse(localStorage.getItem('ddg_pet')    || '{"name":"우리 댕댕이","size":"small","breed":"믹스견"}'),
};

const $ = id => document.getElementById(id);
const EL = {};

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

function locateUser() {
    setTitle('📍 위치 확인 중...');
    EL.sheetBadge.textContent = '';
    if (!navigator.geolocation) { useDefaultLoc('위치 서비스 미지원'); return Promise.resolve(); }
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
                toast(msgs[err.code] || '위치 오류');
                useDefaultLoc(msgs[err.code] || '위치 오류');
                resolve();
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
        );
    });
}

function useDefaultLoc(msg) {
    setTitle('⚠️ ' + msg);
    S.userLoc = { lat: CFG.DEFAULT_LAT, lng: CFG.DEFAULT_LNG };
    S.map.setView([CFG.DEFAULT_LAT, CFG.DEFAULT_LNG], 14);
    drawUserDot(CFG.DEFAULT_LAT, CFG.DEFAULT_LNG);
    updateCircle();
    searchCafes();
    setTimeout(() => toast('📍 파란 핀을 드래그해서 내 위치를 설정해보세요!', 4500), 1000);
}

function drawUserDot(lat, lng) {
    if (S.userMarker) S.map.removeLayer(S.userMarker);
    const icon = L.divIcon({
        html: `<div class="user-pin">
            <div class="user-pin-pulse"></div>
            <div class="user-pin-dot"></div>
            <div class="user-pin-label">드래그</div>
        </div>`,
        iconSize: [32, 44],
        iconAnchor: [16, 16],
        className: '',
    });
    S.userMarker = L.marker([lat, lng], { icon, draggable: true, zIndexOffset: 1000 })
        .addTo(S.map)
        .on('dragstart', () => {
            setTitle('📍 위치를 설정하는 중...');
            EL.sheetBadge.textContent = '';
        })
        .on('drag', e => {
            const pos = e.target.getLatLng();
            S.userLoc = { lat: pos.lat, lng: pos.lng };
            updateCircle();
        })
        .on('dragend', () => {
            updateCircle();
            searchCafes();
            toast('📍 이 위치에서 카페를 검색해요!');
        });
}

function updateCircle() {
    if (S.circle) S.map.removeLayer(S.circle);
    S.circle = L.circle([S.userLoc.lat, S.userLoc.lng], {
        radius: S.walkMin * CFG.WALK_SPEED_MPM,
        color: '#A0785A', weight: 2, opacity: 0.55,
        dashArray: '6,6', fillColor: '#A0785A', fillOpacity: 0.06,
    }).addTo(S.map);
}

let _searchTimer = null;
function debouncedSearch() {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(searchCafes, 400);
}

async function searchCafes() {
    if (!S.userLoc) return;
    const { lat, lng } = S.userLoc;
    const radius = S.walkMin * CFG.WALK_SPEED_MPM;
    setTitle('🔍 카페 검색 중...');
    setBody('<div class="loading"><div class="spinner"></div><p>주변 카페 탐색 중...</p></div>');

    if (CFG.KAKAO_KEY) {
        // ── 카카오 Local API 실시간 검색 ──────────────────────────────────
        try {
            const cafes = await Promise.race([
                fetchKakaoCafes(lat, lng, Math.max(radius * 1.5, 500)),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
            ]);
            if (!cafes.length) { showNoResult(); return; }
            EL.sheetBadge.textContent = `도보 ${S.walkMin}분 · 카카오 실시간`;
            processCafes(cafes);
        } catch (e) {
            console.warn('Kakao API 오류:', e.message);
            toast('카카오 API 오류 — 기본 데이터로 표시해요');
            await fallbackSearch(lat, lng, radius);
        }
    } else {
        // ── 카카오 키 없음: REAL_CAFES + Overpass 폴백 ───────────────────
        await fallbackSearch(lat, lng, radius);
    }
}

/* 카카오 키가 없을 때 사용하는 폴백 (REAL_CAFES + Overpass OSM) */
async function fallbackSearch(lat, lng, radius) {
    const staticHits = REAL_CAFES.filter(c => haversine(lat, lng, +c.y, +c.x) <= radius * 1.5);

    let osm = [];
    try {
        osm = await Promise.race([
            fetchOverpassCafes(lat, lng, Math.max(radius * 1.5, 1000)),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
        ]);
    } catch (e) { console.warn('Overpass:', e.message); }

    const seen = new Set(staticHits.map(c => c.place_name));
    const merged = [...staticHits, ...osm.filter(c => !seen.has(c.place_name))];

    if (!merged.length) { showNoResult(); return; }
    EL.sheetBadge.textContent = osm.length > 0 ? `도보 ${S.walkMin}분 · OSM 포함` : `도보 ${S.walkMin}분 이내`;
    processCafes(merged);
}

function showNoResult() {
    setTitle('근처 카페 정보가 없어요');
    setBody(`<div class="empty-state">
        <div class="empty-emoji">📍</div>
        <div class="empty-title">이 위치엔 등록된 카페가 없어요</div>
        <div class="empty-desc">핀을 이동하거나 반경을 늘려보세요</div>
    </div>`);
    EL.sheetBadge.textContent = '';
}

/* 카카오 키워드 검색 API — 애견카페/반려견카페/펫카페/도그카페 병렬 검색 후 ID 기준 중복 제거 */
async function fetchKakaoCafes(lat, lng, radius) {
    const keywords = ['애견카페', '반려견카페', '펫카페', '도그카페'];
    const seen    = new Set();
    const results = [];
    const r = Math.min(Math.round(radius), 20000); // Kakao 최대 20km

    await Promise.all(keywords.map(async kw => {
        const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
        url.searchParams.set('query', kw);
        url.searchParams.set('x', String(lng));
        url.searchParams.set('y', String(lat));
        url.searchParams.set('radius', r);
        url.searchParams.set('size', 15);
        url.searchParams.set('sort', 'distance');

        const resp = await fetch(url.toString(), {
            headers: { Authorization: `KakaoAK ${CFG.KAKAO_KEY}` },
        });
        if (!resp.ok) throw new Error(`Kakao HTTP ${resp.status}`);
        const data = await resp.json();
        for (const p of (data.documents || [])) {
            if (!seen.has(p.id)) { seen.add(p.id); results.push(p); }
        }
    }));

    // Kakao 응답은 place_name·x·y·road_address_name·phone 형식 — processCafes()와 바로 호환
    return results;
}

async function fetchOverpassCafes(lat, lng, radius) {
    // 애견 특화 태그 + 이름 있는 모든 카페 검색 (반경 1.5x 확장으로 충분한 결과 확보)
    const r = Math.max(radius * 1.5, 800);
    const query = `[out:json][timeout:9];
(
  node["amenity"="cafe"]["name"](around:${r},${lat},${lng});
  way["amenity"="cafe"]["name"](around:${r},${lat},${lng});
  node["amenity"="cafe"]["dog"~"yes|welcome"](around:${r},${lat},${lng});
  node["shop"="pet"]["name"](around:${r},${lat},${lng});
);
out center 30;`;
    const resp = await fetch(CFG.OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    return data.elements
        .filter(el => el.tags?.name)
        .filter(el => {
            const lon = el.lon ?? el.center?.lon;
            const lat2 = el.lat ?? el.center?.lat;
            return lon != null && lat2 != null;
        })
        .map(el => ({
            id: String(el.id),
            place_name: el.tags.name,
            road_address_name: [el.tags['addr:street'], el.tags['addr:housenumber']].filter(Boolean).join(' '),
            address_name: el.tags['addr:city'] || el.tags['addr:district'] || '',
            x: String(el.lon ?? el.center?.lon),
            y: String(el.lat ?? el.center?.lat),
            phone: el.tags.phone || el.tags['contact:phone'] || '',
            isDogFriendly: !!(el.tags.dog === 'yes' || el.tags.dog === 'welcome'),
        }));
}

function processCafes(places) {
    S.markers.forEach(m => S.map.removeLayer(m));
    S.markers = [];
    S.cafes = places.map(p => {
        const hash   = [...String(p.id)].reduce((a, c) => a + c.charCodeAt(0), 0);
        const dogInfo= DOG_POOL[hash % DOG_POOL.length];
        const dist   = haversine(S.userLoc.lat, S.userLoc.lng, +p.y, +p.x);
        return { ...p, dogInfo, dist, walkMin: Math.max(1, Math.round(dist / CFG.WALK_SPEED_MPM)) };
    });
    S.cafes.sort((a, b) => a.dist - b.dist);
    S.cafes.forEach(addMarker);
    setTitle(`🐾 ${S.cafes.length}곳 찾았어요!`);
    renderList();
    snapSheet('half');
}

function addMarker(cafe) {
    const stamped = S.stamps.some(s => s.placeId === cafe.id);
    const color   = stamped ? '#4CAF50' : '#6B4C3B';
    const icon    = stamped ? '✅' : (cafe.dogInfo.indoor ? '🏠' : '🌿');
    const marker  = L.marker([+cafe.y, +cafe.x], {
        icon: L.divIcon({
            html: `<div style="background:${color};color:#fff;border-radius:12px;padding:5px 10px;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap;cursor:pointer;border:2px solid #fff;">${icon} ${cafe.walkMin}분</div>`,
            className: '', iconAnchor: [20, 35],
        }),
    }).addTo(S.map).on('click', () => openDetail(cafe.id));
    S.markers.push(marker);
}

/* ===== 이미지 URL ===== */
function cafeImgUrl(id, w, h) {
    const seed = id.replace(/[^a-z0-9]/gi, '') || 'cafe';
    return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

/* ===== 카드 목록 ===== */
function renderList() {
    const filtered = S.cafes.filter(c => S.activeFilter === 'all' || c.dogInfo.tags.includes(S.activeFilter));
    if (!filtered.length) { showEmpty('해당 조건의 카페가 없어요', '다른 필터를 선택하거나<br>도보 반경을 늘려보세요.'); return; }
    setBody(filtered.map(buildCard).join(''));
    EL.sheetBody.addEventListener('click', handleCardClick);
}

function handleCardClick(e) {
    const card = e.target.closest('.cafe-card[data-id]');
    if (card) openDetail(card.dataset.id);
}

function buildCard(c) {
    const stamped = S.stamps.some(s => s.placeId === c.id);
    const tipCount = getTips(c.id).length;
    const voteCount = Object.values(getVotes(c.id)).reduce((a, v) => a + v, 0);
    return `
    <div class="cafe-card" data-id="${c.id}">
        <div class="cafe-thumb">
            <img src="${cafeImgUrl(c.id, 120, 120)}" alt="" loading="lazy" onload="this.style.opacity=1">
            <span>${c.dogInfo.indoor ? '🏠' : '🌿'}</span>
        </div>
        <div class="cafe-info">
            <div class="cafe-name">${esc(c.place_name)}</div>
            <div class="cafe-addr">${esc(c.road_address_name || c.address_name)}</div>
            <div class="cafe-tags">
                ${c.dogInfo.indoor ? '<span class="tag tag-indoor">🏠 실내가능</span>' : '<span class="tag tag-terrace">🌿 테라스</span>'}
                ${c.dogInfo.maxKg === null ? '<span class="tag tag-large">🐕 모든 견종</span>' : `<span class="tag tag-small">🐶 ${c.dogInfo.maxKg}kg 이하</span>`}
                ${stamped ? '<span class="tag tag-stamp">✅ 방문완료</span>' : ''}
            </div>
            ${(tipCount + voteCount) > 0 ? `<div class="card-community">💬 팁 ${tipCount}개 · 👍 ${voteCount}명 참여</div>` : ''}
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
    S.currentDetailId = placeId;

    const stamped = S.stamps.some(s => s.placeId === c.id);
    const rows = [
        ['실내 동반',   c.dogInfo.indoor  ? '✅ 가능'      : '🌿 테라스/외부만'],
        ['몸무게 제한', c.dogInfo.maxKg === null ? '제한 없음' : `${c.dogInfo.maxKg}kg 이하`],
        ['켄넬 필요',   c.dogInfo.kennel  ? '✅ 필요'      : '❌ 불필요'],
        ['목줄 필수',   c.dogInfo.lead    ? '✅ 필수 착용' : '⭕ 권장'],
    ];

    const shortcuts = VOTE_PRESETS.slice(0, 6)
        .map(p => `<button class="tip-shortcut" onclick="fillTip('${p.emoji} ${p.label}!')">${p.emoji} ${p.label}</button>`)
        .join('');

    $('detailBody').innerHTML = `
        <div class="detail-hero">
            <img src="${cafeImgUrl(c.id, 700, 280)}" alt="" class="hero-photo" onload="this.style.opacity=1">
            <div class="hero-overlay"></div>
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
                <button class="action-btn btn-sec" onclick="navigateCurrent()">🗺️ 길 찾기</button>
                <button class="action-btn btn-stamp ${stamped ? 'earned' : ''}" id="stampBtn_${c.id}" onclick="earnStamp('${c.id}')" ${stamped ? 'disabled' : ''}>
                    ${stamped ? '✅ 방문완료!' : '🏆 스탬프 획득'}
                </button>
            </div>
            ${c.phone ? `<button class="action-btn btn-sec" style="margin-top:-8px" onclick="window.location='tel:${c.phone}'">📞 ${esc(c.phone)}</button>` : ''}

            <div>
                <div class="section-title">👍 이런 카페예요!</div>
                <div class="vote-grid" id="voteGrid"></div>
            </div>

            <div>
                <div class="section-title-row">
                    <span class="section-title">💬 방문 팁</span>
                    <span class="tips-count-badge" id="tipsCount"></span>
                </div>
                <div class="tips-list" id="tipsList"></div>
                <div class="tip-add-area">
                    <div class="tip-shortcuts">${shortcuts}</div>
                    <div class="tip-input-row">
                        <input type="text" id="tipInput" class="tip-input" placeholder="팁 공유 (예: 목줄로 이용 가능했어요!)">
                        <button class="tip-submit-btn" onclick="submitTip()">공유</button>
                    </div>
                </div>
            </div>
        </div>`;

    renderVotes(placeId);
    renderTips(placeId);

    setTimeout(() => {
        const inp = $('tipInput');
        if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') submitTip(); });
    }, 0);

    openPanel('detailPanel');
}

/* ===== 투표 ===== */
function getVotes(id)    { return JSON.parse(localStorage.getItem(`ddg_votes_${id}`) || '{}'); }
function getMyVotes(id)  { return JSON.parse(localStorage.getItem(`ddg_myvotes_${id}`) || '[]'); }
function saveVotes(id, v)   { localStorage.setItem(`ddg_votes_${id}`, JSON.stringify(v)); }
function saveMyVotes(id, v) { localStorage.setItem(`ddg_myvotes_${id}`, JSON.stringify(v)); }

function renderVotes(cafeId) {
    const grid    = $('voteGrid');
    if (!grid) return;
    const votes   = getVotes(cafeId);
    const myVotes = getMyVotes(cafeId);
    grid.innerHTML = VOTE_PRESETS.map(p => {
        const count = votes[p.id] || 0;
        const voted = myVotes.includes(p.id);
        return `<button class="vote-chip ${voted ? 'voted' : ''}" onclick="toggleVote('${cafeId}','${p.id}')">
            <span>${p.emoji}</span>
            <span class="vote-label">${p.label}</span>
            ${count > 0 ? `<span class="vote-count">${count}</span>` : ''}
        </button>`;
    }).join('');
}

window.toggleVote = function(cafeId, presetId) {
    const votes   = getVotes(cafeId);
    const myVotes = getMyVotes(cafeId);
    const idx = myVotes.indexOf(presetId);
    if (idx === -1) { myVotes.push(presetId); votes[presetId] = (votes[presetId] || 0) + 1; }
    else            { myVotes.splice(idx, 1);  votes[presetId] = Math.max(0, (votes[presetId] || 1) - 1); }
    saveVotes(cafeId, votes);
    saveMyVotes(cafeId, myVotes);
    renderVotes(cafeId);
};

/* ===== 팁 ===== */
function getTips(id)      { return JSON.parse(localStorage.getItem(`ddg_tips_${id}`) || '[]'); }
function saveTips(id, v)  { localStorage.setItem(`ddg_tips_${id}`, JSON.stringify(v)); }

function renderTips(cafeId) {
    const list  = $('tipsList');
    const badge = $('tipsCount');
    if (!list) return;
    const tips = getTips(cafeId);
    if (badge) badge.textContent = tips.length > 0 ? `${tips.length}개` : '';
    if (!tips.length) {
        list.innerHTML = '<div class="tips-empty">아직 팁이 없어요. 첫 번째로 공유해보세요! 🐾</div>';
        return;
    }
    list.innerHTML = tips.map(t => `
    <div class="tip-card">
        <div class="tip-text">${esc(t.text)}</div>
        <div class="tip-meta">
            <span class="tip-date">${t.date}</span>
            <button class="tip-like-btn ${t.likedByMe ? 'liked' : ''}" onclick="likeTip('${cafeId}','${t.id}')">
                ${t.likedByMe ? '❤️' : '🤍'} ${t.likes > 0 ? t.likes : '도움이 됐어요'}
            </button>
        </div>
    </div>`).join('');
}

window.fillTip = function(text) {
    const inp = $('tipInput');
    if (inp) { inp.value = text; inp.focus(); }
};

window.submitTip = function() {
    const cafeId = S.currentDetailId;
    if (!cafeId) return;
    const inp  = $('tipInput');
    const text = inp?.value?.trim();
    if (!text) { toast('팁 내용을 입력해주세요!'); return; }
    if (text.length > 120) { toast('팁은 120자 이내로 입력해주세요.'); return; }
    const tips = getTips(cafeId);
    tips.unshift({ id: Date.now().toString(), text, likes: 0, likedByMe: false, date: new Date().toISOString().split('T')[0] });
    saveTips(cafeId, tips);
    if (inp) inp.value = '';
    renderTips(cafeId);
    renderList();
    toast('💬 팁이 등록됐어요! 감사해요 🐾');
};

window.likeTip = function(cafeId, tipId) {
    const tips = getTips(cafeId);
    const tip  = tips.find(t => t.id === tipId);
    if (!tip) return;
    tip.likedByMe = !tip.likedByMe;
    tip.likes = Math.max(0, tip.likes + (tip.likedByMe ? 1 : -1));
    saveTips(cafeId, tips);
    renderTips(cafeId);
};

window.navigateCurrent = function() {
    const c = S.cafes.find(x => x.id === S.currentDetailId);
    if (!c) return;
    window.open(`https://map.kakao.com/link/to/${encodeURIComponent(c.place_name)},${c.y},${c.x}`, '_blank', 'noopener');
};

/* ===== 스탬프 ===== */
window.earnStamp = function(placeId) {
    if (S.stamps.some(s => s.placeId === placeId)) return;
    const c = S.cafes.find(x => x.id === placeId);
    if (!c) return;
    S.stamps.push({ placeId, cafeName: c.place_name, address: c.road_address_name || c.address_name, walkMin: c.walkMin, date: new Date().toISOString().split('T')[0] });
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
    const grid   = !total
        ? `<div class="empty-state"><div class="empty-emoji">🗺️</div><div class="empty-title">아직 방문한 카페가 없어요</div><div class="empty-desc">주변 카페를 찾아 스탬프를 모아보세요!</div></div>`
        : `<div class="stamps-grid">
            ${S.stamps.map(s => `<div class="stamp-item earned"><div class="stamp-emoji">☕</div><div class="stamp-name">${esc(s.cafeName)}</div><div class="stamp-date">${s.date}</div></div>`).join('')}
            ${Array(Math.max(0, 9 - total)).fill(0).map(() => `<div class="stamp-item locked"><div class="stamp-lock">🔒</div><div class="stamp-name" style="color:#CCC">비어있음</div></div>`).join('')}
           </div>`;
    $('stampBody').innerHTML = `
        <div class="stamp-total">
            <div><div class="stamp-total-label">총 스탬프</div><div class="stamp-total-sub">10개 모으면 할인 쿠폰 🎁</div></div>
            <div class="stamp-total-count">${total} 🐾</div>
        </div>
        <div class="mission-card">
            <div class="mission-head"><div class="mission-name">🎯 이번 주 미션</div><div class="mission-badge">주간 도전</div></div>
            <div class="mission-desc">도보 15분 이내 애견카페 ${wTarget}곳 방문하기</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div class="progress-text">${weekly} / ${wTarget}곳 완료</div>
        </div>
        <div class="stamps-section"><div class="stamps-section-title">📋 방문한 카페 컬렉션</div>${grid}</div>`;
    openPanel('stampPanel');
}

function weeklyCount() {
    const mon = new Date();
    mon.setDate(mon.getDate() - mon.getDay() + (mon.getDay() === 0 ? -6 : 1));
    mon.setHours(0, 0, 0, 0);
    return S.stamps.filter(s => new Date(s.date) >= mon).length;
}

function openPetPanel() {
    const p = S.pet;
    $('petBody').innerHTML = `
        <div class="pet-card">
            <div class="pet-avatar">🐕</div>
            <input id="petName" class="pet-name-input" value="${esc(p.name)}" placeholder="반려견 이름" oninput="savePet()">
        </div>
        <div class="pet-options">
            <div class="pet-row"><span class="pet-row-label">🐾 크기</span>
                <select id="petSize" onchange="savePet()">
                    <option value="small"  ${p.size==='small'  ? 'selected':''}>소형견 (~7 kg)</option>
                    <option value="medium" ${p.size==='medium' ? 'selected':''}>중형견 (7~15 kg)</option>
                    <option value="large"  ${p.size==='large'  ? 'selected':''}>대형견 (15 kg~)</option>
                </select>
            </div>
            <div class="pet-row"><span class="pet-row-label">🐩 견종</span>
                <input id="petBreed" type="text" value="${esc(p.breed)}" placeholder="말티즈, 포메라니안..." oninput="savePet()">
            </div>
        </div>
        <div class="pet-tip">💡 <strong>소형견</strong> 필터를 사용하면 몸무게 제한이 있는 카페도 정확히 필터링돼요.</div>`;
    openPanel('petPanel');
}

window.savePet = function() {
    S.pet = { name: $('petName')?.value || '우리 댕댕이', size: $('petSize')?.value || 'small', breed: $('petBreed')?.value || '믹스견' };
    localStorage.setItem('ddg_pet', JSON.stringify(S.pet));
};

function openPanel(id)  { $(id).classList.add('open'); }
function closePanel(id) { $(id).classList.remove('open'); }

function setupSheetDrag() {
    const handle = $('sheetHandle');
    const sheet  = EL.sheet;
    let startY = 0, startH = 0, dragging = false;
    const onStart = y => { startY = y; startH = sheet.getBoundingClientRect().top; dragging = true; sheet.style.transition = 'none'; };
    const onMove  = y => { if (!dragging) return; const raw = startH + (y - startY); sheet.style.transform = `translateY(${Math.max(13, Math.min(window.innerHeight - 140, raw))}px)`; };
    const onEnd   = y => {
        if (!dragging) return;
        dragging = false; sheet.style.transition = ''; sheet.style.transform = '';
        const dy = y - startY;
        snapSheet(dy < -60 ? 'expanded' : dy > 60 ? 'default' : S.sheetSnap);
    };
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

function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000, φ1 = lat1*Math.PI/180, φ2 = lat2*Math.PI/180;
    const Δφ = (lat2-lat1)*Math.PI/180, Δλ = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function setTitle(t) { EL.sheetTitle.textContent = t; }
function setBody(h)  { EL.sheetBody.innerHTML = h; }
function showEmpty(title, desc) { setBody(`<div class="empty-state"><div class="empty-emoji">🔍</div><div class="empty-title">${title}</div><div class="empty-desc">${desc}</div></div>`); }

let _toastTimer = null;
function toast(msg, ms = 2800) {
    EL.toast.textContent = msg;
    EL.toast.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => EL.toast.classList.remove('show'), ms);
}
