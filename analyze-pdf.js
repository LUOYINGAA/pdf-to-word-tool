/**
 * PDF Analysis Script
 * Analyzes PDF structure without browser Canvas API
 */

const fs = require('fs');
const path = require('path');

// Simple PDF parser to extract basic info
function analyzePDF(buffer) {
  const content = buffer.toString('latin1');
  
  // Extract page count
  const pageCountMatch = content.match(/\/Type\s*\/Page[^s][^>]*?/g);
  const typePageMatches = content.match(/\/Type\s*\/Pages/g);
  
  // Look for /Count in Pages object
  const countMatch = content.match(/\/Count\s+(\d+)/);
  
  // Look for images (XObject with Image subtype)
  const imageXObjects = content.match(/\/Subtype\s*\/Image/g) || [];
  
  // Look for text content indicators
  const textIndicators = [
    '/Font',
    '/Tf',  // Text font operator
    '/Tj',  // Show text operator
    'BT',   // Begin text
    'ET',   // End text
  ];
  
  const hasText = textIndicators.some(indicator => content.includes(indicator));
  
  return {
    fileSize: buffer.length,
    header: buffer.slice(0, 8).toString('ascii'),
    estimatedPages: countMatch ? parseInt(countMatch[1]) : 'unknown',
    imageXObjectCount: imageXObjects.length,
    hasTextContent: hasText,
    // Check for common image formats in PDF
    hasJPEG: content.includes('/DCTDecode') || content.includes('/Filter\s*\/DCTDecode'),
    hasPNG: content.includes('/FlateDecode'),
    // Estimate if it's a scanned document or text-based
    likelyScanned: !hasText && imageXObjects.length > 0,
  };
}

// Run analysis
const pdfPath = 'D:\\产品测试报告.pdf';
console.log('🔍 Analyzing PDF:', pdfPath);
console.log('=' .repeat(50));

try {
  const buffer = fs.readFileSync(pdfPath);
  const analysis = analyzePDF(buffer);
  
  console.log('\n📊 PDF Analysis Results:');
  console.log('-'.repeat(30));
  console.log(`File Size: ${(analysis.fileSize / 1024).toFixed(1)} KB`);
  console.log(`Format: ${analysis.header}`);
  console.log(`Estimated Pages: ${analysis.estimatedPages}`);
  console.log(`Image XObjects: ${analysis.imageXObjectCount}`);
  console.log(`Has Text Content: ${analysis.hasTextContent ? '✅ Yes' : '❌ No'}`);
  console.log(`Contains JPEG Images: ${analysis.hasJPEG ? '✅ Yes' : '❌ No'}`);
  console.log(`Contains PNG/Flate Images: ${analysis.hasPNG ? '✅ Yes' : '❌ No'}`);
  console.log(`Likely Scanned Document: ${analysis.likelyScanned ? '⚠️ Yes' : '✅ No (text-based)'}`);
  
  console.log('\n💡 Conversion Expectations:');
  console.log('-'.repeat(30));
  if (analysis.hasTextContent) {
    console.log('✅ Text extraction should work well');
  }
  if (analysis.imageXObjectCount > 0) {
    console.log(`⚠️ Contains ${analysis.imageXObjectCount} embedded images`);
    console.log('   Image extraction may be limited by pdfjs-dist API');
  }
  if (analysis.likelyScanned) {
    console.log('📸 Document appears to be scanned');
    console.log('   Will render pages as high-res images (scale=3.0)');
  }
  
  console.log('\n🎯 Recommended Test Steps:');
  console.log('1. Open http://localhost:3000');
  console.log('2. Upload this PDF file');
  console.log('3. Click "Start Conversion"');
  console.log('4. Check the Conversion Log panel');
  console.log('5. Download and open the resulting .docx');
  
} catch (error) {
  console.error('❌ Error analyzing PDF:', error.message);
}
