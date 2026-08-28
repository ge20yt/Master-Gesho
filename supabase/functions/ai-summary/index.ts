/**
 * ai-summary — OnSpace AI edge function
 * Generates a concise Arabic summary for any article/post
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content } = await req.json();

    if (!title || !content) {
      return new Response(
        JSON.stringify({ error: 'title and content are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'AI configuration missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Trim content to avoid token limits
    const trimmedContent = content.slice(0, 4000);

    const prompt = `أنت خبير في تلخيص المحتوى العربي. لخّص المقال التالي في ٣-٤ جمل واضحة وموجزة باللغة العربية، مركّزاً على النقاط الرئيسية والأفكار الجوهرية.

العنوان: ${title}

المحتوى:
${trimmedContent}

اكتب ملخصاً مفيداً ومحدداً يلتقط جوهر المقال بأسلوب واضح وسلس.`;

    console.log('Calling OnSpace AI for summary:', title.slice(0, 50));

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'أنت مساعد متخصص في تلخيص المحتوى العربي بطريقة احترافية وموجزة. اكتب دائماً باللغة العربية الفصحى السهلة.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.4,
      }),
    });

    let aiData: any;
    if (!aiResponse.ok) {
      // Retry once on server errors
      if (aiResponse.status >= 500) {
        console.warn('ai-summary transient error, retrying...');
        const retry = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'أنت مساعد متخصص في تلخيص المحتوى العربي بطريقة احترافية وموجزة. اكتب دائماً باللغة العربية الفصحى السهلة.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 800,
            temperature: 0.4,
          }),
        });
        if (!retry.ok) {
          const errorText = await retry.text();
          console.error('ai-summary retry failed:', errorText);
          return new Response(
            JSON.stringify({ error: `AI Service Error: ${retry.status}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
          );
        }
        aiData = await retry.json();
      } else {
        const errorText = await aiResponse.text();
        console.error('OnSpace AI error:', errorText);
        return new Response(
          JSON.stringify({ error: `AI Service Error: ${aiResponse.status}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
        );
      }
    } else {
      aiData = await aiResponse.json();
    }
    const rawSummary = aiData.choices?.[0]?.message?.content?.trim() ?? '';

    if (!rawSummary) {
      return new Response(
        JSON.stringify({ error: 'Empty response from AI' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Structured output: try to parse JSON, fallback to raw text
    let summary = rawSummary;
    try {
      const jsonMatch = rawSummary.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.summary) summary = parsed.summary;
      }
    } catch { /* use rawSummary as-is */ }

    console.log('Summary generated successfully');

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('ai-summary error:', error);
    return new Response(
      JSON.stringify({ error: error?.message ?? 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
