import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
// Import Supabase so the AI can read the database
import { createClient } from "npm:@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()

    // 1. Get the Gemini API Key
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('API key not found')

    // 2. Automatically grab the Supabase URL & Key that are built into the Edge environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 3. Fetch the actual factory data!
    const { data: blocks } = await supabase.from('blocks').select('*')
    const { data: sales } = await supabase.from('sales').select('*')
    const { data: costs } = await supabase.from('monthly_costs').select('*')

    // 4. Create the "System Instruction" to give the AI its identity and memory
    const systemPrompt = `
      You are the elite AI assistant for a marble factory called Mahalaxmi.
      Your job is to answer questions about the factory's inventory, sales, and costs.
      
      Here is the live data straight from the database:
      BLOCKS INVENTORY: ${JSON.stringify(blocks)}
      SALES DATA: ${JSON.stringify(sales)}
      MONTHLY COSTS: ${JSON.stringify(costs)}

      Rules:
      - Answer concisely and clearly.
      - If asked about profits or losses, calculate it by comparing total sales amounts against total costs and block purchase prices.
      - Keep the tone professional but helpful. Speak directly to the factory owner.
    `;

    // 5. Initialize Gemini WITH the factory data
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt // <-- This is where the magic happens!
    })

    // 6. Ask the question
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    return new Response(JSON.stringify({ message: responseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})