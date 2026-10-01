export type AnalysisStatus = "aman" | "perhatian" | "bahaya" | "informasi";
export type AnalysisTask = "hitung" | "progress" | "keamanan" | "umum";

export type AnalysisResult = {
  title: string;
  summary: string;
  findings: string[];
  status: AnalysisStatus;
  task?: AnalysisTask;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .replace(/```(?:json)?/gi, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^\s*[-*•]+\s*/gm, "")
    .replace(/`/g, "")
    .trim();
}

function normalizeStatus(value: unknown): AnalysisStatus {
  if (value === "aman" || value === "perhatian" || value === "bahaya") return value;
  return "informasi";
}

function normalizeTask(value: unknown): AnalysisTask | undefined {
  if (value === "hitung" || value === "progress" || value === "keamanan" || value === "umum") {
    return value;
  }
  return undefined;
}

export function parseAnalysis(value: string): AnalysisResult {
  const cleaned = cleanText(value);

  try {
    const parsed = JSON.parse(cleaned) as Partial<AnalysisResult>;
    const findings = Array.isArray(parsed.findings)
      ? parsed.findings.map(cleanText).filter(Boolean)
      : [];

    return {
      title: cleanText(parsed.title) || "Hasil Analisis AI",
      summary: cleanText(parsed.summary) || "Analisis selesai diproses.",
      findings,
      status: normalizeStatus(parsed.status),
      task: normalizeTask(parsed.task),
    };
  } catch {
    const lines = cleaned
      .split(/\r?\n/)
      .map((line) => cleanText(line.replace(/^\s*\d+[.)]\s*/, "")))
      .filter(Boolean);
    const summaryIndex = lines.findIndex((line) =>
      /^(ringkasan|keterangan aktivitas|analisis|kesimpulan)\s*:/i.test(line),
    );
    const summary = cleanText(
      (summaryIndex >= 0 ? lines[summaryIndex] : lines[0] || "Analisis selesai diproses.")
        .replace(/^[^:]+:\s*/, ""),
    );
    const findings = lines
      .filter((_, index) => index !== (summaryIndex >= 0 ? summaryIndex : 0))
      .filter((line) => !/^berdasarkan pengamatan/i.test(line))
      .map((line) => line.replace(/^[^:]{1,40}:\s*/, "").trim())
      .filter(Boolean);

    return {
      title: "Hasil Analisis AI",
      summary,
      findings,
      status: /bahaya|mencurigakan|risiko tinggi/i.test(cleaned)
        ? "bahaya"
        : /perhatian|potensi|berantakan/i.test(cleaned)
          ? "perhatian"
          : "informasi",
    };
  }
}

export function serializeAnalysis(result: AnalysisResult, task?: string) {
  return JSON.stringify({ ...result, task: normalizeTask(task) || result.task });
}
