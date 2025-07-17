import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PropertyAlert {
  property_id: string
  property_name: string
  address: string
  city: string
  state: string
  alert_type: 'high_leaks' | 'warranty_expiring' | 'capital_work_upcoming'
  alert_details: string
  priority: 'high' | 'medium' | 'low'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const alerts: PropertyAlert[] = []

    // 1. Properties with high leak count or repair costs
    const { data: highLeakProperties, error: leakError } = await supabaseClient
      .from('budgets_and_repairs')
      .select(`
        property_id,
        total_leaks_12mo,
        total_leak_expense_12mo,
        properties!inner(
          property_name,
          address,
          city,
          state
        )
      `)
      .or('total_leaks_12mo.gte.5,total_leak_expense_12mo.gte.10000')

    if (leakError) {
      console.error('Error fetching high leak properties:', leakError)
    } else if (highLeakProperties) {
      highLeakProperties.forEach(prop => {
        const property = prop.properties as any
        alerts.push({
          property_id: prop.property_id,
          property_name: property.property_name,
          address: property.address,
          city: property.city,
          state: property.state,
          alert_type: 'high_leaks',
          alert_details: `${prop.total_leaks_12mo} leaks in 12mo, $${prop.total_leak_expense_12mo?.toLocaleString()} in expenses`,
          priority: prop.total_leaks_12mo >= 10 || (prop.total_leak_expense_12mo || 0) >= 25000 ? 'high' : 'medium'
        })
      })
    }

    // 2. Warranties expiring within 6 months
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

    const { data: expiringWarranties, error: warrantyError } = await supabaseClient
      .from('warranties')
      .select(`
        property_id,
        expiration_date,
        installer_expiration_date,
        manufacturer_name,
        contractor_name,
        properties!inner(
          property_name,
          address,
          city,
          state
        )
      `)
      .or(`expiration_date.lte.${sixMonthsFromNow.toISOString().split('T')[0]},installer_expiration_date.lte.${sixMonthsFromNow.toISOString().split('T')[0]}`)

    if (warrantyError) {
      console.error('Error fetching expiring warranties:', warrantyError)
    } else if (expiringWarranties) {
      expiringWarranties.forEach(warranty => {
        const property = warranty.properties as any
        const mainExpiry = warranty.expiration_date
        const installerExpiry = warranty.installer_expiration_date
        
        let details = ''
        if (mainExpiry && new Date(mainExpiry) <= sixMonthsFromNow) {
          details += `Manufacturer warranty expires ${mainExpiry}`
        }
        if (installerExpiry && new Date(installerExpiry) <= sixMonthsFromNow) {
          details += details ? `, Installer warranty expires ${installerExpiry}` : `Installer warranty expires ${installerExpiry}`
        }

        alerts.push({
          property_id: warranty.property_id,
          property_name: property.property_name,
          address: property.address,
          city: property.city,
          state: property.state,
          alert_type: 'warranty_expiring',
          alert_details: details,
          priority: 'medium'
        })
      })
    }

    // 3. Buildings with 2025/2026 capital work upcoming
    const { data: upcomingCapitalWork, error: capitalError } = await supabaseClient
      .from('budgets_and_repairs')
      .select(`
        property_id,
        capital_budget_year,
        capital_budget_estimated,
        scope_of_work,
        properties!inner(
          property_name,
          address,
          city,
          state
        )
      `)
      .in('capital_budget_year', [2025, 2026])
      .not('capital_budget_estimated', 'is', null)

    if (capitalError) {
      console.error('Error fetching capital work properties:', capitalError)
    } else if (upcomingCapitalWork) {
      upcomingCapitalWork.forEach(budget => {
        const property = budget.properties as any
        alerts.push({
          property_id: budget.property_id,
          property_name: property.property_name,
          address: property.address,
          city: property.city,
          state: property.state,
          alert_type: 'capital_work_upcoming',
          alert_details: `${budget.capital_budget_year} capital work: $${budget.capital_budget_estimated?.toLocaleString()} - ${budget.scope_of_work || 'Scope TBD'}`,
          priority: budget.capital_budget_year === 2025 ? 'high' : 'medium'
        })
      })
    }

    // Remove duplicates and sort by priority
    const uniqueAlerts = alerts.reduce((acc, current) => {
      const existing = acc.find(alert => 
        alert.property_id === current.property_id && 
        alert.alert_type === current.alert_type
      )
      if (!existing) {
        acc.push(current)
      }
      return acc
    }, [] as PropertyAlert[])

    // Sort by priority (high -> medium -> low)
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 }
    uniqueAlerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    console.log(`Found ${uniqueAlerts.length} properties needing attention`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        alerts: uniqueAlerts,
        summary: {
          total: uniqueAlerts.length,
          high_priority: uniqueAlerts.filter(a => a.priority === 'high').length,
          medium_priority: uniqueAlerts.filter(a => a.priority === 'medium').length,
          low_priority: uniqueAlerts.filter(a => a.priority === 'low').length
        }
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )
  } catch (error) {
    console.error('Error in properties-needing-attention function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )
  }
})