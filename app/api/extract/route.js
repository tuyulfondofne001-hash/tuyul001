import { NextResponse } from "next/server";

export async function POST(req) {
  // Cek API key endpoint sendiri
  const authHeader = (req.headers.get("authorization") || "").trim();
  const secret = (process.env.API_SECRET_KEY || "").trim();
  const expectedKey = `Bearer ${secret}`;

  if (!secret || authHeader !== expectedKey) {
    console.log("DEBUG received  :", JSON.stringify(authHeader));
    console.log("DEBUG expected  :", JSON.stringify(expectedKey));
    console.log("DEBUG env value :", JSON.stringify(process.env.API_SECRET_KEY));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { pdf_text_content } = body;

  if (!pdf_text_content) {
    return NextResponse.json(
      { error: "pdf_text_content is required" },
      { status: 400 }
    );
  }

  const prompt = `Here is raw text extracted from a PDF resume. Please extract the resume information and return it as XML, following this structure. Pay close attention to the following rules:
1. For experience, organization, and education entries, if the end date indicates 'NOW' or 'PRESENT', include a <stillhere>true</stillhere> tag.
2. Format all <start> and <end> dates to DD/MM/YYYY. If the day is not present, default it to 01. For example, 'Aug 2023' should become '01/08/2023'.
3. Extract only the numerical digits for the <phone> tag. Other fields should be extracted as is.

XML structure:
<xml>
<profile>
<name>...</name>
<phone>...</phone>
<email>...</email>
</profile>
<workexperience>
<experience>
<company>...</company>
<start>...</start>
<end>...</end>
<stillhere>true</stillhere> (if applicable)
<title>...</title>
<description>...</description>
</experience>
</workexperience>
<education>
<entry>
<institution>...</institution>
<start>...</start>
<end>...</end>
<stillhere>true</stillhere> (if applicable)
<degree>...</degree>
<gpa>...</gpa>
</entry>
</education>
<organizationexperience>
<entry>
<organization>...</organization>
<start>...</start>
<end>...</end>
<stillhere>true</stillhere> (if applicable)
<title>...</title>
<description>...</description>
</entry>
</organizationexperience>
...
</xml>

Extracted PDF Text:

${pdf_text_content}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        max_tokens: 250000,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
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