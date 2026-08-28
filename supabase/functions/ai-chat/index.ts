/**
 * ai-chat — OnSpace AI Edge Function
 * Multi-turn Arabic AI assistant for AI tools discovery
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `أنت "جيشو AI"، مساعد ذكي متخصص في أدوات الذكاء الاصطناعي للمستخدمين العرب على منصة "مستر جيشو".

قدراتك الأساسية:
- اقتراح أدوات AI مناسبة بناءً على احتياجات المستخدم بدقة عالية
- مقارنة أدوات بجداول واضحة تشمل الأسعار والمميزات والتقييمات
- شرح المميزات والعيوب بأمثلة عملية
- اقتراح Workflows إنتاجية باستخدام أدوات متعددة
- تحليل احتياجات المشروع واقتراح Stack مناسب
- الإجابة على أسئلة تقنية متعلقة بالذكاء الاصطناعي

الفئات المتاحة: كتابة بالذكاء، أدوات الصور، أدوات البيانات، أدوات المطورين، أدوات مالية، الإنتاجية، التصميم، التسويق.

قواعد الرد:
- الرد دائماً بالعربية الفصحى السهلة والواضحة
- استخدم bullet points وجداول عند المقارنة أو سرد الخيارات
- اذكر الأسعار (مجاني/مدفوع/مفتوح المصدر) والتقييم عند اقتراح أدوات
- كن مختصراً ومفيداً — تجنب الحشو
- إذا لم تعرف أداة بعينها، قل ذلك بصراحة واقترح بدائل
- للمقارنات استخدم هذا التنسيق: الأداة | المميز | السعر | التقييم`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');
    if (!apiKey || !baseUrl) {
      return new Response(JSON.stringify({ error: 'AI config missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-20),
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    // Retry once on transient errors
    let data: any;
    if (!aiRes.ok) {
      if (aiRes.status >= 500) {
        console.warn('OnSpace AI transient error, retrying once...');
        const retry = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.slice(-20)],
            max_tokens: 1500,
            temperature: 0.7,
          }),
        });
        if (!retry.ok) {
          const err = await retry.text();
          console.error('OnSpace AI retry failed:', err);
          return new Response(JSON.stringify({ error: `AI Error: ${retry.status}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502,
          });
        }
        data = await retry.json();
      } else {
        const err = await aiRes.text();
        console.error('OnSpace AI error:', err);
        return new Response(JSON.stringify({ error: `AI Error: ${aiRes.status}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502,
        });
      }
    } else {
      data = await aiRes.json();
    }
    const reply = data.choices?.[0]?.message?.content?.trim() ?? '';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('ai-chat error:', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
