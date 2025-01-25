import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link2 } from "lucide-react";

interface CrtEntry {
  domain: string;
  common_name: string;
}

export const SubdomainScanner = () => {
  const [domain, setDomain] = useState("");
  const [subdomains, setSubdomains] = useState<CrtEntry[]>([]);
  const { toast } = useToast();

  const handleScan = async () => {
    if (!domain) {
      toast({ title: "Please enter a domain", description: "Domain cannot be empty." });
      return;
    }

    // Query the crt table instead of subdomains
    const results = await supabase
      .from("crt")
      .select("domain, common_name")
      .ilike("domain", `%${domain}%`);

    if (results.data && results.data.length > 0) {
      setSubdomains(results.data);
    } else {
      toast({ 
        title: "No results found", 
        description: "No subdomains were found for this domain." 
      });
      setSubdomains([]);
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
          placeholder="Enter domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <Button onClick={handleScan}>Scan</Button>
      </div>

      <div className="space-y-2">
        {subdomains.length > 0 && (
          <ul className="space-y-2">
            {subdomains.map((entry) => (
              <li 
                key={entry.domain} 
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