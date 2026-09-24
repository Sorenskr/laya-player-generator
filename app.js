/**
 * ==========================================================================
 * app.js - 全局中枢控制、彻底解决录屏黑屏、全屏实机预览与双皮肤切换引擎
 * ==========================================================================
 */

window.showToast = function (msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 260);
    }, 2800);
};

window.switchRightTab = function (mode) {
    const tabWeb = document.getElementById('tab-btn-web');
    const tabDy = document.getElementById('tab-btn-dy');
    const tabDm = document.getElementById('tab-btn-dm');
    const panelWeb = document.getElementById('panel-web-settings');
    const panelDy = document.getElementById('panel-dy-settings');
    const panelDm = document.getElementById('panel-dm-settings');

    [tabWeb, tabDy, tabDm].forEach(b => b && b.classList.remove('active'));
    [panelWeb, panelDy, panelDm].forEach(p => p && p.classList.remove('active'));

    if (mode === 'web') {
        if (tabWeb) tabWeb.classList.add('active');
        if (panelWeb) panelWeb.classList.add('active');
    } else if (mode === 'dy') {
        if (tabDy) tabDy.classList.add('active');
        if (panelDy) panelDy.classList.add('active');
    } else if (mode === 'dm') {
        if (tabDm) tabDm.classList.add('active');
        if (panelDm) panelDm.classList.add('active');
    }
};

// 官方原版 3D 拟真 Laya 图标 Base64 (稳定展示，防止破损)
const OFFICIAL_LAYA_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjUwIiBmaWxsPSIjMEQ1QkUxIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMzgiIGZpbGw9IiMyMTcyRjUiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyNiIgZmlsbD0iIzNEODhGRCIvPjxwYXRoIGQ9Ik0yOCAzMiBoMTIgdiAyNCBoMTYgdiAxMSBIMjggeiIgZmlsbD0iI2ZmZmZmZiIvPjx0ZXh0IHg9IjU1IiB5PSI2NCIgZm9udC1zaXplPSIyOCIgZm9udC13ZWlnaHQ9IjkwMCIgZm9udC1zdHlsZT0iaXRhbGljIiBmaWxsPSIjZmZmZmZmIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+YXlhPC90ZXh0Pjwvc3ZnPg==";

