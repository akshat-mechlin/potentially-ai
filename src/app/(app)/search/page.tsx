import { SearchInterface } from "@/components/search/search-interface";

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <p className="text-sub text-muted-foreground">
        Ask anything about your network in natural language
      </p>
      <SearchInterface />
    </div>
  );
}
