import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link2 } from "lucide-react";

export const SubdomainScanner = () => {
  const [domain, setDomain] = useState("");
  const [subdomains, setSubdomains] = useState<string[]>([]);
  const { toast } = useToast();

  const handleScan = async () => {
    if (!domain) {
      toast({ title: "Please enter a domain", description: "Domain cannot be empty." });
      return;
    }

    // Simulate a subdomain scan
    const results = await supabase
      .from("subdomains")
      .select("name")
      .ilike("domain", `%${domain}%`);

    if (results.data) {
      setSubdomains(results.data.map((item) => item.name));
    } else {
      toast({ title: "Scan failed", description: "Could not retrieve subdomains." });
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
          <ul>
            {subdomains.map((subdomain) => (
              <li key={subdomain}>{subdomain}</li>
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
