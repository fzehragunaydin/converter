document.addEventListener('DOMContentLoaded', function() {
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
        if (conversionType.value === 'merge_pdfs') {
            convertButton.disabled = pdfFilesInput.files.length < 2;
            return;
        }
        convertButton.disabled = true;
    }

    conversionType.addEventListener('change', function() {
        const isMergePdf = this.value === 'merge_pdfs';
        pdfMergeSection.style.display = isMergePdf ? 'block' : 'none';
        fileUpload.style.display = isMergePdf ? 'none' : 'block';
        
        if (!isMergePdf) {
            fileInput.value = '';
            updateFileInfo();
            pdfFilesInput.value = '';
            pdfFileList.innerHTML = '';
        }
        
        initialValidation();
    });

    pdfFilesInput.addEventListener('change', function() {
        pdfFileList.innerHTML = '';
        const uniqueFiles = [];
        const fileNames = new Set();
        let hasInvalidFile = false;
        
        Array.from(this.files).forEach((file, index) => {
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                hasInvalidFile = true;
                return;
            }
            
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
            showError('Only PDF files allowed');
            convertButton.disabled = true;
            return;
        }
        
        if (uniqueFiles.length < 2) {
            showError('At least 2 different PDF files required');
            convertButton.disabled = true;
            return;
        }
        
        const dataTransfer = new DataTransfer();
        uniqueFiles.forEach(file => dataTransfer.items.add(file));
        this.files = dataTransfer.files;
        
        convertButton.disabled = false;
        clearError();
    });

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

        if (!fileInput.files.length || !conversionType.value) {
            convertButton.disabled = true;
            return;
        }

        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const sourceFormat = conversionType.value.split('_to_')[0];
        
        if (!formatMappings[sourceFormat]) {
            showError(`Invalid source format: ${sourceFormat}`);
            convertButton.disabled = true;
            return;
        }

        if (!formatMappings[sourceFormat].includes(fileExt)) {
            showError(`Please select a file with ${formatMappings[sourceFormat].join(' or ')} extension`);
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

    convertForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const conversionValue = conversionType.value;
        
        resultDiv.className = 'loading';
        resultDiv.innerHTML = '<div class="loading-spinner"></div> Converting...';
        resultDiv.style.display = 'block';
    
        try {
            if (conversionValue === 'merge_pdfs') {
                const files = pdfFilesInput.files;
                if (files.length < 2) {
                    throw new Error('At least 2 PDF files required');
                }
                
                formData.delete('file');
                formData.delete('files');
                
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
                throw new Error(error.error || 'An error occurred');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Get filename from response headers or generate it
            let downloadFileName;
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    downloadFileName = filenameMatch[1];
                }
            }
            
            if (!downloadFileName) {
                const sourceFileName = fileInput.files[0]?.name || 'converted';
                const baseName = sourceFileName.replace(/\.[^/.]+$/, "");
                
                if (conversionValue.includes('_to_excel')) {
                    downloadFileName = `${baseName}.xlsx`;
                } else if (conversionValue === 'merge_pdfs') {
                    downloadFileName = 'merged.pdf';
                } else {
                    const targetExt = conversionValue.split('_to_')[1];
                    downloadFileName = `${baseName}.${targetExt}`;
                }
            }
            
            a.download = downloadFileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
    
            showSuccess('Conversion completed! Your file has been downloaded.');
        } catch (error) {
            showError('Error: ' + error.message);
        }
    });
    
    function showSuccess(message) {
        resultDiv.className = 'success';
        resultDiv.innerHTML = message;
        resultDiv.style.display = 'block';
        initialValidation();
    }
});