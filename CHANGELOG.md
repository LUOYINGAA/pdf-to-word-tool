# PDF to Word Converter - 2026-05-29

## Status
- Server running on port 3003 (http://localhost:3003)
- Core conversion working: PDF → Word
- Files: app/page.tsx (main UI)

## Changes
- Rewrote page.tsx from scratch with proper bracket matching
- Key: The Paragraph constructor for docx uses:
  `new Paragraph({ children: [new TextRun({ text: text })], spacing: { after: 120 })`

## Technical
- Uses pdfjs-dist v3.11.174 for PDF parsing
- Uses docx npm package for Word generation
- Client-side only, no server required