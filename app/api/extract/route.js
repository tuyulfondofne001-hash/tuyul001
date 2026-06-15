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
  console.log(pdf_text_content)
  if (!pdf_text_content) {
    return NextResponse.json(
      { error: "pdf_text_content is required" },
      { status: 400 }
    );
  }

const prompt = `You are a CV/resume parser. Extract information from the raw PDF text below and return it as XML following the EXACT structure specified. Do not add any explanation or markdown — return only the raw XML.

Rules:
1. Root tag is <cv>, not <xml> or anything else.
2. If a person is currently working/studying/active in a role, set <current>Y</current>. Otherwise omit the tag or set it to N.
3. Format all <start> and <end> dates as YYYY-MM-DD. If only month+year is known, default day to 01 (e.g. "Aug 2023" → "2023-08-01"). If only year is known, use "YYYY-01-01".
4. <phone>: digits only, no spaces or symbols.
5. If a field is unknown or not present in the resume, leave the tag empty or omit it entirely.
6. For <skill> level use one of: beginner, intermediate, advanced, expert.
7. For <skill> category use one of: technical, soft, language, tool, other.
8. For <language> proficiency use one of: native, fluent, advanced, conversational, basic.
9. For <achievement> level use one of: internasional, nasional, regional, lokal.
10. For <experience> employment_status use one of: tetap, kontrak, freelance, magang, paruh_waktu.

Required XML structure:

<cv>
  <title>{Full Name}'s CV</title>

  <personal_info>
    <full_name>...</full_name>
    <headline>...</headline>
    <email>...</email>
    <phone>...</phone>
    <location>...</location>
    <linkedin_url>...</linkedin_url>
    <portfolio_url>...</portfolio_url>
    <objective>...</objective>
  </personal_info>

  <experiences>
    <experience>
      <company_name>...</company_name>
      <position>...</position>
      <location>...</location>
      <employment_status>tetap</employment_status>
      <start>YYYY-MM-DD</start>
      <end>YYYY-MM-DD</end>
      <current>Y</current>
      <description>...</description>
    </experience>
  </experiences>

  <educations>
    <education>
      <institution>...</institution>
      <degree>...</degree>
      <field_of_study>...</field_of_study>
      <city>...</city>
      <start>YYYY-MM-DD</start>
      <end>YYYY-MM-DD</end>
      <current>Y</current>
      <gpa>...</gpa>
      <gpa_max>4.00</gpa_max>
      <description>...</description>
    </education>
  </educations>

  <organizations>
    <organization>
      <organization_name>...</organization_name>
      <position>...</position>
      <city>...</city>
      <start>YYYY-MM-DD</start>
      <end>YYYY-MM-DD</end>
      <current>Y</current>
      <description>...</description>
    </organization>
  </organizations>

  <projects>
    <project>
      <name>...</name>
      <role>...</role>
      <url>...</url>
      <description>...</description>
    </project>
  </projects>

  <skills>
    <skill>
      <name>...</name>
      <level>intermediate</level>
      <category>technical</category>
    </skill>
  </skills>

  <certifications>
    <certification>
      <name>...</name>
      <issuer>...</issuer>
      <issued_at>YYYY-MM-DD</issued_at>
      <expires_at>YYYY-MM-DD</expires_at>
      <never_expires>N</never_expires>
      <certificate_number>...</certificate_number>
      <credential_url>...</credential_url>
    </certification>
  </certifications>

  <languages>
    <language>
      <name>...</name>
      <proficiency>conversational</proficiency>
    </language>
  </languages>

  <achievements>
    <achievement>
      <name>...</name>
      <organizer>...</organizer>
      <level>nasional</level>
      <year>2023</year>
      <description>...</description>
    </achievement>
  </achievements>

  <hobbies>
    <hobby>
      <name>...</name>
      <since_year>...</since_year>
    </hobby>
  </hobbies>

</cv>

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
        model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning-20260428:free",
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
