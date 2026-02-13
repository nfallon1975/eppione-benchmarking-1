import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

// --- Types ---

export interface QueryFilter {
  field: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
  value: string | number | boolean | string[] | number[];
}

export interface QueryAggregation {
  field: string;
  fn: "avg" | "sum" | "count" | "min" | "max";
  alias?: string;
}

export interface QuerySpec {
  table: string;
  filters: QueryFilter[];
  select: string[];
  joins: string[];
  groupBy: string[];
  aggregations: QueryAggregation[];
  orderBy: { field: string; direction: "asc" | "desc" }[];
  limit: number;
}

export interface DataExplorerResult {
  query: QuerySpec;
  results: Record<string, unknown>[];
  summary: string;
  totalCount: number;
}

// --- Whitelist ---

type AllowedTable = {
  fields: string[];
  joins: string[];
};

const ALLOWED_SCHEMA: Record<string, AllowedTable> = {
  BenefitEntry: {
    fields: [
      "id",
      "companyId",
      "benefitCategory",
      "country",
      "benefitName",
      "coverLevel",
      "employerFunded",
      "employeeContributionPercent",
      "coversSpouse",
      "coversDependents",
      "maxDependents",
      "isCore",
      "isVoluntary",
      "isFlexible",
      "flexFundAmount",
      "flexFundCurrency",
      "provider",
      "annualCostPerEmployee",
      "costCurrency",
      "notes",
      "healthExcess",
      "healthCopayPercent",
      "healthInpatientLimit",
      "healthOutpatientLimit",
      "lifeCoverMultiple",
      "lifeFixedCoverAmount",
      "ipBenefitPercent",
      "ipWaitingPeriodWeeks",
      "ipMaxBenefitAge",
      "ciCoverMultiple",
      "ciFixedCoverAmount",
      "dentalAnnualLimit",
      "dentalOrthoIncluded",
      "pensionEmployerPct",
      "pensionEmployeePct",
      "brokerName",
      "brokerSatisfactionScore",
      "renewalDate",
      "benefitSatisfactionScore",
      "createdAt",
    ],
    joins: ["company"],
  },
  Company: {
    fields: [
      "id",
      "name",
      "country",
      "industry",
      "employeeCount",
      "averageSalary",
      "averageSalaryCurrency",
      "averageBonus",
      "averageBonusCurrency",
      "financialYearEndMonth",
      "employeeCountRange",
      "averageBonusPercent",
      "benefitBudget",
      "benefitBudgetCurrency",
      "averageWorkforceAge",
      "surveyCompletedAt",
      "createdAt",
    ],
    joins: [],
  },
  ComplianceCheckResult: {
    fields: [
      "id",
      "companyId",
      "country",
      "benefitEntryId",
      "requirementId",
      "status",
      "gap",
      "recommendation",
      "checkedAt",
    ],
    joins: ["company", "requirement"],
  },
  PlatformInfo: {
    fields: [
      "id",
      "companyId",
      "usesPlatform",
      "platformName",
      "platformType",
      "annualPlatformFee",
      "feeCurrency",
      "feeModel",
      "platformSatisfactionScore",
      "usesTotalRewardPlatform",
      "totalRewardPlatformName",
      "otherHRTechPlatforms",
      "createdAt",
    ],
    joins: ["company"],
  },
};

