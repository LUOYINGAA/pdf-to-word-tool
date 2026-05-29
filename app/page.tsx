// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { saveAs } from "file-saver";

// ==================== i18n ====================
type Lang = "en" | "zh";
const i18n: Record<Lang, Record<string, string>> = {
  en: {
    title: "PDF Tools",
    subtitle: "100% browser-side conversion. Your files never leave your device.",
    tabWord: "PDF to Word (Text)",
    tabImages: "PDF to Images (HD)",
    wordDesc: "Extract text content while preserving original layout and formatting.",
    wordNote1: "Best for text-based PDFs (not scanned documents)",
    wordNote2: "Output: editable .docx file",
    imagesDesc: "Render each page as high-definition PNG (3x scale).",
    imagesNote1: "Works with any PDF, including scanned documents",
    imagesNote2: "Output: individual PNG images per page",
    loadingEngine: "Loading PDF engine...",
    dropArea: "Click or drag PDF files here",
    dropHint: "Batch upload supported, PDF only",
    fileList: "Files",
    btnConvert: "Start Conversion",
    btnDelete: "Delete",
    converting: "Converting...",
    done: "✅ Complete",
    failed: "❌ Failed",
    downloadWord: "⬇ Download Word",
    downloadAll: "⬇ Download All",
    pageLabel: "Page ",
    deleteConfirm: "Delete this file?",
    privacy: "🔒 100% client-side. Files are never uploaded.",
    poweredBy: "Powered by pdfjs-dist + docx.js",
  },
  zh: {
    title: "PDF 工具箱",
    subtitle: "纯前端转换，文件不上传服务器，保护您的隐私",
    tabWord: "PDF转Word（文字）",
    tabImages: "PDF转图片（高清）",
    wordDesc: "提取PDF中的文字内容，保留原始排版格式。",
    wordNote1: "适用于可编辑的PDF文档（非扫描件）",
    wordNote2: "输出：.docx文件，文字可编辑",
    imagesDesc: "将每一页渲染为高清PNG图片（3倍缩放）。",
    imagesNote1: "适用于任何PDF，包括扫描件",
    imagesNote2: "输出：每页独立PNG图片",
    loadingEngine: "正在加载PDF引擎...",
    dropArea: "点击或拖拽PDF文件到此处",
    dropHint: "支持批量上传，仅支持PDF格式",
    fileList: "文件列表",
    btnConvert: "开始转换",
    btnDelete: "删除",
    converting: "转换中...",
    done: "✅ 转换完成",
    failed: "❌ 转换失败",
    downloadWord: "⬇ 下载Word文件",
    downloadAll: "⬇ 下载全部图片",
    pageLabel: "第",
    deleteConfirm: "删除此文件？",
    privacy: "🔒 纯前端转换，文件不会上传到服务器",
    poweredBy: "Powered by pdfjs-dist + docx.js",
  },
};

// PDF.js legacy build
let pdfjsLib: any = null;
let pdfjsLoaded = false;

async function loadPdfJs() {
  if (pdfjsLoaded && pdfjsLib) return pdfjsLib;
  
  try {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      pdfjsLib = (window as any).pdfjsLib || (window as any).pdfjsDist;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        pdfjsLoaded = true;
      }
    };
    document.head.appendChild(script);
    
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (pdfjsLoaded) { clearInterval(check); resolve(true); }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(false); }, 10000);
    });
    
    return pdfjsLib;
  } catch (err) {
    console.error("Failed to load pdfjs-dist:", err);
    throw err;
  }
}

