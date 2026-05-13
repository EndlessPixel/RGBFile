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

// 初始化事件监听器
function initEventListeners() {
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
        encodeToCanvas(arrayBuffer, file.name);
        document.getElementById('encodeDownloadBtn').disabled = false;
    };
    reader.readAsArrayBuffer(file);
}

// 编码到画布
function encodeToCanvas(arrayBuffer, fileName) {
    const canvas = document.getElementById('encodeCanvas');
    const ctx = canvas.getContext('2d');
    
    const data = new Uint8Array(arrayBuffer);
    const headerSize = 32; // 32 色块 = 96 字节
    const totalSize = headerSize + Math.ceil(data.length / 3);
    
    canvas.width = totalSize;
    canvas.height = 1;
    
    // 绘制头部
    // 前 3 色块：RGBF 标识
    const signature = new Uint8Array([0x52, 0x47, 0x42, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00]); // 'RGBF' + 5 个 0 (3 色块 = 9 字节)
    for (let i = 0; i < 3; i++) {
        const r = signature[i * 3];
        const g = signature[i * 3 + 1];
        const b = signature[i * 3 + 2];
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(i, 0, 1, 1);
    }
    
    // 第 4-7 色块：存储文件长度（4 色块 = 12 字节，使用 64 位整数）
    const fileLengthBuffer = new ArrayBuffer(8);
    const fileLengthView = new DataView(fileLengthBuffer);
    fileLengthView.setBigUint64(0, BigInt(data.length), true); // 小端序
    const fileLengthBytes = new Uint8Array(fileLengthBuffer);
    
    for (let i = 0; i < 4; i++) {
        const r = fileLengthBytes[i * 3] || 0;
        const g = fileLengthBytes[i * 3 + 1] || 0;
        const b = fileLengthBytes[i * 3 + 2] || 0;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(3 + i, 0, 1, 1);
    }
    
    // 后面 25 色块：存储文件名（UTF-8 + 0x00 结束符）
    const fileNameBytes = new TextEncoder().encode(fileName);
    const fileNameBuffer = new Uint8Array(25 * 3);
    fileNameBuffer.set(fileNameBytes, 0);
    fileNameBuffer[fileNameBytes.length] = 0; // 添加结束符
    
    for (let i = 0; i < 25; i++) {
        const r = fileNameBuffer[i * 3];
        const g = fileNameBuffer[i * 3 + 1];
        const b = fileNameBuffer[i * 3 + 2];
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(7 + i, 0, 1, 1);
    }
    
    // 绘制文件数据
    for (let i = 0; i < data.length; i += 3) {
        const r = data[i];
        const g = data[i + 1] || 0;
        const b = data[i + 2] || 0;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(headerSize + Math.floor(i / 3), 0, 1, 1);
    }
}

// 下载编码后的图片
function downloadEncodedImage() {
    const canvas = document.getElementById('encodeCanvas');
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = encodeFile.name + '.png';
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
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            decodeFromCanvas(img);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 从画布解码
function decodeFromCanvas(img) {
    const canvas = document.getElementById('decodeCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = img.width;
    canvas.height = 1;
    ctx.drawImage(img, 0, 0, img.width, 1);
    
    // 读取头部信息
    const headerSize = 32;
    const headerPixels = ctx.getImageData(0, 0, headerSize, 1).data;
    
    // 验证 RGBF 标识
    const signature = new Uint8Array(9);
    for (let i = 0; i < 3; i++) {
        // 每个色块对应 4 通道，只取 RGB
        signature[i * 3] = headerPixels[i * 4];     // R
        signature[i * 3 + 1] = headerPixels[i * 4 + 1]; // G
        signature[i * 3 + 2] = headerPixels[i * 4 + 2]; // B
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
    
    // 直接从头部像素数据读取文件长度（小端序）
    for (let i = 0; i < 8; i++) {
        const blockIndex = 3 + Math.floor(i / 3); // 从第 3 个色块开始
        const offsetInBlock = i % 3; // 在色块中的偏移
        const pixelIndex = blockIndex * 4 + offsetInBlock;
        fileLengthView.setUint8(i, headerPixels[pixelIndex]);
    }
    
    const fileLength = Number(fileLengthView.getBigUint64(0, true)); // 小端序
    
    // 读取文件名
    const fileNameBuffer = new Uint8Array(25 * 3);
    for (let i = 0; i < 25; i++) {
        // 从第 7 个色块开始，每个色块对应 4 通道
        const pixelIndex = (7 + i) * 4;
        fileNameBuffer[i * 3] = headerPixels[pixelIndex];     // R
        fileNameBuffer[i * 3 + 1] = headerPixels[pixelIndex + 1]; // G
        fileNameBuffer[i * 3 + 2] = headerPixels[pixelIndex + 2]; // B
    }
    
    // 找到结束符位置
    let nullIndex = fileNameBuffer.indexOf(0);
    if (nullIndex === -1) nullIndex = fileNameBuffer.length;
    const fileNameBytes = fileNameBuffer.slice(0, nullIndex);
    decodedFileName = new TextDecoder().decode(fileNameBytes);
    
    // 读取文件数据
    const dataSize = img.width - headerSize;
    const dataPixels = ctx.getImageData(headerSize, 0, dataSize, 1).data;
    const data = new Uint8Array(dataSize * 3);
    
    // 确保每个字节都被正确读取
    for (let i = 0; i < dataSize; i++) {
        // 每个色块对应 4 通道，只取 RGB
        const pixelIndex = i * 4;
        data[i * 3] = dataPixels[pixelIndex];     // R
        data[i * 3 + 1] = dataPixels[pixelIndex + 1]; // G
        data[i * 3 + 2] = dataPixels[pixelIndex + 2]; // B
    }
    
    // 根据实际文件长度截断数据
    decodedFileData = data.slice(0, fileLength);
    
    // 更新文件信息显示，显示还原文件信息
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
