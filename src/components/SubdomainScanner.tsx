import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Link2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CrtShEntry {
  name_value: string;
}

export const SubdomainScanner = () => {
  const [domain, setDomain] = useState("");
  const [subdomains, setSubdomains] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const fetchWithProxy = async (url: string) => {
    try {
      const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response;
      } else {
        const text = await response.text();
        if (text.trim() === "") {
          throw new Error("No data found");
        }
        return new Response(text);
      }
    } catch (error) {
      console.error('Proxy fetch error:', error);
      throw error;
    }
  };

  const storeDomainInCrt = async (domain: string) => {
    try {
      const { error } = await supabase
        .from('crt')
        .insert([
          {
            domain,
            common_name: domain,
            issuer_name: 'Unknown',
            not_before: new Date().toISOString(),
            not_after: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.error('Error storing domain:', error);
      }
    } catch (error) {
      console.error('Failed to store domain:', error);
    }
  };

  const validateDomain = (domain: string) => {
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/;
    return domainRegex.test(domain);
  };

  const scanSubdomains = async () => {
    if (!validateDomain(domain)) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid domain name (e.g., example.com)",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setSubdomains([]);

    try {
      await storeDomainInCrt(domain);

      const [crtResponse, hackertargetResponse] = await Promise.all([
        fetchWithProxy(`https://crt.sh/?q=${domain}&output=json`),
        fetchWithProxy(`https://api.hackertarget.com/hostsearch/?q=${domain}`),
      ]);

      let crtSubdomains: string[] = [];
      let hackertargetSubdomains: string[] = [];

      try {
        const crtData = await crtResponse.json() as CrtShEntry[];
        crtSubdomains = crtData.map((entry: CrtShEntry) => entry.name_value.replace(/\*\./g, ""));
      } catch (error) {
        console.warn('Failed to parse crt.sh data:', error);
      }

      try {
        const hackertargetData = await hackertargetResponse.text();
        if (hackertargetData && !hackertargetData.includes("error") && !hackertargetData.includes("API count exceeded")) {
          hackertargetSubdomains = hackertargetData.split("\n").map(line => line.split(",")[0]);
        }
      } catch (error) {
        console.warn('Failed to parse hackertarget data:', error);
      }

      const allSubdomains = [...new Set([...crtSubdomains, ...hackertargetSubdomains])].filter(Boolean).sort();
      
      if (allSubdomains.length === 0) {
        toast({
          title: "No Subdomains Found",
          description: "No subdomains were found for this domain. This could mean the domain is not active or our sources have no information about it.",
          variant: "destructive",
        });
      } else {
        setSubdomains(allSubdomains);
        toast({
          title: "Scan Complete",
          description: `Found ${allSubdomains.length} subdomains`,
        });
      }
    } catch (error) {
      console.error('Scanning error:', error);
      toast({
        title: "Error",
        description: "Failed to scan subdomains. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scanSubdomains();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-6 bg-scanner-dark text-scanner-light">
          <h1 className="text-3xl font-bold mb-6 text-scanner-accent">Domain Discovery Hub</h1>
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-4">
              <Input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Enter domain (e.g., example.com)"
                className="flex-1 bg-gray-800 border-gray-700 text-white"
              />
              <Button
                type="submit"
                disabled={isScanning}
                className="bg-scanner-accent hover:bg-blue-600"
              >
                {isScanning ? (
                  "Scanning..."
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Scan
                  </>
                )}
              </Button>
            </div>
          </form>

          {subdomains.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-scanner-accent">
                Found {subdomains.length} Subdomains
              </h2>
              <div className="grid gap-2">
                {subdomains.map((subdomain, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded bg-gray-800 hover:bg-gray-700"
                  >
                    <Link2 className="w-4 h-4 text-scanner-accent" />
                    <a
                      href={`https://${subdomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-scanner-light hover:text-scanner-accent transition-colors"
                    >
                      {subdomain}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};