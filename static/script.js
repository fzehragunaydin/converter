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

    // Dönüşüm türü değiştiğinde
    conversionType.addEventListener('change', function() {
        const isMergePdf = this.value === 'merge_pdfs';
        pdfMergeSection.style.display = isMergePdf ? 'block' : 'none';
        fileUpload.style.display = isMergePdf ? 'none' : 'block';
        
        if (!isMergePdf) {
            fileInput.value = '';
            updateFileInfo();
        }
        
        validateForm();
    });

    // PDF birleştirme dosya seçimi
    pdfFilesInput.addEventListener('change', function() {
        pdfFileList.innerHTML = '';
        
        if (this.files.length < 2) {
            showError('En az 2 PDF dosyası seçmelisiniz.');
            return;
        }
        
        // PDF doğrulama
        const invalidFiles = Array.from(this.files).filter(file => 
            !file.name.toLowerCase().endsWith('.pdf')
        );
        
        if (invalidFiles.length > 0) {
            showError('Sadece PDF dosyaları seçilebilir.');
            return;
        }
        
        // Dosya listesi oluştur
        Array.from(this.files).forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'multi-file-item';
            fileItem.innerHTML = `
                <span>${file.name}</span>
                <span class="remove-file" data-index="${index}">✖</span>
            `;
            pdfFileList.appendChild(fileItem);
        });
        
        // Dosya kaldırma işlevselliği
        document.querySelectorAll('.remove-file').forEach(removeBtn => {
            removeBtn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                const newFiles = Array.from(pdfFilesInput.files);
                newFiles.splice(index, 1);
                
                const dataTransfer = new DataTransfer();
                newFiles.forEach(file => dataTransfer.items.add(file));
                pdfFilesInput.files = dataTransfer.files;
                
                this.closest('.multi-file-item').remove();
                
                if (pdfFilesInput.files.length < 2) {
                    showError('En az 2 PDF dosyası seçmelisiniz.');
                } else {
                    clearError();
                }
            });
        });
        
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
        if (conversionType.value === 'merge_pdfs') {
            convertButton.disabled = pdfFilesInput.files.length < 2;
            return;
        }

        if (fileInput.files.length === 0 || !conversionType.value) {
            convertButton.disabled = true;
            return;
        }

        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const sourceFormat = conversionType.value.split('_to_')[0];
        
        if (!formatMappings[sourceFormat] || !formatMappings[sourceFormat].includes(fileExt)) {
            showError(`Hata: Bu dönüşüm için ${formatMappings[sourceFormat]?.join(' veya ')} uzantılı bir dosya seçmelisiniz.`);
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
                
                formData.delete('file');
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
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
            const targetFormat = conversionValue === 'merge_pdfs' 
                ? 'pdf' 
                : conversionValue.split('_to_')[1];
            
            const extension = targetFormat === 'excel' ? 'xlsx' : targetFormat;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            a.download = conversionValue === 'merge_pdfs' 
                ? 'merged.pdf' 
                : fileInput.files[0].name.split('.')[0] + '.' + extension;
            
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
    }
});