import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Copy, Heart, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CrtShEntry {
  name_value: string;
  common_name?: string;
  issuer_name?: string;
  not_before?: string;
  not_after?: string;
}

export const SubdomainScanner = () => {
  const [domain, setDomain] = useState("");
  const [subdomains, setSubdomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const validateDomain = (domain: string) => {
    const pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return pattern.test(domain);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(subdomains.join("\n"));
      toast({
        title: "Copied!",
        description: "Subdomains copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const fetchWithProxy = async (url: string) => {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error('Proxy fetch error:', error);
      throw new Error(`Failed to fetch from ${url}`);
    }
  };

  const storeDomainSearch = async (domain: string) => {
    try {
      const { error } = await supabase
        .from('domain_searches')
        .insert([{ domain }]);
      
      if (error) {
        console.error('Supabase error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error storing domain search:', error);
      return false;
    }
  };

  const storeCertificateData = async (domain: string, certData: CrtShEntry) => {
    try {
      const { error } = await supabase
        .from('crt')
        .insert([{
          domain,
          common_name: certData.common_name || domain,
          issuer_name: certData.issuer_name || 'Unknown',
          not_before: certData.not_before || new Date().toISOString(),
          not_after: certData.not_after || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        }]);
      
      if (error) {
        console.error('Error storing certificate data:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error storing certificate data:', error);
      return false;
    }
  };

  const scanSubdomains = async () => {
    if (!validateDomain(domain)) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid domain (e.g., example.com)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSubdomains([]);

    try {
      // Store the domain search first
      const stored = await storeDomainSearch(domain);
      if (!stored) {
        console.warn('Failed to store domain search, but continuing with scan');
      }

      const [crtResponse, hackertargetResponse] = await Promise.all([
        fetchWithProxy(`https://crt.sh/?q=%25.${domain}&output=json`),
        fetchWithProxy(`https://api.hackertarget.com/hostsearch/?q=${domain}`),
      ]);

      const crtData = await crtResponse.json() as CrtShEntry[];
      const hackertargetData = await hackertargetResponse.text();

      // Store certificate data
      for (const cert of crtData) {
        await storeCertificateData(domain, cert);
      }

      const crtSubdomains = crtData.map((entry: CrtShEntry) => entry.name_value.replace(/\*\./g, ""));
      const hackertargetSubdomains = hackertargetData.split("\n").map(line => line.split(",")[0]);

      const allSubdomains = [...new Set([...crtSubdomains, ...hackertargetSubdomains])];
      
      setSubdomains(allSubdomains.filter(Boolean).sort());
      
      toast({
        title: "Scan Complete",
        description: `Found ${allSubdomains.length} subdomains`,
      });
    } catch (error) {
      console.error('Scanning error:', error);
      toast({
        title: "Error",
        description: "Failed to scan subdomains. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-scanner-dark text-scanner-light p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-scanner-accent">Subdomain Scanner</h1>
          <p className="text-lg">Enter a domain to discover its subdomains</p>
        </div>

        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="bg-scanner-dark border-scanner-light/20 text-scanner-light"
          />
          <Button
            onClick={scanSubdomains}
            disabled={loading}
            className="bg-scanner-accent hover:bg-scanner-accent/90 text-scanner-dark"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Scan
          </Button>
        </div>

        {subdomains.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Found {subdomains.length} subdomains
              </h2>
              <Button
                onClick={copyToClipboard}
                className="bg-scanner-accent hover:bg-scanner-accent/90 text-scanner-dark flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Results
              </Button>
            </div>
            <div className="bg-scanner-dark border border-scanner-light/20 rounded-lg p-4">
              <div className="font-mono max-h-96 overflow-y-auto space-y-2">
                {subdomains.map((subdomain, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-scanner-light/5 rounded transition-colors"
                  >
                    {subdomain}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-scanner-light/60 pt-8">
          Created by{" "}
          <a
            href="https://www.hackwithsingh.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-scanner-accent hover:underline"
          >
            www.hackwithsingh.com
          </a>{" "}
          <Heart className="inline-block h-4 w-4 text-red-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
};