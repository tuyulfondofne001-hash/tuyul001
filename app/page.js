"use client";

import { useState } from "react";

export default function Home() {
  const [pdfText, setPdfText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResult("");

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ pdf_text_content: pdfText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error, null, 2)
        );
      } else {
        setResult(data.xml);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h1>PDF Resume → XML Extractor</h1>

      <div style={{ marginBottom: 12 }}>
        <label>API Key Endpoint:</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Masukkan API key endpoint"
          style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>PDF Text Content:</label>
        <textarea
          value={pdfText}
          onChange={(e) => setPdfText(e.target.value)}
          rows={12}
          placeholder="Paste hasil extract text PDF di sini..."
          style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
        />
      </div>

      <button onClick={handleSubmit} disabled={loading} style={{ padding: "10px 20px" }}>
        {loading ? "Processing..." : "Generate XML"}
      </button>

      {error && (
        <pre style={{ color: "red", marginTop: 20, whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      )}

      {result && (
        <div style={{ marginTop: 20 }}>
          <h3>Hasil XML:</h3>
          <pre
            style={{
              background: "#f4f4f4",
              padding: 16,
              whiteSpace: "pre-wrap",
              overflowX: "auto",
            }}
          >
            {result}
          </pre>
        </div>
      )}
    </main>
  );
}
