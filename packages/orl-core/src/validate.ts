import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import schema from "../../../schema/orl-0.1.schema.json";

import type { OrlPackage } from "./types";

export interface ValidationDiagnostic {
  level: "error" | "warning";
  code: string;
  message: string;
  instancePath?: string;
}

export interface ValidationResult {
  valid: boolean;
  package: OrlPackage | null;
  diagnostics: ValidationDiagnostic[];
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: false
});

addFormats(ajv);

const validateSchema = ajv.compile(schema);

function schemaErrorToDiagnostic(
  error: ErrorObject
): ValidationDiagnostic {
  return {
    level: "error",
    code: `schema.${error.keyword}`,
    message: error.message ?? "Schema validation error",
    instancePath: error.instancePath || "/"
  };
}

function semanticDiagnostics(
  value: OrlPackage
): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];
  const supportedTypes = new Set(["people", "timeline", "reentry"]);
  const layerIds = new Set<string>();
  const itemIds = new Set<string>();

  for (const layer of value.layers) {
    if (layerIds.has(layer.id)) {
      diagnostics.push({
        level: "error",
        code: "semantic.duplicate-layer-id",
        message: `Duplicate layer id: ${layer.id}`
      });
    }
    layerIds.add(layer.id);

    if (!supportedTypes.has(layer.type)) {
      diagnostics.push({
        level: "warning",
        code: "semantic.unsupported-layer-type",
        message: `Unsupported layer type: ${layer.type}`
      });
    }

    for (const item of layer.items) {
      if (itemIds.has(item.id)) {
        diagnostics.push({
          level: "error",
          code: "semantic.duplicate-item-id",
          message: `Duplicate item id: ${item.id}`
        });
      }
      itemIds.add(item.id);

      if (
        item.visual &&
        item.visual.decorative !== true &&
        !item.visual.alt?.trim()
      ) {
        diagnostics.push({
          level: "warning",
          code: "accessibility.visual-missing-alt",
          message:
            `Visual support on item ${item.id} has no text alternative.`
        });
      }
    }
  }

  return diagnostics;
}

export function validateOrlPackage(
  value: unknown
): ValidationResult {
  if (!validateSchema(value)) {
    return {
      valid: false,
      package: null,
      diagnostics: (validateSchema.errors ?? []).map(
        schemaErrorToDiagnostic
      )
    };
  }

  const typed = value as OrlPackage;
  const diagnostics = semanticDiagnostics(typed);
  const hasSemanticError = diagnostics.some(
    (diagnostic) => diagnostic.level === "error"
  );

  return {
    valid: !hasSemanticError,
    package: hasSemanticError ? null : typed,
    diagnostics
  };
}

export function publicationMatches(
  orl: OrlPackage,
  publicationIdentifier: string
): ValidationDiagnostic[] {
  if (orl.publication.identifier === publicationIdentifier) {
    return [];
  }

  return [
    {
      level: "error",
      code: "publication.identifier-mismatch",
      message:
        "The ORL package does not target the currently opened publication."
    }
  ];
}