// ==================== Enhanced Text Extraction (preserves layout) ====================
async function pdfToWordText(file: File, onProgress?: (p: number) => void): Promise<Blob> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  
  const allParagraphs: Paragraph[] = [];
  
  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(((i - 1) / numPages) * 100);
    
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    
    interface TextItem {
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fontSize: number;
      fontName: string;
    }
    
    const items: TextItem[] = [];
    for (const item of textContent.items) {
      const it = item as any;
      if (!it.str || !it.str.trim()) continue;
      
      const tx = it.transform;
      const fontSize = Math.sqrt(tx[0] * tx[0] + tx[2] * tx[2]) || 12;
      
      items.push({
        text: it.str,
        x: tx[4],
        y: tx[5],
        width: it.width || (it.str.length * fontSize * 0.6),
        height: fontSize * 1.2,
        fontSize: Math.round(fontSize),
        fontName: it.fontName || "Helvetica",
      });
    }
    
    if (items.length === 0) continue;
    
    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 3) return yDiff;
      return a.x - b.x;
    });
    
    const lineThreshold = 5;
    const lines: TextItem[][] = [];
    let currentLine: TextItem[] = [items[0]];
    
    for (let j = 1; j < items.length; j++) {
      if (Math.abs(items[j].y - items[j-1].y) <= lineThreshold) {
        currentLine.push(items[j]);
      } else {
        currentLine.sort((a, b) => a.x - b.x);
        lines.push(currentLine);
        currentLine = [items[j]];
      }
    }
    currentLine.sort((a, b) => a.x - b.x);
    lines.push(currentLine);
    
    const paraThreshold = 18;
    const paragraphs: TextItem[][] = [];
    let currentPara: TextItem[] = [lines[0][0]];
    let lastLineY = lines[0][0].y;
    
    for (let li = 0; li < lines.length; li++) {
      const lineAvgY = lines[li].reduce((s, it) => s + it.y, 0) / lines[li].length;
      
      if (li > 0 && Math.abs(lineAvgY - lastLineY) > paraThreshold) {
        paragraphs.push(currentPara);
        currentPara = [...lines[li]];
      } else {
        currentPara.push(...lines[li]);
      }
      lastLineY = lineAvgY;
    }
    paragraphs.push(currentPara);
    
    for (const para of paragraphs) {
      para.sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 3) return yDiff;
        return a.x - b.x;
      });
      
      const runs: { text: string; size: number; bold: boolean }[] = [];
      let currentRun: typeof runs[0] | null = null;
      
      for (const item of para) {
        const isBold = item.fontSize >= 14 || (item.fontName && item.fontName.toLowerCase().includes("bold"));
        const runSize = Math.max(10, Math.min(item.fontSize, 72));
        
        if (currentRun && currentRun.size === runSize && currentRun.bold === isBold) {
          currentRun.text += item.text;
        } else {
          if (currentRun) runs.push(currentRun);
          currentRun = { text: item.text, size: runSize, bold: isBold };
        }
      }
      if (currentRun) runs.push(currentRun);
      
      const avgX = para.reduce((s, it) => s + it.x, 0) / para.length;
      const pageWidth = viewport.width;
      let alignment = AlignmentType.LEFT;
      if (avgX > pageWidth * 0.7) alignment = AlignmentType.RIGHT;
      else if (avgX > pageWidth * 0.3 && avgX < pageWidth * 0.7) alignment = AlignmentType.CENTER;
      
      allParagraphs.push(
        new Paragraph({
          alignment,
          spacing: { after: 200, line: 276 },
          children: runs.map(r =>
            new TextRun({
              text: r.text,
              size: r.size * 2,
              bold: r.bold,
              font: "Calibri",
            })
          ),
        })
      );
    }
    
    if (i < numPages) {
      allParagraphs.push(new Paragraph({ children: [] }));
      allParagraphs.push(new Paragraph({ pageBreakBefore: true }));
    }
  }
  
  if (onProgress) onProgress(100);
  
  const doc = new Document({
    sections: [{ children: allParagraphs }],
  });
  
  return Packer.toBlob(doc);
}

// ==================== PDF to Images ====================
async function pdfToImages(file: File, onProgress?: (p: number) => void): Promise<Blob[]> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  
  const imageBlobs: Blob[] = [];
  
  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(((i - 1) / numPages) * 100);
    
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 3.0 });
    
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png", 1.0)
    );
    
    imageBlobs.push(blob);
  }
  
  if (onProgress) onProgress(100);
  return imageBlobs;
}