(function () {
    const tabWeb = document.getElementById('tab-btn-web');
    const tabDy = document.getElementById('tab-btn-dy');
    const tabDm = document.getElementById('tab-btn-dm');

    if (tabWeb) tabWeb.addEventListener('click', () => window.switchRightTab('web'));
    if (tabDy) tabDy.addEventListener('click', () => window.switchRightTab('dy'));
    if (tabDm) tabDm.addEventListener('click', () => window.switchRightTab('dm'));

    /* ==========================================================================
       A. 波浪热度曲线
       ========================================================================== */
    const waveCanvas = document.getElementById('waveform-canvas');
    const wrapWaveform = document.getElementById('wrap-waveform');
    const swWaveform = document.getElementById('sw-waveform');
    const selWavePreset = document.getElementById('sel-waveform-preset');
    const inWaveHeight = document.getElementById('in-wave-height');
    const txtWaveHeight = document.getElementById('txt-wave-height');
    const inCustomWave = document.getElementById('in-custom-wave');
    const wrapCustomWave = document.getElementById('wrap-custom-wave');

    window.drawWaveform = function () {
        if (!swWaveform || !wrapWaveform || !waveCanvas) return;
        if (!swWaveform.checked) {
            wrapWaveform.style.display = 'none';
            return;
        }
        wrapWaveform.style.display = 'block';

        const ctx = waveCanvas.getContext('2d');
        const w = (waveCanvas.width = waveCanvas.offsetWidth || 800);
        const h = (waveCanvas.height = parseInt(inWaveHeight.value) || 32);

        ctx.clearRect(0, 0, w, h);

        let points = [15, 25, 60, 40, 85, 95, 45, 75, 30, 10];
        if (selWavePreset.value === 'climax') {
            points = [10, 15, 20, 25, 40, 50, 70, 85, 100, 90];
        } else if (selWavePreset.value === 'dense') {
            points = [30, 80, 45, 90, 35, 85, 40, 95, 50, 70, 30];
        } else if (selWavePreset.value === 'custom') {
            points = inCustomWave.value.split(',').map(n => Math.min(100, Math.max(0, parseInt(n.trim()) || 0)));
            if (points.length < 2) points = [10, 80, 20];
        }

        ctx.beginPath();
        ctx.moveTo(0, h);
        const step = w / (points.length - 1);
        for (let i = 0; i < points.length; i++) {
            const x = i * step;
            const y = h - (points[i] / 100) * (h - 4);
            if (i === 0) {
                ctx.lineTo(x, y);
            } else {
                const prevX = (i - 1) * step;
                const prevY = h - (points[i - 1] / 100) * (h - 4);
                const cx = (prevX + x) / 2;
                ctx.bezierCurveTo(cx, prevY, cx, y, x, y);
            }
        }
        ctx.lineTo(w, h);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    };

    if (selWavePreset) {
        selWavePreset.addEventListener('change', () => {
            if (wrapCustomWave) wrapCustomWave.style.display = selWavePreset.value === 'custom' ? 'flex' : 'none';
            window.drawWaveform();
            triggerSaveStorage();
        });
    }

    if (inWaveHeight && txtWaveHeight && wrapWaveform) {
        inWaveHeight.addEventListener('input', (e) => {
            txtWaveHeight.textContent = e.target.value + 'px';
            wrapWaveform.style.height = e.target.value + 'px';
            window.drawWaveform();
            triggerSaveStorage();
        });
    }

    if (inCustomWave) {
        inCustomWave.addEventListener('input', () => {
            window.drawWaveform();
            triggerSaveStorage();
        });
    }

    window.addEventListener('resize', window.drawWaveform);
    setTimeout(window.drawWaveform, 200);

    /* ==========================================================================
       B. 内部控件互动
       ========================================================================== */
    const btnCycleSpeed = document.getElementById('btn-cycle-speed');
    const dispSpeedVal = document.getElementById('disp-speed-val');
    const speeds = ['1.0X', '1.25X', '1.5X', '2.0X', '0.75X'];
    let speedIdx = 0;
    if (btnCycleSpeed && dispSpeedVal) {
        btnCycleSpeed.addEventListener('click', () => {
            speedIdx = (speedIdx + 1) % speeds.length;
            dispSpeedVal.textContent = speeds[speedIdx];
            const previewVideo = document.getElementById('preview-video');
            if (previewVideo) previewVideo.playbackRate = parseFloat(speeds[speedIdx]);
            window.showToast(`已切换倍速为：${speeds[speedIdx]}`);
            triggerSaveStorage();
        });
    }

    const dispBotRes = document.getElementById('disp-bot-res');
    const resOptions = ['原畫 1080P 60幀 ▾', 'Laya 藍光 4K ▾', '4K 120P 極致 ▾', '超清 720P ▾'];
    let resIdx = 0;
    if (dispBotRes) {
        dispBotRes.addEventListener('click', () => {
            resIdx = (resIdx + 1) % resOptions.length;
            dispBotRes.textContent = resOptions[resIdx];
            window.showToast(`已切换清晰度：${resOptions[resIdx].replace(' ▾', '')}`);
            triggerSaveStorage();
        });
    }

    const dyBtnLike = document.getElementById('dy-btn-like');
    const dySvgLike = document.getElementById('dy-svg-like');
    let isLiked = false;
    if (dyBtnLike && dySvgLike) {
        dyBtnLike.addEventListener('click', () => {
            isLiked = !isLiked;
            dySvgLike.setAttribute('fill', isLiked ? '#fe2c55' : '#ffffff');
            dyBtnLike.style.transform = 'scale(1.2)';
            setTimeout(() => { dyBtnLike.style.transform = 'scale(1)'; }, 150);
            window.showToast(isLiked ? '❤️ 点赞成功！' : '已取消点赞');
        });
    }

    const dyBtnStar = document.getElementById('dy-btn-star');
    const dySvgStar = document.getElementById('dy-svg-star');
    let isStarred = false;
    if (dyBtnStar && dySvgStar) {
        dyBtnStar.addEventListener('click', () => {
            isStarred = !isStarred;
            dySvgStar.setAttribute('fill', isStarred ? '#f1c40f' : '#ffffff');
            dyBtnStar.style.transform = 'scale(1.2)';
            setTimeout(() => { dyBtnStar.style.transform = 'scale(1)'; }, 150);
            window.showToast(isStarred ? '⭐ 已加入收藏！' : '已取消收藏');
        });
    }

    const dyBtnFollow = document.getElementById('dy-btn-follow');
    if (dyBtnFollow) {
        dyBtnFollow.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dyBtnFollow.textContent === '+') {
                dyBtnFollow.textContent = '✓';
                dyBtnFollow.classList.add('followed');
                window.showToast('已成功关注作者！');
            } else {
                dyBtnFollow.textContent = '+';
                dyBtnFollow.classList.remove('followed');
                window.showToast('已取消关注');
            }
        });
    }

    /* ==========================================================================
       ★ C. 手机端双风格原生切换引擎 (通过类名锁定，杜绝样式覆盖失效)
       ========================================================================== */
    const selMobileSkin = document.getElementById('sel-mobile-skin');
    const renderTarget = document.getElementById('render-target');

    function applyMobileSkin(skin) {
        if (!renderTarget) return;
        if (skin === 'laya') {
            renderTarget.classList.remove('skin-douyin');
            renderTarget.classList.add('skin-laya');
        } else {
            renderTarget.classList.remove('skin-laya');
            renderTarget.classList.add('skin-douyin');
        }
        triggerSaveStorage();
    }

    if (selMobileSkin) {
        selMobileSkin.addEventListener('change', (e) => {
            applyMobileSkin(e.target.value);
            window.showToast(e.target.value === 'laya' ? '💎 已切换为：Laya 官方原生交友社区风格 (图三)' : '📱 已切换为：抖音原生短视频风格 (图二)');
        });
    }

    /* ==========================================================================
       D. 全站显隐开关与文案绑定
       ========================================================================== */
    const bindToggle = (switchId, targetId) => {
        const sw = document.getElementById(switchId);
        const target = document.getElementById(targetId);
        if (sw && target) {
            sw.addEventListener('change', (e) => {
                target.style.display = e.target.checked ? '' : 'none';
                if (switchId === 'sw-waveform') window.drawWaveform();
                triggerSaveStorage();
            });
        }
    };

    bindToggle('sw-danmaku', 'danmaku-container');
    bindToggle('sw-center-btn', 'btn-toggle-playback');
    bindToggle('sw-center-pill', 'disp-center-pill');
    bindToggle('sw-bot-dm-group', 'wrap-bot-dm-group');
    bindToggle('sw-viewer', 'wrap-viewer-pill');
    bindToggle('sw-banner', 'wrap-banner');
    bindToggle('sw-free-pill', 'wrap-free-pill');
    bindToggle('sw-laya-badge', 'wrap-laya-badge');
    bindToggle('sw-vip-tag', 'wrap-vip-tag');
    bindToggle('sw-back-btn', 'wrap-back-btn');
    bindToggle('sw-top-right', 'wrap-top-right');
    bindToggle('sw-bottom-bar', 'wrap-bottom-bar');
    bindToggle('sw-waveform', 'wrap-waveform');
    bindToggle('sw-dy-gold', 'dy-wrap-gold');
    bindToggle('sw-dy-campaign', 'dy-wrap-campaign');
    bindToggle('sw-dy-right-bar', 'dy-wrap-right-bar');
    bindToggle('sw-dy-top-nav', 'dy-wrap-top-nav');

    // 核心新增：【🔥热点】栏显隐开关联动 (默认关闭)
    const swDyHotspot = document.getElementById('sw-dy-hotspot');
    const dyWrapHotspot = document.getElementById('dy-wrap-hotspot');
    if (swDyHotspot && dyWrapHotspot) {
        swDyHotspot.addEventListener('change', (e) => {
            dyWrapHotspot.style.display = e.target.checked ? 'flex' : 'none';
            triggerSaveStorage();
        });
    }

    const bindText = (inputId, outputId) => {
        const inp = document.getElementById(inputId);
        const out = document.getElementById(outputId);
        if (inp && out) {
            inp.addEventListener('input', (e) => { 
                out.textContent = e.target.value; 
                triggerSaveStorage();
            });
        }
    };

    bindText('in-title', 'disp-title');
    bindText('in-banner-body', 'disp-banner-body');
    bindText('in-dm-placeholder', 'disp-dm-placeholder');
    bindText('in-dy-likes', 'dy-val-likes');
    bindText('in-dy-comments', 'dy-val-comments');
    bindText('in-dy-stars', 'dy-val-stars');
    bindText('in-dy-shares', 'dy-val-shares');
    bindText('in-dy-author', 'dy-disp-author');
    bindText('in-dy-desc', 'dy-disp-desc');
    bindText('in-dy-tags', 'dy-disp-tags');
    bindText('in-dy-campaign', 'dy-disp-campaign');
    bindText('in-dy-gold-title', 'dy-disp-gold-title');
    bindText('in-dy-hotspot-title', 'dy-disp-hotspot-title');
    bindText('in-dy-hotspot-views', 'dy-disp-hotspot-views');

    const inDyMsgCount = document.getElementById('in-dy-msg-count');
    const dyDispMsgBubble = document.getElementById('dy-disp-msg-bubble');
    if (inDyMsgCount && dyDispMsgBubble) {
        inDyMsgCount.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val) {
                dyDispMsgBubble.textContent = val;
                dyDispMsgBubble.style.display = 'inline-flex';
            } else {
                dyDispMsgBubble.style.display = 'none';
            }
            triggerSaveStorage();
        });
    }

    const selDmPreset = document.getElementById('sel-dm-preset');
    const inDmPlaceholder = document.getElementById('in-dm-placeholder');
    const dispDmPlaceholder = document.getElementById('disp-dm-placeholder');
    if (selDmPreset && inDmPlaceholder && dispDmPlaceholder) {
        selDmPreset.addEventListener('change', (e) => {
            if (e.target.value !== 'custom') {
                inDmPlaceholder.value = e.target.value;
                dispDmPlaceholder.textContent = e.target.value;
            } else {
                inDmPlaceholder.focus();
                inDmPlaceholder.select();
            }
            triggerSaveStorage();
        });
    }

    // 头像装载与恢复默认
    const dyAvatarUploader = document.getElementById('dy-avatar-uploader');
    const dyAvatarImg = document.getElementById('dy-avatar-img');
    const btnResetAvatar = document.getElementById('btn-reset-avatar');

    if (dyAvatarImg && !dyAvatarImg.src) {
        dyAvatarImg.src = OFFICIAL_LAYA_B64;
    }

    if (dyAvatarUploader && dyAvatarImg) {
        dyAvatarUploader.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                dyAvatarImg.src = evt.target.result;
                window.showToast('头像已成功更换！');
                triggerSaveStorage();
            };
            reader.readAsDataURL(file);
        });
    }

    if (btnResetAvatar && dyAvatarImg) {
        btnResetAvatar.addEventListener('click', () => {
            dyAvatarImg.src = OFFICIAL_LAYA_B64;
            window.showToast('已恢复官方 3D Laya 头像！');
            triggerSaveStorage();
        });
    }

    /* ==========================================================================
       ★ E. 全屏实机预览模式 (所见即所得、真机比例复刻、带播放/暂停)
       ========================================================================== */
    const btnOpenPreview = document.getElementById('btn-open-preview');
    const btnClosePreview = document.getElementById('btn-close-preview');
    const fullscreenPreviewModal = document.getElementById('fullscreen-preview-modal');
    const previewStageWrap = document.getElementById('preview-stage-wrap');
    const playerStage = document.querySelector('.player-stage');
    const btnPreviewPauseToggle = document.getElementById('btn-preview-pause-toggle');

    if (btnOpenPreview && fullscreenPreviewModal && renderTarget && previewStageWrap) {
        btnOpenPreview.addEventListener('click', () => {
            previewStageWrap.appendChild(renderTarget);
            fullscreenPreviewModal.classList.add('show');
            window.showToast('🖥️ 全屏实机预览已开启：预览效果与下载 100% 一致');
        });
    }

    function exitFullscreenPreview() {
        if (!fullscreenPreviewModal || !renderTarget || !playerStage) return;
        playerStage.appendChild(renderTarget);
        fullscreenPreviewModal.classList.remove('show');
    }

    if (btnClosePreview) btnClosePreview.addEventListener('click', exitFullscreenPreview);

    if (btnPreviewPauseToggle) {
        btnPreviewPauseToggle.addEventListener('click', () => {
            if (window.PlayerEngine && window.PlayerEngine.togglePlayback) {
                window.PlayerEngine.togglePlayback();
            }
        });
    }

    /* ==========================================================================
       F. 全自动 LocalStorage 记忆系统与“一键重置”
       ========================================================================== */
    const STORAGE_KEY = 'LAYA_STUDIO_PERSIST_V4';
    let saveTimeout = null;

    function triggerSaveStorage() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveAllToStorage, 350);
    }
    window.triggerSaveStorage = triggerSaveStorage;

    function saveAllToStorage() {
        try {
            const data = {
                inputs: {},
                checkboxes: {},
                selects: {},
                avatar: document.getElementById('dy-avatar-img')?.src || '',
                danmakuList: window.DanmakuEngine ? window.DanmakuEngine.list : [],
                danmakuMode: window.DanmakuEngine ? window.DanmakuEngine.mode : 'scroll',
                skin: document.getElementById('sel-mobile-skin')?.value || 'douyin'
            };

            document.querySelectorAll('input[type="text"], input[type="number"], input[type="range"], textarea').forEach(el => {
                if (el.id) data.inputs[el.id] = el.value;
            });
            document.querySelectorAll('input[type="checkbox"]').forEach(el => {
                if (el.id) data.checkboxes[el.id] = el.checked;
            });
            document.querySelectorAll('select').forEach(el => {
                if (el.id) data.selects[el.id] = el.value;
            });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Storage save:', e);
        }
    }

    function loadAllFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                if (dyAvatarImg) dyAvatarImg.src = OFFICIAL_LAYA_B64;
                return;
            }
            const data = JSON.parse(raw);

            if (data.inputs) {
                Object.entries(data.inputs).forEach(([id, val]) => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.value = val;
                        el.dispatchEvent(new Event('input'));
                    }
                });
            }

            if (data.checkboxes) {
                Object.entries(data.checkboxes).forEach(([id, checked]) => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.checked = checked;
                        el.dispatchEvent(new Event('change'));
                    }
                });
            }

            if (data.selects) {
                Object.entries(data.selects).forEach(([id, val]) => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.value = val;
                        el.dispatchEvent(new Event('change'));
                    }
                });
            }

            if (data.avatar && dyAvatarImg) {
                dyAvatarImg.src = data.avatar;
            } else if (dyAvatarImg) {
                dyAvatarImg.src = OFFICIAL_LAYA_B64;
            }

            if (data.skin && selMobileSkin) {
                selMobileSkin.value = data.skin;
                applyMobileSkin(data.skin);
            }

            if (data.danmakuList && window.DanmakuEngine) {
                window.DanmakuEngine.list = data.danmakuList;
                if (data.danmakuMode) window.DanmakuEngine.mode = data.danmakuMode;
                window.DanmakuEngine.refresh();
            }

            window.showToast('✨ 已自动恢复上次保存的配置！');
        } catch (e) {
            console.warn('Storage load:', e);
        }
    }

    const btnGlobalReset = document.getElementById('btn-global-reset');
    if (btnGlobalReset) {
        btnGlobalReset.addEventListener('click', () => {
            if (confirm('确认要一键清除所有本地修改并恢复初始默认设置吗？')) {
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
            }
        });
    }

    setTimeout(loadAllFromStorage, 100);

    /* ==========================================================================
       G. 全局繁简一键互转 (作用于左侧)
       ========================================================================== */
    let isTraditional = true;
    const s2tDict = {
        '视频': '視頻', '暗号': '暗號', '独家': '獨家', '私密': '私密', '免费': '免費',
        '通道': '通道', '正在观看': '正在觀看', '原画': '原畫', '原画质连线': '原畫質連線',
        '音轨': '音軌', '设置': '設置', '限时特权': '限時特權',
        '已解锁完整无码未删减版，点击任意处播放': '已解鎖完整無碼未刪減版，點擊任意處播放',
        '特权生效中': '特權生效中', '点击继续播放': '點擊繼續播放', '点击暂停播放': '點擊暫停播放', '弹幕': '彈幕',
        '倍速': '倍速', '精选': '精選', '热点': '熱點', '关注': '關注', '全屏观看': '全屏觀看',
        '首页': '首頁', '朋友': '朋友', '消息': '消息', '我': '我', '发现': '發現', '瞬间': '瞬間', '视讯': '視訊', '娱乐': '娛樂', '我的': '我的'
    };
    const t2sDict = Object.fromEntries(Object.entries(s2tDict).map(([k, v]) => [v, k]));

    const btnToggleLang = document.getElementById('btn-toggle-lang');
    if (btnToggleLang) {
        btnToggleLang.addEventListener('click', () => {
            isTraditional = !isTraditional;
            const dict = isTraditional ? s2tDict : t2sDict;
            if (!renderTarget) return;

            const walker = document.createTreeWalker(renderTarget, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while ((node = walker.nextNode())) {
                let txt = node.nodeValue;
                if (!txt || !txt.trim()) continue;
                for (const [s, t] of Object.entries(dict)) {
                    txt = txt.replaceAll(s, t);
                }
                node.nodeValue = txt;
            }
            window.showToast(isTraditional ? '画面已切换为：繁体中文' : '画面已切换为：简体中文');
        });
    }

    /* ==========================================================================
       H. 超高清截图导出
       ========================================================================== */
    const btnSaveImg = document.getElementById('btn-save-img');
    if (btnSaveImg) {
        btnSaveImg.addEventListener('click', () => {
            if (!renderTarget) return;

            window.showToast('📸 正在渲染超高清图片...');

            html2canvas(renderTarget, {
                scale: 2.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#000000',
                onclone: (clonedDoc) => {
                    const containerBox = renderTarget.getBoundingClientRect();
                    const cW = containerBox.width;
                    const cH = containerBox.height;
                    const cAspect = cW / cH;

                    const mediaDims = window.PlayerEngine ? window.PlayerEngine.getMediaNaturalDimensions() : { width: 1280, height: 720 };
                    const mW = mediaDims.width;
                    const mH = mediaDims.height;
                    const mAspect = mW / mH;

                    const zoom = (parseFloat(document.getElementById('in-media-scale').value) || 100) / 100;
                    const fitMode = document.getElementById('sel-crop-fit')?.value || 'cover';

                    let renderW, renderH;
                    if (fitMode === 'cover') {
                        if (mAspect > cAspect) {
                            renderH = cH * zoom;
                            renderW = renderH * mAspect;
                        } else {
                            renderW = cW * zoom;
                            renderH = renderW / mAspect;
                        }
                    } else {
                        if (mAspect > cAspect) {
                            renderW = cW * zoom;
                            renderH = renderW / mAspect;
                        } else {
                            renderH = cH * zoom;
                            renderW = renderH * mAspect;
                        }
                    }

                    const posX = (parseFloat(document.getElementById('in-pos-x').value) || 50) / 100;
                    const posY = (parseFloat(document.getElementById('in-pos-y').value) || 50) / 100;
                    const offX = (cW - renderW) * posX;
                    const offY = (cH - renderH) * posY;

                    const clonedMedia = window.PlayerEngine.isVideoMode 
                        ? clonedDoc.getElementById('preview-video')
                        : clonedDoc.getElementById('preview-img');

                    if (clonedMedia) {
                        clonedMedia.style.position = 'absolute';
                        clonedMedia.style.width = renderW + 'px';
                        clonedMedia.style.height = renderH + 'px';
                        clonedMedia.style.left = offX + 'px';
                        clonedMedia.style.top = offY + 'px';
                        clonedMedia.style.objectFit = 'fill';
                        clonedMedia.style.transform = 'none';
                    }

                    const origBox = renderTarget.getBoundingClientRect();
                    const origItems = renderTarget.querySelectorAll('.danmaku-item');
                    const clonedContainer = clonedDoc.getElementById('danmaku-container');
                    const clonedItems = clonedContainer ? clonedContainer.querySelectorAll('.danmaku-item') : [];

                    origItems.forEach((orig, idx) => {
                        if (clonedItems[idx]) {
                            const r = orig.getBoundingClientRect();
                            clonedItems[idx].style.animation = 'none';
                            clonedItems[idx].style.transform = 'none';
                            clonedItems[idx].style.left = (r.left - origBox.left) + 'px';
                            clonedItems[idx].style.top = (r.top - origBox.top) + 'px';
                        }
                    });
                }
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `Laya_${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.showToast('✅ 高清图片已保存！');
            }).catch(err => {
                window.showToast(`❌ 导出失败: ${err.message}`);
            });
        });
    }

    /* ==========================================================================
       ★ I. 核心修复：彻底消灭录屏黑屏 (外壳剥离纯黑背景 + 100% 透明 UI 合成)
       ========================================================================== */
    const btnSaveVid = document.getElementById('btn-save-vid');
    if (btnSaveVid) {
        btnSaveVid.addEventListener('click', async () => {
            const previewVideo = document.getElementById('preview-video');
            const inMediaScale = document.getElementById('in-media-scale');
            const inPosY = document.getElementById('in-pos-y');
            const inPosX = document.getElementById('in-pos-x');

            if (!window.PlayerEngine || !window.PlayerEngine.isVideoMode || !previewVideo) {
                window.showToast('提示：请先上传一段 MP4/WebM 视频素材！');
                return;
            }

            let recordSeconds = parseInt(document.getElementById('sel-record-sec').value);
            if (document.getElementById('sel-record-sec').value === 'custom') {
                recordSeconds = Math.max(1, parseInt(document.getElementById('in-custom-sec').value) || 8);
            }

            btnSaveVid.textContent = `⏳ 预处理 UI 蒙版...`;
            btnSaveVid.disabled = true;

            try {
                const isDouyin = renderTarget.classList.contains('mode-mobile-port');
                const outW = isDouyin ? 720 : 1280;
                const outH = isDouyin ? 1280 : 720;

                // ★ 致命修复：在克隆节点中彻底抹除 .player-box 的 #000 黑色背景，防止遮盖视频
                const uiSnapshotCanvas = await html2canvas(renderTarget, {
                    backgroundColor: null, // 透明背景
                    scale: outW / renderTarget.offsetWidth,
                    useCORS: true,
                    allowTaint: true,
                    onclone: (clonedDoc) => {
                        const target = clonedDoc.getElementById('render-target');
                        if (target) {
                            // 移除任何带有 background 的类
                            target.className = target.className.replace(/\bplayer-box\b/, '');
                            target.style.setProperty('background', 'transparent', 'important');
                            target.style.setProperty('background-color', 'transparent', 'important');
                            target.style.setProperty('box-shadow', 'none', 'important');
                            target.style.setProperty('border', 'none', 'important');
                        }
                        const media = clonedDoc.getElementById('player-media-wrap');
                        if (media) media.style.display = 'none';
                        const dm = clonedDoc.getElementById('danmaku-container');
                        if (dm) dm.style.display = 'none';
                    }
                });

                btnSaveVid.textContent = `⏳ 录制合成中 (${recordSeconds}s)...`;

                const offCanvas = document.createElement('canvas');
                offCanvas.width = outW;
                offCanvas.height = outH;
                const ctx = offCanvas.getContext('2d');

                // 音频抓取保护
                let audioTracks = [];
                try {
                    if (!window._audioCtx) {
                        window._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    }
                    if (window._audioCtx.state === 'suspended') {
                        await window._audioCtx.resume();
                    }
                    if (!window._audioSrcNode) {
                        window._audioSrcNode = window._audioCtx.createMediaElementSource(previewVideo);
                        window._audioDstNode = window._audioCtx.createMediaStreamDestination();
                        window._audioSrcNode.connect(window._audioDstNode);
                        window._audioSrcNode.connect(window._audioCtx.destination);
                    }
                    audioTracks = window._audioDstNode.stream.getAudioTracks();
                } catch (audioErr) {
                    console.warn('Audio fallback:', audioErr);
                }

                const canvasStream = offCanvas.captureStream(30);
                const combinedStream = new MediaStream([
                    ...canvasStream.getVideoTracks(),
                    ...audioTracks
                ]);

                let mime = 'video/webm';
                if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
                    mime = 'video/mp4;codecs=avc1';
                } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                    mime = 'video/mp4';
                }

                const recorder = new MediaRecorder(combinedStream, {
                    mimeType: mime,
                    videoBitsPerSecond: 6000000
                });

                const chunks = [];
                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = () => {
                    if (chunks.length === 0) {
                        window.showToast('❌ 录制数据为空，请重试');
                        btnSaveVid.textContent = '合成下载视频 (带边框与原声)';
                        btnSaveVid.disabled = false;
                        return;
                    }

                    const blob = new Blob(chunks, { type: mime });
                    const downloadUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.style.display = 'none';
                    link.download = `Laya_${isDouyin ? 'Mobile' : 'WebPlayer'}_${Date.now()}.${mime.includes('mp4') ? 'mp4' : 'webm'}`;
                    link.href = downloadUrl;
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => {
                        document.body.removeChild(link);
                        URL.revokeObjectURL(downloadUrl);
                    }, 500);

                    btnSaveVid.textContent = '合成下载视频 (带边框与原声)';
                    btnSaveVid.disabled = false;
                    window.showToast('🎉 视频合成导出成功！绝无黑屏！');
                };

                const danmakuParticles = (window.DanmakuEngine ? window.DanmakuEngine.getActiveList() : []).map((dm, idx) => ({
                    text: dm.text,
                    color: isDouyin ? '#ffffff' : dm.color,
                    y: (outH * (isDouyin ? (12 + (idx % 5) * 8) : dm.top)) / 100,
                    x: outW + (idx * 190),
                    speed: (dm.speed ? (22 - dm.speed) : 9) * 0.95
                }));

                previewVideo.currentTime = 0;
                await new Promise(resolve => {
                    const onSeeked = () => {
                        previewVideo.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    previewVideo.addEventListener('seeked', onSeeked);
                    setTimeout(resolve, 300);
                });

                await previewVideo.play();
                if (window.PlayerEngine && window.PlayerEngine.updatePlayStateUI) {
                    window.PlayerEngine.updatePlayStateUI(true);
                }

                recorder.start(250);

                let isRecording = true;
                const drawVideoFrame = () => {
                    if (!isRecording) return;

                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, outW, outH);

                    // 1. 真实比例绘制视频底层
                    const vw = previewVideo.videoWidth || 1280;
                    const vh = previewVideo.videoHeight || 720;
                    const mAspect = vw / vh;
                    const cAspect = outW / outH;
                    const zoom = (parseFloat(inMediaScale.value) || 100) / 100;
                    const fitMode = document.getElementById('sel-crop-fit')?.value || 'cover';

                    let rw, rh;
                    if (fitMode === 'cover') {
                        if (mAspect > cAspect) {
                            rh = outH * zoom;
                            rw = rh * mAspect;
                        } else {
                            rw = outW * zoom;
                            rh = rw / mAspect;
                        }
                    } else {
                        if (mAspect > cAspect) {
                            rw = outW * zoom;
                            rh = rw / mAspect;
                        } else {
                            rh = outH * zoom;
                            rw = rh * mAspect;
                        }
                    }

                    const posX = (parseFloat(inPosX.value) || 50) / 100;
                    const posY = (parseFloat(inPosY.value) || 50) / 100;
                    const offX = (outW - rw) * posX;
                    const offY = (outH - rh) * posY;

                    if (previewVideo.readyState >= 2) {
                        ctx.drawImage(previewVideo, offX, offY, rw, rh);
                    }

                    // 2. 覆盖纯透明 UI 图层 (包含边框与全部按钮，绝无纯黑底布)
                    ctx.drawImage(uiSnapshotCanvas, 0, 0, outW, outH);

                    // 3. 动态绘制弹幕
                    const swDm = document.getElementById('sw-danmaku');
                    if (swDm && swDm.checked) {
                        const fontSize = (parseInt(document.getElementById('in-danmaku-size').value) || 16) * (outW / 960);
                        ctx.font = `bold ${fontSize}px sans-serif`;
                        ctx.lineWidth = 3.5;
                        ctx.strokeStyle = '#000000';

                        danmakuParticles.forEach(p => {
                            p.x -= p.speed;
                            if (p.x < -ctx.measureText(p.text).width - 60) {
                                p.x = outW + Math.random() * 120;
                            }
                            ctx.strokeText(p.text, p.x, p.y);
                            ctx.fillStyle = p.color;
                            ctx.fillText(p.text, p.x, p.y);
                        });
                    }

                    requestAnimationFrame(drawVideoFrame);
                };

                drawVideoFrame();

                setTimeout(() => {
                    isRecording = false;
                    if (recorder.state !== 'inactive') {
                        recorder.stop();
                    }
                }, recordSeconds * 1000);

            } catch (err) {
                console.error(err);
                btnSaveVid.textContent = '合成下载视频 (带边框与原声)';
                btnSaveVid.disabled = false;
                window.showToast(`导出异常: ${err.message}`);
            }
        });
    }
})();
