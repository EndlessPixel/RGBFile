// 全局变量
let encodeFile = null;
let decodeImage = null;
let decodedFileName = '';
let decodedFileData = null;

// RGBF 标识
const RGBF_SIGNATURE = [0x52, 0x47, 0x42, 0x46]; // 'RGBF' in ASCII

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化输出尺寸
function formatOutputSize(width, height) {
    return `${width} × ${height} = ${formatFileSize(width * height)} 像素`;
}

// 初始化选项卡
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabId + '-tab').classList.add('active');
        });
    });
}

// 初始化模式切换事件
function initModeSelector() {
    const encodeMode = document.getElementById('encodeMode');
    const decodeMode = document.getElementById('decodeMode');
    const encodePixelLabel = document.getElementById('encodePixelLabel');
    const decodePixelLabel = document.getElementById('decodePixelLabel');
    
    encodeMode.addEventListener('change', () => {
        if (encodeMode.value === 'square') {
            encodePixelLabel.style.display = 'inline';
            document.getElementById('encodePixelsPerLine').style.display = 'inline';
        } else {
            encodePixelLabel.style.display = 'none';
            document.getElementById('encodePixelsPerLine').style.display = 'none';
        }
    });
    
    decodeMode.addEventListener('change', () => {
        if (decodeMode.value === 'square') {
            decodePixelLabel.style.display = 'inline';
            document.getElementById('decodePixelsPerLine').style.display = 'inline';
        } else {
            decodePixelLabel.style.display = 'none';
            document.getElementById('decodePixelsPerLine').style.display = 'none';
        }
    });
    
    // 初始化状态
    encodePixelLabel.style.display = 'none';
    document.getElementById('encodePixelsPerLine').style.display = 'none';
    decodePixelLabel.style.display = 'none';
    document.getElementById('decodePixelsPerLine').style.display = 'none';
}

// 初始化事件监听器
function initEventListeners() {
    initTabs();
    initModeSelector();
    
    // Encode 区域
    const encodeDropArea = document.getElementById('encodeDropArea');
    const encodeFileInput = document.getElementById('encodeFileInput');
    const encodeDownloadBtn = document.getElementById('encodeDownloadBtn');
    
    // 拖放事件
    encodeDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        encodeDropArea.classList.add('active');
    });
    
    encodeDropArea.addEventListener('dragleave', () => {
        encodeDropArea.classList.remove('active');
    });
    
    encodeDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        encodeDropArea.classList.remove('active');
        if (e.dataTransfer.files.length > 0) {
            handleEncodeFile(e.dataTransfer.files[0]);
        }
    });
    
    // 点击选择文件
    encodeDropArea.addEventListener('click', () => {
        encodeFileInput.click();
    });
    
    encodeFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleEncodeFile(e.target.files[0]);
        }
    });
    
    // 下载按钮
    encodeDownloadBtn.addEventListener('click', downloadEncodedImage);
    
    // Decode 区域
    const decodeDropArea = document.getElementById('decodeDropArea');
    const decodeFileInput = document.getElementById('decodeFileInput');
    const decodeDownloadBtn = document.getElementById('decodeDownloadBtn');
    
    // 拖放事件
    decodeDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        decodeDropArea.classList.add('active');
    });
    
    decodeDropArea.addEventListener('dragleave', () => {
        decodeDropArea.classList.remove('active');
    });
    
    decodeDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        decodeDropArea.classList.remove('active');
        if (e.dataTransfer.files.length > 0) {
            handleDecodeImage(e.dataTransfer.files[0]);
        }
    });
    
    // 点击选择文件
    decodeDropArea.addEventListener('click', () => {
        decodeFileInput.click();
    });
    
    decodeFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleDecodeImage(e.target.files[0]);
        }
    });
    
    // 下载按钮
    decodeDownloadBtn.addEventListener('click', downloadDecodedFile);
}

