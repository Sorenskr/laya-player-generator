/**
 * ==========================================================================
 * player.js - 媒体播放器核心控制引擎
 * ==========================================================================
 */

// 全局播放器共享状态对象 (挂载到 window 供 danmaku.js 与 app.js 访问)
window.PlayerEngine = {
    isVideoMode: false,
    previewVideo: null,
    previewImg: null,
    renderTarget: null,
    
    // 时间转换与格式化工具函数
    timeToSec(timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.trim().split(':').map(Number);
        if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
        if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
        return parseInt(timeStr, 10) || 0;
    },

    secToTime(totalSec) {
        if (isNaN(totalSec) || totalSec < 0) totalSec = 0;
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = Math.floor(totalSec % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
};

(function () {
    // 基础 DOM 元素缓存
    const renderTarget = document.getElementById('render-target');
    const previewImg = document.getElementById('preview-img');
    const previewVideo = document.getElementById('preview-video');
    const mediaUploader = document.getElementById('media-uploader');
    const dyFullscreenPill = document.getElementById('dy-fullscreen-pill');

    // 播放/暂停控制元素
    const btnTogglePlayback = document.getElementById('btn-toggle-playback');
    const btnBotPlayState = document.getElementById('btn-bot-play-state');
    const iconCenterPlay = document.getElementById('icon-center-play');
    const iconCenterPause = document.getElementById('icon-center-pause');
    const iconBotPlay = document.getElementById('icon-bot-play');
    const iconBotPause = document.getElementById('icon-bot-pause');
    const dispCenterPill = document.getElementById('disp-center-pill');

    // 时间与进度控制元素
    const inStartTime = document.getElementById('in-start-time');
    const inTotalTime = document.getElementById('in-total-time');
    const dispTime = document.getElementById('disp-time');
    const swSyncVideoTime = document.getElementById('sw-sync-video-time');
    const inProgress = document.getElementById('in-progress');
    const txtProgress = document.getElementById('txt-progress');
    const dispProgressBar = document.getElementById('disp-progress-bar');
    const inBuffer = document.getElementById('in-buffer');
    const txtBuffer = document.getElementById('txt-buffer');
    const dispBufferBar = document.getElementById('disp-buffer-bar');
    const progressClickBar = document.getElementById('progress-click-bar');

    // 构图调整元素
    const inPosY = document.getElementById('in-pos-y');
    const txtPosY = document.getElementById('txt-pos-y');
    const inMediaScale = document.getElementById('in-media-scale');
    const txtMediaScale = document.getElementById('txt-media-scale');
    const btnResetPos = document.getElementById('btn-reset-pos');
    const btnFacePreset = document.getElementById('btn-face-preset');

    // 共享引用回写
    window.PlayerEngine.renderTarget = renderTarget;
    window.PlayerEngine.previewImg = previewImg;
    window.PlayerEngine.previewVideo = previewVideo;

    // Toast 提示辅助调用
    const toast = (msg) => {
        if (typeof window.showToast === 'function') {
            window.showToast(msg);
        }
    };

    /* ==========================================================================
       1. 视口画幅切换器 (16:9 / 19.5:9 / 9:16)
       ========================================================================== */
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const targetMode = btn.dataset.mode;
            renderTarget.className = `player-box ${targetMode}`;

            // 若切换到手机竖屏模式，自动联动右侧面板切换到抖音设置页；反之切回 Web 设置
            if (targetMode === 'mode-mobile-port') {
                if (typeof window.switchRightTab === 'function') {
                    window.switchRightTab('dy');
                }
            } else {
                if (typeof window.switchRightTab === 'function') {
                    window.switchRightTab('web');
                }
            }

            checkMediaAspect();

            // 若波浪线引擎存在，刷新尺寸
            if (typeof window.drawWaveform === 'function') {
                window.drawWaveform();
            }
        });
    });

    /* ==========================================================================
       2. 媒体上传、嗅探与自适应
       ========================================================================== */
    mediaUploader.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.type.startsWith('video/')) {
            window.PlayerEngine.isVideoMode = true;
            previewImg.style.display = 'none';
            previewVideo.style.display = 'block';

            // 释放前序 URL 避免内存泄露
            if (previewVideo.src && previewVideo.src.startsWith('blob:')) {
                URL.revokeObjectURL(previewVideo.src);
            }

            previewVideo.src = URL.createObjectURL(file);
            previewVideo.play().then(() => {
                updatePlayStateUI(true);
            }).catch(() => {
                updatePlayStateUI(false);
            });

            toast('視頻素材加載成功，原聲已接入！');
        } else if (file.type.startsWith('image/')) {
            window.PlayerEngine.isVideoMode = false;
            previewVideo.pause();
            previewVideo.style.display = 'none';
            previewImg.style.display = 'block';

            const reader = new FileReader();
            reader.onload = (evt) => {
                previewImg.src = evt.target.result;
                checkMediaAspect();
            };
            reader.readAsDataURL(file);

            updatePlayStateUI(false);
            toast('圖片素材加載成功！');
        }
    });

    // 检查画幅比例：竖屏模式下遇到横屏媒体时，显示「全屏观看」悬浮胶囊
    function checkMediaAspect() {
        if (!renderTarget.classList.contains('mode-mobile-port')) {
            if (dyFullscreenPill) dyFullscreenPill.style.display = 'none';
            return;
        }

        let w = 1920, h = 1080;
        if (window.PlayerEngine.isVideoMode) {
            w = previewVideo.videoWidth || 1920;
            h = previewVideo.videoHeight || 1080;
        } else {
            w = previewImg.naturalWidth || 1920;
            h = previewImg.naturalHeight || 1080;
        }

        if (w > h) {
            if (dyFullscreenPill) dyFullscreenPill.style.display = 'flex';
        } else {
            if (dyFullscreenPill) dyFullscreenPill.style.display = 'none';
        }
    }
    previewVideo.addEventListener('loadedmetadata', checkMediaAspect);

    // 点击「全屏观看」胶囊，快速跳转至横屏模式
    if (dyFullscreenPill) {
        dyFullscreenPill.addEventListener('click', () => {
            const landBtn = document.querySelector('.tab-btn[data-mode="mode-mobile-land"]');
            if (landBtn) landBtn.click();
            toast('已切換為手機橫屏全屏視野');
        });
    }

    /* ==========================================================================
       3. 播放与暂停状态双向联动
       ========================================================================== */
    function updatePlayStateUI(isPlaying) {
        if (isPlaying) {
            if (iconBotPlay) iconBotPlay.style.display = 'none';
            if (iconBotPause) iconBotPause.style.display = 'block';
            if (iconCenterPlay) iconCenterPlay.style.display = 'none';
            if (iconCenterPause) iconCenterPause.style.display = 'flex';
            if (dispCenterPill) dispCenterPill.textContent = '點擊暫停播放';
        } else {
            if (iconBotPlay) iconBotPlay.style.display = 'block';
            if (iconBotPause) iconBotPause.style.display = 'none';
            if (iconCenterPlay) iconCenterPlay.style.display = 'block';
            if (iconCenterPause) iconCenterPause.style.display = 'none';
            if (dispCenterPill) dispCenterPill.textContent = '點擊繼續播放';
        }
    }
    window.PlayerEngine.updatePlayStateUI = updatePlayStateUI;

    function togglePlayback() {
        if (!window.PlayerEngine.isVideoMode) {
            toast('當前為靜態截圖模式，上傳視頻即可動態播放');
            return;
        }

        if (previewVideo.paused) {
            previewVideo.play().then(() => {
                updatePlayStateUI(true);
            }).catch(err => {
                console.warn('Playback error:', err);
            });
        } else {
            previewVideo.pause();
            updatePlayStateUI(false);
        }
    }
    window.PlayerEngine.togglePlayback = togglePlayback;

    if (btnTogglePlayback) btnTogglePlayback.addEventListener('click', togglePlayback);
    if (btnBotPlayState) btnBotPlayState.addEventListener('click', togglePlayback);

    /* ==========================================================================
       4. 真实秒数累加走动与进度条控制
       ========================================================================== */
    function refreshTimeUI() {
        const s = window.PlayerEngine.timeToSec(inStartTime.value);
        const t = window.PlayerEngine.timeToSec(inTotalTime.value) || 1;
        dispTime.textContent = `${window.PlayerEngine.secToTime(s)} / ${window.PlayerEngine.secToTime(t)}`;
    }

    inStartTime.addEventListener('input', () => {
        refreshTimeUI();
        const startSec = window.PlayerEngine.timeToSec(inStartTime.value);
        const totalSec = window.PlayerEngine.timeToSec(inTotalTime.value);
        if (totalSec > 0) {
            const pct = Math.min(100, Math.max(0, Math.round((startSec / totalSec) * 100)));
            inProgress.value = pct;
            dispProgressBar.style.width = pct + '%';
            txtProgress.textContent = pct + '%';
        }
    });

    inTotalTime.addEventListener('input', () => {
        refreshTimeUI();
        const startSec = window.PlayerEngine.timeToSec(inStartTime.value);
        const totalSec = window.PlayerEngine.timeToSec(inTotalTime.value);
        if (totalSec > 0) {
            const pct = Math.min(100, Math.max(0, Math.round((startSec / totalSec) * 100)));
            inProgress.value = pct;
            dispProgressBar.style.width = pct + '%';
            txtProgress.textContent = pct + '%';
        }
    });

    // 拖动播放进度条长短
    inProgress.addEventListener('input', (e) => {
        const val = e.target.value;
        dispProgressBar.style.width = val + '%';
        txtProgress.textContent = val + '%';
        const total = window.PlayerEngine.timeToSec(inTotalTime.value) || 5325;
        const newSec = Math.round((val / 100) * total);
        inStartTime.value = window.PlayerEngine.secToTime(newSec);
        refreshTimeUI();
    });

    // 拖动预加载缓冲条长短
    inBuffer.addEventListener('input', (e) => {
        dispBufferBar.style.width = e.target.value + '%';
        txtBuffer.textContent = e.target.value + '%';
    });

    // 点击底部进度条轨直接定位百分比
    if (progressClickBar) {
        progressClickBar.addEventListener('click', (e) => {
            const rect = progressClickBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.min(100, Math.max(0, Math.round((clickX / rect.width) * 100)));
            inProgress.value = pct;
            inProgress.dispatchEvent(new Event('input'));
        });
    }

    // 视频真实播放事件：在设定的起始时间上实时递增累计
    previewVideo.addEventListener('timeupdate', () => {
        if (!window.PlayerEngine.isVideoMode || !swSyncVideoTime.checked) return;

        const baseStart = window.PlayerEngine.timeToSec(inStartTime.value);
        const totalSec = window.PlayerEngine.timeToSec(inTotalTime.value) || 5325;
        const elapsed = Math.floor(previewVideo.currentTime);
        const curSec = baseStart + elapsed;

        dispTime.textContent = `${window.PlayerEngine.secToTime(curSec)} / ${window.PlayerEngine.secToTime(totalSec)}`;
        const pct = Math.min(100, (curSec / totalSec) * 100);
        dispProgressBar.style.width = pct.toFixed(2) + '%';
        txtProgress.textContent = Math.round(pct) + '%';
    });

    /* ==========================================================================
       5. 画面防切脸构图微调 (Y轴位移与缩放)
       ========================================================================== */
    function updateTransform() {
        const yVal = inPosY.value + '%';
        const scaleVal = inMediaScale.value / 100;

        document.documentElement.style.setProperty('--media-pos-y', yVal);
        document.documentElement.style.setProperty('--media-scale', scaleVal);

        txtPosY.textContent = yVal;
        txtMediaScale.textContent = inMediaScale.value + '%';
    }

    inPosY.addEventListener('input', updateTransform);
    inMediaScale.addEventListener('input', updateTransform);

    btnResetPos.addEventListener('click', () => {
        inPosY.value = 50;
        inMediaScale.value = 100;
        updateTransform();
        toast('畫面已恢復默認居中');
    });

    btnFacePreset.addEventListener('click', () => {
        inPosY.value = 18;
        inMediaScale.value = 110;
        updateTransform();
        toast('已應用快速露臉構圖預設');
    });

    // 初始化调用一次更新界面
    refreshTimeUI();
    updateTransform();
})();
