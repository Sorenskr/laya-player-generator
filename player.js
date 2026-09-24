/**
 * ==========================================================================
 * player.js - 媒体播放器引擎 (支持图四独立取景浮窗拖拽与全屏预览联动)
 * ==========================================================================
 */

window.PlayerEngine = {
    isVideoMode: false,
    previewVideo: null,
    previewImg: null,
    renderTarget: null,
    
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
    },

    getMediaNaturalDimensions() {
        if (this.isVideoMode && this.previewVideo) {
            return {
                width: this.previewVideo.videoWidth || 1280,
                height: this.previewVideo.videoHeight || 720
            };
        } else if (this.previewImg) {
            return {
                width: this.previewImg.naturalWidth || 1280,
                height: this.previewImg.naturalHeight || 720
            };
        }
        return { width: 1280, height: 720 };
    }
};

(function () {
    const renderTarget = document.getElementById('render-target');
    const previewImg = document.getElementById('preview-img');
    const previewVideo = document.getElementById('preview-video');
    const mediaUploader = document.getElementById('media-uploader');
    const dyFullscreenPill = document.getElementById('dy-fullscreen-pill');
    const selCropFit = document.getElementById('sel-crop-fit');

    const btnTogglePlayback = document.getElementById('btn-toggle-playback');
    const btnBotPlayState = document.getElementById('btn-bot-play-state');
    const iconCenterPlay = document.getElementById('icon-center-play');
    const iconCenterPause = document.getElementById('icon-center-pause');
    const iconBotPlay = document.getElementById('icon-bot-play');
    const iconBotPause = document.getElementById('icon-bot-pause');
    const dispCenterPill = document.getElementById('disp-center-pill');

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

    const inPosY = document.getElementById('in-pos-y');
    const txtPosY = document.getElementById('txt-pos-y');
    const inPosX = document.getElementById('in-pos-x');
    const txtPosX = document.getElementById('txt-pos-x');
    const inMediaScale = document.getElementById('in-media-scale');
    const txtMediaScale = document.getElementById('txt-media-scale');
    const btnResetPos = document.getElementById('btn-reset-pos');
    const btnFacePreset = document.getElementById('btn-face-preset');

    // 图四独立小窗 DOM
    const swCropWindow = document.getElementById('sw-crop-window');
    const cropInspectorWindow = document.getElementById('crop-inspector-window');
    const btnCloseCropWindow = document.getElementById('btn-close-crop-window');
    const cropThumbImg = document.getElementById('crop-thumb-img');
    const cropSelectionBox = document.getElementById('crop-selection-box');
    const cropWindowBody = document.getElementById('crop-window-body');
    const btnCropReset = document.getElementById('btn-crop-reset');

    window.PlayerEngine.renderTarget = renderTarget;
    window.PlayerEngine.previewImg = previewImg;
    window.PlayerEngine.previewVideo = previewVideo;

    const toast = (msg) => {
        if (typeof window.showToast === 'function') window.showToast(msg);
    };

    /* ==========================================================================
       1. 视口画幅切换器
       ========================================================================== */
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const targetMode = btn.dataset.mode;
            renderTarget.className = `player-box ${targetMode}`;

            if (targetMode === 'mode-mobile-port') {
                if (typeof window.switchRightTab === 'function') window.switchRightTab('dy');
            } else {
                if (typeof window.switchRightTab === 'function') window.switchRightTab('web');
            }

            checkMediaAspect();
            syncCropBoxRatio();
            if (typeof window.drawWaveform === 'function') window.drawWaveform();
        });
    });

    /* ==========================================================================
       2. 媒体上传、嗅探与小窗同步
       ========================================================================== */
    if (mediaUploader) {
        mediaUploader.addEventListener('click', () => {
            mediaUploader.value = '';
        });

        mediaUploader.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const fileName = file.name || '';
            const fileType = file.type || '';

            const isVideo = fileType.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi)$/i.test(fileName);
            const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|jfif|bmp|svg)$/i.test(fileName);

            if (isVideo) {
                window.PlayerEngine.isVideoMode = true;
                previewImg.style.display = 'none';
                previewVideo.style.display = 'block';

                if (previewVideo.src && previewVideo.src.startsWith('blob:')) {
                    URL.revokeObjectURL(previewVideo.src);
                }

                const vidUrl = URL.createObjectURL(file);
                previewVideo.src = vidUrl;
                previewVideo.play().then(() => {
                    updatePlayStateUI(true);
                }).catch(() => {
                    updatePlayStateUI(false);
                });

                // 为小窗生成缩略海报
                const tempVid = document.createElement('video');
                tempVid.src = vidUrl;
                tempVid.currentTime = 1;
                tempVid.onloadeddata = () => {
                    const c = document.createElement('canvas');
                    c.width = tempVid.videoWidth;
                    c.height = tempVid.videoHeight;
                    c.getContext('2d').drawImage(tempVid, 0, 0);
                    cropThumbImg.src = c.toDataURL();
                };

                toast('視頻素材加載成功，原聲已接入！');
            } else if (isImage || !isVideo) {
                window.PlayerEngine.isVideoMode = false;
                previewVideo.pause();
                previewVideo.style.display = 'none';
                previewImg.style.display = 'block';

                if (previewImg.src && previewImg.src.startsWith('blob:')) {
                    URL.revokeObjectURL(previewImg.src);
                }

                const imgUrl = URL.createObjectURL(file);
                previewImg.src = imgUrl;
                cropThumbImg.src = imgUrl;
                previewImg.onload = () => {
                    checkMediaAspect();
                };

                updatePlayStateUI(false);
                toast('圖片素材加載成功！');
            }
            if (typeof window.triggerSaveStorage === 'function') window.triggerSaveStorage();
        });
    }

    function checkMediaAspect() {
        if (!renderTarget.classList.contains('mode-mobile-port')) {
            if (dyFullscreenPill) dyFullscreenPill.style.display = 'none';
            return;
        }

        const dims = window.PlayerEngine.getMediaNaturalDimensions();
        if (dims.width > dims.height) {
            if (dyFullscreenPill) dyFullscreenPill.style.display = 'flex';
        } else {
            if (dyFullscreenPill) dyFullscreenPill.style.display = 'none';
        }
    }
    previewVideo.addEventListener('loadedmetadata', checkMediaAspect);

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
            previewVideo.play().then(() => updatePlayStateUI(true)).catch(console.warn);
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

    inProgress.addEventListener('input', (e) => {
        const val = e.target.value;
        dispProgressBar.style.width = val + '%';
        txtProgress.textContent = val + '%';
        const total = window.PlayerEngine.timeToSec(inTotalTime.value) || 5325;
        const newSec = Math.round((val / 100) * total);
        inStartTime.value = window.PlayerEngine.secToTime(newSec);
        refreshTimeUI();
    });

    inBuffer.addEventListener('input', (e) => {
        dispBufferBar.style.width = e.target.value + '%';
        txtBuffer.textContent = e.target.value + '%';
    });

    if (progressClickBar) {
        progressClickBar.addEventListener('click', (e) => {
            const rect = progressClickBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.min(100, Math.max(0, Math.round((clickX / rect.width) * 100)));
            inProgress.value = pct;
            inProgress.dispatchEvent(new Event('input'));
        });
    }

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
       ★ 5. 画面防变形缩放与图四独立取景框小窗交互
       ========================================================================== */
    function updateTransform() {
        const yVal = inPosY.value + '%';
        const xVal = inPosX.value + '%';
        const scaleVal = inMediaScale.value / 100;

        document.documentElement.style.setProperty('--media-pos-y', yVal);
        document.documentElement.style.setProperty('--media-pos-x', xVal);
        document.documentElement.style.setProperty('--media-scale', scaleVal);

        txtPosY.textContent = yVal;
        txtPosX.textContent = xVal;
        txtMediaScale.textContent = inMediaScale.value + '%';

        syncCropBoxPosition();
        if (typeof window.triggerSaveStorage === 'function') window.triggerSaveStorage();
    }

    inPosY.addEventListener('input', updateTransform);
    inPosX.addEventListener('input', updateTransform);
    inMediaScale.addEventListener('input', updateTransform);

    if (selCropFit) {
        selCropFit.addEventListener('change', (e) => {
            const fit = e.target.value;
            previewImg.style.objectFit = fit;
            previewVideo.style.objectFit = fit;
            toast(fit === 'cover' ? '已切換為：等比裁切填充 (無黑邊)' : '已切換為：完整畫面包含 (留黑邊不變形)');
            if (typeof window.triggerSaveStorage === 'function') window.triggerSaveStorage();
        });
    }

    // A. 开启/关闭图四独立小窗
    if (swCropWindow && cropInspectorWindow) {
        swCropWindow.addEventListener('change', (e) => {
            cropInspectorWindow.style.display = e.target.checked ? 'flex' : 'none';
            if (e.target.checked) {
                // 初始化缩略图
                if (!cropThumbImg.src || cropThumbImg.src === window.location.href) {
                    cropThumbImg.src = previewImg.src;
                }
                syncCropBoxRatio();
                syncCropBoxPosition();
            }
        });
    }

    if (btnCloseCropWindow) {
        btnCloseCropWindow.addEventListener('click', () => {
            swCropWindow.checked = false;
            cropInspectorWindow.style.display = 'none';
        });
    }

    // B. 小窗内根据当前画幅 (16:9 / 19.5:9 / 9:16) 动态约束选框长宽比
    function syncCropBoxRatio() {
        if (!cropSelectionBox) return;
        const isPort = renderTarget.classList.contains('mode-mobile-port');
        const isLand = renderTarget.classList.contains('mode-mobile-land');
        
        if (isPort) {
            cropSelectionBox.style.width = '42%';
            cropSelectionBox.style.aspectRatio = '9 / 16';
        } else if (isLand) {
            cropSelectionBox.style.width = '80%';
            cropSelectionBox.style.aspectRatio = '19.5 / 9';
        } else {
            cropSelectionBox.style.width = '75%';
            cropSelectionBox.style.aspectRatio = '16 / 9';
        }
    }

    function syncCropBoxPosition() {
        if (!cropSelectionBox || !cropWindowBody) return;
        const xPct = parseFloat(inPosX.value) || 50;
        const yPct = parseFloat(inPosY.value) || 50;
        
        const bodyW = cropWindowBody.offsetWidth;
        const bodyH = cropWindowBody.offsetHeight;
        const boxW = cropSelectionBox.offsetWidth;
        const boxH = cropSelectionBox.offsetHeight;

        const maxLeft = bodyW - boxW;
        const maxTop = bodyH - boxH;

        if (maxLeft > 0 && maxTop > 0) {
            cropSelectionBox.style.left = (maxLeft * (1 - xPct / 100)) + 'px';
            cropSelectionBox.style.top = (maxTop * (1 - yPct / 100)) + 'px';
        }
    }

    // C. 核心拖拽：在图四小窗里按住绿色框框直接拖拽，实时改变大屏取景！
    let isDraggingCrop = false;
    let cropStartX = 0, cropStartY = 0;
    let cropBoxStartLeft = 0, cropBoxStartTop = 0;

    if (cropSelectionBox && cropWindowBody) {
        cropSelectionBox.addEventListener('mousedown', (e) => {
            isDraggingCrop = true;
            cropStartX = e.clientX;
            cropStartY = e.clientY;
            cropBoxStartLeft = cropSelectionBox.offsetLeft;
            cropBoxStartTop = cropSelectionBox.offsetTop;
            e.preventDefault();
            e.stopPropagation();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingCrop) return;
            const deltaX = e.clientX - cropStartX;
            const deltaY = e.clientY - cropStartY;

            const bodyW = cropWindowBody.offsetWidth;
            const bodyH = cropWindowBody.offsetHeight;
            const boxW = cropSelectionBox.offsetWidth;
            const boxH = cropSelectionBox.offsetHeight;

            const maxLeft = Math.max(1, bodyW - boxW);
            const maxTop = Math.max(1, bodyH - boxH);

            let newLeft = Math.min(maxLeft, Math.max(0, cropBoxStartLeft + deltaX));
            let newTop = Math.min(maxTop, Math.max(0, cropBoxStartTop + deltaY));

            cropSelectionBox.style.left = newLeft + 'px';
            cropSelectionBox.style.top = newTop + 'px';

            // 反算为百分比并实时驱动主画面移动
            const revXPct = Math.round((1 - newLeft / maxLeft) * 100);
            const revYPct = Math.round((1 - newTop / maxTop) * 100);

            inPosX.value = revXPct;
            inPosY.value = revYPct;

            const yVal = revYPct + '%';
            const xVal = revXPct + '%';
            document.documentElement.style.setProperty('--media-pos-y', yVal);
            document.documentElement.style.setProperty('--media-pos-x', xVal);
            txtPosY.textContent = yVal;
            txtPosX.textContent = xVal;
        });

        window.addEventListener('mouseup', () => {
            if (isDraggingCrop) {
                isDraggingCrop = false;
                if (typeof window.triggerSaveStorage === 'function') window.triggerSaveStorage();
            }
        });
    }

    if (btnCropReset) {
        btnCropReset.addEventListener('click', () => {
            inPosY.value = 50;
            inPosX.value = 50;
            inMediaScale.value = 100;
            updateTransform();
            toast('小窗取景已居中');
        });
    }

    btnResetPos.addEventListener('click', () => {
        inPosY.value = 50;
        inPosX.value = 50;
        inMediaScale.value = 100;
        updateTransform();
        toast('畫面已恢復默認居中');
    });

    btnFacePreset.addEventListener('click', () => {
        inPosY.value = 18;
        inPosX.value = 50;
        inMediaScale.value = 110;
        updateTransform();
        toast('已應用快速露臉構圖預設');
    });

    refreshTimeUI();
    updateTransform();
})();
