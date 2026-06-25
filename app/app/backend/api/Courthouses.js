// courthouses.js
// Single source of truth for all registered courthouse scrapers.
// Add a new entry here to make it appear in the sidebar automatically
// and register it for the backend sync router.
//
// key       — matches SCRAPER_MAP key in courthouse_scraper.py exactly
// state     — two-letter state code matching AVAILABLE_STATES
// label     — display name shown in the sidebar
// county    — county name for grouping / display

export const COURTHOUSE_REGISTRY = [
  {
    key:    "PA_PHILADELPHIA",
    state:  "PA",
    label:  "Philadelphia County Civil Court",
    county: "Philadelphia",
  },
  {
    key:    "PA_ALLEGHENY",
    state:  "PA",
    label:  "Allegheny County Sheriff Sales",
    county: "Allegheny",
  },
  {
    key:    "TX_HOUSTON",
    state:  "TX",
    label:  "Harris County Foreclosure Registry",
    county: "Harris",
  },
  {
    key:    "TX_DALLAS",
    state:  "TX",
    label:  "Dallas County Tax Sales",
    county: "Dallas",
  },
  {
    key:    "TX_BEXAR",
    state:  "TX",
    label:  "Bexar County (San Antonio) Sales",
    county: "Bexar",
  },
  {
    key:    "FL_MIAMI_DADE",
    state:  "FL",
    label:  "Miami-Dade Clerk of Courts",
    county: "Miami-Dade",
  },
  {
    key:    "FL_BROWARD",
    state:  "FL",
    label:  "Broward County Foreclosure Sales",
    county: "Broward",
  },
  {
    key:    "FL_HILLSBOROUGH",
    state:  "FL",
    label:  "Hillsborough County (Tampa) Sales",
    county: "Hillsborough",
  },
  {
    key:    "IL_COOK",
    state:  "IL",
    label:  "Cook County (Chicago) Sheriff Sales",
    county: "Cook",
  },
  {
    key:    "GA_FULTON",
    state:  "GA",
    label:  "Fulton County (Atlanta) Tax Sales",
    county: "Fulton",
  },
  {
    key:    "AZ_MARICOPA",
    state:  "AZ",
    label:  "Maricopa County (Phoenix) Trustee Sales",
    county: "Maricopa",
  },
  {
    key:    "CA_LOS_ANGELES",
    state:  "CA",
    label:  "Los Angeles County Tax Collector Sales",
    county: "Los Angeles",
  },
  {
    key:    "CA_SAN_DIEGO",
    state:  "CA",
    label:  "San Diego County Treasurer Sales",
    county: "San Diego",
  },
  {
    key:    "NY_KINGS",
    state:  "NY",
    label:  "Kings County (Brooklyn) Foreclosures",
    county: "Kings",
  },
  {
    key:    "NY_QUEENS",
    state:  "NY",
    label:  "Queens County Foreclosures",
    county: "Queens",
  },
  {
    key:    "OH_CUYAHOGA",
    state:  "OH",
    label:  "Cuyahoga County (Cleveland) Sheriff Sales",
    county: "Cuyahoga",
  },
  {
    key:    "NC_MECKLENBURG",
    state:  "NC",
    label:  "Mecklenburg County (Charlotte) Sales",
    county: "Mecklenburg",
  },
  {
    key:    "MI_WAYNE",
    state:  "MI",
    label:  "Wayne County (Detroit) Tax Sales",
    county: "Wayne",
  },
  {
    key:    "NV_CLARK",
    state:  "NV",
    label:  "Clark County (Las Vegas) Foreclosures",
    county: "Clark",
  },
  {
    key:    "CO_DENVER",
    state:  "CO",
    label:  "Denver County Public Trustee Sales",
    county: "Denver",
  },
];

// Lookup helpers
export const getCourthousesForState = (stateCode) =>
  COURTHOUSE_REGISTRY.filter((c) => c.state === stateCode);

export const getCourthouseByKey = (key) =>
  COURTHOUSE_REGISTRY.find((c) => c.key === key) ?? null;