const SCHEMA_DESCRIPTION = `Available tables and fields:

1. BenefitEntry — Employee benefit entries per company
   Fields: id, companyId, benefitCategory (enum: HEALTH, LIFE, DISABILITY, PENSION, DENTAL, VISION, EAP, WELLNESS, INCOME_PROTECTION, CRITICAL_ILLNESS, TRAVEL, MEAL_VOUCHERS, TRANSPORT, CHILDCARE, EDUCATION, OTHER), country (ISO 2-letter code), benefitName (string), coverLevel (string), employerFunded (boolean), employeeContributionPercent (float), coversSpouse (boolean), coversDependents (boolean), maxDependents (int), isCore (boolean), isVoluntary (boolean), isFlexible (boolean), flexFundAmount (float), flexFundCurrency (string), provider (string), annualCostPerEmployee (float), costCurrency (string), notes (string), healthExcess (float), healthCopayPercent (float 0-100), healthInpatientLimit (float), healthOutpatientLimit (float), lifeCoverMultiple (float), lifeFixedCoverAmount (float), ipBenefitPercent (float), ipWaitingPeriodWeeks (int), ipMaxBenefitAge (int), ciCoverMultiple (float), ciFixedCoverAmount (float), dentalAnnualLimit (float), dentalOrthoIncluded (boolean), pensionEmployerPct (float), pensionEmployeePct (float), brokerName (string), brokerSatisfactionScore (int 1-10), renewalDate (datetime), benefitSatisfactionScore (int 1-10), createdAt (datetime)
   Joins: company (Company)

2. Company — Company profile information
   Fields: id, name (string), country (ISO 2-letter code), industry (NACE code string), employeeCount (int), averageSalary (float), averageSalaryCurrency (string), averageBonus (float), averageBonusCurrency (string), financialYearEndMonth (int 1-12), employeeCountRange (string: "1-50", "51-250", "251-1000", "1001-5000", "5000+"), averageBonusPercent (float), benefitBudget (float), benefitBudgetCurrency (string), averageWorkforceAge (float), surveyCompletedAt (datetime), createdAt (datetime)

3. ComplianceCheckResult — Compliance check results per company
   Fields: id, companyId, country (ISO 2-letter code), benefitEntryId, requirementId, status (enum: COMPLIANT, NON_COMPLIANT, PARTIALLY_COMPLIANT, NOT_APPLICABLE, UNKNOWN), gap (string), recommendation (string), checkedAt (datetime)
   Joins: company (Company), requirement (CountryBenefitRequirement)

4. PlatformInfo — Benefits platform information per company
   Fields: id, companyId, usesPlatform (boolean), platformName (string), platformType (enum: FLEX_BENEFITS, TOTAL_REWARD, VOLUNTARY, DISCOUNT, WELLBEING, OTHER), annualPlatformFee (float), feeCurrency (string), feeModel (enum: PER_EMPLOYEE_PER_MONTH, PER_EMPLOYEE_PER_YEAR, FLAT_FEE, PERCENTAGE, OTHER), platformSatisfactionScore (int 1-10), usesTotalRewardPlatform (boolean), totalRewardPlatformName (string), otherHRTechPlatforms (string), createdAt (datetime)
   Joins: company (Company)`;

// --- Validation ---

function validateQuerySpec(spec: QuerySpec): string | null {
  const table = ALLOWED_SCHEMA[spec.table];
  if (!table) {
    return `Table "${spec.table}" is not allowed. Allowed tables: ${Object.keys(ALLOWED_SCHEMA).join(", ")}`;
  }

  for (const field of spec.select) {
    // Allow dotted paths for joined fields like company.name
    const parts = field.split(".");
    if (parts.length === 2) {
      const [joinName, joinField] = parts;
      if (!table.joins.includes(joinName)) {
        return `Join "${joinName}" is not allowed on table "${spec.table}"`;
      }
      const joinTable = ALLOWED_SCHEMA[joinName.charAt(0).toUpperCase() + joinName.slice(1)];
      if (joinTable && !joinTable.fields.includes(joinField)) {
        return `Field "${joinField}" is not allowed on joined table "${joinName}"`;
      }
    } else if (!table.fields.includes(field)) {
      return `Field "${field}" is not allowed on table "${spec.table}"`;
    }
  }

  for (const filter of spec.filters) {
    const parts = filter.field.split(".");
    if (parts.length === 2) {
      const [joinName, joinField] = parts;
      if (!table.joins.includes(joinName)) {
        return `Join "${joinName}" is not allowed on table "${spec.table}"`;
      }
      const joinTable = ALLOWED_SCHEMA[joinName.charAt(0).toUpperCase() + joinName.slice(1)];
      if (joinTable && !joinTable.fields.includes(joinField)) {
        return `Field "${joinField}" is not allowed on joined table "${joinName}"`;
      }
    } else if (!table.fields.includes(filter.field)) {
      return `Filter field "${filter.field}" is not allowed on table "${spec.table}"`;
    }
  }

  for (const join of spec.joins) {
    if (!table.joins.includes(join)) {
      return `Join "${join}" is not allowed on table "${spec.table}"`;
    }
  }

  for (const field of spec.groupBy) {
    const parts = field.split(".");
    if (parts.length === 2) {
      const [joinName, joinField] = parts;
      if (!table.joins.includes(joinName)) {
        return `Join "${joinName}" is not allowed on table "${spec.table}"`;
      }
      const joinTable = ALLOWED_SCHEMA[joinName.charAt(0).toUpperCase() + joinName.slice(1)];
      if (joinTable && !joinTable.fields.includes(joinField)) {
        return `GroupBy field "${joinField}" is not allowed on joined table "${joinName}"`;
      }
    } else if (!table.fields.includes(field)) {
      return `GroupBy field "${field}" is not allowed on table "${spec.table}"`;
    }
  }

  for (const agg of spec.aggregations) {
    if (!table.fields.includes(agg.field) && agg.field !== "_count") {
      return `Aggregation field "${agg.field}" is not allowed on table "${spec.table}"`;
    }
  }

  const aggAliases = new Set(
    spec.aggregations.map((a) => a.alias || `${a.fn}_${a.field}`)
  );

  for (const ob of spec.orderBy) {
    if (aggAliases.has(ob.field)) continue;
    const parts = ob.field.split(".");
    if (parts.length === 1 && !table.fields.includes(ob.field)) {
      return `OrderBy field "${ob.field}" is not allowed on table "${spec.table}"`;
    }
  }

  return null;
}

