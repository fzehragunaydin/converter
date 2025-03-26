document.addEventListener('DOMContentLoaded', function() {
    // Element seçiciler
    const fileInput = document.getElementById('file');
    const fileUpload = document.getElementById('fileUpload');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const conversionType = document.getElementById('conversionType');
    const convertButton = document.getElementById('convertButton');
    const convertForm = document.getElementById('convertForm');
    const resultDiv = document.getElementById('result');
    const pdfMergeSection = document.getElementById('pdfMergeSection');
    const pdfFilesInput = document.getElementById('pdfFiles');
    const pdfFileList = document.getElementById('pdfFileList');

    // Format eşleştirmeleri
    const formatMappings = {
        'pdf': ['pdf'],
        'docx': ['docx', 'doc'],
        'jpg': ['jpg', 'jpeg'],
        'png': ['png'],
        'json': ['json'],
        'excel': ['xlsx', 'xls'],
        'csv': ['csv'],
        'xml': ['xml']
    };

    function initialValidation() {
        // PDF Merge senaryosu
        if (conversionType.value === 'merge_pdfs') {
            convertButton.disabled = pdfFilesInput.files.length < 2;
            return;
        }

        convertButton.disabled = true;
    }

    // Dönüşüm türü değiştiğinde
    conversionType.addEventListener('change', function() {
        const isMergePdf = this.value === 'merge_pdfs';
        pdfMergeSection.style.display = isMergePdf ? 'block' : 'none';
        fileUpload.style.display = isMergePdf ? 'none' : 'block';
        
        if (!isMergePdf) {
            fileInput.value = '';
            updateFileInfo();
            pdfFilesInput.value = ''; // PDF dosyalarını temizle
            pdfFileList.innerHTML = ''; // PDF dosya listesini temizle
        }
        
        initialValidation();
    });

    // PDF birleştirme dosya seçimi
    pdfFilesInput.addEventListener('change', function() {
        pdfFileList.innerHTML = '';
        
            // Benzersiz dosya isimlerini kontrol et
            const uniqueFiles = [];
            const fileNames = new Set();
            let hasInvalidFile = false;
            
            Array.from(this.files).forEach((file, index) => {
                // Sadece PDF dosyalarını kabul et
                if (!file.name.toLowerCase().endsWith('.pdf')) {
                    hasInvalidFile = true;
                    return;
                }
                
                // Yinelenen dosya isimlerini kontrol et
                if (!fileNames.has(file.name)) {
                    fileNames.add(file.name);
                    uniqueFiles.push(file);
                    
                    const fileItem = document.createElement('div');
                    fileItem.className = 'multi-file-item';
                    fileItem.innerHTML = `
                        <span>${file.name}</span>
                        <span class="remove-file" data-index="${index}">✖</span>
                    `;
                    pdfFileList.appendChild(fileItem);
                }
            });
    
            if (hasInvalidFile) {
                showError('Sadece PDF dosyaları ekleyebilirsiniz.');
                convertButton.disabled = true;
                return;
            }
            
            // Eğer benzersiz dosya sayısı 2'den azsa hata ver
            if (uniqueFiles.length < 2) {
                showError('En az 2 FARKLI PDF dosyası seçmelisiniz.');
                convertButton.disabled = true;
                return;
            }
            
            // Dosya listesini güncelle (sadece benzersiz dosyaları içerecek şekilde)
            const dataTransfer = new DataTransfer();
            uniqueFiles.forEach(file => dataTransfer.items.add(file));
            this.files = dataTransfer.files;
            
            convertButton.disabled = false;
            clearError();
        });

    // Dosya sürükle-bırak işlevselliği
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUpload.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        fileUpload.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUpload.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        fileUpload.classList.add('drag-over');
    }

    function unhighlight() {
        fileUpload.classList.remove('drag-over');
    }

    fileUpload.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            updateFileInfo();
            validateForm();
        }
    }

    // Dosya seçimi değiştiğinde
    fileInput.addEventListener('change', function() {
        updateFileInfo();
        validateForm();
    });

    function updateFileInfo() {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            fileInfo.classList.add('active');
        } else {
            fileInfo.classList.remove('active');
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function validateForm() {
        // PDF Merge senaryosu
        if (conversionType.value === 'merge_pdfs') {
            convertButton.disabled = pdfFilesInput.files.length < 2;
            return;
        }

        // Normal dosya dönüşüm senaryosu
        if (!fileInput.files.length || !conversionType.value) {
            convertButton.disabled = true;
            return;
        }

        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const sourceFormat = conversionType.value.split('_to_')[0];
        
        // Kaynak formatın varlığını kontrol et
        if (!formatMappings[sourceFormat]) {
            showError(`Hata: Geçersiz kaynak format: ${sourceFormat}`);
            convertButton.disabled = true;
            return;
        }

        // Dosya uzantısını doğrula
        if (!formatMappings[sourceFormat].includes(fileExt)) {
            showError(`Hata: Bu dönüşüm için ${formatMappings[sourceFormat].join(' veya ')} uzantılı bir dosya seçmelisiniz.`);
            convertButton.disabled = true;
        } else {
            clearError();
            convertButton.disabled = false;
        }
    }

    function showError(message) {
        resultDiv.className = 'error';
        resultDiv.innerHTML = message;
        resultDiv.style.display = 'block';
    }

    function clearError() {
        resultDiv.style.display = 'none';
    }

    // Form gönderimi
    convertForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const conversionValue = conversionType.value;
        
        // Yükleme göstergesi
        resultDiv.className = 'loading';
        resultDiv.innerHTML = '<div class="loading-spinner"></div> Dönüştürülüyor...';
        resultDiv.style.display = 'block';
    
        try {
            // PDF birleştirme için özel işlem
            if (conversionValue === 'merge_pdfs') {
                const files = pdfFilesInput.files;
                if (files.length < 2) {
                    throw new Error('En az 2 PDF dosyası seçmelisiniz.');
                }
                
                // FormData'yı temizle ve yalnızca benzersiz dosyaları ekle
                formData.delete('file');
                formData.delete('files'); // Önceki dosyaları temizle
                
                // Dosyaları benzersiz isimlerle ekle
                const uniqueNames = new Set();
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (!uniqueNames.has(file.name)) {
                        uniqueNames.add(file.name);
                        formData.append('files', file, `file_${i}_${file.name}`);
                    }
                }
            }
    
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });
    
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Bir hata oluştu');
            }
    
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'merged.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
    
            showSuccess('Dönüşüm başarıyla tamamlandı! Dosyanız indirildi.');
        } catch (error) {
            showError('Hata: ' + error.message);
        }
    });
    

    function showSuccess(message) {
        resultDiv.className = 'success';
        resultDiv.innerHTML = message;
        resultDiv.style.display = 'block';
        initialValidation();
    }
});