// ==================== UI Component ====================
interface FileItem {
  id: string;
  file: File;
  status: "pending" | "converting" | "done" | "error";
  progress: number;
  outputUrl?: string;
  outputBlobs?: Blob[];
  error?: string;
}

export default function PDFTools() {
  const [activeTab, setActiveTab] = useState<"word" | "images">("word");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [pdfEngineReady, setPdfEngineReady] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const t = i18n[lang];

  useEffect(() => {
    loadPdfJs()
      .then(() => setPdfEngineReady(true))
      .catch((err) => console.error("Failed to load PDF engine:", err));
  }, []);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const pdfFiles = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    const newItems: FileItem[] = pdfFiles.map((file) => ({
      id: `file-${Date.now()}-${Math.random()}`,
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newItems]);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  // Delete single file
  const deleteFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const convertFile = useCallback(async (item: FileItem) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: "converting", progress: 0 } : f))
    );

    try {
      if (activeTab === "word") {
        const wordBlob = await pdfToWordText(item.file, (progress) => {
          setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, progress } : f)));
        });
        const url = URL.createObjectURL(wordBlob);
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "done", progress: 100, outputUrl: url } : f))
        );
      } else {
        const imageBlobs = await pdfToImages(item.file, (progress) => {
          setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, progress } : f)));
        });
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "done", progress: 100, outputBlobs: imageBlobs } : f))
        );
      }
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "error", error: err.message || "Conversion failed" } : f
        )
      );
    }
  }, [activeTab]);

  const convertAll = useCallback(() => {
    files.filter((f) => f.status === "pending").forEach((f) => convertFile(f));
  }, [files, convertFile]);

  const downloadWord = useCallback((item: FileItem) => {
    if (!item.outputUrl) return;
    const a = document.createElement("a");
    a.href = item.outputUrl;
    a.download = item.file.name.replace(/\.pdf$/i, ".docx");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const downloadImage = useCallback((blob: Blob, index: number) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `page-${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const downloadAllImages = useCallback((item: FileItem) => {
    if (!item.outputBlobs?.length) return;
    item.outputBlobs.forEach((blob, idx) =>
      setTimeout(() => downloadImage(blob, idx), idx * 500)
    );
  }, [downloadImage]);

  // ==================== Render ====================
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1a1a1a" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          📄 {t.title}
        </h1>
        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === "en" ? "zh" : "en")}
          style={{
            padding: "6px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            background: "white",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
          }}
        >
          🌐 {lang === "en" ? "中文" : "English"}
        </button>
      </div>
      <p style={{ color: "#6b7280", marginBottom: 28, fontSize: 15 }}>{t.subtitle}</p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid #f3f4f6" }}>
        {(["word", "images"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "12px 24px",
              border: "none",
              background: activeTab === tab ? "linear-gradient(135deg, #667eea, #764ba2)" : "transparent",
              color: activeTab === tab ? "white" : "#6b7280",
              borderRadius: "10px 10px 0 0",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              transition: "all 0.2s",
            }}
          >
            {tab === "word" ? `📝 ${t.tabWord}` : `🖼️ ${t.tabImages}`}
          </button>
        ))}
      </div>

      {/* Feature Card */}
      <div style={{ 
        background: activeTab === "word" ? "#f0f4ff" : "#fff7ed", 
        padding: 16, borderRadius: 12, marginBottom: 24, fontSize: 14,
        borderLeft: `4px solid ${activeTab === "word" ? "#667eea" : "#f97316"}`
      }}>
        <strong style={{ display: "block", marginBottom: 6 }}>
          {activeTab === "word" ? `📝 ${t.tabWord}` : `🖼️ ${t.tabImages}`}
        </strong>
        <ul style={{ margin: 0, paddingLeft: 20, color: "#4b5563" }}>
          <li>{activeTab === "word" ? t.wordDesc : t.imagesDesc}</li>
          <li>{activeTab === "word" ? t.wordNote1 : t.imagesNote1}</li>
          <li>{activeTab === "word" ? t.wordNote2 : t.imagesNote2}</li>
        </ul>
      </div>

      {/* Engine Status */}
      {!pdfEngineReady && (
        <div style={{ background: "#fef3c7", padding: 14, borderRadius: 10, marginBottom: 20, textAlign: "center", fontWeight: 500 }}>
          ⏳ {t.loadingEngine}
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? "#667eea" : "#d1d5db"}`,
          borderRadius: 16,
          padding: "52px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: dragActive ? "#f5f3ff" : "#fafafa",
          transition: "all 0.25s",
          marginBottom: 24,
        }}
      >
        <input ref={fileInputRef} type="file" accept=".pdf" multiple onChange={(e) => e.target.files && handleFiles(e.target.files)} style={{ display: "none" }} />
        <div style={{ fontSize: 52, marginBottom: 12 }}>📄</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{t.dropArea}</div>
        <div style={{ color: "#9ca3af", fontSize: 13 }}>{t.dropHint}</div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
              {t.fileList} ({files.length})
            </h3>
            <button
              onClick={convertAll}
              disabled={files.every((f) => f.status !== "pending")}
              style={{
                padding: "10px 24px",
                background: files.every((f) => f.status !== "pending") ? "#d1d5db" : "linear-gradient(135deg, #667eea, #764ba2)",
                color: "white",
                border: "none",
                borderRadius: 10,
                cursor: files.every((f) => f.status !== "pending") ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 14,
                boxShadow: files.every((f) => f.status !== "pending") ? "none" : "0 4px 12px rgba(102,126,234,0.35)",
              }}
            >
              🚀 {t.btnConvert}
            </button>
          </div>

          {files.map((item) => (
            <div key={item.id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 15, flex: 1, marginRight: 12, wordBreak: "break-all" }}>
                  📄 {item.file.name}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>{(item.file.size / 1024).toFixed(1)} KB</span>
                  {/* Delete Button */}
                  <button
                    onClick={() => deleteFile(item.id)}
                    style={{
                      padding: "4px 10px",
                      background: "#fee2e2",
                      color: "#dc2626",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                    title={t.btnDelete}
                  >
                    🗑️ {t.btnDelete}
                  </button>
                </div>
              </div>

              {/* Progress */}
              {item.status === "converting" && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ background: "#e5e7eb", borderRadius: 6, height: 8, overflow: "hidden" }}>
                    <div style={{ background: "linear-gradient(90deg, #667eea, #764ba2)", height: "100%", width: `${item.progress}%`, transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{t.converting} {item.progress.toFixed(0)}%</div>
                </div>
              )}

              {/* Status */}
              {item.status === "done" && <div style={{ color: "#16a34a", fontWeight: 600, fontSize: 14 }}>{t.done}</div>}
              {item.status === "error" && <div style={{ color: "#dc2626", fontSize: 14 }}>{t.failed} {item.error}</div>}

              {/* Downloads */}
              {item.status === "done" && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {activeTab === "word" && item.outputUrl && (
                    <button onClick={() => downloadWord(item)} style={{ padding: "8px 18px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                      {t.downloadWord}
                    </button>
                  )}
                  {activeTab === "images" && item.outputBlobs && (
                    <>
                      <button onClick={() => downloadAllImages(item)} style={{ padding: "8px 18px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                        {t.downloadAll}
                      </button>
                      {item.outputBlobs.map((_, idx) => (
                        <button key={idx} onClick={() => downloadImage(item.outputBlobs![idx], idx)} style={{ padding: "6px 14px", background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                          {t.pageLabel}{idx + 1}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", color: "#d1d5db", fontSize: 12, marginTop: 48, lineHeight: 1.8 }}>
        <p>{t.privacy}</p>
        <p>{t.poweredBy}</p>
      </div>
    </div>
  );
}
