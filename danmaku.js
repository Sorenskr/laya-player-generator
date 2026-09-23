/**
 * ==========================================================================
 * danmaku.js - 高级动态弹幕多轨道管理与实时双向交互引擎
 * ==========================================================================
 */

window.DanmakuEngine = {
    list: [],
    container: null,
    trackListUI: null,

    getActiveList() {
        return this.list.filter(item => item.visible !== false);
    },

    refresh() {
        renderDanmakuStage();
        renderDanmakuTracksUI();
    },

    // 发射一条即时弹幕 (飘过画面)
    fireLive(text, color = '#ffffff') {
        if (!text || !text.trim()) return;
        const newTrack = {
            id: 'dm_live_' + Date.now(),
            text: text.trim(),
            top: Math.floor(Math.random() * 55) + 12,
            color: color,
            speed: 8,
            opacity: 1.0,
            visible: true
        };
        this.list.unshift(newTrack);
        this.refresh();
    }
};

(function () {
    const danmakuContainer = document.getElementById('danmaku-container');
    const danmakuTrackList = document.getElementById('danmaku-track-list');
    const inDanmakuSize = document.getElementById('in-danmaku-size');
    const txtDanmakuSize = document.getElementById('txt-danmaku-size');
    const btnAddDanmaku = document.getElementById('btn-add-danmaku');
    const inBatchDanmaku = document.getElementById('in-batch-danmaku');
    const btnParseBatch = document.getElementById('btn-parse-batch');
    const swDanmaku = document.getElementById('sw-danmaku');
    const btnQuickDmToggle = document.getElementById('btn-quick-dm-toggle');
    const btnOpenDmInput = document.getElementById('btn-open-dm-input');

    window.DanmakuEngine.container = danmakuContainer;
    window.DanmakuEngine.trackListUI = danmakuTrackList;

    const toast = (msg) => {
        if (typeof window.showToast === 'function') window.showToast(msg);
    };

    /* ==========================================================================
       1. 初始弹幕数据集 (预设高能福利弹幕，默认可见)
       ========================================================================== */
    window.DanmakuEngine.list = [
        {
            id: 'dm_init_1',
            text: '這身材太頂了吧！',
            top: 14,
            color: '#ffffff',
            speed: 9,
            opacity: 1.0,
            visible: true
        },
        {
            id: 'dm_init_2',
            text: '免費通道真的良心，太讚了',
            top: 26,
            color: '#f39c12',
            speed: 11,
            opacity: 1.0,
            visible: true
        },
        {
            id: 'dm_init_3',
            text: '前方高能，衛生紙已備好！',
            top: 42,
            color: '#fe2c55',
            speed: 8,
            opacity: 1.0,
            visible: true
        },
        {
            id: 'dm_init_4',
            text: '已截圖收藏，感謝樓主分享',
            top: 60,
            color: '#2ecc71',
            speed: 10,
            opacity: 0.95,
            visible: true
        },
        {
            id: 'dm_init_5',
            text: 'Laya 播放器牛逼！原畫質吹爆',
            top: 74,
            color: '#00d2d3',
            speed: 12,
            opacity: 1.0,
            visible: true
        }
    ];

    /* ==========================================================================
       2. 播放器画面舞台渲染函数
       ========================================================================== */
    function renderDanmakuStage() {
        if (!danmakuContainer) return;
        danmakuContainer.innerHTML = '';

        window.DanmakuEngine.list.forEach((dm) => {
            if (dm.visible === false) return;

            const el = document.createElement('div');
            el.className = 'danmaku-item';
            el.id = 'stage_' + dm.id;
            el.textContent = dm.text;
            el.style.top = dm.top + '%';
            el.style.color = dm.color;
            el.style.opacity = dm.opacity !== undefined ? dm.opacity : 1.0;
            el.style.animationDuration = dm.speed + 's';

            danmakuContainer.appendChild(el);
        });
    }

    /* ==========================================================================
       3. 右侧轨道编辑器可视化渲染与实时双向绑定
       ========================================================================== */
    function renderDanmakuTracksUI() {
        if (!danmakuTrackList) return;
        danmakuTrackList.innerHTML = '';

        window.DanmakuEngine.list.forEach((dm, index) => {
            const card = document.createElement('div');
            card.className = 'dm-track-card';
            card.dataset.id = dm.id;

            card.innerHTML = `
                <div class="dm-track-row1">
                    <input type="text" class="dm-input-text" value="${dm.text}" placeholder="彈幕內容">
                    <button class="dm-track-del" title="刪除此軌道">✕</button>
                </div>
                <div class="dm-track-row2">
                    <label>高度: <input type="number" class="dm-input-top" value="${dm.top}" min="5" max="90" style="width: 42px; background:#181b24; color:#fff; border:1px solid #2d3344; border-radius:3px; padding:2px 4px; font-size:10px;">%</label>
                    <label>速度: <input type="number" class="dm-input-speed" value="${dm.speed}" min="4" max="25" style="width: 38px; background:#181b24; color:#fff; border:1px solid #2d3344; border-radius:3px; padding:2px 4px; font-size:10px;">s</label>
                    <label>顏色: <input type="color" class="dm-input-color" value="${dm.color}"></label>
                    <label style="display:flex; align-items:center; gap:2px; cursor:pointer;">
                        <input type="checkbox" class="dm-input-vis" ${dm.visible !== false ? 'checked' : ''} style="accent-color: var(--primary);"> 顯示
                    </label>
                </div>
            `;

            // 文本即时改写
            const inputText = card.querySelector('.dm-input-text');
            inputText.addEventListener('input', (e) => {
                dm.text = e.target.value;
                const stageEl = document.getElementById('stage_' + dm.id);
                if (stageEl) stageEl.textContent = e.target.value;
            });

            // 纵向轨道高度即时调节
            const inputTop = card.querySelector('.dm-input-top');
            inputTop.addEventListener('input', (e) => {
                const val = Math.min(95, Math.max(5, parseInt(e.target.value) || 20));
                dm.top = val;
                const stageEl = document.getElementById('stage_' + dm.id);
                if (stageEl) stageEl.style.top = val + '%';
            });

            // 速度调节
            const inputSpeed = card.querySelector('.dm-input-speed');
            inputSpeed.addEventListener('input', (e) => {
                const val = Math.min(30, Math.max(3, parseInt(e.target.value) || 8));
                dm.speed = val;
                const stageEl = document.getElementById('stage_' + dm.id);
                if (stageEl) stageEl.style.animationDuration = val + 's';
            });

            // 颜色即时变换
            const inputColor = card.querySelector('.dm-input-color');
            inputColor.addEventListener('input', (e) => {
                dm.color = e.target.value;
                const stageEl = document.getElementById('stage_' + dm.id);
                if (stageEl) stageEl.style.color = e.target.value;
            });

            // 显隐独立开关
            const inputVis = card.querySelector('.dm-input-vis');
            inputVis.addEventListener('change', (e) => {
                dm.visible = e.target.checked;
                renderDanmakuStage();
            });

            // 删除单条轨道
            const btnDel = card.querySelector('.dm-track-del');
            btnDel.addEventListener('click', () => {
                window.DanmakuEngine.list.splice(index, 1);
                window.DanmakuEngine.refresh();
                toast('彈幕軌道已刪除');
            });

            danmakuTrackList.appendChild(card);
        });
    }

    /* ==========================================================================
       4. 全局字号滑动条与独立轨道新增
       ========================================================================== */
    if (inDanmakuSize && txtDanmakuSize) {
        inDanmakuSize.addEventListener('input', (e) => {
            const sizeVal = e.target.value + 'px';
            document.documentElement.style.setProperty('--danmaku-size', sizeVal);
            txtDanmakuSize.textContent = sizeVal;
        });
    }

    if (btnAddDanmaku) {
        btnAddDanmaku.addEventListener('click', () => {
            const randomTops = [18, 28, 42, 56, 70, 82];
            const randomColors = ['#ffffff', '#f39c12', '#2ecc71', '#00d2d3', '#ff7675', '#a29bfe'];
            const newIndex = window.DanmakuEngine.list.length + 1;

            const newTrack = {
                id: 'dm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                text: '自定義彈幕軌道 ' + newIndex,
                top: randomTops[newIndex % randomTops.length],
                color: randomColors[newIndex % randomColors.length],
                speed: 8 + (newIndex % 4) * 2,
                opacity: 1.0,
                visible: true
            };

            window.DanmakuEngine.list.push(newTrack);
            window.DanmakuEngine.refresh();
            toast('已新增 1 條自定義彈幕軌道');
        });
    }

    // 批量导入
    if (btnParseBatch && inBatchDanmaku) {
        btnParseBatch.addEventListener('click', () => {
            const rawText = inBatchDanmaku.value.trim();
            if (!rawText) {
                toast('請先在輸入框粘貼文本內容');
                return;
            }

            const segments = rawText.split(/[\n,，;；。]+/)
                .map(s => s.trim())
                .filter(s => s.length > 0);

            if (segments.length === 0) {
                toast('未檢測到有效文本片段');
                return;
            }

            const colorPalette = ['#ffffff', '#f39c12', '#2ecc71', '#54a0ff', '#fe2c55', '#00d2d3', '#ffeaa7'];
            const newTracks = segments.map((txt, idx) => ({
                id: 'dm_batch_' + Date.now() + '_' + idx,
                text: txt,
                top: 14 + (idx % 7) * 11,
                color: colorPalette[idx % colorPalette.length],
                speed: 8 + (idx % 5) * 1.5,
                opacity: 1.0,
                visible: true
            }));

            window.DanmakuEngine.list = [...window.DanmakuEngine.list, ...newTracks];
            window.DanmakuEngine.refresh();

            inBatchDanmaku.value = '';
            toast(`成功識別並導入 ${segments.length} 條彈幕軌道！`);
        });
    }

    /* ==========================================================================
       5. 胶囊按钮切换与播放器画面直接发送弹幕
       ========================================================================== */
    function syncCapsuleState(isOn) {
        if (!btnQuickDmToggle) return;
        if (isOn) {
            btnQuickDmToggle.classList.add('active');
        } else {
            btnQuickDmToggle.classList.remove('active');
        }
    }

    if (swDanmaku && danmakuContainer) {
        swDanmaku.addEventListener('change', (e) => {
            danmakuContainer.style.display = e.target.checked ? 'block' : 'none';
            syncCapsuleState(e.target.checked);
        });
    }

    if (btnQuickDmToggle && swDanmaku) {
        btnQuickDmToggle.addEventListener('click', () => {
            swDanmaku.checked = !swDanmaku.checked;
            swDanmaku.dispatchEvent(new Event('change'));
            toast(swDanmaku.checked ? '彈幕已開啓' : '彈幕已關閉');
        });
    }

    // 点击播放器底部输入框：直接弹出发射窗口，并即时漂移在屏幕上
    if (btnOpenDmInput) {
        btnOpenDmInput.addEventListener('click', () => {
            const userDm = prompt('請輸入你要發射的實時彈幕：', document.getElementById('disp-dm-placeholder').textContent);
            if (userDm && userDm.trim()) {
                window.DanmakuEngine.fireLive(userDm.trim(), '#ff7675');
                toast(`🚀 彈幕已發射：「${userDm.trim()}」`);
            }
        });
    }

    window.DanmakuEngine.refresh();
})();
