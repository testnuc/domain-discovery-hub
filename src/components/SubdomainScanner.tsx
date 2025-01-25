import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart, Link2, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Subdomain {
  domain: string;
}

export const SubdomainScanner = () => {
  const [domain, setDomain] = useState("");
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const storeDomainSearch = async (domain: string) => {
    try {
      await supabase
        .from('domain_searches')
        .insert([{ domain }]);
    } catch (error) {
      console.error("Error storing domain search:", error);
    }
  };

  const handleCopy = () => {
    const textToCopy = subdomains.map(entry => entry.domain).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Subdomains have been copied to clipboard."
    });
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

      // Use supabase.functions.invoke instead of fetch
      const { data, error } = await supabase.functions.invoke('fetch-subdomains', {
        body: { domain }
      });

      if (error) {
        throw error;
      }

      const uniqueDomains = data?.subdomains || [];

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

      {subdomains.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Results</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy All
                </>
              )}
            </Button>
          </div>
          <div className="bg-scanner-dark text-scanner-light p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <ul className="space-y-1">
              {subdomains.map((entry, index) => (
                <li 
                  key={`${entry.domain}-${index}`}
                  className="flex items-center gap-2 hover:text-scanner-accent transition-colors"
                >
                  <Link2 className="w-4 h-4 shrink-0" />
                  <span className="break-all">{entry.domain}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-1 mt-8 text-sm text-muted-foreground">
        <a
          href="https://www.hackwithsingh.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center hover:text-primary transition-colors"
        >
          www.hackwithsingh.com
        </a>
        <Heart
          className="inline-block w-4 h-4 mx-1 animate-pulse"
          fill="#ea384c"
          color="#ea384c"
        />
      </div>
    </div>
  );
};