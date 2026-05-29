# PDF to Word Converter

A free, privacy-focused PDF to Word converter that runs entirely in your browser. No uploads, no servers, no tracking.

## Features

- ✅ **100% Private** - All processing happens in your browser
- ✅ **No Uploads** - Files never leave your device
- ✅ **Batch Conversion** - Convert multiple PDFs at once
- ✅ **Image Preservation** - Images in PDFs are extracted and preserved
- ✅ **Mobile Friendly** - Works on any device
- ✅ **No Registration** - Start using immediately
- ✅ **No Ads** - Clean, distraction-free interface

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **PDF Processing**: pdf.js (Mozilla)
- **Word Generation**: docx library
- **Dropzone**: react-dropzone
- **File Handling**: file-saver

## Getting Started

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start using.

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Deploy automatically

Or use Vercel CLI:

```bash
npm i -g vercel
vercel
```

## How It Works

1. **Upload**: Drag & drop or browse for PDF files
2. **Convert**: Click "Convert All" to start processing
3. **Download**: Get your .docx files instantly

All processing uses WebAssembly and client-side JavaScript - your files stay on your device.

## Privacy Guarantee

- No data is sent to any server
- No cookies or tracking
- No account required
- Works offline after first load

## License

MIT
