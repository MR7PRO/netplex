import { defineMcp } from "@lovable.dev/mcp-js";
import searchListings from "./tools/search-listings";
import getListing from "./tools/get-listing";
import listCategories from "./tools/list-categories";
import listVerifiedSellers from "./tools/list-verified-sellers";

export default defineMcp({
  name: "netplex-mcp",
  title: "NetPlex Marketplace",
  version: "0.1.0",
  instructions:
    "Tools for the NetPlex Gaza marketplace. Use `list_categories` to discover category slugs, `search_listings` to find available products by keyword / category / region / brand / price, `get_listing` to fetch a single product's full details, and `list_verified_sellers` to browse trusted shops. All data is public and read-only.",
  tools: [searchListings, getListing, listCategories, listVerifiedSellers],
});
