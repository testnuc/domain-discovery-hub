import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Subdomain {
  domain: string;
}

export const SubdomainScanner = () => {
  const [domain, setDomain] = useState("");
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const fetchCrtShDomains = async (domain: string) => {
    try {
      const response = await fetch(`https://crt.sh/?q=%25.${domain}&output=json`);
      if (!response.ok) throw new Error('Failed to fetch from crt.sh');
      const data = await response.json();
      return data.map((entry: { name_value: string }) => ({
        domain: entry.name_value.replace('*.', '')
      }));
    } catch (error) {
      console.error("Error fetching from crt.sh:", error);
      return [];
    }
  };

  const fetchHackerTargetDomains = async (domain: string) => {
    try {
      const response = await fetch(`https://api.hackertarget.com/hostsearch/?q=${domain}`);
      if (!response.ok) throw new Error('Failed to fetch from HackerTarget');
      const text = await response.text();
      if (!text.trim()) return [];
      return text.split('\n')
        .map(line => ({
          domain: line.split(',')[0]
        }));
    } catch (error) {
      console.error("Error fetching from HackerTarget:", error);
      return [];
    }
  };

  const fetchRapidDnsDomains = async (domain: string) => {
    try {
      const response = await fetch(`https://rapiddns.io/subdomain/${domain}?full=1&down=1`);
      if (!response.ok) throw new Error('Failed to fetch from RapidDNS');
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const domains = Array.from(doc.querySelectorAll('td'))
        .map(td => td.textContent?.trim())
        .filter(domain => domain && domain.includes('.'))
        .map(domain => ({ domain: domain || '' }));
      return domains;
    } catch (error) {
      console.error("Error fetching from RapidDNS:", error);
      return [];
    }
  };

  const fetchUrlscanDomains = async (domain: string) => {
    try {
      const response = await fetch(`https://urlscan.io/api/v1/search/?q=domain:${domain}`);
      if (!response.ok) throw new Error('Failed to fetch from URLScan');
      const data = await response.json();
      return data.results.map((result: { page: { domain: string } }) => ({
        domain: result.page.domain
      }));
    } catch (error) {
      console.error("Error fetching from URLScan:", error);
      return [];
    }
  };

  const storeDomainSearch = async (domain: string) => {
    try {
      await supabase
        .from('domain_searches')
        .insert([{ domain }]);
    } catch (error) {
      console.error("Error storing domain search:", error);
    }
  };

  const handleScan = async () => {
    if (!domain) {
      toast({ 
        title: "Please enter a domain", 
        description: "Domain cannot be empty." 
      });
      return;
    }

    setIsLoading(true);
    try {
      // Store the domain search
      await storeDomainSearch(domain);

      // Fetch from all sources in parallel
      const [crtResults, hackerTargetResults, rapidDnsResults, urlscanResults] = await Promise.all([
        fetchCrtShDomains(domain),
        fetchHackerTargetDomains(domain),
        fetchRapidDnsDomains(domain),
        fetchUrlscanDomains(domain)
      ]);

      // Combine and deduplicate results
      const allDomains = [...crtResults, ...hackerTargetResults, ...rapidDnsResults, ...urlscanResults];
      const uniqueDomains = Array.from(new Set(
        allDomains.map(d => d.domain)
      )).map(domain => ({ domain }));

      if (uniqueDomains.length === 0) {
        toast({ 
          title: "No results found", 
          description: "No subdomains were found for this domain." 
        });
      }

      setSubdomains(uniqueDomains);
    } catch (error) {
      console.error("Error scanning domains:", error);
      toast({ 
        title: "Error scanning domains", 
        description: "An error occurred while scanning for subdomains." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Domain Discovery Hub</h1>
        <p className="text-muted-foreground">
          Enter a domain to discover its subdomains
        </p>
      </div>

      <div className="flex flex-col space-y-4">
        <Input
          placeholder="Enter domain (e.g. example.com)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <Button 
          onClick={handleScan}
          disabled={isLoading}
        >
          {isLoading ? "Scanning..." : "Scan"}
        </Button>
      </div>

      <div className="space-y-2">
        {subdomains.length > 0 && (
          <ul className="space-y-2">
            {subdomains.map((entry, index) => (
              <li 
                key={`${entry.domain}-${index}`}
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
              >
                <Link2 className="w-4 h-4 text-gray-500" />
                <span>{entry.domain}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-center gap-1 mt-8 text-sm text-muted-foreground">
        Created with{" "}
        <Heart
          className="inline-block w-4 h-4 mx-1 animate-pulse"
          fill="#ea384c"
          color="#ea384c"
        />{" "}
        by{" "}
        <a
          href="https://www.hackwithsingh.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center hover:text-primary transition-colors"
        >
          www.hackwithsingh.com
        </a>
      </div>
    </div>
  );
};