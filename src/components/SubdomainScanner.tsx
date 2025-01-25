import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart, Link2 } from "lucide-react";

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
      const [crtResults, hackerTargetResults] = await Promise.all([
        fetchCrtShDomains(domain),
        fetchHackerTargetDomains(domain)
      ]);

      // Combine and deduplicate results
      const allDomains = [...crtResults, ...hackerTargetResults];
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