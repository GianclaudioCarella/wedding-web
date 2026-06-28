# PDF Support

PDF support is implemented and the `pdfjs-dist` package is already installed.

## How It Works

When a PDF is uploaded in Admin Chat → Documents:

1. File is read as `ArrayBuffer`
2. `pdfjs-dist` parses the document
3. Text is extracted from each page and concatenated
4. Text is chunked and embedded for semantic search (see `RAG_README.md`)

## Supported

- Text-based PDFs
- Multi-page documents
- Standard fonts and simple layouts

## Not Supported

- Scanned PDFs (OCR not implemented)
- Images embedded in PDFs
- Password-protected PDFs
- Complex table layouts (text order may be wrong)

## Implementation

- `lib/services/document.service.ts` — `extractTextFromPDF()` method
- `app/admin/chat/components/DocumentUpload.tsx` — accepts `.txt` and `.pdf`
