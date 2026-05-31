import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { createClient } from "npm:@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ChatMessage = {
  role?: string
  content?: string
}

function compactJson(value: unknown, maxChars = 14000) {
  const text = JSON.stringify(value ?? [])
  return text.length > maxChars ? `${text.slice(0, maxChars)}... [truncated]` : text
}

function compactMessages(messages: ChatMessage[] = []) {
  return messages
    .slice(-10)
    .map((message) => {
      const role = message.role === 'user' ? 'Owner' : 'AI'
      const content = String(message.content ?? '').slice(0, 1200)
      return `${role}: ${content}`
    })
    .join('\n')
}

function readyStockSummary(blocks: any[] = [], sales: any[] = []) {
  const soldByBlock = new Map<string, number>()
  sales.forEach((sale) => {
    soldByBlock.set(sale.block_id, (soldByBlock.get(sale.block_id) || 0) + Number(sale.sqft_sold || 0))
  })

  return blocks
    .filter((block) => block.status === 'ready_to_sell')
    .map((block) => {
      const totalSqft = Number(block.total_sqft || 0)
      const soldSqft = Number(soldByBlock.get(block.id) || 0)
      return {
        block_id: block.id,
        block_no: block.block_no,
        stone_type: block.stone_type,
        quarry_name: block.quarry_name,
        total_sqft: totalSqft,
        sold_sqft: soldSqft,
        available_sqft: Math.max(totalSqft - soldSqft, 0),
      }
    })
}

function ledgerSummary(ledger: any[] = []) {
  const expenses = ledger.filter((row) => row.entry_type === 'expense')
  const income = ledger.filter((row) => row.entry_type === 'income')
  const assets = ledger.filter((row) => row.entry_type === 'asset')
  const processedSqft = expenses.reduce((sum, row) => sum + Number(row.processed_sqft || 0), 0)
  const totalExpenses = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0)

  return {
    expense_entries: expenses.length,
    total_expenses: totalExpenses,
    total_income_receipts: income
      .filter((row) => ['payment_received', 'sale_receipt'].includes(row.category))
      .reduce((sum, row) => sum + Number(row.amount || 0), 0),
    total_invoice_value: income
      .filter((row) => row.category === 'sale_invoice')
      .reduce((sum, row) => sum + Number(row.amount || 0), 0),
    total_block_purchases: assets.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    processed_sqft: processedSqft,
    overhead_per_sqft: processedSqft > 0 ? totalExpenses / processedSqft : null,
  }
}

async function readTable(supabase: ReturnType<typeof createClient>, table: string, orderColumn = 'created_at', limit = 80) {
  const { data } = await supabase
    .from(table)
    .select('*')
    .order(orderColumn, { ascending: false })
    .limit(limit)

  return data ?? []
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, messages = [] } = await req.json()

    // 1. Get the Gemini API Key
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('API key not found')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const [
      blocks,
      sales,
      costs,
      ledger,
      machineSessions,
      machineRates,
      materialProfiles,
      parties,
    ] = await Promise.all([
      readTable(supabase, 'blocks', 'created_at', 120),
      readTable(supabase, 'sales', 'sold_at', 120),
      readTable(supabase, 'monthly_costs', 'month', 80),
      readTable(supabase, 'factory_ledger', 'entry_date', 160),
      readTable(supabase, 'machine_sessions', 'started_at', 120),
      readTable(supabase, 'machine_rate_profiles', 'last_calculated_at', 20),
      readTable(supabase, 'material_cost_profiles', 'updated_at', 120),
      readTable(supabase, 'parties', 'updated_at', 120),
    ])

    const recentConversation = compactMessages(Array.isArray(messages) ? messages : [])
    const readyStock = readyStockSummary(blocks as any[], sales as any[])
    const factoryLedgerSummary = ledgerSummary(ledger as any[])

    const systemPrompt = `
      You are the factory AI assistant for Mahalaxmi Granites, a granite ERP/PWD operations app.
      Your job is to answer from the current chat and live ERP data: inventory, sales, parties,
      factory ledger, machine sessions, learned machine hourly rates, and material hardness/cost profiles.
      
      Here is the live data straight from the database:
      BLOCKS INVENTORY: ${compactJson(blocks)}
      SALES DATA: ${compactJson(sales)}
      READY STOCK SUMMARY (use this for ready stock, not raw block total_sqft): ${compactJson(readyStock)}
      LEGACY MONTHLY COSTS (old table; may be empty because factory_ledger is now the cost source): ${compactJson(costs)}
      FACTORY LEDGER: ${compactJson(ledger)}
      FACTORY LEDGER SUMMARY: ${compactJson(factoryLedgerSummary)}
      MACHINE SESSIONS: ${compactJson(machineSessions)}
      MACHINE RATE PROFILES: ${compactJson(machineRates)}
      MATERIAL COST PROFILES: ${compactJson(materialProfiles)}
      PARTIES: ${compactJson(parties)}

      Rules:
      - Answer concisely and clearly.
      - Use the recent conversation when the owner asks follow-up questions.
      - Treat factory_ledger as the source of truth for operating expenses, payments, block purchases, and receipts.
      - Never say monthly costs are missing if FACTORY_LEDGER has expense entries; the monthly_costs table is legacy.
      - If asked about profits or losses, prefer factory_ledger and machine cost data over old monthly-only estimates.
      - slab_count is optional production detail. If it is null, say slab counts have not been entered yet, not that the whole ERP is missing costs.
      - If data is missing because the database was reset, say exactly what table or seed data is missing.
      - Keep the tone professional but helpful. Speak directly to the factory owner.
    `;

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt
    })

    const result = await model.generateContent(`
      Recent conversation in this chat:
      ${recentConversation || 'No prior messages were provided.'}

      Current owner message:
      ${prompt}
    `)
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
