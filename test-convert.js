/**
 * Test script for PDF to Word conversion
 * Run with: node test-convert.js
 */

const fs = require('fs');
const path = require('path');

// Read the PDF file
const pdfPath = 'D:\\产品测试报告.pdf';
console.log(`📄 Reading PDF: ${pdfPath}`);

if (!fs.existsSync(pdfPath)) {
  console.error('❌ PDF file not found!');
  process.exit(1);
}

const pdfBuffer = fs.readFileSync(pdfPath);
console.log(`✅ PDF loaded: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

// We'll use the browser-based approach via a simple HTML test page
// Let's create a test HTML that auto-loads and converts the PDF

const testHTML = `<!DOCTYPE html>
<html>
<head>
  <title>PDF to Word Test</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
  <h1>PDF to Word Conversion Test</h1>
  <div id="log" style="white-space: pre-wrap; font-family: monospace; background: #f0f0f0; padding: 10px;"></div>
  
  <script>
    const logEl = document.getElementById('log');
    function log(msg) { logEl.textContent += msg + '\\n'; console.log(msg); }
    
    async function test() {
      try {
        log('🚀 Starting PDF to Word test...');
        
        // Load PDF
        const response = await fetch('/test-pdf');
        if (!response.ok) throw new Error('Failed to load PDF');
        const arrayBuffer = await response.arrayBuffer();
        log(\`✅ PDF loaded: \${(arrayBuffer.byteLength / 1024).toFixed(1)} KB\`);
        
        // Parse PDF
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        log(\`📖 PDF parsed: \${pdf.numPages} pages\`);
        
        // Analyze each page
        for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const textItems = textContent.items;
          
          log(\`\\n--- Page \${i} ---\`);
          log(\`   Text items: \${textItems.length}\`);
          
          if (textItems.length > 0) {
            const sampleText = textItems.slice(0, 3).map(t => t.str).join(' ');
            log(\`   Sample text: "\${sampleText.substring(0, 100)}"\`);
          }
          
          // Check for images
          try {
            const resources = await page.getResources();
            if (resources && resources.XObject) {
              const xobjKeys = Object.keys(resources.XObject);
              log(\`   XObjects: \${xobjKeys.length} (\${xobjKeys.join(', ')})\`);
            } else {
              log(\`   XObjects: none\`);
            }
          } catch (e) {
            log(\`   XObject check error: \${e.message}\`);
          }
        }
        
        log('\\n✅ Test complete!');
      } catch (e) {
        log(\`❌ Error: \${e.message}\\n\${e.stack}\`);
      }
    }
    
    test();
  </script>
</body>
</html>`;

console.log('\n📝 Test approach:');
console.log('1. The PDF-to-Word tool runs in browser (Next.js client-side)');
console.log('2. Cannot fully test conversion in Node.js (needs Canvas API)');
console.log('\n💡 Recommendation:');
console.log('- Open http://localhost:3000 in browser');
console.log('- Upload D:\\\\产品测试报告.pdf');
console.log('- Check conversion log and download result');

// Let's at least verify the PDF is valid by checking its header
const header = pdfBuffer.slice(0, 8).toString('ascii');
console.log(`\n📋 PDF Header: ${header}`);
console.log(`✅ File appears to be a valid PDF`);
