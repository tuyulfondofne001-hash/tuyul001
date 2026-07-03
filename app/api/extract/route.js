import { NextResponse } from "next/server";

export async function POST(req) {
  // Cek API key endpoint sendiri
  const authHeader = (req.headers.get("authorization") || "").trim();
  const secret = (process.env.API_SECRET_KEY || "").trim();
  const expectedKey = `Bearer ${secret}`;

  if (!secret || authHeader !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // `prompt` = system prompt yang dikirim dari backend JejakKarir (CVsController::extractPdf).
  // Endpoint ini TIDAK menyimpan/hardcode prompt sendiri — sepenuhnya dikontrol pengirim.
  const { pdf_text_content, prompt } = body;

  if (!pdf_text_content) {
    return NextResponse.json(
      { error: "pdf_text_content is required" },
      { status: 400 }
    );
  }

  if (!prompt) {
    return NextResponse.json(
      { error: "prompt (system prompt) is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning-20260428:free",
        max_tokens: 250000,
        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: pdf_text_content,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: response.status });
    }

    const rawContent = data?.choices?.[0]?.message?.content ?? "";

    // Ambil blok XML murni jika dibungkus markdown code block
    const xmlMatch = rawContent.match(/```(?:xml)?\s*([\s\S]*?)```/);
    const xmlContent = xmlMatch ? xmlMatch[1].trim() : rawContent.trim();

    return NextResponse.json({
      xml: xmlContent,
      raw: rawContent,
      usage: data.usage,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
