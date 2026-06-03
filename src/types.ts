interface Link {
  text?: string;
  url: string;
}

interface RaindropCollection {
  title: string;
  description?: string;
  count: number;
  id: string;
  parentId?: string;
}

interface BlockQueryMap {
  highlights: boolean;
  raindropIDs?: string | null;
  search?: string | null;
  format?: string | null;
  sort?: string | null;
  collection?: number | null;
  showTags?: boolean;
  nested?: boolean;
  limit?: number | null;
}

type BlockQueryMapKeys =
  | "search"
  | "format"
  | "sort"
  | "collection"
  | "showTags"
  | "raindropIDs"
  | "highlights"
  | "nested"
  | "limit";

export type { Link, RaindropCollection, BlockQueryMap, BlockQueryMapKeys };
