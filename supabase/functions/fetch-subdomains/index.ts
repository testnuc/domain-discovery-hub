import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  } finally {
    clearTimeout(id);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { domain } = await req.json()
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Scanning subdomains for: ${domain}`)

    // Fetch from crt.sh
    const crtShUrl = `https://crt.sh/?q=%25.${domain}&output=json`
    const crtShData = await fetchWithTimeout(crtShUrl)
    const crtShDomains = crtShData ? crtShData.map((cert: any) => cert.name_value) : []

    // Fetch from HackerTarget
    const hackerTargetUrl = `https://api.hackertarget.com/hostsearch/?q=${domain}`
    const hackerTargetResponse = await fetchWithTimeout(hackerTargetUrl)
    const hackerTargetDomains = hackerTargetResponse ? 
      hackerTargetResponse.split('\n').map((line: string) => line.split(',')[0]) : []

    // Fetch from RapidDNS
    const rapidDnsUrl = `https://rapiddns.io/subdomain/${domain}`
    const rapidDnsResponse = await fetchWithTimeout(rapidDnsUrl)
    const rapidDnsDomains = rapidDnsResponse ? 
      rapidDnsResponse.match(/[a-zA-Z0-9.-]+\.${domain}/g) || [] : []

    // Combine and deduplicate results
    const allDomains = [...new Set([
      ...crtShDomains,
      ...hackerTargetDomains,
      ...rapidDnsDomains
    ])]
      .filter(Boolean)
      .filter(domain => domain.includes('.'))
      .map(domain => ({ domain: domain.replace(/^\*\./, '') }))

    console.log(`Found ${allDomains.length} unique subdomains`)

    return new Response(
      JSON.stringify({ subdomains: allDomains }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch subdomains' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})