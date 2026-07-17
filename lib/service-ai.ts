export type ServiceAiResult = {
  category: string;
  qualityLabel: string;
  summary: string;
  tags: string[];
};

const serviceKeywords = [
  "ac",
  "aplikasi",
  "beauty",
  "bersih",
  "dapur",
  "desain",
  "elektrik",
  "foto",
  "fotografer",
  "hair",
  "instalasi",
  "kamar mandi",
  "konten",
  "lampu",
  "landing page",
  "ledeng",
  "listrik",
  "makeup",
  "mua",
  "nail",
  "online",
  "produk",
  "qr",
  "renovasi",
  "salon",
  "skincare",
  "sofa",
  "stop kontak",
  "studio",
  "umkm",
  "video",
  "website",
  "whatsapp",
  "wisuda",
];

function normalizeText(value: string) {
  return value.toLowerCase();
}

function normalizeCategory(value?: string | null) {
  const trimmed = value
    ?.replace(/[#|/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!trimmed) {
    return "Jasa umum";
  }

  return trimmed.slice(0, 40);
}

function fallbackCategory(title: string) {
  return normalizeCategory(title);
}

function fallbackTags(text: string) {
  const normalized = normalizeText(text);
  const tags = new Set<string>();

  for (const keyword of serviceKeywords) {
    if (normalized.includes(keyword)) {
      tags.add(keyword);
    }
  }

  return [...tags].slice(0, 5);
}

function fallbackQuality(text: string) {
  const normalized = normalizeText(text);

  if (
    ["buruk", "tidak datang", "penipuan", "kecewa", "mahal"].some((word) =>
      normalized.includes(word),
    )
  ) {
    return "Perlu hati-hati";
  }

  if (
    ["rapi", "tepat waktu", "bagus", "cepat", "jelas", "sopan"].some((word) =>
      normalized.includes(word),
    )
  ) {
    return "Direkomendasikan";
  }

  return "Belum cukup sinyal";
}

function fallbackSummary(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return "Belum ada ringkasan review.";
  }

  return trimmed.length > 130 ? `${trimmed.slice(0, 127)}...` : trimmed;
}

function parseAiJson(content: string): Partial<ServiceAiResult> {
  try {
    return JSON.parse(content) as Partial<ServiceAiResult>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);

    if (!match) {
      return {};
    }

    try {
      return JSON.parse(match[0]) as Partial<ServiceAiResult>;
    } catch {
      return {};
    }
  }
}

export async function analyzeServiceContent({
  description,
  review,
  title,
}: {
  description: string;
  review?: string | null;
  title: string;
}): Promise<ServiceAiResult> {
  const text = [title, description, review].filter(Boolean).join("\n");
  const fallback: ServiceAiResult = {
    category: fallbackCategory(title),
    qualityLabel: fallbackQuality(text),
    summary: fallbackSummary(review || description),
    tags: fallbackTags(text),
  };
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      body: JSON.stringify({
        messages: [
          {
            content:
              "Kamu mengklasifikasikan katalog jasa Indonesia. Balas JSON valid saja dengan keys: category, tags, qualityLabel, summary. category harus berupa jenis jasa spesifik dari input user, singkat 1-3 kata, misalnya Teknisi listrik, Fotografer produk, Makeup artist, Web UMKM. Jangan pakai bucket kategori generik bawaan. qualityLabel harus singkat: Sangat direkomendasikan, Direkomendasikan, Campuran, Perlu hati-hati, atau Belum cukup sinyal. summary maksimal 140 karakter.",
            role: "system",
          },
          {
            content: JSON.stringify({ description, review, title }),
            role: "user",
          },
        ],
        model: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return fallback;
    }

    const parsed = parseAiJson(content);
    return {
      category: normalizeCategory(parsed.category ?? fallback.category),
      qualityLabel: parsed.qualityLabel?.slice(0, 40) || fallback.qualityLabel,
      summary: parsed.summary?.slice(0, 160) || fallback.summary,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.map(String).slice(0, 6)
        : fallback.tags,
    };
  } catch {
    return fallback;
  }
}
