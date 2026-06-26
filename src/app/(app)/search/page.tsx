import { SearchInterface } from "@/components/search/search-interface";

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Search</h1>
        <p className="text-muted-foreground">
          Ask anything about your network in natural language
        </p>
      </div>
      <SearchInterface />
    </div>
  );
}
