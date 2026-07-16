export type ServiceAiResult = {
  category: string;
  qualityLabel: string;
  summary: string;
  tags: string[];
};

const allowedCategories = ["Rumah", "Kreatif", "Kecantikan", "Digital", "Lainnya"];

const keywordCategories = [
  {
    category: "Rumah",
    keywords: [
      "ac",
      "bersih",
      "dapur",
      "elektrik",
      "instalasi",
      "kamar mandi",
      "lampu",
      "ledeng",
      "listrik",
      "renovasi",
      "rumah",
      "sofa",
      "stop kontak",
    ],
  },
  {
    category: "Kecantikan",
    keywords: [
      "beauty",
      "hair",
      "kecantikan",
      "makeup",
      "mua",
      "nail",
      "salon",
      "skincare",
      "wisuda",
    ],
  },
  {
    category: "Kreatif",
    keywords: [
      "desain",
      "foto",
      "fotografer",
      "konten",
      "kreatif",
      "produk",
      "studio",
      "video",
    ],
  },
  {
    category: "Digital",
    keywords: [
      "aplikasi",
      "digital",
      "landing page",
      "online",
      "qr",
      "umkm",
      "website",
      "whatsapp",
    ],
  },
];

function normalizeText(value: string) {
  return value.toLowerCase();
}

function fallbackCategory(text: string) {
  const normalized = normalizeText(text);

  for (const group of keywordCategories) {
    if (group.keywords.some((keyword) => normalized.includes(keyword))) {
      return group.category;
    }
  }

  return "Lainnya";
}

function fallbackTags(text: string) {
  const normalized = normalizeText(text);
  const tags = new Set<string>();

  for (const group of keywordCategories) {
    for (const keyword of group.keywords) {
      if (normalized.includes(keyword)) {
        tags.add(keyword);
      }
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
    category: fallbackCategory(text),
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
              "Kamu mengklasifikasikan katalog jasa Indonesia. Balas JSON valid saja dengan keys: category, tags, qualityLabel, summary. category harus salah satu: Rumah, Kreatif, Kecantikan, Digital, Lainnya. qualityLabel harus singkat: Sangat direkomendasikan, Direkomendasikan, Campuran, Perlu hati-hati, atau Belum cukup sinyal. summary maksimal 140 karakter.",
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
    const category =
      parsed.category && allowedCategories.includes(parsed.category)
        ? parsed.category
        : fallback.category;

    return {
      category,
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
