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
    
    // PDF Merge Related Elements
    const pdfMergeSection = document.getElementById('pdfMergeSection');
    const pdfFilesInput = document.getElementById('pdfFiles');
    const pdfFileList = document.getElementById('pdfFileList');

    // Updated Format Mappings to include jpg and png
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
    
    // Conversion Type Change Handler
    conversionType.addEventListener('change', function() {
        // Reset form
        fileInput.value = '';
        fileInfo.classList.remove('active');
        resultDiv.style.display = 'none';
        
        // Handle PDF Merge Section Visibility
        if (this.value === 'merge_pdfs') {
            pdfMergeSection.style.display = 'block';
            fileUpload.style.display = 'none';
            convertButton.disabled = true;
        } else {
            pdfMergeSection.style.display = 'none';
            fileUpload.style.display = 'block';
        }
        
        validateForm();
    });
    
    // PDF Merge File Selection
    pdfFilesInput.addEventListener('change', function() {
        pdfFileList.innerHTML = ''; // Clear previous list
        
        if (this.files.length < 2) {
            convertButton.disabled = true;
            resultDiv.className = 'error';
            resultDiv.innerHTML = 'En az 2 PDF dosyası seçmelisiniz.';
            return;
        }
        
        // Validate PDF files
        const invalidFiles = Array.from(this.files).filter(file => 
            !file.name.toLowerCase().endsWith('.pdf')
        );
        
        if (invalidFiles.length > 0) {
            convertButton.disabled = true;
            resultDiv.className = 'error';
            resultDiv.innerHTML = 'Sadece PDF dosyaları seçilebilir.';
            return;
        }
        
        // Create file list
        Array.from(this.files).forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'multi-file-item';
            fileItem.innerHTML = `
                <span>${file.name}</span>
                <span class="remove-file" data-index="${index}">✖</span>
            `;
            pdfFileList.appendChild(fileItem);
        });
        
        // Remove file functionality
        document.querySelectorAll('.remove-file').forEach(removeBtn => {
            removeBtn.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                const dt = new DataTransfer();
                
                // Re-add files except the removed one
                for (let i = 0; i < pdfFilesInput.files.length; i++) {
                    if (i != index) {
                        dt.items.add(pdfFilesInput.files[i]);
                    }
                }
                
                pdfFilesInput.files = dt.files;
                this.closest('.multi-file-item').remove();
                
                // Re-validate
                if (pdfFilesInput.files.length < 2) {
                    convertButton.disabled = true;
                    resultDiv.className = 'error';
                    resultDiv.innerHTML = 'En az 2 PDF dosyası seçmelisiniz.';
                }
            });
        });
        
        // Enable convert button
        convertButton.disabled = false;
        resultDiv.style.display = 'none';
    });

    // File drag and drop functionality
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
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        updateFileInfo();
        validateForm();
    }
    
    fileInput.addEventListener('change', function() {
        updateFileInfo();
        validateForm();
    });
    
    conversionType.addEventListener('change', function() {
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
        if (fileInput.files.length === 0 || !conversionType.value) {
            convertButton.disabled = true;
            resultDiv.style.display = 'none';
            return;
        }
        
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const sourceFormat = conversionType.value.split('_to_')[0];
        
        if (!formatMappings[sourceFormat].includes(fileExt)) {
            resultDiv.className = 'error';
            resultDiv.innerHTML = `Hata: Bu dönüşüm için ${formatMappings[sourceFormat].join(' veya ')} uzantılı bir dosya seçmelisiniz.`;
            convertButton.disabled = true;
        } else {
            resultDiv.style.display = 'none';
            convertButton.disabled = false;
        }
    }
    
    // Form submission
    convertForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const form = new FormData(this);
        
        // Show loading indicator
        resultDiv.className = 'loading';
        resultDiv.innerHTML = '<div class="loading-spinner"></div> Dönüştürülüyor...';
        
        // Special handling for PDF merge
        if (conversionType.value === 'merge_pdfs') {
            // Use pdfFilesInput for multiple files
            const dt = pdfFilesInput.files;
            form.delete('file');
            for (let i = 0; i < dt.length; i++) {
                form.append('files', dt[i]);
            }
        }
        
        fetch('/api/convert', {
            method: 'POST',
            body: form
        })
        .then(response => {
            if (response.ok) {
                return response.blob();
            }
            return response.json().then(err => {
                throw new Error(err.error || 'Bir hata oluştu');
            });
        })
        .then(blob => {
            const targetFormat = conversionType.value === 'merge_pdfs' 
                ? 'pdf' 
                : conversionType.value.split('_to_')[1];
            
            let extension = targetFormat;
            if (targetFormat === 'excel') extension = 'xlsx';
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Handle filename for merged PDFs or conversions
            a.download = conversionType.value === 'merge_pdfs' 
                ? 'merged.pdf' 
                : fileInput.files[0].name.split('.')[0] + '.' + extension;
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            resultDiv.className = 'success';
            resultDiv.innerHTML = 'Dönüşüm başarıyla tamamlandı! Dosyanız indirildi.';
        })
        .catch(error => {
            resultDiv.className = 'error';
            resultDiv.innerHTML = 'Hata: ' + error.message;
        });
    });
});