// --- Core Functions ---

export async function parseNaturalLanguageQuery(
  question: string,
  role: string
): Promise<QuerySpec> {
  const client = new Anthropic();

  const prompt = `You are a database query translator. Convert the user's natural language question into a structured QuerySpec JSON object.

${SCHEMA_DESCRIPTION}

The user has role: ${role}. Generate a query that answers their question.

Rules:
- Return ONLY valid JSON, no markdown fencing, no explanation.
- Use only fields and tables listed above.
- For enum comparisons, use the exact enum values (e.g., "HEALTH" not "health", "NON_COMPLIANT" not "non-compliant").
- Set limit to at most 100.
- If the question asks for an average or aggregate, use the aggregations and groupBy fields.
- If the question mentions satisfaction scores, brokerSatisfactionScore and benefitSatisfactionScore are on BenefitEntry (1-10 scale). platformSatisfactionScore is on PlatformInfo.
- For "health score" or "health insurance score", use benefitSatisfactionScore with benefitCategory filter of "HEALTH".
- If the question references company info alongside benefits, include "company" in joins and use "company.fieldName" in select.
- The "contains" operator is for string pattern matching (case-insensitive substring match).

JSON shape:
{
  "table": "TableName",
  "filters": [{ "field": "fieldName", "op": "eq|neq|gt|gte|lt|lte|contains|in", "value": ... }],
  "select": ["field1", "field2", "company.name"],
  "joins": ["company"],
  "groupBy": [],
  "aggregations": [{ "field": "fieldName", "fn": "avg|sum|count|min|max", "alias": "resultName" }],
  "orderBy": [{ "field": "fieldName", "direction": "asc|desc" }],
  "limit": 100
}

User question: ${question}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Could not understand your question. Please try rephrasing it.");
  }

  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let spec: QuerySpec;
  try {
    spec = JSON.parse(jsonText) as QuerySpec;
  } catch {
    throw new Error("Could not understand your question. Please try rephrasing it.");
  }

  // Defaults
  spec.filters = spec.filters || [];
  spec.select = spec.select || [];
  spec.joins = spec.joins || [];
  spec.groupBy = spec.groupBy || [];
  spec.aggregations = (spec.aggregations || []).map((agg) => {
    // Normalize: Claude sometimes uses "function" instead of "fn"
    const raw = agg as unknown as Record<string, unknown>;
    const fn = (agg.fn || raw["function"] || "count") as QueryAggregation["fn"];
    return { field: agg.field, fn, alias: agg.alias };
  });
  spec.orderBy = spec.orderBy || [];
  spec.limit = Math.min(spec.limit || 100, 100);

  const validationError = validateQuerySpec(spec);
  if (validationError) {
    throw new Error(`Invalid query: ${validationError}`);
  }

  return spec;
}

export async function executeQuerySpec(
  spec: QuerySpec,
  scopedCompanyIds: string[] | null
): Promise<{ results: Record<string, unknown>[]; totalCount: number }> {
  const modelName = spec.table.charAt(0).toLowerCase() + spec.table.slice(1);

  // Build Prisma where clause
  const where: Record<string, unknown> = {};

  // Apply company scoping
  if (scopedCompanyIds !== null) {
    if (spec.table === "Company") {
      where.id = { in: scopedCompanyIds };
    } else {
      where.companyId = { in: scopedCompanyIds };
    }
  }

  // Apply filters
  for (const filter of spec.filters) {
    const parts = filter.field.split(".");
    if (parts.length === 2) {
      // Joined field filter, e.g. company.country = "IE"
      const [joinName, joinField] = parts;
      if (!where[joinName]) where[joinName] = {};
      (where[joinName] as Record<string, unknown>)[joinField] = toPrismaOp(filter);
    } else {
      where[filter.field] = toPrismaOp(filter);
    }
  }

  // Handle aggregation queries
  if (spec.aggregations.length > 0 && spec.groupBy.length > 0) {
    const prismaModel = (prisma as unknown as Record<string, unknown>)[modelName] as {
      groupBy: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
    };

    // Prisma groupBy only supports the model's own scalar fields —
    // split out joined fields (e.g. "company.name") and fetch them separately
    const scalarGroupBy = spec.groupBy.filter((f) => !f.includes("."));
    const joinedGroupBy = spec.groupBy.filter((f) => f.includes("."));

    // Ensure we have a linking field for joins (e.g. companyId)
    if (joinedGroupBy.length > 0 && !scalarGroupBy.includes("companyId")) {
      scalarGroupBy.push("companyId");
    }

    const aggArgs: Record<string, Record<string, boolean>> = {};
    for (const agg of spec.aggregations) {
      const fnKey = `_${agg.fn}`;
      if (!aggArgs[fnKey]) aggArgs[fnKey] = {};
      if (agg.fn === "count") {
        aggArgs[fnKey][agg.field === "_count" ? "_all" : agg.field] = true;
      } else {
        aggArgs[fnKey][agg.field] = true;
      }
    }

    // Build orderBy in Prisma groupBy format: { _avg: { field: "desc" } }
    const aliasToAgg = new Map(
      spec.aggregations.map((a) => [a.alias || `${a.fn}_${a.field}`, a])
    );
    let groupByOrderBy: Record<string, unknown> | undefined;
    if (spec.orderBy.length > 0) {
      const ob = spec.orderBy[0];
      const matchedAgg = aliasToAgg.get(ob.field);
      if (matchedAgg) {
        groupByOrderBy = { [`_${matchedAgg.fn}`]: { [matchedAgg.field]: ob.direction } };
      } else if (scalarGroupBy.includes(ob.field)) {
        groupByOrderBy = { [ob.field]: ob.direction };
      }
    }

    const groupByResult = await prismaModel.groupBy({
      by: scalarGroupBy,
      where,
      ...aggArgs,
      orderBy: groupByOrderBy,
      take: spec.limit,
    });

    // If there are joined fields, fetch the related data and merge
    let joinedData = new Map<string, Record<string, unknown>>();
    if (joinedGroupBy.length > 0) {
      const companyIds = groupByResult
        .map((r) => r.companyId as string)
        .filter(Boolean);

      if (companyIds.length > 0) {
        const joinSelect: Record<string, boolean> = { id: true };
        for (const jf of joinedGroupBy) {
          const field = jf.split(".")[1];
          if (field) joinSelect[field] = true;
        }
        // Also include fields from spec.select that are joined
        for (const sf of spec.select) {
          const parts = sf.split(".");
          if (parts.length === 2 && parts[0] === "company") {
            joinSelect[parts[1]] = true;
          }
        }

        const companies = await prisma.company.findMany({
          where: { id: { in: companyIds } },
          select: joinSelect,
        });
        for (const c of companies) {
          joinedData.set(
            (c as Record<string, unknown>).id as string,
            c as Record<string, unknown>
          );
        }
      }
    }

    // Flatten aggregation results + merge joined data
    const results = groupByResult.map((row) => {
      const flat: Record<string, unknown> = {};
      for (const key of scalarGroupBy) {
        flat[key] = row[key];
      }
      // Merge joined fields
      if (joinedData.size > 0 && row.companyId) {
        const company = joinedData.get(row.companyId as string);
        if (company) {
          for (const jf of joinedGroupBy) {
            const field = jf.split(".")[1];
            if (field) flat[jf] = company[field];
          }
          // Also add any selected join fields not in groupBy
          for (const sf of spec.select) {
            const parts = sf.split(".");
            if (parts.length === 2 && parts[0] === "company" && !flat[sf]) {
              flat[sf] = company[parts[1]];
            }
          }
        }
      }
      for (const agg of spec.aggregations) {
        const fnKey = `_${agg.fn}`;
        const aggResult = row[fnKey] as Record<string, unknown> | undefined;
        const alias = agg.alias || `${agg.fn}_${agg.field}`;
        if (aggResult) {
          flat[alias] = agg.fn === "count" && agg.field === "_count"
            ? aggResult._all
            : aggResult[agg.field];
        }
      }
      return flat;
    });

    return { results, totalCount: results.length };
  }

  // Regular findMany query
  const prismaModel = (prisma as unknown as Record<string, unknown>)[modelName] as {
    findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
    count: (args: Record<string, unknown>) => Promise<number>;
  };

  // Build select/include
  const selectFields: Record<string, unknown> = {};
  const include: Record<string, unknown> = {};
  let hasJoinSelects = false;

  for (const field of spec.select) {
    const parts = field.split(".");
    if (parts.length === 2) {
      const [joinName, joinField] = parts;
      hasJoinSelects = true;
      if (!include[joinName]) include[joinName] = { select: {} };
      ((include[joinName] as Record<string, unknown>).select as Record<string, boolean>)[joinField] = true;
    } else {
      selectFields[field] = true;
    }
  }

  const queryArgs: Record<string, unknown> = { where };

  if (spec.select.length > 0) {
    if (hasJoinSelects) {
      // When using include, we need select on top-level fields
      queryArgs.select = { ...selectFields, ...Object.fromEntries(
        Object.entries(include).map(([k, v]) => [k, v])
      )};
    } else if (Object.keys(selectFields).length > 0) {
      queryArgs.select = selectFields;
    }
  } else if (spec.joins.length > 0) {
    // If no select but joins requested, include them
    for (const join of spec.joins) {
      include[join] = true;
    }
    queryArgs.include = include;
  }

  if (spec.orderBy.length > 0) {
    queryArgs.orderBy = spec.orderBy.map((o) => {
      const parts = o.field.split(".");
      if (parts.length === 2) {
        return { [parts[0]]: { [parts[1]]: o.direction } };
      }
      return { [o.field]: o.direction };
    });
  }

  queryArgs.take = spec.limit;

  const [results, totalCount] = await Promise.all([
    prismaModel.findMany(queryArgs),
    prismaModel.count({ where }),
  ]);

  // Flatten joined results for display
  const flatResults = results.map((row) => {
    const flat: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        // Flatten join objects: company.name -> company.name
        for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
          flat[`${key}.${subKey}`] = subValue;
        }
      } else {
        flat[key] = value;
      }
    }
    return flat;
  });

  return { results: flatResults, totalCount };
}

export async function summarizeResults(
  question: string,
  results: Record<string, unknown>[],
  totalCount: number
): Promise<string> {
  if (results.length === 0) {
    return "No results were found matching your query. Try broadening your search criteria or rephrasing your question.";
  }

  const client = new Anthropic();

  const prompt = `The user asked: "${question}"

The query returned ${totalCount} total results (showing ${results.length}).

Here is the data (JSON):
${JSON.stringify(results.slice(0, 50), null, 2)}

Write a 2-4 sentence natural language summary of the results. Be specific about numbers and key findings. Do not use markdown formatting. If there are notable patterns or outliers, mention them.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return `Found ${totalCount} results.`;
  }

  return textBlock.text.trim();
}

// --- Helpers ---

function toPrismaOp(filter: QueryFilter): unknown {
  switch (filter.op) {
    case "eq":
      return filter.value;
    case "neq":
      return { not: filter.value };
    case "gt":
      return { gt: filter.value };
    case "gte":
      return { gte: filter.value };
    case "lt":
      return { lt: filter.value };
    case "lte":
      return { lte: filter.value };
    case "contains":
      return { contains: filter.value as string, mode: "insensitive" };
    case "in":
      return { in: filter.value };
    default:
      return filter.value;
  }
}
