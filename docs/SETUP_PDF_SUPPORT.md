# PDF Support Setup

## Install Required Package

To enable PDF processing, you need to install the `pdfjs-dist` package:

```bash
npm install pdfjs-dist
```

Or if using yarn:

```bash
yarn add pdfjs-dist
```

Or if using pnpm:

```bash
pnpm add pdfjs-dist
```

## What's Changed

1. **DocumentService** - Added `extractTextFromPDF()` method
   - Uses `pdfjs-dist` library (browser-compatible)
   - Extracts text from all pages
   - Handles multi-page PDFs

2. **DocumentUpload UI** - Updated to accept PDFs
   - File input accepts `.txt` and `.pdf`
   - Validation checks for both formats
   - Updated help text

## How It Works

When a PDF is uploaded:
1. File is read as ArrayBuffer
2. PDF.js loads and parses the document
3. Text is extracted from each page
4. All pages are concatenated with double newlines
5. Text is split into chunks with embeddings
6. Stored in database for semantic search

## Testing

After installing the package:

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Go to Admin Chat → Documents

3. Upload a PDF file

4. Wait for processing (status shows "Processing" → "Ready")

5. Ask questions about the PDF content!

## Troubleshooting

### "Cannot find module 'pdfjs-dist'"
- Make sure you ran `npm install pdfjs-dist`
- Restart your dev server

### PDF processing fails
- Check browser console for errors
- Ensure PDF is not password-protected
- Try with a different PDF file

### Text extraction is incomplete
- Some PDFs use images instead of text (OCR needed)
- Scanned PDFs won't work without OCR
- Complex layouts may have text order issues

## Supported PDF Features

✅ Text-based PDFs
✅ Multi-page documents
✅ Standard fonts
✅ Simple layouts

❌ Scanned documents (need OCR)
❌ Images in PDFs
❌ Complex tables (may have formatting issues)
❌ Password-protected PDFs

## Future Enhancements

- OCR support for scanned PDFs
- Image extraction and description
- Table structure preservation
- Form field extraction