// 处理编码文件
function handleEncodeFile(file) {
    encodeFile = file;
    
    // 显示文件信息
    document.getElementById('encodeFileInfo').style.display = 'block';
    document.getElementById('encodeFileName').textContent = file.name;
    document.getElementById('encodeFileSize').textContent = formatFileSize(file.size);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const mode = document.getElementById('encodeMode').value;
        const pixelsPerLine = parseInt(document.getElementById('encodePixelsPerLine').value) || 4096;
        const result = encodeToCanvas(arrayBuffer, file.name, mode, pixelsPerLine);
        
        document.getElementById('encodeOutputSize').textContent = formatOutputSize(result.width, result.height);
        document.getElementById('encodeDownloadBtn').disabled = false;
    };
    reader.readAsArrayBuffer(file);
}

// 编码到画布
function encodeToCanvas(arrayBuffer, fileName, mode = 'strip', pixelsPerLine = 4096) {
    const canvas = document.getElementById('encodeCanvas');
    const ctx = canvas.getContext('2d');
    
    const data = new Uint8Array(arrayBuffer);
    const headerSize = 32; // 32 色块 = 96 字节
    const dataWithHeader = headerSize + Math.ceil(data.length / 3);
    
    let width, height;
    
    if (mode === 'square') {
        // 方形模式：每指定像素换行
        width = pixelsPerLine;
        height = Math.ceil(dataWithHeader / pixelsPerLine);
    } else {
        // 条形模式：单行
        width = dataWithHeader;
        height = 1;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // 绘制头部（前3色块：RGBF标识）
    const signature = new Uint8Array([0x52, 0x47, 0x42, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00]);
    for (let i = 0; i < 3; i++) {
        const r = signature[i * 3];
        const g = signature[i * 3 + 1];
        const b = signature[i * 3 + 2];
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        const x = i % width;
        const y = Math.floor(i / width);
        ctx.fillRect(x, y, 1, 1);
    }
    
    // 第4-7色块：存储文件长度（4色块=12字节，使用64位整数）
    const fileLengthBuffer = new ArrayBuffer(8);
    const fileLengthView = new DataView(fileLengthBuffer);
    fileLengthView.setBigUint64(0, BigInt(data.length), true);
    const fileLengthBytes = new Uint8Array(fileLengthBuffer);
    
    for (let i = 0; i < 4; i++) {
        const r = fileLengthBytes[i * 3] || 0;
        const g = fileLengthBytes[i * 3 + 1] || 0;
        const b = fileLengthBytes[i * 3 + 2] || 0;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        const x = (3 + i) % width;
        const y = Math.floor((3 + i) / width);
        ctx.fillRect(x, y, 1, 1);
    }
    
    // 后面25色块：存储文件名（UTF-8 + 0x00结束符）
    const fileNameBytes = new TextEncoder().encode(fileName);
    const fileNameBuffer = new Uint8Array(25 * 3);
    fileNameBuffer.set(fileNameBytes, 0);
    fileNameBuffer[fileNameBytes.length] = 0;
    
    for (let i = 0; i < 25; i++) {
        const r = fileNameBuffer[i * 3];
        const g = fileNameBuffer[i * 3 + 1];
        const b = fileNameBuffer[i * 3 + 2];
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        const x = (7 + i) % width;
        const y = Math.floor((7 + i) / width);
        ctx.fillRect(x, y, 1, 1);
    }
    
    // 绘制文件数据
    for (let i = 0; i < data.length; i += 3) {
        const r = data[i];
        const g = data[i + 1] || 0;
        const b = data[i + 2] || 0;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        const pixelIndex = headerSize + Math.floor(i / 3);
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        ctx.fillRect(x, y, 1, 1);
    }
    
    return { width, height };
}

// 下载编码后的图片
function downloadEncodedImage() {
    const canvas = document.getElementById('encodeCanvas');
    const mode = document.getElementById('encodeMode').value;
    const pixelsPerLine = document.getElementById('encodePixelsPerLine').value;
    const ext = mode === 'square' ? `.${pixelsPerLine}.png` : '.png';
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = encodeFile.name + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// 处理解码图片
function handleDecodeImage(file) {
    // 显示文件信息
    document.getElementById('decodeFileInfo').style.display = 'block';
    document.getElementById('decodeFileName').textContent = file.name;
    document.getElementById('decodeFileSize').textContent = formatFileSize(file.size);
    document.getElementById('decodeDetectedMode').textContent = '检测中...';
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const mode = document.getElementById('decodeMode').value;
            const pixelsPerLine = parseInt(document.getElementById('decodePixelsPerLine').value) || 4096;
            decodeFromCanvas(img, mode, pixelsPerLine);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 从画布解码
function decodeFromCanvas(img, mode = 'auto', pixelsPerLine = 4096) {
    const canvas = document.getElementById('decodeCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    // 检测模式
    let detectedMode = 'strip';
    if (mode === 'square' || (mode === 'auto' && img.height > 1)) {
        detectedMode = 'square';
    }
    
    document.getElementById('decodeDetectedMode').textContent = detectedMode === 'square' ? `方形 Square (${pixelsPerLine}px)` : '条形 Strip';
    
    const width = img.width;
    const height = img.height;
    const headerSize = 32;
    
    // 读取头部信息
    const headerPixels = ctx.getImageData(0, 0, width, height).data;
    
    // 验证RGBF标识
    const signature = new Uint8Array(9);
    for (let i = 0; i < 3; i++) {
        const x = i % width;
        const y = Math.floor(i / width);
        const pixelIndex = (y * width + x) * 4;
        signature[i * 3] = headerPixels[pixelIndex];
        signature[i * 3 + 1] = headerPixels[pixelIndex + 1];
        signature[i * 3 + 2] = headerPixels[pixelIndex + 2];
    }
    
    const expectedSignature = new Uint8Array([0x52, 0x47, 0x42, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00]);
    let isValid = true;
    for (let i = 0; i < 9; i++) {
        if (signature[i] !== expectedSignature[i]) {
            isValid = false;
            break;
        }
    }
    
    if (!isValid) {
        alert('无效的 RGBFile 图片，请上传正确的编码图片！');
        return;
    }
    
    // 读取文件长度
    const fileLengthBuffer = new ArrayBuffer(8);
    const fileLengthView = new DataView(fileLengthBuffer);
    
    for (let i = 0; i < 8; i++) {
        const blockIndex = 3 + Math.floor(i / 3);
        const offsetInBlock = i % 3;
        const x = blockIndex % width;
        const y = Math.floor(blockIndex / width);
        const pixelIndex = (y * width + x) * 4 + offsetInBlock;
        fileLengthView.setUint8(i, headerPixels[pixelIndex]);
    }
    
    const fileLength = Number(fileLengthView.getBigUint64(0, true));
    
    // 读取文件名
    const fileNameBuffer = new Uint8Array(25 * 3);
    for (let i = 0; i < 25; i++) {
        const blockIndex = 7 + i;
        const x = blockIndex % width;
        const y = Math.floor(blockIndex / width);
        const pixelIndex = (y * width + x) * 4;
        fileNameBuffer[i * 3] = headerPixels[pixelIndex];
        fileNameBuffer[i * 3 + 1] = headerPixels[pixelIndex + 1];
        fileNameBuffer[i * 3 + 2] = headerPixels[pixelIndex + 2];
    }
    
    let nullIndex = fileNameBuffer.indexOf(0);
    if (nullIndex === -1) nullIndex = fileNameBuffer.length;
    const fileNameBytes = fileNameBuffer.slice(0, nullIndex);
    decodedFileName = new TextDecoder().decode(fileNameBytes);
    
    // 读取文件数据
    const dataSize = width * height - headerSize;
    const data = new Uint8Array(dataSize * 3);
    
    for (let i = 0; i < dataSize; i++) {
        const pixelIndex = headerSize + i;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        const pixelData = (y * width + x) * 4;
        data[i * 3] = headerPixels[pixelData];
        data[i * 3 + 1] = headerPixels[pixelData + 1];
        data[i * 3 + 2] = headerPixels[pixelData + 2];
    }
    
    // 根据实际文件长度截断数据
    decodedFileData = data.slice(0, fileLength);
    
    // 更新文件信息显示
    document.getElementById('decodeFileName').textContent = decodedFileName;
    document.getElementById('decodeFileSize').textContent = formatFileSize(fileLength);
    
    document.getElementById('decodeDownloadBtn').disabled = false;
}

// 下载解码后的文件
function downloadDecodedFile() {
    if (!decodedFileData || !decodedFileName) return;
    
    const blob = new Blob([decodedFileData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = decodedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 初始化应用
window.addEventListener('DOMContentLoaded', initEventListeners);