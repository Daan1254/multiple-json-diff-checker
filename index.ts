type ValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null"
  | "undefined";

interface ComparisonResult {
  key: string;
  platforms: {
    [platform: string]: {
      exists: boolean;
      type: ValueType;
      value: any;
    };
  };
}

function getValueType(value: any): ValueType {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value as ValueType;
}

function formatValue(value: any, type: ValueType): string {
  if (type === "object") return "";
  if (type === "array") return `[${value.length} items]`;
  return String(value);
}

function compareJsonInputs(inputs: { [platform: string]: any }[]) {
  // Collect all unique keys including nested ones
  const allKeys = new Set<string>();
  inputs.forEach((input) => {
    const addKeys = (obj: any, prefix = "") => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        allKeys.add(fullKey);

        if (value && typeof value === "object") {
          if (Array.isArray(value) && value.length > 0) {
            // Add array indicator
            allKeys.add(`${fullKey}[array]`);
            // Add keys from first array item as example
            addKeys(value[0], `${fullKey}[0]`);
          } else if (!Array.isArray(value)) {
            addKeys(value, fullKey);
          }
        }
      });
    };
    addKeys(input);
  });

  // Platform names
  const platformNames = ["Magento", "WooCommerce", "Shopify", "Lightspeed"];

  // Create comparison results
  const results: ComparisonResult[] = [];

  // Sort keys to group by parent object
  const sortedKeys = Array.from(allKeys).sort((a, b) => {
    const aBase = a.split(".")[0];
    const bBase = b.split(".")[0];
    if (aBase !== bBase) return aBase.localeCompare(bBase);

    const aDepth = a.split(".").length;
    const bDepth = b.split(".").length;
    if (aDepth !== bDepth) return aDepth - bDepth;

    return a.localeCompare(b);
  });

  sortedKeys.forEach((key) => {
    const comparison: ComparisonResult = {
      key,
      platforms: {},
    };

    inputs.forEach((input, index) => {
      let value: any = input;
      let exists = true;

      // Handle array notation
      if (key.includes("[array]")) {
        const basePath = key.replace("[array]", "");
        const parts = basePath.split(".");
        for (const part of parts) {
          if (value && typeof value === "object" && part in value) {
            value = value[part];
          } else {
            exists = false;
            value = null;
            break;
          }
        }
      } else if (key.includes("[0]")) {
        const parts = key.split(/[\.\[\]]+/).filter(Boolean);
        for (const part of parts) {
          if (
            value &&
            typeof value === "object" &&
            (part in value || (Array.isArray(value) && !isNaN(Number(part))))
          ) {
            value = value[part];
          } else {
            exists = false;
            value = null;
            break;
          }
        }
      } else {
        const parts = key.split(".");
        for (const part of parts) {
          if (value && typeof value === "object" && part in value) {
            value = value[part];
          } else {
            exists = false;
            value = null;
            break;
          }
        }
      }

      comparison.platforms[platformNames[index]] = {
        exists,
        type: getValueType(value),
        value,
      };
    });

    results.push(comparison);
  });

  // Generate markdown table
  let markdown = `| Key | ${platformNames.join(" | ")} |\n`;
  markdown += `|${"-".repeat(4)}|${platformNames
    .map(() => "-".repeat(15))
    .join("|")}|\n`;

  results.forEach((result) => {
    markdown += `| ${result.key} | `;
    markdown += Object.values(result.platforms)
      .map((platform) => {
        if (!platform.exists) return "-";
        return `${platform.type}${
          platform.value !== undefined && platform.type !== "object"
            ? `: ${formatValue(platform.value, platform.type)}`
            : ""
        }`;
      })
      .join(" | ");
    markdown += " |\n";
  });

  return markdown;
}

// Example usage:
const magentoInput = {};
const wooCommerceInput = {};
const shopifyInput = {};
const lightspeedInput = {};

console.log(
  compareJsonInputs([
    magentoInput,
    wooCommerceInput,
    shopifyInput,
    lightspeedInput,
  ])
);
