import { parseDocument, isCollection, isMap, isSeq, isPair, isScalar } from 'yaml';

// src/types.ts
var DEFAULT_EXPRESSION_VERSIONS = {
  jsonpath: "rfc9535",
  xpath: "xpath-31",
  jsonpointer: "rfc6901"
};
var isPlainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function isReusableObject(obj) {
  return isPlainObject(obj) && typeof obj.reference === "string";
}
function isSelector(obj) {
  return isPlainObject(obj) && "context" in obj && "selector" in obj && "type" in obj;
}
function isExpressionType(obj) {
  return isPlainObject(obj) && typeof obj.type === "string" && "version" in obj;
}

// src/version.ts
var KNOWN_ARAZZO_VERSIONS = ["1.0.0", "1.0.1", "1.1.0"];
var LATEST_ARAZZO_VERSION = "1.1.0";
var VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(-.+)?$/;
function isArazzoDocument(root) {
  return typeof root === "object" && root !== null && !Array.isArray(root) && "arazzo" in root;
}
function getArazzoVersion(root) {
  if (!isArazzoDocument(root)) return null;
  const v = root.arazzo;
  if (v === void 0 || v === null) return null;
  return String(v);
}
function getArazzoMinor(version) {
  if (!version) return null;
  const m = VERSION_RE.exec(version);
  return m ? `${m[1]}.${m[2]}` : null;
}
function getSupportedMinor(version) {
  const minor = getArazzoMinor(version);
  return minor === "1.0" || minor === "1.1" ? minor : null;
}
function isKnownArazzoVersion(version) {
  return getSupportedMinor(version) !== null;
}
function isWellFormedArazzoVersion(version) {
  return VERSION_RE.test(version);
}

// src/parse.ts
function parseArazzo(text) {
  const yamlDoc = parseDocument(text, { prettyErrors: false, uniqueKeys: true, keepSourceTokens: false });
  const errors = [];
  for (const e of yamlDoc.errors) {
    errors.push({ code: "yaml-syntax", message: e.message, severity: "error", range: { start: e.pos[0], end: e.pos[1] } });
  }
  for (const w of yamlDoc.warnings) {
    errors.push({ code: "yaml-warning", message: w.message, severity: "warning", range: { start: w.pos[0], end: w.pos[1] } });
  }
  let doc;
  try {
    doc = yamlDoc.toJS({ maxAliasCount: 1e4 });
  } catch (e) {
    errors.push({
      code: "yaml-syntax",
      message: e instanceof Error ? e.message : String(e),
      severity: "error",
      range: { start: 0, end: Math.min(text.length, 1) }
    });
    doc = void 0;
  }
  if (doc === null) doc = void 0;
  return {
    doc,
    yamlDoc,
    errors,
    version: getArazzoVersion(doc),
    isArazzo: isArazzoDocument(doc)
  };
}
var nodeRange = (n) => {
  const r = n?.range;
  return r ? { start: r[0], end: r[1] } : void 0;
};
function findPair(map, key) {
  if (!isMap(map)) return void 0;
  for (const item of map.items) {
    if (!isPair(item)) continue;
    const k = isScalar(item.key) ? item.key.value : item.key;
    if (k !== null && k !== void 0 && String(k) === String(key)) return item;
  }
  return void 0;
}
function walk(yamlDoc, path) {
  let node = yamlDoc.contents;
  let pair;
  let exact = true;
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    let next;
    let nextPair;
    if (isMap(node)) {
      nextPair = findPair(node, seg);
      if (!nextPair) {
        exact = false;
        break;
      }
      next = nextPair.value;
    } else if (isSeq(node) && typeof seg === "number" && seg >= 0 && seg < node.items.length) {
      next = node.items[seg];
    } else {
      exact = false;
      break;
    }
    if (next === null || next === void 0) {
      pair = nextPair;
      node = next;
      if (i < path.length - 1) exact = false;
      break;
    }
    pair = nextPair;
    node = next;
  }
  return { node, pair, exact };
}
function locate(yamlDoc, path) {
  if (!yamlDoc.contents) return void 0;
  const { node, pair, exact } = walk(yamlDoc, path);
  const key = pair ? nodeRange(pair.key) : void 0;
  const value = nodeRange(node);
  const main = exact ? value ?? key : key ?? value;
  if (!main) return { start: 0, end: 0, exact: false };
  return { start: main.start, end: main.end, exact, key, value };
}
function firstEntryRange(node) {
  if (!isMap(node)) return void 0;
  const first = node.items[0];
  if (!first || !isPair(first)) return void 0;
  const k = nodeRange(first.key);
  const v = nodeRange(first.value);
  return k ? { start: k.start, end: isCollection(first.value) ? k.end : v?.end ?? k.end } : void 0;
}
function diagnosticRange(yamlDoc, path, preferKey = false) {
  if (!yamlDoc.contents) return void 0;
  const { node, pair, exact } = walk(yamlDoc, path);
  const key = pair ? nodeRange(pair.key) : void 0;
  if (key && (!exact || preferKey || isCollection(node))) return key;
  if (!exact || isCollection(node)) return firstEntryRange(node) ?? nodeRange(node) ?? key;
  return nodeRange(node) ?? key;
}
function createLineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = lo + hi + 1 >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo, character: offset - starts[lo] };
  };
}
function pointerToPath(pointer, doc) {
  if (pointer === "" || pointer === "#") return [];
  const segs = pointer.replace(/^#/, "").split("/").slice(1).map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
  const out = [];
  let cur = doc;
  for (const s of segs) {
    if (Array.isArray(cur) && /^\d+$/.test(s)) {
      out.push(Number(s));
      cur = cur[Number(s)];
    } else if (cur === void 0 && /^\d+$/.test(s)) {
      out.push(Number(s));
    } else {
      out.push(s);
      cur = cur && typeof cur === "object" ? cur[s] : void 0;
    }
  }
  return out;
}
function pathToPointer(path) {
  return path.map((s) => "/" + String(s).replace(/~/g, "~0").replace(/\//g, "~1")).join("");
}

// src/model.ts
var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var asArray = (v) => Array.isArray(v) ? v : [];
var asObj = (v) => isObj(v) ? v : {};
var str = (v) => typeof v === "string" ? v : void 0;
function workflowsOf(doc) {
  return asArray(asObj(doc).workflows).filter(isObj);
}
function sourcesOf(doc) {
  return asArray(asObj(doc).sourceDescriptions).filter(isObj);
}
function findWorkflow(doc, workflowId) {
  return workflowsOf(doc).find((w) => w.workflowId === workflowId);
}
function findSource(doc, name) {
  return sourcesOf(doc).find((s) => s.name === name);
}
function operationSources(doc) {
  return sourcesOf(doc).filter((s) => s.type !== "arazzo");
}
var STEP_TARGETS = ["operationId", "operationPath", "workflowId", "channelPath"];
function stepTargets(step) {
  const s = asObj(step);
  return STEP_TARGETS.filter((t) => s[t] !== void 0);
}
var SOURCE_EXPR_RE = /\$sourceDescriptions\.([A-Za-z0-9_\-]+)/;
function resolveStepSource(doc, step) {
  const s = asObj(step);
  const fromName = (name, how) => {
    const src = findSource(doc, name);
    return src ? { name, type: src.type, how } : { unknownName: name, how };
  };
  const ref = str(s.operationId) ?? str(s.operationPath) ?? str(s.channelPath) ?? str(s.workflowId);
  if (ref !== void 0) {
    const m = SOURCE_EXPR_RE.exec(ref);
    if (m) return fromName(m[1], "explicit");
  }
  const opId = str(s.operationId);
  if (opId !== void 0) {
    const dot = opId.indexOf(".");
    if (dot > 0) {
      const candidate = opId.slice(0, dot);
      if (findSource(doc, candidate)) return fromName(candidate, "legacy");
    }
    const ops = operationSources(doc);
    if (ops.length === 1) return { name: ops[0].name, type: ops[0].type, how: "single" };
  }
  return {};
}
function isAsyncStep(doc, step) {
  const s = asObj(step);
  if (s.channelPath !== void 0 || s.action !== void 0) return true;
  if (s.operationId !== void 0) return resolveStepSource(doc, step).type === "asyncapi";
  return false;
}
var COMPONENT_REF_RE = /^\$components\.(parameters|successActions|failureActions|inputs)\.(.+)$/;
function parseComponentReference(ref) {
  const m = COMPONENT_REF_RE.exec(ref.trim());
  return m ? { kind: m[1], name: m[2] } : void 0;
}
function componentOf(doc, kind, name) {
  const comps = asObj(asObj(doc).components);
  const bucket = asObj(comps[kind]);
  return Object.prototype.hasOwnProperty.call(bucket, name) ? bucket[name] : void 0;
}
function resolveList(doc, list, kind) {
  const out = [];
  asArray(list).forEach((item, index) => {
    if (isObj(item) && typeof item.reference === "string") {
      const ref = parseComponentReference(item.reference);
      if (!ref || ref.kind !== kind) return;
      const target = componentOf(doc, kind, ref.name);
      if (!isObj(target)) return;
      const value = kind === "parameters" && "value" in item ? { ...target, value: item.value } : target;
      out.push({ value, index, reference: item.reference, componentName: ref.name });
    } else if (isObj(item)) {
      out.push({ value: item, index });
    }
  });
  return out;
}
var resolveParameters = (doc, list) => resolveList(doc, list, "parameters");
var resolveSuccessActions = (doc, list) => resolveList(doc, list, "successActions");
var resolveFailureActions = (doc, list) => resolveList(doc, list, "failureActions");
function effectiveActions(doc, workflow, step, kind) {
  const k = kind === "success" ? "successActions" : "failureActions";
  const stepList = asObj(step)[kind === "success" ? "onSuccess" : "onFailure"];
  const own = resolveList(doc, stepList, k).map((r) => ({ ...r, origin: "step" }));
  const names = new Set(own.map((a) => a.value.name));
  const wf = resolveList(doc, asObj(workflow)[k], k).filter((r) => !names.has(r.value.name)).map((r) => ({ ...r, origin: "workflow" }));
  return [...own, ...wf];
}
function resolveInputsSchema(doc, schema) {
  let cur = schema;
  for (let i = 0; i < 5 && isObj(cur) && typeof cur.$ref === "string" && cur.$ref.startsWith("#/"); i++) {
    const segs = cur.$ref.slice(2).split("/").map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
    let next = doc;
    for (const seg of segs) next = isObj(next) ? next[seg] : void 0;
    if (!isObj(next)) return isObj(cur) ? cur : void 0;
    cur = next;
  }
  return isObj(cur) ? cur : void 0;
}
function workflowInputNames(doc, wf) {
  if (!wf || wf.inputs === void 0) return { names: /* @__PURE__ */ new Set(), required: [] };
  const names = /* @__PURE__ */ new Set();
  const required = [];
  let opaque = false;
  const visit = (schema, depth) => {
    const s = resolveInputsSchema(doc, schema);
    if (!s || depth > 5) {
      opaque = true;
      return;
    }
    if (isObj(s.properties)) Object.keys(s.properties).forEach((k) => names.add(k));
    asArray(s.required).forEach((r) => typeof r === "string" && required.push(r));
    asArray(s.allOf).forEach((x) => visit(x, depth + 1));
    if (s.anyOf || s.oneOf || typeof s.$ref === "string" && !s.$ref.startsWith("#/")) opaque = true;
    if (s.additionalProperties !== void 0 && s.additionalProperties !== false) opaque = true;
  };
  visit(wf.inputs, 0);
  return opaque ? void 0 : { names, required };
}

// src/validation/rules.ts
var NEEDS_SOURCES = "Requires loading and parsing the referenced source documents (out of scope for a document-local validator).";
var RULES = {
  // c.1 Version, structure, schema
  "arazzo-schema": { severity: "error", layer: "schema", section: "\xA75.8", summary: "Fallback for JSON Schema errors not mapped to a more specific rule", implemented: true },
  "arazzo-version-format": { severity: "error", layer: "both", section: "\xA75.1, \xA75.8.1.1", summary: "`arazzo` is required and has the major.minor.patch form", implemented: true },
  "arazzo-version": { severity: "warning", layer: "semantic", section: "\xA75.1", summary: "Unknown major.minor version (R1 `arazzo-version-unknown`): no schema applies, only semantic rules run", implemented: true },
  "arazzo-version-feature-mismatch": { severity: "error", layer: "semantic", section: "\xA75.1", summary: "1.1 feature used in a 1.0.x document (warning when the 1.0 schema silently accepts it)", implemented: true },
  "arazzo-migration-param-object-value": { severity: "error", layer: "schema", section: "\xA75.8.6.1", summary: "1.1: a literal object Parameter.value (valid in 1.0) is rejected unless it is a Selector", implemented: true },
  "arazzo-self-recommended": { severity: "info", layer: "semantic", section: "\xA75.5.2, \xA75.6.1", summary: "1.1: `$self` is recommended for identity-based referencing", implemented: true },
  "arazzo-self-fragment": { severity: "error", layer: "schema", section: "\xA75.8.1.1", summary: "`$self` MUST NOT contain a fragment", implemented: true },
  "arazzo-self-uri-reference": { severity: "error", layer: "semantic", section: "\xA75.8.1.1", summary: "`$self` must be a valid RFC 3986 URI-reference", implemented: true },
  "arazzo-self-relative": { severity: "info", layer: "semantic", section: "\xA75.6.1, App. B", summary: "Relative `$self` is resolved against the retrieval URI (less portable)", implemented: true },
  "arazzo-unknown-field": { severity: "error", layer: "schema", section: "\xA75.8, \xA75.10", summary: "Field not defined by the specification and not an `x-` extension", implemented: true },
  "arazzo-extension-reserved-prefix": { severity: "warning", layer: "semantic", section: "\xA75.10", summary: "`x-oai-`, `x-oas-` and `x-arazzo` prefixes are reserved", implemented: true },
  "arazzo-reusable-no-extension": { severity: "error", layer: "schema", section: "\xA75.8.10.1", summary: "No additional field on a Reusable Object", implemented: true },
  // c.2 Identifiers & uniqueness
  "arazzo-workflow-id-unique": { severity: "error", layer: "semantic", section: "\xA75.8.4.1", summary: "`workflowId` unique in the document", implemented: true },
  "arazzo-step-id-unique": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "`stepId` unique in its workflow", implemented: true },
  "arazzo-source-name-unique": { severity: "error", layer: "semantic", section: "\xA75.8.3.1", summary: "Source description names are unique", implemented: true },
  "arazzo-source-name-pattern": { severity: "error", layer: "schema", section: "\xA75.8.3.1", summary: "Source name matches [A-Za-z0-9_-]+", implemented: true },
  "arazzo-source-type-enum": { severity: "error", layer: "schema", section: "\xA75.8.3.1", summary: "Source `type` is openapi, asyncapi (1.1) or arazzo", implemented: true },
  "arazzo-id-pattern": { severity: "warning", layer: "semantic", section: "\xA75.8.4.1, \xA75.8.5.1, \xA75.9", summary: "`workflowId` / `stepId` SHOULD match [A-Za-z0-9_-]+", implemented: true },
  "arazzo-key-pattern": { severity: "error", layer: "both", section: "\xA75.8.4.1, \xA75.8.9", summary: "Output and component keys match ^[a-zA-Z0-9.\\-_]+$", implemented: true },
  "arazzo-parameter-unique": { severity: "error", layer: "semantic", section: "\xA75.8.6", summary: "No duplicate parameter (name + in) in a list", implemented: true },
  "arazzo-action-name-unique": { severity: "error", layer: "semantic", section: "\xA75.8.7", summary: "No duplicate action name in a list", implemented: true },
  // c.3 Step targets
  "arazzo-step-target-exclusive": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "Exactly one of operationId, operationPath, workflowId, channelPath", implemented: true },
  "arazzo-step-target-missing": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "A step needs a target", implemented: true },
  "arazzo-step-operation-id-qualified": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "With several non-arazzo sources, operationId MUST be $sourceDescriptions.<name>.<id>", implemented: true },
  "arazzo-step-operation-resolved": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "operationId / operationPath resolved in the source", implemented: false, reason: NEEDS_SOURCES },
  "arazzo-step-operation-path-format": { severity: "error", layer: "semantic", section: "\xA75.8.5.1, \xA75.6.2", summary: "operationPath = {$sourceDescriptions.<name>.url}#<json-pointer>", implemented: true },
  "arazzo-step-operation-path-source-type": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "operationPath targets an openapi source", implemented: true },
  "arazzo-step-prefer-operation-id": { severity: "info", layer: "semantic", section: "\xA75.8.5.1", summary: "Prefer operationId when the operation has one", implemented: false, reason: NEEDS_SOURCES },
  "arazzo-channel-path-format": { severity: "warning", layer: "semantic", section: "\xA75.8.5.1", summary: "1.1: channelPath = {$sourceDescriptions.<name>.url}#/channels/<key> (warning until the OAI publishes a normative example, R1 \xA7 d.5)", implemented: true },
  "arazzo-channel-path-source-type": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "1.1: channelPath targets an asyncapi source", implemented: true },
  "arazzo-step-workflow-resolved": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "Step workflowId: local workflow or $sourceDescriptions.<arazzo>.<wf>", implemented: true },
  "arazzo-step-workflow-qualified": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "A workflow of another document MUST be referenced with $sourceDescriptions", implemented: true },
  "arazzo-step-workflow-requestbody": { severity: "warning", layer: "semantic", section: "\xA75.8.5.1", summary: "requestBody has no effect on a workflow step", implemented: true },
  "arazzo-source-type-recommended": { severity: "warning", layer: "semantic", section: "\xA75.8.3.1", summary: "Source used by an async step or operationPath should declare its type", implemented: true },
  // c.4 AsyncAPI
  "arazzo-async-action-enum": { severity: "error", layer: "both", section: "\xA75.8.5.1", summary: "action \u2208 {send, receive}", implemented: true },
  "arazzo-async-action-only-asyncapi": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "action only on AsyncAPI steps", implemented: true },
  "arazzo-async-action-required": { severity: "error", layer: "both", section: "\xA75.8.5.1", summary: "AsyncAPI steps declare action", implemented: true },
  "arazzo-async-action-mismatch": { severity: "warning", layer: "semantic", section: "\xA75.8.5.1, \xA75.8.5.3", summary: "action consistent with the AsyncAPI operation action", implemented: false, reason: NEEDS_SOURCES },
  "arazzo-async-correlation-receive-only": { severity: "error", layer: "both", section: "\xA75.8.5.1", summary: "correlationId only with action: receive", implemented: true },
  "arazzo-async-correlation-only-asyncapi": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "correlationId only on AsyncAPI steps", implemented: true },
  "arazzo-async-correlation-type": { severity: "warning", layer: "semantic", section: "\xA75.8.5.1", summary: "correlationId should be a string (runtime expression)", implemented: true },
  "arazzo-step-timeout-positive": { severity: "warning", layer: "both", section: "\xA75.8.5.1", summary: "timeout is a positive integer (ms)", implemented: true },
  "arazzo-async-receive-timeout-recommended": { severity: "info", layer: "semantic", section: "\xA75.8.5.3", summary: "receive without timeout may wait forever", implemented: true },
  "arazzo-async-receive-success-criteria": { severity: "info", layer: "semantic", section: "\xA75.8.5.3", summary: "receive should define successCriteria", implemented: true },
  "arazzo-async-http-expression": { severity: "warning", layer: "semantic", section: "\xA75.9, \xA75.8.5.3", summary: "$statusCode / $request / $response in an AsyncAPI step", implemented: true },
  "arazzo-async-param-in": { severity: "warning", layer: "semantic", section: "\xA75.8.6", summary: "AsyncAPI step parameters: only header / channel make sense", implemented: true },
  "arazzo-param-in-channel": { severity: "error", layer: "semantic", section: "\xA75.8.6 (DEV PR #615)", summary: "in: channel outside an AsyncAPI step (info on AsyncAPI steps: post-1.1.0 clarification)", implemented: true },
  // c.5 dependsOn
  "arazzo-step-depends-on-shape": { severity: "error", layer: "schema", section: "\xA75.8.5.1", summary: "Valid dependsOn form, non-empty, unique", implemented: true },
  "arazzo-step-depends-on-resolved": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "dependsOn target exists", implemented: true },
  "arazzo-step-depends-on-self": { severity: "error", layer: "semantic", section: "\xA75.8.5.1", summary: "A step cannot depend on itself", implemented: true },
  "arazzo-step-depends-on-cycle": { severity: "error", layer: "semantic", section: "\xA75.8.5.2.4", summary: "No cycle in explicit + implicit ($steps.X.outputs) dependencies", implemented: true },
  "arazzo-step-forward-output-reference": { severity: "error", layer: "semantic", section: "\xA75.8.5.2.5", summary: "Without dependsOn, no reference to the outputs of a later step", implemented: true },
  "arazzo-step-depends-on-sync": { severity: "info", layer: "semantic", section: "\xA75.8.5.2.1", summary: "dependsOn in a purely synchronous context: array order is recommended", implemented: true },
  "arazzo-workflow-depends-on-resolved": { severity: "error", layer: "semantic", section: "\xA75.8.4.1", summary: "Workflow.dependsOn target exists", implemented: true },
  "arazzo-workflow-depends-on-qualified": { severity: "error", layer: "semantic", section: "\xA75.8.4.1", summary: "Remote workflows go through $sourceDescriptions", implemented: true },
  "arazzo-workflow-depends-on-cycle": { severity: "error", layer: "semantic", section: "\xA75.8.4.1", summary: "No cycle between workflows", implemented: true },
  // c.6 Actions
  "arazzo-action-goto-target": { severity: "error", layer: "schema", section: "\xA75.8.7.1, \xA75.8.8.1", summary: "goto needs exactly one of stepId / workflowId", implemented: true },
  "arazzo-action-target-exclusive": { severity: "error", layer: "semantic", section: "\xA75.8.8.1", summary: "stepId and workflowId are exclusive (also for retry)", implemented: true },
  "arazzo-action-goto-step-exists": { severity: "error", layer: "semantic", section: "\xA75.8.7.1, \xA75.8.8.1", summary: "Target stepId exists in the current workflow", implemented: true },
  "arazzo-action-goto-workflow-exists": { severity: "error", layer: "semantic", section: "\xA75.8.7.1, \xA75.8.8.1", summary: "Target workflowId exists", implemented: true },
  "arazzo-action-field-irrelevant": { severity: "warning", layer: "semantic", section: "\xA75.8.7.1, \xA75.8.8.1", summary: "Field without effect for this action type", implemented: true },
  "arazzo-action-retry-values": { severity: "error", layer: "schema", section: "\xA75.8.8.1", summary: "retryAfter \u2265 0, retryLimit integer \u2265 0", implemented: true },
  "arazzo-action-parameters-require-workflow": { severity: "error", layer: "schema", section: "\xA75.8.7.1, \xA75.8.8.1", summary: "1.1: action parameters only with workflowId", implemented: true },
  "arazzo-action-parameters-shape": { severity: "error", layer: "semantic", section: "\xA75.8.7.1, \xA75.8.8.1", summary: "1.1: action parameters are Parameter (no in) or Reusable Objects", implemented: true },
  "arazzo-action-parameters-no-in": { severity: "error", layer: "semantic", section: "\xA75.8.7.1, \xA75.8.8.1", summary: "1.1: `in` MUST NOT be used in action parameters", implemented: true },
  "arazzo-workflow-parameters-match-inputs": { severity: "warning", layer: "semantic", section: "\xA75.8.5.1, \xA75.8.6.1", summary: "Parameters passed to a workflow match its inputs", implemented: true },
  "arazzo-workflow-step-param-in": { severity: "info", layer: "semantic", section: "\xA75.8.6.1", summary: "`in` is ignored on workflow step parameters", implemented: true },
  // c.7 Parameters, components
  "arazzo-param-in-required": { severity: "error", layer: "schema", section: "\xA75.8.6.1", summary: "`in` required for operation targets", implemented: true },
  "arazzo-param-in-enum": { severity: "error", layer: "schema", section: "\xA75.8.6.1", summary: "`in` value is valid", implemented: true },
  "arazzo-param-querystring-exclusive": { severity: "error", layer: "semantic", section: "\xA75.8.6", summary: "1.1: querystring cannot coexist with query", implemented: true },
  "arazzo-param-querystring-single": { severity: "warning", layer: "semantic", section: "\xA75.8.6", summary: "1.1: at most one querystring parameter", implemented: true },
  "arazzo-param-querystring-string": { severity: "error", layer: "semantic", section: "\xA75.8.6.1", summary: "1.1: querystring value resolves to a string", implemented: true },
  "arazzo-param-resolved": { severity: "warning", layer: "semantic", section: "\xA75.8.6, \xA75.9.1", summary: "Parameter exists in the target operation", implemented: false, reason: NEEDS_SOURCES },
  "arazzo-reusable-reference-resolved": { severity: "error", layer: "semantic", section: "\xA75.8.10.1, \xA75.9", summary: "Reusable reference points to an existing component", implemented: true },
  "arazzo-reusable-reference-kind": { severity: "error", layer: "semantic", section: "\xA75.8.4.1, \xA75.8.5.1", summary: "Component kind matches the context", implemented: true },
  "arazzo-reusable-value-parameter-only": { severity: "warning", layer: "semantic", section: "\xA75.8.10.1", summary: "Reusable `value` only for parameters", implemented: true },
  "arazzo-components-inputs-ref": { severity: "error", layer: "semantic", section: "\xA75.8.10, \xA75.9", summary: "$components.inputs.* is not a runtime expression: use $ref", implemented: true },
  "arazzo-components-ref-resolved": { severity: "error", layer: "semantic", section: "\xA75.6.2", summary: "Local $ref in inputs resolves", implemented: true },
  "arazzo-components-unused": { severity: "info", layer: "semantic", section: "\xA75.8.9", summary: "Component never referenced", implemented: true },
  // c.8 Criterion, Selector, ETO, PayloadReplacement
  "arazzo-criterion-context-required": { severity: "error", layer: "schema", section: "\xA75.8.11.5", summary: "`context` required when `type` is set", implemented: true },
  "arazzo-criterion-type-enum": { severity: "error", layer: "schema", section: "\xA75.8.11.5", summary: "Criterion type is valid", implemented: true },
  "arazzo-criterion-eto-jsonpointer": { severity: "warning", layer: "semantic", section: "\xA75.8.11.5, \xA75.8.12", summary: "jsonpointer has no condition semantics", implemented: true },
  "arazzo-criterion-syntax": { severity: "error", layer: "semantic", section: "\xA75.8.11.1-4", summary: "Condition syntax valid for its type", implemented: true },
  "arazzo-criterion-embedded-expression": { severity: "error", layer: "semantic", section: "\xA75.8.11.3", summary: "regex / jsonpath / xpath: runtime expressions MUST be embedded in {}", implemented: true },
  "arazzo-success-criteria-non-empty": { severity: "error", layer: "schema", section: "\xA75.8.5.1", summary: "successCriteria not empty", implemented: true },
  "arazzo-eto-version": { severity: "error", layer: "schema", section: "\xA75.8.12.1", summary: "Expression Type Object: type + compatible version", implemented: true },
  "arazzo-selector-required-fields": { severity: "error", layer: "schema", section: "\xA75.8.13.1", summary: "Selector: context, selector, type required", implemented: true },
  "arazzo-selector-context-structured": { severity: "warning", layer: "semantic", section: "\xA75.8.13.1", summary: "Selector context points to structured data", implemented: true },
  "arazzo-selector-syntax": { severity: "error", layer: "semantic", section: "\xA75.8.13.1", summary: "selector valid for its type", implemented: true },
  "arazzo-selector-misplaced": { severity: "warning", layer: "semantic", section: "\xA75.8.13", summary: "Selector-shaped object where it is taken literally (Reusable.value)", implemented: true },
  "arazzo-replacement-target-syntax": { severity: "error", layer: "semantic", section: "\xA75.8.15.1", summary: "target consistent with targetSelectorType / content type", implemented: true },
  "arazzo-replacement-literal-value": { severity: "info", layer: "semantic", section: "\xA75.8.15.1, DEV PR #614", summary: "Non-string literal value (neutralised S11 false positive)", implemented: true },
  // c.9 Runtime expressions
  "arazzo-expression-syntax": { severity: "error", layer: "semantic", section: "\xA75.9", summary: "Runtime expression respects the ABNF", implemented: true },
  "arazzo-expression-steps-resolved": { severity: "error", layer: "semantic", section: "\xA75.9, \xA75.8.5.1", summary: "$steps.<id>.outputs.<name> resolves", implemented: true },
  "arazzo-expression-workflows-resolved": { severity: "error", layer: "semantic", section: "\xA75.9", summary: "$workflows.<id>.(inputs|outputs).<name> resolves", implemented: true },
  "arazzo-expression-inputs-declared": { severity: "warning", layer: "semantic", section: "\xA75.9", summary: "$inputs.<name> declared in the workflow inputs", implemented: true },
  "arazzo-expression-source-resolved": { severity: "error", layer: "semantic", section: "\xA75.9.2", summary: "$sourceDescriptions.<name> exists", implemented: true },
  "arazzo-expression-components-resolved": { severity: "error", layer: "semantic", section: "\xA75.9", summary: "$components.<type>.<key> exists", implemented: true },
  "arazzo-expression-self-defined": { severity: "warning", layer: "semantic", section: "\xA75.9.1", summary: "1.1: $self used without a root $self", implemented: true },
  "arazzo-expression-message-context": { severity: "warning", layer: "semantic", section: "\xA75.9.1", summary: "1.1: $message outside an AsyncAPI step", implemented: true },
  "arazzo-expression-components-scope": { severity: "info", layer: "semantic", section: "\xA75.8.9", summary: "Components are document-scoped (remote workflows)", implemented: false, reason: NEEDS_SOURCES },
  // c.10 Sources
  "arazzo-source-url-uri-reference": { severity: "error", layer: "semantic", section: "\xA75.8.3.1", summary: "url is a valid URI-reference", implemented: true },
  "arazzo-source-unresolvable": { severity: "warning", layer: "semantic", section: "\xA75.5", summary: "Source cannot be loaded", implemented: false, reason: NEEDS_SOURCES },
  "arazzo-source-identity": { severity: "warning", layer: "semantic", section: "\xA75.5.2", summary: "Absolute url vs $self identity", implemented: false, reason: NEEDS_SOURCES },
  "arazzo-source-type-mismatch": { severity: "error", layer: "semantic", section: "\xA75.8.3.1", summary: "Declared type vs loaded document", implemented: false, reason: NEEDS_SOURCES },
  "arazzo-source-unused": { severity: "info", layer: "semantic", section: "\xA75.8.3", summary: "Source never referenced", implemented: true }
};
var LEGACY_CODE_MAP = {
  "arazzo-mutual-exclusive": "arazzo-step-target-exclusive",
  "arazzo-operation-required": "arazzo-step-target-missing",
  "arazzo-ref-dependsOn": "arazzo-workflow-depends-on-resolved",
  "arazzo-source-type": "arazzo-source-type-enum",
  "arazzo-duplicate-stepId": "arazzo-step-id-unique",
  "arazzo-version": "arazzo-version"
};

// src/validation/diagnostic.ts
function createSink(source, out) {
  return (code, path, message, severity) => {
    out.push({ code, message, severity: severity ?? RULES[code].severity, path: [...path], source });
  };
}
var pathKey = (code, path) => `${code}\0${path.map(String).join("")}`;
function isUnder(path, prefix) {
  if (path.length < prefix.length) return false;
  return prefix.every((seg, i) => String(seg) === String(path[i]));
}

// src/generated/validators.js
function __deepEqual(a, b) {
  if (a === b) return true;
  if (a && b && typeof a == "object" && typeof b == "object") {
    if (a.constructor !== b.constructor) return false;
    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0; ) if (!__deepEqual(a[i], b[i])) return false;
      return true;
    }
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;
    for (i = length; i-- !== 0; ) if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    for (i = length; i-- !== 0; ) {
      var key = keys[i];
      if (!__deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return a !== a && b !== b;
}
var validate10 = validate52;
var pattern3 = new RegExp("^x-", "u");
function validate53(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate53.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    var props0 = {};
    for (const key0 in data) {
      if (pattern3.test(key0)) {
        props0[key0] = true;
      }
    }
  }
  validate53.errors = vErrors;
  evaluated0.props = props0;
  return errors === 0;
}
validate53.evaluated = { "dynamicProps": true, "dynamicItems": false };
function validate55(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate55.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.title === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "title" }, message: "must have required property 'title'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.version === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "version" }, message: "must have required property 'version'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.title = true;
      props0.summary = true;
      props0.description = true;
      props0.version = true;
    }
    if (data.title !== void 0) {
      if (typeof data.title !== "string") {
        const err2 = { instancePath: instancePath + "/title", schemaPath: "#/properties/title/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.summary !== void 0) {
      if (typeof data.summary !== "string") {
        const err3 = { instancePath: instancePath + "/summary", schemaPath: "#/properties/summary/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err4 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.version !== void 0) {
      if (typeof data.version !== "string") {
        const err5 = { instancePath: instancePath + "/version", schemaPath: "#/properties/version/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err6 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      }
    }
  } else {
    const err7 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  validate55.errors = vErrors;
  return errors === 0;
}
validate55.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema22 = { "properties": { "type": { "enum": ["arazzo", "openapi"] } }};
var pattern5 = new RegExp("^[A-Za-z0-9_\\-]+$", "u");
function validate58(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate58.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.name === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.url === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "url" }, message: "must have required property 'url'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.name = true;
      props0.url = true;
      props0.type = true;
    }
    if (data.name !== void 0) {
      let data0 = data.name;
      if (typeof data0 === "string") {
        if (!pattern5.test(data0)) {
          const err2 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/pattern", keyword: "pattern", params: { pattern: "^[A-Za-z0-9_\\-]+$" }, message: 'must match pattern "^[A-Za-z0-9_\\-]+$"' };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
      } else {
        const err3 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.url !== void 0) {
      if (!(typeof data.url === "string")) {
        const err4 = { instancePath: instancePath + "/url", schemaPath: "#/properties/url/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data2 = data.type;
      if (!(data2 === "arazzo" || data2 === "openapi")) {
        const err5 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/enum", keyword: "enum", params: { allowedValues: schema22.properties.type.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err6 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      }
    }
  } else {
    const err7 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  validate58.errors = vErrors;
  return errors === 0;
}
validate58.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema0 = { "type": ["object", "boolean"]};
var schema1 = { "type": ["object", "boolean"]};
function validate2(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate2.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(typeof data === "string")) {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate2.errors = vErrors;
  return errors === 0;
}
validate2.evaluated = { "dynamicProps": false, "dynamicItems": false };
function validate4(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate4.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(typeof data === "string")) {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate4.errors = vErrors;
  return errors === 0;
}
validate4.evaluated = { "dynamicProps": false, "dynamicItems": false };
var pattern1 = new RegExp("^[A-Za-z_][-A-Za-z0-9._]*$", "u");
function validate7(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate7.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (typeof data === "string") {
    if (!pattern1.test(data)) {
      const err0 = { instancePath, schemaPath: "#/pattern", keyword: "pattern", params: { pattern: "^[A-Za-z_][-A-Za-z0-9._]*$" }, message: 'must match pattern "^[A-Za-z_][-A-Za-z0-9._]*$"' };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
  } else {
    const err1 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err1];
    } else {
      vErrors.push(err1);
    }
    errors++;
  }
  validate7.errors = vErrors;
  return errors === 0;
}
validate7.evaluated = { "dynamicProps": false, "dynamicItems": false };
var pattern0 = new RegExp("^[^#]*#?$", "u");
function validate1(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate1.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: schema1.type }, message: "must be object,boolean" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (!dynamicAnchors.meta) {
    dynamicAnchors.meta = validate1;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.$id !== void 0) {
      let data0 = data.$id;
      if (!validate2(data0, { instancePath: instancePath + "/$id", parentData: data, parentDataProperty: "$id", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate2.errors : vErrors.concat(validate2.errors);
        errors = vErrors.length;
      }
      if (typeof data0 === "string") {
        if (!pattern0.test(data0)) {
          const err1 = { instancePath: instancePath + "/$id", schemaPath: "#/properties/%24id/pattern", keyword: "pattern", params: { pattern: "^[^#]*#?$" }, message: 'must match pattern "^[^#]*#?$"' };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
      }
    }
    if (data.$schema !== void 0) {
      if (!validate4(data.$schema, { instancePath: instancePath + "/$schema", parentData: data, parentDataProperty: "$schema", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate4.errors : vErrors.concat(validate4.errors);
        errors = vErrors.length;
      }
    }
    if (data.$ref !== void 0) {
      if (!validate2(data.$ref, { instancePath: instancePath + "/$ref", parentData: data, parentDataProperty: "$ref", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate2.errors : vErrors.concat(validate2.errors);
        errors = vErrors.length;
      }
    }
    if (data.$anchor !== void 0) {
      if (!validate7(data.$anchor, { instancePath: instancePath + "/$anchor", parentData: data, parentDataProperty: "$anchor", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate7.errors : vErrors.concat(validate7.errors);
        errors = vErrors.length;
      }
    }
    if (data.$dynamicRef !== void 0) {
      if (!validate2(data.$dynamicRef, { instancePath: instancePath + "/$dynamicRef", parentData: data, parentDataProperty: "$dynamicRef", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate2.errors : vErrors.concat(validate2.errors);
        errors = vErrors.length;
      }
    }
    if (data.$dynamicAnchor !== void 0) {
      if (!validate7(data.$dynamicAnchor, { instancePath: instancePath + "/$dynamicAnchor", parentData: data, parentDataProperty: "$dynamicAnchor", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate7.errors : vErrors.concat(validate7.errors);
        errors = vErrors.length;
      }
    }
    if (data.$vocabulary !== void 0) {
      let data6 = data.$vocabulary;
      if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
        for (const key0 in data6) {
          const _errs10 = errors;
          if (!validate4(key0, { instancePath: instancePath + "/$vocabulary", parentData: data6, parentDataProperty: "$vocabulary", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate4.errors : vErrors.concat(validate4.errors);
            errors = vErrors.length;
          }
          var valid1 = _errs10 === errors;
          if (!valid1) {
            const err2 = { instancePath: instancePath + "/$vocabulary", schemaPath: "#/properties/%24vocabulary/propertyNames", keyword: "propertyNames", params: { propertyName: key0 }, message: "property name must be valid" };
            if (vErrors === null) {
              vErrors = [err2];
            } else {
              vErrors.push(err2);
            }
            errors++;
          }
        }
        for (const key1 in data6) {
          if (typeof data6[key1] !== "boolean") {
            const err3 = { instancePath: instancePath + "/$vocabulary/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/%24vocabulary/additionalProperties/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
            if (vErrors === null) {
              vErrors = [err3];
            } else {
              vErrors.push(err3);
            }
            errors++;
          }
        }
      } else {
        const err4 = { instancePath: instancePath + "/$vocabulary", schemaPath: "#/properties/%24vocabulary/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.$comment !== void 0) {
      if (typeof data.$comment !== "string") {
        const err5 = { instancePath: instancePath + "/$comment", schemaPath: "#/properties/%24comment/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.$defs !== void 0) {
      let data9 = data.$defs;
      if (data9 && typeof data9 == "object" && !Array.isArray(data9)) {
        for (const key2 in data9) {
          let data10 = data9[key2];
          let _v0 = dynamicAnchors.meta;
          if (_v0) {
            if (!_v0(data10, { instancePath: instancePath + "/$defs/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data9, parentDataProperty: key2, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? _v0.errors : vErrors.concat(_v0.errors);
              errors = vErrors.length;
            } else {
              var props0 = _v0.evaluated.props;
              _v0.evaluated.items;
            }
          } else {
            if (!validate1(data10, { instancePath: instancePath + "/$defs/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data9, parentDataProperty: key2, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate1.errors : vErrors.concat(validate1.errors);
              errors = vErrors.length;
            } else {
              var props1 = validate1.evaluated.props;
              if (props0 !== true && props1 !== void 0) {
                if (props1 === true) {
                  props0 = true;
                } else {
                  props0 = props0 || {};
                  Object.assign(props0, props1);
                }
              }
              validate1.evaluated.items;
            }
          }
        }
      } else {
        const err6 = { instancePath: instancePath + "/$defs", schemaPath: "#/properties/%24defs/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
  }
  validate1.errors = vErrors;
  return errors === 0;
}
validate1.evaluated = { "props": { "$id": true, "$schema": true, "$ref": true, "$anchor": true, "$dynamicRef": true, "$dynamicAnchor": true, "$vocabulary": true, "$comment": true, "$defs": true }, "dynamicProps": false, "dynamicItems": false };
var schema5 = { "type": ["object", "boolean"]};
function validate14(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate14.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (Array.isArray(data)) {
    if (data.length < 1) {
      const err0 = { instancePath, schemaPath: "#/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    const len0 = data.length;
    for (let i0 = 0; i0 < len0; i0++) {
      let data0 = data[i0];
      let _v0 = dynamicAnchors.meta;
      if (_v0) {
        if (!_v0(data0, { instancePath: instancePath + "/" + i0, parentData: data, parentDataProperty: i0, rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? _v0.errors : vErrors.concat(_v0.errors);
          errors = vErrors.length;
        } else {
          var props0 = _v0.evaluated.props;
          _v0.evaluated.items;
        }
      } else {
        if (!validate14(data0, { instancePath: instancePath + "/" + i0, parentData: data, parentDataProperty: i0, rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate14.errors : vErrors.concat(validate14.errors);
          errors = vErrors.length;
        } else {
          var props1 = validate14.evaluated.props;
          if (props0 !== true && props1 !== void 0) {
            if (props1 === true) {
              props0 = true;
            } else {
              props0 = props0 || {};
              Object.assign(props0, props1);
            }
          }
          validate14.evaluated.items;
        }
      }
    }
  } else {
    const err1 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "array" }, message: "must be array" };
    if (vErrors === null) {
      vErrors = [err1];
    } else {
      vErrors.push(err1);
    }
    errors++;
  }
  validate14.errors = vErrors;
  return errors === 0;
}
validate14.evaluated = { "items": true, "dynamicProps": false, "dynamicItems": false };
function validate13(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate13.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: schema5.type }, message: "must be object,boolean" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (!dynamicAnchors.meta) {
    dynamicAnchors.meta = validate13;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.prefixItems !== void 0) {
      if (!validate14(data.prefixItems, { instancePath: instancePath + "/prefixItems", parentData: data, parentDataProperty: "prefixItems", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate14.errors : vErrors.concat(validate14.errors);
        errors = vErrors.length;
      }
    }
    if (data.items !== void 0) {
      let data1 = data.items;
      let _v0 = dynamicAnchors.meta;
      if (_v0) {
        if (!_v0(data1, { instancePath: instancePath + "/items", parentData: data, parentDataProperty: "items", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? _v0.errors : vErrors.concat(_v0.errors);
          errors = vErrors.length;
        } else {
          var props0 = _v0.evaluated.props;
          _v0.evaluated.items;
        }
      } else {
        if (!validate13(data1, { instancePath: instancePath + "/items", parentData: data, parentDataProperty: "items", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
          errors = vErrors.length;
        } else {
          var props1 = validate13.evaluated.props;
          if (props0 !== true && props1 !== void 0) {
            if (props1 === true) {
              props0 = true;
            } else {
              props0 = props0 || {};
              Object.assign(props0, props1);
            }
          }
          validate13.evaluated.items;
        }
      }
    }
    if (data.contains !== void 0) {
      let data2 = data.contains;
      let _v1 = dynamicAnchors.meta;
      if (_v1) {
        if (!_v1(data2, { instancePath: instancePath + "/contains", parentData: data, parentDataProperty: "contains", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? _v1.errors : vErrors.concat(_v1.errors);
          errors = vErrors.length;
        } else {
          var props2 = _v1.evaluated.props;
          _v1.evaluated.items;
        }
      } else {
        if (!validate13(data2, { instancePath: instancePath + "/contains", parentData: data, parentDataProperty: "contains", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
          errors = vErrors.length;
        } else {
          var props3 = validate13.evaluated.props;
          if (props2 !== true && props3 !== void 0) {
            if (props3 === true) {
              props2 = true;
            } else {
              props2 = props2 || {};
              Object.assign(props2, props3);
            }
          }
          validate13.evaluated.items;
        }
      }
    }
    if (data.additionalProperties !== void 0) {
      let data3 = data.additionalProperties;
      let _v2 = dynamicAnchors.meta;
      if (_v2) {
        if (!_v2(data3, { instancePath: instancePath + "/additionalProperties", parentData: data, parentDataProperty: "additionalProperties", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? _v2.errors : vErrors.concat(_v2.errors);
          errors = vErrors.length;
        } else {
          var props4 = _v2.evaluated.props;
          _v2.evaluated.items;
        }
      } else {
        if (!validate13(data3, { instancePath: instancePath + "/additionalProperties", parentData: data, parentDataProperty: "additionalProperties", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
          errors = vErrors.length;
        } else {
          var props5 = validate13.evaluated.props;
          if (props4 !== true && props5 !== void 0) {
            if (props5 === true) {
              props4 = true;
            } else {
              props4 = props4 || {};
              Object.assign(props4, props5);
            }
          }
          validate13.evaluated.items;
        }
      }
    }
    if (data.properties !== void 0) {
      let data4 = data.properties;
      if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
        for (const key0 in data4) {
          let data5 = data4[key0];
          let _v3 = dynamicAnchors.meta;
          if (_v3) {
            if (!_v3(data5, { instancePath: instancePath + "/properties/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data4, parentDataProperty: key0, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? _v3.errors : vErrors.concat(_v3.errors);
              errors = vErrors.length;
            } else {
              var props6 = _v3.evaluated.props;
              _v3.evaluated.items;
            }
          } else {
            if (!validate13(data5, { instancePath: instancePath + "/properties/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data4, parentDataProperty: key0, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
              errors = vErrors.length;
            } else {
              var props7 = validate13.evaluated.props;
              if (props6 !== true && props7 !== void 0) {
                if (props7 === true) {
                  props6 = true;
                } else {
                  props6 = props6 || {};
                  Object.assign(props6, props7);
                }
              }
              validate13.evaluated.items;
            }
          }
        }
      } else {
        const err1 = { instancePath: instancePath + "/properties", schemaPath: "#/properties/properties/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.patternProperties !== void 0) {
      let data6 = data.patternProperties;
      if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
        for (const key1 in data6) {
          const _errs11 = errors;
          var valid2 = _errs11 === errors;
          if (!valid2) {
            const err2 = { instancePath: instancePath + "/patternProperties", schemaPath: "#/properties/patternProperties/propertyNames", keyword: "propertyNames", params: { propertyName: key1 }, message: "property name must be valid" };
            if (vErrors === null) {
              vErrors = [err2];
            } else {
              vErrors.push(err2);
            }
            errors++;
          }
        }
        for (const key2 in data6) {
          let data7 = data6[key2];
          let _v4 = dynamicAnchors.meta;
          if (_v4) {
            if (!_v4(data7, { instancePath: instancePath + "/patternProperties/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data6, parentDataProperty: key2, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? _v4.errors : vErrors.concat(_v4.errors);
              errors = vErrors.length;
            } else {
              var props8 = _v4.evaluated.props;
              _v4.evaluated.items;
            }
          } else {
            if (!validate13(data7, { instancePath: instancePath + "/patternProperties/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data6, parentDataProperty: key2, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
              errors = vErrors.length;
            } else {
              var props9 = validate13.evaluated.props;
              if (props8 !== true && props9 !== void 0) {
                if (props9 === true) {
                  props8 = true;
                } else {
                  props8 = props8 || {};
                  Object.assign(props8, props9);
                }
              }
              validate13.evaluated.items;
            }
          }
        }
      } else {
        const err3 = { instancePath: instancePath + "/patternProperties", schemaPath: "#/properties/patternProperties/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.dependentSchemas !== void 0) {
      let data8 = data.dependentSchemas;
      if (data8 && typeof data8 == "object" && !Array.isArray(data8)) {
        for (const key3 in data8) {
          let data9 = data8[key3];
          let _v5 = dynamicAnchors.meta;
          if (_v5) {
            if (!_v5(data9, { instancePath: instancePath + "/dependentSchemas/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data8, parentDataProperty: key3, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? _v5.errors : vErrors.concat(_v5.errors);
              errors = vErrors.length;
            } else {
              var props10 = _v5.evaluated.props;
              _v5.evaluated.items;
            }
          } else {
            if (!validate13(data9, { instancePath: instancePath + "/dependentSchemas/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data8, parentDataProperty: key3, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
              errors = vErrors.length;
            } else {
              var props11 = validate13.evaluated.props;
              if (props10 !== true && props11 !== void 0) {
                if (props11 === true) {
                  props10 = true;
                } else {
                  props10 = props10 || {};
                  Object.assign(props10, props11);
                }
              }
              validate13.evaluated.items;
            }
          }
        }
      } else {
        const err4 = { instancePath: instancePath + "/dependentSchemas", schemaPath: "#/properties/dependentSchemas/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.propertyNames !== void 0) {
      let data10 = data.propertyNames;
      let _v6 = dynamicAnchors.meta;
      if (_v6) {
        if (!_v6(data10, { instancePath: instancePath + "/propertyNames", parentData: data, parentDataProperty: "propertyNames", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? _v6.errors : vErrors.concat(_v6.errors);
          errors = vErrors.length;
        } else {
          var props12 = _v6.evaluated.props;
          _v6.evaluated.items;
        }
      } else {
        if (!validate13(data10, { instancePath: instancePath + "/propertyNames", parentData: data, parentDataProperty: "propertyNames", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
          errors = vErrors.length;
        } else {
          var props13 = validate13.evaluated.props;
          if (props12 !== true && props13 !== void 0) {
            if (props13 === true) {
              props12 = true;
            } else {
              props12 = props12 || {};
              Object.assign(props12, props13);
            }
          }
          validate13.evaluated.items;
        }
      }
    }
    if (data.if !== void 0) {
      let data11 = data.if;
      let _v7 = dynamicAnchors.meta;
      if (_v7) {
        if (!_v7(data11, { instancePath: instancePath + "/if", parentData: data, parentDataProperty: "if", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? _v7.errors : vErrors.concat(_v7.errors);
          errors = vErrors.length;
        } else {
          var props14 = _v7.evaluated.props;
          _v7.evaluated.items;
        }
      } else {
        if (!validate13(data11, { instancePath: instancePath + "/if", parentData: data, parentDataProperty: "if", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
          errors = vErrors.length;
        } else {
          var props15 = validate13.evaluated.props;
          if (props14 !== true && props15 !== void 0) {
            if (props15 === true) {
              props14 = true;
            } else {
              props14 = props14 || {};
              Object.assign(props14, props15);
            }
          }
          validate13.evaluated.items;
        }
      }
    }
    if (data.then !== void 0) {
      let data12 = data.then;
      let _v8 = dynamicAnchors.meta;
      if (_v8) {
        if (!_v8(data12, { instancePath: instancePath + "/then", parentData: data, parentDataProperty: "then", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? _v8.errors : vErrors.concat(_v8.errors);
          errors = vErrors.length;
        } else {
          var props16 = _v8.evaluated.props;
          _v8.evaluated.items;
        }
      } else {
        if (!validate13(data12, { instancePath: instancePath + "/then", parentData: data, parentDataProperty: "then", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
          errors = vErrors.length;
        } else {
          var props17 = validate13.evaluated.props;
          if (props16 !== true && props17 !== void 0) {
            if (props17 === true) {
              props16 = true;
            } else {
              props16 = props16 || {};
              Object.assign(props16, props17);
            }
          }
          validate13.evaluated.items;
        }
      }
    }
    if (data.else !== void 0) {
      let data13 = data.else;
      let _v9 = dynamicAnchors.meta;
      if (_v9) {
        if (!_v9(data13, { instancePath: instancePath + "/else", parentData: data, parentDataProperty: "else", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? _v9.errors : vErrors.concat(_v9.errors);
          errors = vErrors.length;
        } else {
          var props18 = _v9.evaluated.props;
          _v9.evaluated.items;
        }
      } else {
        if (!validate13(data13, { instancePath: instancePath + "/else", parentData: data, parentDataProperty: "else", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
          errors = vErrors.length;
        } else {
          var props19 = validate13.evaluated.props;
          if (props18 !== true && props19 !== void 0) {
            if (props19 === true) {
              props18 = true;
            } else {
              props18 = props18 || {};
              Object.assign(props18, props19);
            }
          }
          validate13.evaluated.items;
        }
      }
    }
    if (data.allOf !== void 0) {
      if (!validate14(data.allOf, { instancePath: instancePath + "/allOf", parentData: data, parentDataProperty: "allOf", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate14.errors : vErrors.concat(validate14.errors);
        errors = vErrors.length;
      }
    }
    if (data.anyOf !== void 0) {
      if (!validate14(data.anyOf, { instancePath: instancePath + "/anyOf", parentData: data, parentDataProperty: "anyOf", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate14.errors : vErrors.concat(validate14.errors);
        errors = vErrors.length;
      }
    }
    if (data.oneOf !== void 0) {
      if (!validate14(data.oneOf, { instancePath: instancePath + "/oneOf", parentData: data, parentDataProperty: "oneOf", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate14.errors : vErrors.concat(validate14.errors);
        errors = vErrors.length;
      }
    }
    if (data.not !== void 0) {
      let data17 = data.not;
      let _v10 = dynamicAnchors.meta;
      if (_v10) {
        if (!_v10(data17, { instancePath: instancePath + "/not", parentData: data, parentDataProperty: "not", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? _v10.errors : vErrors.concat(_v10.errors);
          errors = vErrors.length;
        } else {
          var props20 = _v10.evaluated.props;
          _v10.evaluated.items;
        }
      } else {
        if (!validate13(data17, { instancePath: instancePath + "/not", parentData: data, parentDataProperty: "not", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
          errors = vErrors.length;
        } else {
          var props21 = validate13.evaluated.props;
          if (props20 !== true && props21 !== void 0) {
            if (props21 === true) {
              props20 = true;
            } else {
              props20 = props20 || {};
              Object.assign(props20, props21);
            }
          }
          validate13.evaluated.items;
        }
      }
    }
  }
  validate13.errors = vErrors;
  return errors === 0;
}
validate13.evaluated = { "props": { "prefixItems": true, "items": true, "contains": true, "additionalProperties": true, "properties": true, "patternProperties": true, "dependentSchemas": true, "propertyNames": true, "if": true, "then": true, "else": true, "allOf": true, "anyOf": true, "oneOf": true, "not": true }, "dynamicProps": false, "dynamicItems": false };
var schema7 = { "type": ["object", "boolean"]};
function validate20(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate20.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: schema7.type }, message: "must be object,boolean" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (!dynamicAnchors.meta) {
    dynamicAnchors.meta = validate20;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.unevaluatedItems !== void 0) {
      let data0 = data.unevaluatedItems;
      let _v0 = dynamicAnchors.meta;
      if (_v0) {
        if (!_v0(data0, { instancePath: instancePath + "/unevaluatedItems", parentData: data, parentDataProperty: "unevaluatedItems", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? _v0.errors : vErrors.concat(_v0.errors);
          errors = vErrors.length;
        } else {
          var props0 = _v0.evaluated.props;
          _v0.evaluated.items;
        }
      } else {
        if (!validate20(data0, { instancePath: instancePath + "/unevaluatedItems", parentData: data, parentDataProperty: "unevaluatedItems", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate20.errors : vErrors.concat(validate20.errors);
          errors = vErrors.length;
        } else {
          var props1 = validate20.evaluated.props;
          if (props0 !== true && props1 !== void 0) {
            if (props1 === true) {
              props0 = true;
            } else {
              props0 = props0 || {};
              Object.assign(props0, props1);
            }
          }
          validate20.evaluated.items;
        }
      }
    }
    if (data.unevaluatedProperties !== void 0) {
      let data1 = data.unevaluatedProperties;
      let _v1 = dynamicAnchors.meta;
      if (_v1) {
        if (!_v1(data1, { instancePath: instancePath + "/unevaluatedProperties", parentData: data, parentDataProperty: "unevaluatedProperties", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? _v1.errors : vErrors.concat(_v1.errors);
          errors = vErrors.length;
        } else {
          var props2 = _v1.evaluated.props;
          _v1.evaluated.items;
        }
      } else {
        if (!validate20(data1, { instancePath: instancePath + "/unevaluatedProperties", parentData: data, parentDataProperty: "unevaluatedProperties", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate20.errors : vErrors.concat(validate20.errors);
          errors = vErrors.length;
        } else {
          var props3 = validate20.evaluated.props;
          if (props2 !== true && props3 !== void 0) {
            if (props3 === true) {
              props2 = true;
            } else {
              props2 = props2 || {};
              Object.assign(props2, props3);
            }
          }
          validate20.evaluated.items;
        }
      }
    }
  }
  validate20.errors = vErrors;
  return errors === 0;
}
validate20.evaluated = { "props": { "unevaluatedItems": true, "unevaluatedProperties": true }, "dynamicProps": false, "dynamicItems": false };
var schema8 = { "type": ["object", "boolean"]};
var schema9 = { "enum": ["array", "boolean", "integer", "null", "number", "object", "string"] };
function validate23(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate23.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data === "array" || data === "boolean" || data === "integer" || data === "null" || data === "number" || data === "object" || data === "string")) {
    const err0 = { instancePath, schemaPath: "#/enum", keyword: "enum", params: { allowedValues: schema9.enum }, message: "must be equal to one of the allowed values" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate23.errors = vErrors;
  return errors === 0;
}
validate23.evaluated = { "dynamicProps": false, "dynamicItems": false };
function validate26(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate26.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(typeof data == "number" && (!(data % 1) && !isNaN(data)))) {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (typeof data == "number") {
    if (data < 0 || isNaN(data)) {
      const err1 = { instancePath, schemaPath: "#/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
  }
  validate26.errors = vErrors;
  return errors === 0;
}
validate26.evaluated = { "dynamicProps": false, "dynamicItems": false };
function validate28(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate28.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(typeof data == "number" && (!(data % 1) && !isNaN(data)))) {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (typeof data == "number") {
    if (data < 0 || isNaN(data)) {
      const err1 = { instancePath, schemaPath: "#/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
  }
  validate28.errors = vErrors;
  return errors === 0;
}
validate28.evaluated = { "dynamicProps": false, "dynamicItems": false };
function validate36(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate36.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (Array.isArray(data)) {
    const len0 = data.length;
    for (let i0 = 0; i0 < len0; i0++) {
      if (typeof data[i0] !== "string") {
        const err0 = { instancePath: instancePath + "/" + i0, schemaPath: "#/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
    let i1 = data.length;
    let j0;
    if (i1 > 1) {
      const indices0 = {};
      for (; i1--; ) {
        let item0 = data[i1];
        if (typeof item0 !== "string") {
          continue;
        }
        if (typeof indices0[item0] == "number") {
          j0 = indices0[item0];
          const err1 = { instancePath, schemaPath: "#/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
          break;
        }
        indices0[item0] = i1;
      }
    }
  } else {
    const err2 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "array" }, message: "must be array" };
    if (vErrors === null) {
      vErrors = [err2];
    } else {
      vErrors.push(err2);
    }
    errors++;
  }
  validate36.errors = vErrors;
  return errors === 0;
}
validate36.evaluated = { "items": true, "dynamicProps": false, "dynamicItems": false };
var func0 = __deepEqual;
function validate22(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate22.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: schema8.type }, message: "must be object,boolean" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (!dynamicAnchors.meta) {
    dynamicAnchors.meta = validate22;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type !== void 0) {
      let data0 = data.type;
      const _errs2 = errors;
      let valid1 = false;
      const _errs3 = errors;
      if (!validate23(data0, { instancePath: instancePath + "/type", parentData: data, parentDataProperty: "type", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
        errors = vErrors.length;
      }
      var _valid0 = _errs3 === errors;
      valid1 = valid1 || _valid0;
      const _errs4 = errors;
      if (Array.isArray(data0)) {
        if (data0.length < 1) {
          const err1 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/anyOf/1/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        const len0 = data0.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate23(data0[i0], { instancePath: instancePath + "/type/" + i0, parentData: data0, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
            errors = vErrors.length;
          }
        }
        let i1 = data0.length;
        let j0;
        if (i1 > 1) {
          outer0: for (; i1--; ) {
            for (j0 = i1; j0--; ) {
              if (func0(data0[i1], data0[j0])) {
                const err2 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/anyOf/1/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err2];
                } else {
                  vErrors.push(err2);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err3 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/anyOf/1/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
      var _valid0 = _errs4 === errors;
      valid1 = valid1 || _valid0;
      if (!valid1) {
        const err4 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      } else {
        errors = _errs2;
        if (vErrors !== null) {
          if (_errs2) {
            vErrors.length = _errs2;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.enum !== void 0) {
      if (!Array.isArray(data.enum)) {
        const err5 = { instancePath: instancePath + "/enum", schemaPath: "#/properties/enum/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.multipleOf !== void 0) {
      let data3 = data.multipleOf;
      if (typeof data3 == "number") {
        if (data3 <= 0 || isNaN(data3)) {
          const err6 = { instancePath: instancePath + "/multipleOf", schemaPath: "#/properties/multipleOf/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      } else {
        const err7 = { instancePath: instancePath + "/multipleOf", schemaPath: "#/properties/multipleOf/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.maximum !== void 0) {
      if (!(typeof data.maximum == "number")) {
        const err8 = { instancePath: instancePath + "/maximum", schemaPath: "#/properties/maximum/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.exclusiveMaximum !== void 0) {
      if (!(typeof data.exclusiveMaximum == "number")) {
        const err9 = { instancePath: instancePath + "/exclusiveMaximum", schemaPath: "#/properties/exclusiveMaximum/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.minimum !== void 0) {
      if (!(typeof data.minimum == "number")) {
        const err10 = { instancePath: instancePath + "/minimum", schemaPath: "#/properties/minimum/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.exclusiveMinimum !== void 0) {
      if (!(typeof data.exclusiveMinimum == "number")) {
        const err11 = { instancePath: instancePath + "/exclusiveMinimum", schemaPath: "#/properties/exclusiveMinimum/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.maxLength !== void 0) {
      if (!validate26(data.maxLength, { instancePath: instancePath + "/maxLength", parentData: data, parentDataProperty: "maxLength", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
        errors = vErrors.length;
      }
    }
    if (data.minLength !== void 0) {
      if (!validate28(data.minLength, { instancePath: instancePath + "/minLength", parentData: data, parentDataProperty: "minLength", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
        errors = vErrors.length;
      }
    }
    if (data.pattern !== void 0) {
      if (!(typeof data.pattern === "string")) {
        const err12 = { instancePath: instancePath + "/pattern", schemaPath: "#/properties/pattern/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
    if (data.maxItems !== void 0) {
      if (!validate26(data.maxItems, { instancePath: instancePath + "/maxItems", parentData: data, parentDataProperty: "maxItems", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
        errors = vErrors.length;
      }
    }
    if (data.minItems !== void 0) {
      if (!validate28(data.minItems, { instancePath: instancePath + "/minItems", parentData: data, parentDataProperty: "minItems", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
        errors = vErrors.length;
      }
    }
    if (data.uniqueItems !== void 0) {
      if (typeof data.uniqueItems !== "boolean") {
        const err13 = { instancePath: instancePath + "/uniqueItems", schemaPath: "#/properties/uniqueItems/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.maxContains !== void 0) {
      if (!validate26(data.maxContains, { instancePath: instancePath + "/maxContains", parentData: data, parentDataProperty: "maxContains", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
        errors = vErrors.length;
      }
    }
    if (data.minContains !== void 0) {
      if (!validate26(data.minContains, { instancePath: instancePath + "/minContains", parentData: data, parentDataProperty: "minContains", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
        errors = vErrors.length;
      }
    }
    if (data.maxProperties !== void 0) {
      if (!validate26(data.maxProperties, { instancePath: instancePath + "/maxProperties", parentData: data, parentDataProperty: "maxProperties", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
        errors = vErrors.length;
      }
    }
    if (data.minProperties !== void 0) {
      if (!validate28(data.minProperties, { instancePath: instancePath + "/minProperties", parentData: data, parentDataProperty: "minProperties", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
        errors = vErrors.length;
      }
    }
    if (data.required !== void 0) {
      if (!validate36(data.required, { instancePath: instancePath + "/required", parentData: data, parentDataProperty: "required", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate36.errors : vErrors.concat(validate36.errors);
        errors = vErrors.length;
      }
    }
    if (data.dependentRequired !== void 0) {
      let data19 = data.dependentRequired;
      if (data19 && typeof data19 == "object" && !Array.isArray(data19)) {
        for (const key0 in data19) {
          if (!validate36(data19[key0], { instancePath: instancePath + "/dependentRequired/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data19, parentDataProperty: key0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate36.errors : vErrors.concat(validate36.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/dependentRequired", schemaPath: "#/properties/dependentRequired/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
  }
  validate22.errors = vErrors;
  return errors === 0;
}
validate22.evaluated = { "props": { "type": true, "const": true, "enum": true, "multipleOf": true, "maximum": true, "exclusiveMaximum": true, "minimum": true, "exclusiveMinimum": true, "maxLength": true, "minLength": true, "pattern": true, "maxItems": true, "minItems": true, "uniqueItems": true, "maxContains": true, "minContains": true, "maxProperties": true, "minProperties": true, "required": true, "dependentRequired": true }, "dynamicProps": false, "dynamicItems": false };
var schema13 = { "type": ["object", "boolean"]};
function validate40(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate40.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: schema13.type }, message: "must be object,boolean" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (!dynamicAnchors.meta) {
    dynamicAnchors.meta = validate40;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.title !== void 0) {
      if (typeof data.title !== "string") {
        const err1 = { instancePath: instancePath + "/title", schemaPath: "#/properties/title/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err2 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.deprecated !== void 0) {
      if (typeof data.deprecated !== "boolean") {
        const err3 = { instancePath: instancePath + "/deprecated", schemaPath: "#/properties/deprecated/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.readOnly !== void 0) {
      if (typeof data.readOnly !== "boolean") {
        const err4 = { instancePath: instancePath + "/readOnly", schemaPath: "#/properties/readOnly/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.writeOnly !== void 0) {
      if (typeof data.writeOnly !== "boolean") {
        const err5 = { instancePath: instancePath + "/writeOnly", schemaPath: "#/properties/writeOnly/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.examples !== void 0) {
      if (!Array.isArray(data.examples)) {
        const err6 = { instancePath: instancePath + "/examples", schemaPath: "#/properties/examples/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
  }
  validate40.errors = vErrors;
  return errors === 0;
}
validate40.evaluated = { "props": { "title": true, "description": true, "default": true, "deprecated": true, "readOnly": true, "writeOnly": true, "examples": true }, "dynamicProps": false, "dynamicItems": false };
var schema14 = { "type": ["object", "boolean"]};
function validate42(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate42.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: schema14.type }, message: "must be object,boolean" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (!dynamicAnchors.meta) {
    dynamicAnchors.meta = validate42;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.format !== void 0) {
      if (typeof data.format !== "string") {
        const err1 = { instancePath: instancePath + "/format", schemaPath: "#/properties/format/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
  }
  validate42.errors = vErrors;
  return errors === 0;
}
validate42.evaluated = { "props": { "format": true }, "dynamicProps": false, "dynamicItems": false };
var schema15 = { "type": ["object", "boolean"]};
function validate44(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate44.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: schema15.type }, message: "must be object,boolean" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (!dynamicAnchors.meta) {
    dynamicAnchors.meta = validate44;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.contentEncoding !== void 0) {
      if (typeof data.contentEncoding !== "string") {
        const err1 = { instancePath: instancePath + "/contentEncoding", schemaPath: "#/properties/contentEncoding/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.contentMediaType !== void 0) {
      if (typeof data.contentMediaType !== "string") {
        const err2 = { instancePath: instancePath + "/contentMediaType", schemaPath: "#/properties/contentMediaType/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.contentSchema !== void 0) {
      let data2 = data.contentSchema;
      let _v0 = dynamicAnchors.meta;
      if (_v0) {
        if (!_v0(data2, { instancePath: instancePath + "/contentSchema", parentData: data, parentDataProperty: "contentSchema", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? _v0.errors : vErrors.concat(_v0.errors);
          errors = vErrors.length;
        } else {
          var props0 = _v0.evaluated.props;
          _v0.evaluated.items;
        }
      } else {
        if (!validate44(data2, { instancePath: instancePath + "/contentSchema", parentData: data, parentDataProperty: "contentSchema", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
          errors = vErrors.length;
        } else {
          var props1 = validate44.evaluated.props;
          if (props0 !== true && props1 !== void 0) {
            if (props1 === true) {
              props0 = true;
            } else {
              props0 = props0 || {};
              Object.assign(props0, props1);
            }
          }
          validate44.evaluated.items;
        }
      }
    }
  }
  validate44.errors = vErrors;
  return errors === 0;
}
validate44.evaluated = { "props": { "contentEncoding": true, "contentMediaType": true, "contentSchema": true }, "dynamicProps": false, "dynamicItems": false };
function validate71(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate71.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (Array.isArray(data)) {
    const len0 = data.length;
    for (let i0 = 0; i0 < len0; i0++) {
      if (typeof data[i0] !== "string") {
        const err0 = { instancePath: instancePath + "/" + i0, schemaPath: "#/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
    let i1 = data.length;
    let j0;
    if (i1 > 1) {
      const indices0 = {};
      for (; i1--; ) {
        let item0 = data[i1];
        if (typeof item0 !== "string") {
          continue;
        }
        if (typeof indices0[item0] == "number") {
          j0 = indices0[item0];
          const err1 = { instancePath, schemaPath: "#/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
          break;
        }
        indices0[item0] = i1;
      }
    }
  } else {
    const err2 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "array" }, message: "must be array" };
    if (vErrors === null) {
      vErrors = [err2];
    } else {
      vErrors.push(err2);
    }
    errors++;
  }
  validate71.errors = vErrors;
  return errors === 0;
}
validate71.evaluated = { "items": true, "dynamicProps": false, "dynamicItems": false };
function validate73(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate73.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (typeof data === "string") {
    if (!pattern1.test(data)) {
      const err0 = { instancePath, schemaPath: "#/pattern", keyword: "pattern", params: { pattern: "^[A-Za-z_][-A-Za-z0-9._]*$" }, message: 'must match pattern "^[A-Za-z_][-A-Za-z0-9._]*$"' };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
  } else {
    const err1 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err1];
    } else {
      vErrors.push(err1);
    }
    errors++;
  }
  validate73.errors = vErrors;
  return errors === 0;
}
validate73.evaluated = { "dynamicProps": false, "dynamicItems": false };
function validate75(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate75.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(typeof data === "string")) {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate75.errors = vErrors;
  return errors === 0;
}
validate75.evaluated = { "dynamicProps": false, "dynamicItems": false };
function validate63(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate63.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: schema0.type }, message: "must be object,boolean" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (!dynamicAnchors.meta) {
    dynamicAnchors.meta = validate63;
  }
  if (!validate1(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate1.errors : vErrors.concat(validate1.errors);
    errors = vErrors.length;
  }
  if (!validate13(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
    errors = vErrors.length;
  }
  if (!validate20(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate20.errors : vErrors.concat(validate20.errors);
    errors = vErrors.length;
  }
  if (!validate22(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate22.errors : vErrors.concat(validate22.errors);
    errors = vErrors.length;
  }
  if (!validate40(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate40.errors : vErrors.concat(validate40.errors);
    errors = vErrors.length;
  }
  if (!validate42(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate42.errors : vErrors.concat(validate42.errors);
    errors = vErrors.length;
  }
  if (!validate44(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
    errors = vErrors.length;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.definitions !== void 0) {
      let data0 = data.definitions;
      if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
        for (const key0 in data0) {
          let data1 = data0[key0];
          let _v0 = dynamicAnchors.meta;
          if (_v0) {
            if (!_v0(data1, { instancePath: instancePath + "/definitions/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data0, parentDataProperty: key0, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? _v0.errors : vErrors.concat(_v0.errors);
              errors = vErrors.length;
            } else {
              var props0 = _v0.evaluated.props;
              _v0.evaluated.items;
            }
          } else {
            if (!validate63(data1, { instancePath: instancePath + "/definitions/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data0, parentDataProperty: key0, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate63.errors : vErrors.concat(validate63.errors);
              errors = vErrors.length;
            } else {
              var props1 = validate63.evaluated.props;
              if (props0 !== true && props1 !== void 0) {
                if (props1 === true) {
                  props0 = true;
                } else {
                  props0 = props0 || {};
                  Object.assign(props0, props1);
                }
              }
              validate63.evaluated.items;
            }
          }
        }
      } else {
        const err1 = { instancePath: instancePath + "/definitions", schemaPath: "#/properties/definitions/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.dependencies !== void 0) {
      let data2 = data.dependencies;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        for (const key1 in data2) {
          let data3 = data2[key1];
          const _errs19 = errors;
          let valid4 = false;
          const _errs20 = errors;
          let _v1 = dynamicAnchors.meta;
          if (_v1) {
            if (!_v1(data3, { instancePath: instancePath + "/dependencies/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data2, parentDataProperty: key1, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? _v1.errors : vErrors.concat(_v1.errors);
              errors = vErrors.length;
            } else {
              var props2 = _v1.evaluated.props;
              _v1.evaluated.items;
            }
          } else {
            if (!validate63(data3, { instancePath: instancePath + "/dependencies/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data2, parentDataProperty: key1, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate63.errors : vErrors.concat(validate63.errors);
              errors = vErrors.length;
            } else {
              var props3 = validate63.evaluated.props;
              if (props2 !== true && props3 !== void 0) {
                if (props3 === true) {
                  props2 = true;
                } else {
                  props2 = props2 || {};
                  Object.assign(props2, props3);
                }
              }
              validate63.evaluated.items;
            }
          }
          var _valid0 = _errs20 === errors;
          valid4 = valid4 || _valid0;
          const _errs21 = errors;
          if (!validate71(data3, { instancePath: instancePath + "/dependencies/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data2, parentDataProperty: key1, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate71.errors : vErrors.concat(validate71.errors);
            errors = vErrors.length;
          }
          var _valid0 = _errs21 === errors;
          valid4 = valid4 || _valid0;
          if (!valid4) {
            const err2 = { instancePath: instancePath + "/dependencies/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/dependencies/additionalProperties/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
            if (vErrors === null) {
              vErrors = [err2];
            } else {
              vErrors.push(err2);
            }
            errors++;
          } else {
            errors = _errs19;
            if (vErrors !== null) {
              if (_errs19) {
                vErrors.length = _errs19;
              } else {
                vErrors = null;
              }
            }
          }
        }
      } else {
        const err3 = { instancePath: instancePath + "/dependencies", schemaPath: "#/properties/dependencies/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.$recursiveAnchor !== void 0) {
      if (!validate73(data.$recursiveAnchor, { instancePath: instancePath + "/$recursiveAnchor", parentData: data, parentDataProperty: "$recursiveAnchor", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate73.errors : vErrors.concat(validate73.errors);
        errors = vErrors.length;
      }
    }
    if (data.$recursiveRef !== void 0) {
      if (!validate75(data.$recursiveRef, { instancePath: instancePath + "/$recursiveRef", parentData: data, parentDataProperty: "$recursiveRef", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
        errors = vErrors.length;
      }
    }
  }
  validate63.errors = vErrors;
  return errors === 0;
}
validate63.evaluated = { "props": { "definitions": true, "dependencies": true, "$recursiveAnchor": true, "$recursiveRef": true, "contentEncoding": true, "contentMediaType": true, "contentSchema": true, "format": true, "title": true, "description": true, "default": true, "deprecated": true, "readOnly": true, "writeOnly": true, "examples": true, "type": true, "const": true, "enum": true, "multipleOf": true, "maximum": true, "exclusiveMaximum": true, "minimum": true, "exclusiveMinimum": true, "maxLength": true, "minLength": true, "pattern": true, "maxItems": true, "minItems": true, "uniqueItems": true, "maxContains": true, "minContains": true, "maxProperties": true, "minProperties": true, "required": true, "dependentRequired": true, "unevaluatedItems": true, "unevaluatedProperties": true, "prefixItems": true, "items": true, "contains": true, "additionalProperties": true, "properties": true, "patternProperties": true, "dependentSchemas": true, "propertyNames": true, "if": true, "then": true, "else": true, "allOf": true, "anyOf": true, "oneOf": true, "not": true, "$id": true, "$schema": true, "$ref": true, "$anchor": true, "$dynamicRef": true, "$dynamicAnchor": true, "$vocabulary": true, "$comment": true, "$defs": true }, "dynamicProps": false, "dynamicItems": false };
var schema29 = { "properties": { "value": { "type": ["string", "boolean", "object", "array", "number", "null"] } }};
function validate80(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate80.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.reference === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "reference" }, message: "must have required property 'reference'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.reference !== void 0) {
      if (typeof data.reference !== "string") {
        const err1 = { instancePath: instancePath + "/reference", schemaPath: "#/properties/reference/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.value !== void 0) {
      let data1 = data.value;
      if (typeof data1 != "object" && typeof data1 !== "string" && typeof data1 !== "boolean" && !(typeof data1 == "number")) {
        const err2 = { instancePath: instancePath + "/value", schemaPath: "#/properties/value/type", keyword: "type", params: { type: schema29.properties.value.type }, message: "must be string,boolean,object,array,number,null" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    for (const key0 in data) {
      if (key0 !== "reference" && key0 !== "value") {
        const err3 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
  } else {
    const err4 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err4];
    } else {
      vErrors.push(err4);
    }
    errors++;
  }
  validate80.errors = vErrors;
  return errors === 0;
}
validate80.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema30 = { "properties": { "in": { "enum": ["path", "query", "header", "cookie"] }, "value": { "type": ["string", "boolean", "object", "array", "number", "null"] } }};
function validate82(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate82.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.name === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.value === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "value" }, message: "must have required property 'value'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.name = true;
      props0.in = true;
      props0.value = true;
    }
    if (data.name !== void 0) {
      if (typeof data.name !== "string") {
        const err2 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.in !== void 0) {
      let data1 = data.in;
      if (!(data1 === "path" || data1 === "query" || data1 === "header" || data1 === "cookie")) {
        const err3 = { instancePath: instancePath + "/in", schemaPath: "#/properties/in/enum", keyword: "enum", params: { allowedValues: schema30.properties.in.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.value !== void 0) {
      let data2 = data.value;
      if (typeof data2 != "object" && typeof data2 !== "string" && typeof data2 !== "boolean" && !(typeof data2 == "number")) {
        const err4 = { instancePath: instancePath + "/value", schemaPath: "#/properties/value/type", keyword: "type", params: { type: schema30.properties.value.type }, message: "must be string,boolean,object,array,number,null" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err5 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
      }
    }
  } else {
    const err6 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err6];
    } else {
      vErrors.push(err6);
    }
    errors++;
  }
  validate82.errors = vErrors;
  return errors === 0;
}
validate82.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate87(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate87.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (typeof data !== "string") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate87.errors = vErrors;
  return errors === 0;
}
validate87.evaluated = { "dynamicProps": false, "dynamicItems": false };
function validate91(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate91.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.target === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "target" }, message: "must have required property 'target'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.value === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "value" }, message: "must have required property 'value'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.target = true;
      props0.value = true;
    }
    if (data.target !== void 0) {
      if (typeof data.target !== "string") {
        const err2 = { instancePath: instancePath + "/target", schemaPath: "#/properties/target/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.value !== void 0) {
      if (typeof data.value !== "string") {
        const err3 = { instancePath: instancePath + "/value", schemaPath: "#/properties/value/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err4 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      }
    }
  } else {
    const err5 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err5];
    } else {
      vErrors.push(err5);
    }
    errors++;
  }
  validate91.errors = vErrors;
  return errors === 0;
}
validate91.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate89(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate89.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (props0 !== true) {
      props0 = props0 || {};
      props0.contentType = true;
      props0.payload = true;
      props0.replacements = true;
    }
    if (data.contentType !== void 0) {
      if (typeof data.contentType !== "string") {
        const err0 = { instancePath: instancePath + "/contentType", schemaPath: "#/properties/contentType/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
    if (data.replacements !== void 0) {
      let data1 = data.replacements;
      if (Array.isArray(data1)) {
        const len0 = data1.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate91(data1[i0], { instancePath: instancePath + "/replacements/" + i0, parentData: data1, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate91.errors : vErrors.concat(validate91.errors);
            errors = vErrors.length;
          }
        }
        let i1 = data1.length;
        let j0;
        if (i1 > 1) {
          outer0: for (; i1--; ) {
            for (j0 = i1; j0--; ) {
              if (func0(data1[i1], data1[j0])) {
                const err1 = { instancePath: instancePath + "/replacements", schemaPath: "#/properties/replacements/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err1];
                } else {
                  vErrors.push(err1);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err2 = { instancePath: instancePath + "/replacements", schemaPath: "#/properties/replacements/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err3 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
      }
    }
  } else {
    const err4 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err4];
    } else {
      vErrors.push(err4);
    }
    errors++;
  }
  validate89.errors = vErrors;
  return errors === 0;
}
validate89.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema34 = { "properties": { "type": { "else": { "enum": ["simple", "regex", "jsonpath", "xpath"] } } }};
var schema35 = { "properties": { "type": { "enum": ["jsonpath", "xpath"] }}, "allOf": [{ "if": { "required": ["type"], "properties": { "type": { "const": "jsonpath" } } }, "then": { "properties": { "version": { "const": "draft-goessner-dispatch-jsonpath-00" } } } }, { "if": { "required": ["type"], "properties": { "type": { "const": "xpath" } } }, "then": { "properties": { "version": { "enum": ["xpath-10", "xpath-20", "xpath-30"] } } } }]};
function validate97(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate97.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  const _errs2 = errors;
  let valid1 = true;
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0 && ("type")) {
      const err0 = {};
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    } else {
      if (data.type !== void 0) {
        if ("jsonpath" !== data.type) {
          const err1 = {};
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
      }
    }
  }
  var _valid0 = _errs3 === errors;
  errors = _errs2;
  if (vErrors !== null) {
    if (_errs2) {
      vErrors.length = _errs2;
    } else {
      vErrors = null;
    }
  }
  if (_valid0) {
    const _errs5 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.version !== void 0) {
        if ("draft-goessner-dispatch-jsonpath-00" !== data.version) {
          const err2 = { instancePath: instancePath + "/version", schemaPath: "#/allOf/0/then/properties/version/const", keyword: "const", params: { allowedValue: "draft-goessner-dispatch-jsonpath-00" }, message: "must be equal to constant" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
      }
    }
    var _valid0 = _errs5 === errors;
    valid1 = _valid0;
    if (valid1) {
      var props1 = {};
      props1.version = true;
      props1.type = true;
    }
  }
  if (!valid1) {
    const err3 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err3];
    } else {
      vErrors.push(err3);
    }
    errors++;
  }
  if (props0 !== true && props1 !== void 0) {
    if (props1 === true) {
      props0 = true;
    } else {
      props0 = props0 || {};
      Object.assign(props0, props1);
    }
  }
  const _errs8 = errors;
  let valid4 = true;
  const _errs9 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0 && ("type")) {
      const err4 = {};
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    } else {
      if (data.type !== void 0) {
        if ("xpath" !== data.type) {
          const err5 = {};
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
      }
    }
  }
  var _valid1 = _errs9 === errors;
  errors = _errs8;
  if (vErrors !== null) {
    if (_errs8) {
      vErrors.length = _errs8;
    } else {
      vErrors = null;
    }
  }
  if (_valid1) {
    const _errs11 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.version !== void 0) {
        let data3 = data.version;
        if (!(data3 === "xpath-10" || data3 === "xpath-20" || data3 === "xpath-30")) {
          const err6 = { instancePath: instancePath + "/version", schemaPath: "#/allOf/1/then/properties/version/enum", keyword: "enum", params: { allowedValues: schema35.allOf[1].then.properties.version.enum }, message: "must be equal to one of the allowed values" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      }
    }
    var _valid1 = _errs11 === errors;
    valid4 = _valid1;
    if (valid4) {
      var props2 = {};
      props2.version = true;
      props2.type = true;
    }
  }
  if (!valid4) {
    const err7 = { instancePath, schemaPath: "#/allOf/1/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  if (props0 !== true && props2 !== void 0) {
    if (props2 === true) {
      props0 = true;
    } else {
      props0 = props0 || {};
      Object.assign(props0, props2);
    }
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err8 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err8];
      } else {
        vErrors.push(err8);
      }
      errors++;
    }
    if (data.version === void 0) {
      const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "version" }, message: "must have required property 'version'" };
      if (vErrors === null) {
        vErrors = [err9];
      } else {
        vErrors.push(err9);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.type = true;
      props0.version = true;
    }
    if (data.type !== void 0) {
      let data4 = data.type;
      if (!(data4 === "jsonpath" || data4 === "xpath")) {
        const err10 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/enum", keyword: "enum", params: { allowedValues: schema35.properties.type.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.version !== void 0) {
      if (typeof data.version !== "string") {
        const err11 = { instancePath: instancePath + "/version", schemaPath: "#/properties/version/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
  } else {
    const err12 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err12];
    } else {
      vErrors.push(err12);
    }
    errors++;
  }
  validate97.errors = vErrors;
  evaluated0.props = props0;
  return errors === 0;
}
validate97.evaluated = { "dynamicProps": true, "dynamicItems": false };
function validate95(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate95.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.condition === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "condition" }, message: "must have required property 'condition'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.context = true;
      props0.condition = true;
      props0.type = true;
    }
    if (data.context !== void 0) {
      if (typeof data.context !== "string") {
        const err1 = { instancePath: instancePath + "/context", schemaPath: "#/properties/context/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.condition !== void 0) {
      if (typeof data.condition !== "string") {
        const err2 = { instancePath: instancePath + "/condition", schemaPath: "#/properties/condition/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data2 = data.type;
      const _errs6 = errors;
      let valid1 = true;
      const _errs7 = errors;
      if (!(data2 && typeof data2 == "object" && !Array.isArray(data2))) {
        const err3 = {};
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
      var _valid0 = _errs7 === errors;
      errors = _errs6;
      if (vErrors !== null) {
        if (_errs6) {
          vErrors.length = _errs6;
        } else {
          vErrors = null;
        }
      }
      let ifClause0;
      if (_valid0) {
        const _errs9 = errors;
        if (!validate97(data2, { instancePath: instancePath + "/type", parentData: data, parentDataProperty: "type", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate97.errors : vErrors.concat(validate97.errors);
          errors = vErrors.length;
        }
        var _valid0 = _errs9 === errors;
        valid1 = _valid0;
        ifClause0 = "then";
      } else {
        const _errs10 = errors;
        if (!(data2 === "simple" || data2 === "regex" || data2 === "jsonpath" || data2 === "xpath")) {
          const err4 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/else/enum", keyword: "enum", params: { allowedValues: schema34.properties.type.else.enum }, message: "must be equal to one of the allowed values" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        var _valid0 = _errs10 === errors;
        valid1 = _valid0;
        ifClause0 = "else";
      }
      if (!valid1) {
        const err5 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/if", keyword: "if", params: { failingKeyword: ifClause0 }, message: 'must match "' + ifClause0 + '" schema' };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      if (data.context === void 0) {
        const err6 = { instancePath, schemaPath: "#/dependentRequired", keyword: "dependentRequired", params: {
          property: "type",
          missingProperty: "context",
          depsCount: 1,
          deps: "context"
        }, message: "must have property context when property type is present" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err7 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
      }
    }
  } else {
    const err8 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err8];
    } else {
      vErrors.push(err8);
    }
    errors++;
  }
  validate95.errors = vErrors;
  return errors === 0;
}
validate95.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema36 = { "properties": { "type": { "enum": ["end", "goto"] }}};
function validate105(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate105.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (typeof data !== "string") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate105.errors = vErrors;
  return errors === 0;
}
validate105.evaluated = { "dynamicProps": false, "dynamicItems": false };
function validate102(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate102.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  const _errs2 = errors;
  let valid1 = true;
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type !== void 0) {
      if ("goto" !== data.type) {
        const err0 = {};
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
  }
  var _valid0 = _errs3 === errors;
  errors = _errs2;
  if (vErrors !== null) {
    if (_errs2) {
      vErrors.length = _errs2;
    } else {
      vErrors = null;
    }
  }
  if (_valid0) {
    const _errs5 = errors;
    const _errs6 = errors;
    let valid3 = false;
    let passing0 = null;
    const _errs7 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.workflowId === void 0) {
        const err1 = { instancePath, schemaPath: "#/allOf/0/then/oneOf/0/required", keyword: "required", params: { missingProperty: "workflowId" }, message: "must have required property 'workflowId'" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    var _valid1 = _errs7 === errors;
    if (_valid1) {
      valid3 = true;
      passing0 = 0;
    }
    const _errs8 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.stepId === void 0) {
        const err2 = { instancePath, schemaPath: "#/allOf/0/then/oneOf/1/required", keyword: "required", params: { missingProperty: "stepId" }, message: "must have required property 'stepId'" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    var _valid1 = _errs8 === errors;
    if (_valid1 && valid3) {
      valid3 = false;
      passing0 = [passing0, 1];
    } else {
      if (_valid1) {
        valid3 = true;
        passing0 = 1;
      }
    }
    if (!valid3) {
      const err3 = { instancePath, schemaPath: "#/allOf/0/then/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    } else {
      errors = _errs6;
      if (vErrors !== null) {
        if (_errs6) {
          vErrors.length = _errs6;
        } else {
          vErrors = null;
        }
      }
    }
    var _valid0 = _errs5 === errors;
    valid1 = _valid0;
  }
  if (!valid1) {
    const err4 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err4];
    } else {
      vErrors.push(err4);
    }
    errors++;
  }
  if (props0 !== true) {
    props0 = props0 || {};
    props0.type = true;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.name === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data.type === void 0) {
      const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.name = true;
      props0.type = true;
      props0.workflowId = true;
      props0.stepId = true;
      props0.criteria = true;
    }
    if (data.name !== void 0) {
      if (typeof data.name !== "string") {
        const err7 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data2 = data.type;
      if (!(data2 === "end" || data2 === "goto")) {
        const err8 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/enum", keyword: "enum", params: { allowedValues: schema36.properties.type.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.workflowId !== void 0) {
      if (!validate87(data.workflowId, { instancePath: instancePath + "/workflowId", parentData: data, parentDataProperty: "workflowId", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate87.errors : vErrors.concat(validate87.errors);
        errors = vErrors.length;
      }
    }
    if (data.stepId !== void 0) {
      if (!validate105(data.stepId, { instancePath: instancePath + "/stepId", parentData: data, parentDataProperty: "stepId", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate105.errors : vErrors.concat(validate105.errors);
        errors = vErrors.length;
      }
    }
    if (data.criteria !== void 0) {
      let data5 = data.criteria;
      if (Array.isArray(data5)) {
        if (data5.length < 1) {
          const err9 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate95(data5[i0], { instancePath: instancePath + "/criteria/" + i0, parentData: data5, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate95.errors : vErrors.concat(validate95.errors);
            errors = vErrors.length;
          }
        }
        let i1 = data5.length;
        let j0;
        if (i1 > 1) {
          outer0: for (; i1--; ) {
            for (j0 = i1; j0--; ) {
              if (func0(data5[i1], data5[j0])) {
                const err10 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err10];
                } else {
                  vErrors.push(err10);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err11 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err12 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
      }
    }
  } else {
    const err13 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err13];
    } else {
      vErrors.push(err13);
    }
    errors++;
  }
  validate102.errors = vErrors;
  return errors === 0;
}
validate102.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema38 = { "properties": { "type": { "enum": ["end", "goto", "retry"] }}};
function validate110(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate110.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  const _errs2 = errors;
  let valid1 = true;
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type !== void 0) {
      if (!(data.type === "goto")) {
        const err0 = {};
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
  }
  var _valid0 = _errs3 === errors;
  errors = _errs2;
  if (vErrors !== null) {
    if (_errs2) {
      vErrors.length = _errs2;
    } else {
      vErrors = null;
    }
  }
  if (_valid0) {
    const _errs5 = errors;
    const _errs6 = errors;
    let valid3 = false;
    let passing0 = null;
    const _errs7 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.workflowId === void 0) {
        const err1 = { instancePath, schemaPath: "#/allOf/0/then/oneOf/0/required", keyword: "required", params: { missingProperty: "workflowId" }, message: "must have required property 'workflowId'" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    var _valid1 = _errs7 === errors;
    if (_valid1) {
      valid3 = true;
      passing0 = 0;
    }
    const _errs8 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.stepId === void 0) {
        const err2 = { instancePath, schemaPath: "#/allOf/0/then/oneOf/1/required", keyword: "required", params: { missingProperty: "stepId" }, message: "must have required property 'stepId'" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    var _valid1 = _errs8 === errors;
    if (_valid1 && valid3) {
      valid3 = false;
      passing0 = [passing0, 1];
    } else {
      if (_valid1) {
        valid3 = true;
        passing0 = 1;
      }
    }
    if (!valid3) {
      const err3 = { instancePath, schemaPath: "#/allOf/0/then/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    } else {
      errors = _errs6;
      if (vErrors !== null) {
        if (_errs6) {
          vErrors.length = _errs6;
        } else {
          vErrors = null;
        }
      }
    }
    var _valid0 = _errs5 === errors;
    valid1 = _valid0;
  }
  if (!valid1) {
    const err4 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err4];
    } else {
      vErrors.push(err4);
    }
    errors++;
  }
  if (props0 !== true) {
    props0 = props0 || {};
    props0.type = true;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.name === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data.type === void 0) {
      const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.name = true;
      props0.type = true;
      props0.workflowId = true;
      props0.stepId = true;
      props0.retryAfter = true;
      props0.retryLimit = true;
      props0.criteria = true;
    }
    if (data.name !== void 0) {
      if (typeof data.name !== "string") {
        const err7 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data2 = data.type;
      if (!(data2 === "end" || data2 === "goto" || data2 === "retry")) {
        const err8 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/enum", keyword: "enum", params: { allowedValues: schema38.properties.type.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.workflowId !== void 0) {
      if (!validate87(data.workflowId, { instancePath: instancePath + "/workflowId", parentData: data, parentDataProperty: "workflowId", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate87.errors : vErrors.concat(validate87.errors);
        errors = vErrors.length;
      }
    }
    if (data.stepId !== void 0) {
      if (!validate105(data.stepId, { instancePath: instancePath + "/stepId", parentData: data, parentDataProperty: "stepId", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate105.errors : vErrors.concat(validate105.errors);
        errors = vErrors.length;
      }
    }
    if (data.retryAfter !== void 0) {
      let data5 = data.retryAfter;
      if (typeof data5 == "number") {
        if (data5 < 0 || isNaN(data5)) {
          const err9 = { instancePath: instancePath + "/retryAfter", schemaPath: "#/properties/retryAfter/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
      } else {
        const err10 = { instancePath: instancePath + "/retryAfter", schemaPath: "#/properties/retryAfter/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.retryLimit !== void 0) {
      let data6 = data.retryLimit;
      if (!(typeof data6 == "number" && (!(data6 % 1) && !isNaN(data6)))) {
        const err11 = { instancePath: instancePath + "/retryLimit", schemaPath: "#/properties/retryLimit/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
      if (typeof data6 == "number") {
        if (data6 < 0 || isNaN(data6)) {
          const err12 = { instancePath: instancePath + "/retryLimit", schemaPath: "#/properties/retryLimit/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
      }
    }
    if (data.criteria !== void 0) {
      let data7 = data.criteria;
      if (Array.isArray(data7)) {
        const len0 = data7.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate95(data7[i0], { instancePath: instancePath + "/criteria/" + i0, parentData: data7, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate95.errors : vErrors.concat(validate95.errors);
            errors = vErrors.length;
          }
        }
        let i1 = data7.length;
        let j0;
        if (i1 > 1) {
          outer0: for (; i1--; ) {
            for (j0 = i1; j0--; ) {
              if (func0(data7[i1], data7[j0])) {
                const err13 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err13];
                } else {
                  vErrors.push(err13);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err15 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err15];
          } else {
            vErrors.push(err15);
          }
          errors++;
        }
      }
    }
  } else {
    const err16 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err16];
    } else {
      vErrors.push(err16);
    }
    errors++;
  }
  validate110.errors = vErrors;
  return errors === 0;
}
validate110.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var pattern7 = new RegExp("^[a-zA-Z0-9\\.\\-_]+$", "u");
function validate78(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate78.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  const _errs1 = errors;
  let valid0 = false;
  let passing0 = null;
  const _errs2 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.operationId === void 0) {
      const err0 = { instancePath, schemaPath: "#/oneOf/0/required", keyword: "required", params: { missingProperty: "operationId" }, message: "must have required property 'operationId'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
  }
  var _valid0 = _errs2 === errors;
  if (_valid0) {
    valid0 = true;
    passing0 = 0;
  }
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.operationPath === void 0) {
      const err1 = { instancePath, schemaPath: "#/oneOf/1/required", keyword: "required", params: { missingProperty: "operationPath" }, message: "must have required property 'operationPath'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
  }
  var _valid0 = _errs3 === errors;
  if (_valid0 && valid0) {
    valid0 = false;
    passing0 = [passing0, 1];
  } else {
    if (_valid0) {
      valid0 = true;
      passing0 = 1;
    }
    const _errs4 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.workflowId === void 0) {
        const err2 = { instancePath, schemaPath: "#/oneOf/2/required", keyword: "required", params: { missingProperty: "workflowId" }, message: "must have required property 'workflowId'" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    var _valid0 = _errs4 === errors;
    if (_valid0 && valid0) {
      valid0 = false;
      passing0 = [passing0, 2];
    } else {
      if (_valid0) {
        valid0 = true;
        passing0 = 2;
      }
    }
  }
  if (!valid0) {
    const err3 = { instancePath, schemaPath: "#/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
    if (vErrors === null) {
      vErrors = [err3];
    } else {
      vErrors.push(err3);
    }
    errors++;
  } else {
    errors = _errs1;
    if (vErrors !== null) {
      if (_errs1) {
        vErrors.length = _errs1;
      } else {
        vErrors = null;
      }
    }
  }
  const _errs6 = errors;
  let valid2 = true;
  const _errs7 = errors;
  const _errs8 = errors;
  let valid3 = false;
  const _errs9 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.operationPath === void 0 && ("operationPath")) {
      const err4 = {};
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
  }
  var _valid2 = _errs9 === errors;
  if (_valid2) {
    valid3 = true;
  }
  const _errs10 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.operationId === void 0 && ("operationId")) {
      const err5 = {};
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
  }
  var _valid2 = _errs10 === errors;
  if (_valid2 && valid3) {
    valid3 = false;
  } else {
    if (_valid2) {
      valid3 = true;
    }
  }
  if (!valid3) {
    const err6 = {};
    if (vErrors === null) {
      vErrors = [err6];
    } else {
      vErrors.push(err6);
    }
    errors++;
  } else {
    errors = _errs8;
    if (vErrors !== null) {
      if (_errs8) {
        vErrors.length = _errs8;
      } else {
        vErrors = null;
      }
    }
  }
  var _valid1 = _errs7 === errors;
  errors = _errs6;
  if (vErrors !== null) {
    if (_errs6) {
      vErrors.length = _errs6;
    } else {
      vErrors = null;
    }
  }
  if (_valid1) {
    const _errs11 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.parameters !== void 0) {
        let data0 = data.parameters;
        if (Array.isArray(data0)) {
          const len0 = data0.length;
          for (let i0 = 0; i0 < len0; i0++) {
            let data1 = data0[i0];
            const _errs14 = errors;
            let valid7 = true;
            const _errs15 = errors;
            if (data1 && typeof data1 == "object" && !Array.isArray(data1)) {
              if (data1.reference === void 0 && ("reference")) {
                const err7 = {};
                if (vErrors === null) {
                  vErrors = [err7];
                } else {
                  vErrors.push(err7);
                }
                errors++;
              }
            }
            var _valid3 = _errs15 === errors;
            errors = _errs14;
            if (vErrors !== null) {
              if (_errs14) {
                vErrors.length = _errs14;
              } else {
                vErrors = null;
              }
            }
            let ifClause0;
            if (_valid3) {
              const _errs16 = errors;
              if (!validate80(data1, { instancePath: instancePath + "/parameters/" + i0, parentData: data0, parentDataProperty: i0, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate80.errors : vErrors.concat(validate80.errors);
                errors = vErrors.length;
              }
              var _valid3 = _errs16 === errors;
              valid7 = _valid3;
              ifClause0 = "then";
            } else {
              const _errs17 = errors;
              if (!validate82(data1, { instancePath: instancePath + "/parameters/" + i0, parentData: data0, parentDataProperty: i0, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate82.errors : vErrors.concat(validate82.errors);
                errors = vErrors.length;
              }
              if (data1 && typeof data1 == "object" && !Array.isArray(data1)) {
                if (data1.in === void 0) {
                  const err8 = { instancePath: instancePath + "/parameters/" + i0, schemaPath: "#/allOf/0/then/properties/parameters/items/else/required", keyword: "required", params: { missingProperty: "in" }, message: "must have required property 'in'" };
                  if (vErrors === null) {
                    vErrors = [err8];
                  } else {
                    vErrors.push(err8);
                  }
                  errors++;
                }
              }
              var _valid3 = _errs17 === errors;
              valid7 = _valid3;
              ifClause0 = "else";
            }
            if (!valid7) {
              const err9 = { instancePath: instancePath + "/parameters/" + i0, schemaPath: "#/allOf/0/then/properties/parameters/items/if", keyword: "if", params: { failingKeyword: ifClause0 }, message: 'must match "' + ifClause0 + '" schema' };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
          }
        }
      }
    }
    var _valid1 = _errs11 === errors;
    valid2 = _valid1;
    if (valid2) {
      var props2 = {};
      props2.parameters = true;
    }
  }
  if (!valid2) {
    const err10 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err10];
    } else {
      vErrors.push(err10);
    }
    errors++;
  }
  if (props0 !== true && props2 !== void 0) {
    if (props2 === true) {
      props0 = true;
    } else {
      props0 = props0 || {};
      Object.assign(props0, props2);
    }
  }
  const _errs19 = errors;
  let valid8 = true;
  const _errs20 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.workflowId === void 0 && ("workflowId")) {
      const err11 = {};
      if (vErrors === null) {
        vErrors = [err11];
      } else {
        vErrors.push(err11);
      }
      errors++;
    }
  }
  var _valid4 = _errs20 === errors;
  errors = _errs19;
  if (vErrors !== null) {
    if (_errs19) {
      vErrors.length = _errs19;
    } else {
      vErrors = null;
    }
  }
  if (_valid4) {
    const _errs21 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.parameters !== void 0) {
        let data2 = data.parameters;
        if (Array.isArray(data2)) {
          const len1 = data2.length;
          for (let i1 = 0; i1 < len1; i1++) {
            let data3 = data2[i1];
            const _errs24 = errors;
            let valid12 = true;
            const _errs25 = errors;
            if (data3 && typeof data3 == "object" && !Array.isArray(data3)) {
              if (data3.reference === void 0 && ("reference")) {
                const err12 = {};
                if (vErrors === null) {
                  vErrors = [err12];
                } else {
                  vErrors.push(err12);
                }
                errors++;
              }
            }
            var _valid5 = _errs25 === errors;
            errors = _errs24;
            if (vErrors !== null) {
              if (_errs24) {
                vErrors.length = _errs24;
              } else {
                vErrors = null;
              }
            }
            let ifClause1;
            if (_valid5) {
              const _errs26 = errors;
              if (!validate80(data3, { instancePath: instancePath + "/parameters/" + i1, parentData: data2, parentDataProperty: i1, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate80.errors : vErrors.concat(validate80.errors);
                errors = vErrors.length;
              }
              var _valid5 = _errs26 === errors;
              valid12 = _valid5;
              ifClause1 = "then";
            } else {
              const _errs27 = errors;
              if (!validate82(data3, { instancePath: instancePath + "/parameters/" + i1, parentData: data2, parentDataProperty: i1, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate82.errors : vErrors.concat(validate82.errors);
                errors = vErrors.length;
              }
              var _valid5 = _errs27 === errors;
              valid12 = _valid5;
              ifClause1 = "else";
            }
            if (!valid12) {
              const err13 = { instancePath: instancePath + "/parameters/" + i1, schemaPath: "#/allOf/1/then/properties/parameters/items/if", keyword: "if", params: { failingKeyword: ifClause1 }, message: 'must match "' + ifClause1 + '" schema' };
              if (vErrors === null) {
                vErrors = [err13];
              } else {
                vErrors.push(err13);
              }
              errors++;
            }
          }
        }
      }
    }
    var _valid4 = _errs21 === errors;
    valid8 = _valid4;
    if (valid8) {
      var props4 = {};
      props4.parameters = true;
    }
  }
  if (!valid8) {
    const err14 = { instancePath, schemaPath: "#/allOf/1/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err14];
    } else {
      vErrors.push(err14);
    }
    errors++;
  }
  if (props0 !== true && props4 !== void 0) {
    if (props4 === true) {
      props0 = true;
    } else {
      props0 = props0 || {};
      Object.assign(props0, props4);
    }
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.stepId === void 0) {
      const err15 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "stepId" }, message: "must have required property 'stepId'" };
      if (vErrors === null) {
        vErrors = [err15];
      } else {
        vErrors.push(err15);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.stepId = true;
      props0.description = true;
      props0.operationId = true;
      props0.operationPath = true;
      props0.workflowId = true;
      props0.parameters = true;
      props0.requestBody = true;
      props0.successCriteria = true;
      props0.onSuccess = true;
      props0.onFailure = true;
      props0.outputs = true;
    }
    if (data.stepId !== void 0) {
      if (typeof data.stepId !== "string") {
        const err16 = { instancePath: instancePath + "/stepId", schemaPath: "#/properties/stepId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err17 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
    if (data.operationId !== void 0) {
      if (typeof data.operationId !== "string") {
        const err18 = { instancePath: instancePath + "/operationId", schemaPath: "#/properties/operationId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
    if (data.operationPath !== void 0) {
      if (typeof data.operationPath !== "string") {
        const err19 = { instancePath: instancePath + "/operationPath", schemaPath: "#/properties/operationPath/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      }
    }
    if (data.workflowId !== void 0) {
      if (!validate87(data.workflowId, { instancePath: instancePath + "/workflowId", parentData: data, parentDataProperty: "workflowId", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate87.errors : vErrors.concat(validate87.errors);
        errors = vErrors.length;
      }
    }
    if (data.parameters !== void 0) {
      let data9 = data.parameters;
      if (Array.isArray(data9)) {
        let i2 = data9.length;
        let j0;
        if (i2 > 1) {
          outer0: for (; i2--; ) {
            for (j0 = i2; j0--; ) {
              if (func0(data9[i2], data9[j0])) {
                const err20 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/uniqueItems", keyword: "uniqueItems", params: { i: i2, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i2 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err21 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
    }
    if (data.requestBody !== void 0) {
      if (!validate89(data.requestBody, { instancePath: instancePath + "/requestBody", parentData: data, parentDataProperty: "requestBody", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate89.errors : vErrors.concat(validate89.errors);
        errors = vErrors.length;
      }
    }
    if (data.successCriteria !== void 0) {
      let data11 = data.successCriteria;
      if (Array.isArray(data11)) {
        if (data11.length < 1) {
          const err22 = { instancePath: instancePath + "/successCriteria", schemaPath: "#/properties/successCriteria/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err22];
          } else {
            vErrors.push(err22);
          }
          errors++;
        }
        const len2 = data11.length;
        for (let i3 = 0; i3 < len2; i3++) {
          if (!validate95(data11[i3], { instancePath: instancePath + "/successCriteria/" + i3, parentData: data11, parentDataProperty: i3, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate95.errors : vErrors.concat(validate95.errors);
            errors = vErrors.length;
          }
        }
        let i4 = data11.length;
        let j1;
        if (i4 > 1) {
          outer1: for (; i4--; ) {
            for (j1 = i4; j1--; ) {
              if (func0(data11[i4], data11[j1])) {
                const err23 = { instancePath: instancePath + "/successCriteria", schemaPath: "#/properties/successCriteria/uniqueItems", keyword: "uniqueItems", params: { i: i4, j: j1 }, message: "must NOT have duplicate items (items ## " + j1 + " and " + i4 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err23];
                } else {
                  vErrors.push(err23);
                }
                errors++;
                break outer1;
              }
            }
          }
        }
      } else {
        const err24 = { instancePath: instancePath + "/successCriteria", schemaPath: "#/properties/successCriteria/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (data.onSuccess !== void 0) {
      let data13 = data.onSuccess;
      if (Array.isArray(data13)) {
        const len3 = data13.length;
        for (let i5 = 0; i5 < len3; i5++) {
          let data14 = data13[i5];
          const _errs46 = errors;
          let valid20 = true;
          const _errs47 = errors;
          if (data14 && typeof data14 == "object" && !Array.isArray(data14)) {
            if (data14.reference === void 0 && ("reference")) {
              const err25 = {};
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
          }
          var _valid6 = _errs47 === errors;
          errors = _errs46;
          if (vErrors !== null) {
            if (_errs46) {
              vErrors.length = _errs46;
            } else {
              vErrors = null;
            }
          }
          let ifClause2;
          if (_valid6) {
            const _errs48 = errors;
            if (!validate80(data14, { instancePath: instancePath + "/onSuccess/" + i5, parentData: data13, parentDataProperty: i5, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate80.errors : vErrors.concat(validate80.errors);
              errors = vErrors.length;
            }
            var _valid6 = _errs48 === errors;
            valid20 = _valid6;
            ifClause2 = "then";
          } else {
            const _errs49 = errors;
            if (!validate102(data14, { instancePath: instancePath + "/onSuccess/" + i5, parentData: data13, parentDataProperty: i5, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate102.errors : vErrors.concat(validate102.errors);
              errors = vErrors.length;
            }
            var _valid6 = _errs49 === errors;
            valid20 = _valid6;
            ifClause2 = "else";
          }
          if (!valid20) {
            const err26 = { instancePath: instancePath + "/onSuccess/" + i5, schemaPath: "#/properties/onSuccess/items/if", keyword: "if", params: { failingKeyword: ifClause2 }, message: 'must match "' + ifClause2 + '" schema' };
            if (vErrors === null) {
              vErrors = [err26];
            } else {
              vErrors.push(err26);
            }
            errors++;
          }
        }
        let i6 = data13.length;
        let j2;
        if (i6 > 1) {
          outer2: for (; i6--; ) {
            for (j2 = i6; j2--; ) {
              if (func0(data13[i6], data13[j2])) {
                const err27 = { instancePath: instancePath + "/onSuccess", schemaPath: "#/properties/onSuccess/uniqueItems", keyword: "uniqueItems", params: { i: i6, j: j2 }, message: "must NOT have duplicate items (items ## " + j2 + " and " + i6 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
                break outer2;
              }
            }
          }
        }
      } else {
        const err28 = { instancePath: instancePath + "/onSuccess", schemaPath: "#/properties/onSuccess/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err28];
        } else {
          vErrors.push(err28);
        }
        errors++;
      }
    }
    if (data.onFailure !== void 0) {
      let data15 = data.onFailure;
      if (Array.isArray(data15)) {
        const len4 = data15.length;
        for (let i7 = 0; i7 < len4; i7++) {
          let data16 = data15[i7];
          const _errs53 = errors;
          let valid24 = true;
          const _errs54 = errors;
          if (data16 && typeof data16 == "object" && !Array.isArray(data16)) {
            if (data16.reference === void 0 && ("reference")) {
              const err29 = {};
              if (vErrors === null) {
                vErrors = [err29];
              } else {
                vErrors.push(err29);
              }
              errors++;
            }
          }
          var _valid7 = _errs54 === errors;
          errors = _errs53;
          if (vErrors !== null) {
            if (_errs53) {
              vErrors.length = _errs53;
            } else {
              vErrors = null;
            }
          }
          let ifClause3;
          if (_valid7) {
            const _errs55 = errors;
            if (!validate80(data16, { instancePath: instancePath + "/onFailure/" + i7, parentData: data15, parentDataProperty: i7, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate80.errors : vErrors.concat(validate80.errors);
              errors = vErrors.length;
            }
            var _valid7 = _errs55 === errors;
            valid24 = _valid7;
            ifClause3 = "then";
          } else {
            const _errs56 = errors;
            if (!validate110(data16, { instancePath: instancePath + "/onFailure/" + i7, parentData: data15, parentDataProperty: i7, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate110.errors : vErrors.concat(validate110.errors);
              errors = vErrors.length;
            }
            var _valid7 = _errs56 === errors;
            valid24 = _valid7;
            ifClause3 = "else";
          }
          if (!valid24) {
            const err30 = { instancePath: instancePath + "/onFailure/" + i7, schemaPath: "#/properties/onFailure/items/if", keyword: "if", params: { failingKeyword: ifClause3 }, message: 'must match "' + ifClause3 + '" schema' };
            if (vErrors === null) {
              vErrors = [err30];
            } else {
              vErrors.push(err30);
            }
            errors++;
          }
        }
        let i8 = data15.length;
        let j3;
        if (i8 > 1) {
          outer3: for (; i8--; ) {
            for (j3 = i8; j3--; ) {
              if (func0(data15[i8], data15[j3])) {
                const err31 = { instancePath: instancePath + "/onFailure", schemaPath: "#/properties/onFailure/uniqueItems", keyword: "uniqueItems", params: { i: i8, j: j3 }, message: "must NOT have duplicate items (items ## " + j3 + " and " + i8 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err31];
                } else {
                  vErrors.push(err31);
                }
                errors++;
                break outer3;
              }
            }
          }
        }
      } else {
        const err32 = { instancePath: instancePath + "/onFailure", schemaPath: "#/properties/onFailure/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err32];
        } else {
          vErrors.push(err32);
        }
        errors++;
      }
    }
    if (data.outputs !== void 0) {
      let data17 = data.outputs;
      if (data17 && typeof data17 == "object" && !Array.isArray(data17)) {
        var props7 = {};
        for (const key0 in data17) {
          if (pattern7.test(key0)) {
            if (typeof data17[key0] !== "string") {
              const err33 = { instancePath: instancePath + "/outputs/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/outputs/patternProperties/%5E%5Ba-zA-Z0-9%5C.%5C-_%5D%2B%24/type", keyword: "type", params: { type: "string" }, message: "must be string" };
              if (vErrors === null) {
                vErrors = [err33];
              } else {
                vErrors.push(err33);
              }
              errors++;
            }
            props7[key0] = true;
          }
        }
      } else {
        const err34 = { instancePath: instancePath + "/outputs", schemaPath: "#/properties/outputs/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err34];
        } else {
          vErrors.push(err34);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key1 in data) {
        if (!props0 || !props0[key1]) {
          const err35 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key1 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err35];
          } else {
            vErrors.push(err35);
          }
          errors++;
        }
      }
    }
  } else {
    const err36 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err36];
    } else {
      vErrors.push(err36);
    }
    errors++;
  }
  validate78.errors = vErrors;
  return errors === 0;
}
validate78.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate61(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate61.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.workflowId === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "workflowId" }, message: "must have required property 'workflowId'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.steps === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "steps" }, message: "must have required property 'steps'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.workflowId = true;
      props0.summary = true;
      props0.description = true;
      props0.inputs = true;
      props0.dependsOn = true;
      props0.steps = true;
      props0.successActions = true;
      props0.failureActions = true;
      props0.outputs = true;
      props0.parameters = true;
    }
    if (data.workflowId !== void 0) {
      if (typeof data.workflowId !== "string") {
        const err2 = { instancePath: instancePath + "/workflowId", schemaPath: "#/properties/workflowId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.summary !== void 0) {
      if (typeof data.summary !== "string") {
        const err3 = { instancePath: instancePath + "/summary", schemaPath: "#/properties/summary/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err4 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.inputs !== void 0) {
      if (!validate63(data.inputs, { instancePath: instancePath + "/inputs", parentData: data, parentDataProperty: "inputs", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate63.errors : vErrors.concat(validate63.errors);
        errors = vErrors.length;
      }
    }
    if (data.dependsOn !== void 0) {
      let data4 = data.dependsOn;
      if (Array.isArray(data4)) {
        const len0 = data4.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (typeof data4[i0] !== "string") {
            const err5 = { instancePath: instancePath + "/dependsOn/" + i0, schemaPath: "#/properties/dependsOn/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err5];
            } else {
              vErrors.push(err5);
            }
            errors++;
          }
        }
        let i1 = data4.length;
        let j0;
        if (i1 > 1) {
          const indices0 = {};
          for (; i1--; ) {
            let item0 = data4[i1];
            if (typeof item0 !== "string") {
              continue;
            }
            if (typeof indices0[item0] == "number") {
              j0 = indices0[item0];
              const err6 = { instancePath: instancePath + "/dependsOn", schemaPath: "#/properties/dependsOn/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
              if (vErrors === null) {
                vErrors = [err6];
              } else {
                vErrors.push(err6);
              }
              errors++;
              break;
            }
            indices0[item0] = i1;
          }
        }
      } else {
        const err7 = { instancePath: instancePath + "/dependsOn", schemaPath: "#/properties/dependsOn/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.steps !== void 0) {
      let data6 = data.steps;
      if (Array.isArray(data6)) {
        if (data6.length < 1) {
          const err8 = { instancePath: instancePath + "/steps", schemaPath: "#/properties/steps/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        const len1 = data6.length;
        for (let i2 = 0; i2 < len1; i2++) {
          if (!validate78(data6[i2], { instancePath: instancePath + "/steps/" + i2, parentData: data6, parentDataProperty: i2, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate78.errors : vErrors.concat(validate78.errors);
            errors = vErrors.length;
          }
        }
        let i3 = data6.length;
        let j1;
        if (i3 > 1) {
          outer0: for (; i3--; ) {
            for (j1 = i3; j1--; ) {
              if (func0(data6[i3], data6[j1])) {
                const err9 = { instancePath: instancePath + "/steps", schemaPath: "#/properties/steps/uniqueItems", keyword: "uniqueItems", params: { i: i3, j: j1 }, message: "must NOT have duplicate items (items ## " + j1 + " and " + i3 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err9];
                } else {
                  vErrors.push(err9);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err10 = { instancePath: instancePath + "/steps", schemaPath: "#/properties/steps/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.successActions !== void 0) {
      let data8 = data.successActions;
      if (Array.isArray(data8)) {
        const len2 = data8.length;
        for (let i4 = 0; i4 < len2; i4++) {
          let data9 = data8[i4];
          const _errs18 = errors;
          let valid9 = true;
          const _errs19 = errors;
          if (data9 && typeof data9 == "object" && !Array.isArray(data9)) {
            if (data9.reference === void 0 && ("reference")) {
              const err11 = {};
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
          }
          var _valid0 = _errs19 === errors;
          errors = _errs18;
          if (vErrors !== null) {
            if (_errs18) {
              vErrors.length = _errs18;
            } else {
              vErrors = null;
            }
          }
          let ifClause0;
          if (_valid0) {
            const _errs20 = errors;
            if (!validate80(data9, { instancePath: instancePath + "/successActions/" + i4, parentData: data8, parentDataProperty: i4, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate80.errors : vErrors.concat(validate80.errors);
              errors = vErrors.length;
            }
            var _valid0 = _errs20 === errors;
            valid9 = _valid0;
            ifClause0 = "then";
          } else {
            const _errs21 = errors;
            if (!validate102(data9, { instancePath: instancePath + "/successActions/" + i4, parentData: data8, parentDataProperty: i4, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate102.errors : vErrors.concat(validate102.errors);
              errors = vErrors.length;
            }
            var _valid0 = _errs21 === errors;
            valid9 = _valid0;
            ifClause0 = "else";
          }
          if (!valid9) {
            const err12 = { instancePath: instancePath + "/successActions/" + i4, schemaPath: "#/properties/successActions/items/if", keyword: "if", params: { failingKeyword: ifClause0 }, message: 'must match "' + ifClause0 + '" schema' };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        let i5 = data8.length;
        let j2;
        if (i5 > 1) {
          outer1: for (; i5--; ) {
            for (j2 = i5; j2--; ) {
              if (func0(data8[i5], data8[j2])) {
                const err13 = { instancePath: instancePath + "/successActions", schemaPath: "#/properties/successActions/uniqueItems", keyword: "uniqueItems", params: { i: i5, j: j2 }, message: "must NOT have duplicate items (items ## " + j2 + " and " + i5 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err13];
                } else {
                  vErrors.push(err13);
                }
                errors++;
                break outer1;
              }
            }
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/successActions", schemaPath: "#/properties/successActions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.failureActions !== void 0) {
      let data10 = data.failureActions;
      if (Array.isArray(data10)) {
        const len3 = data10.length;
        for (let i6 = 0; i6 < len3; i6++) {
          let data11 = data10[i6];
          const _errs25 = errors;
          let valid13 = true;
          const _errs26 = errors;
          if (data11 && typeof data11 == "object" && !Array.isArray(data11)) {
            if (data11.reference === void 0 && ("reference")) {
              const err15 = {};
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
          }
          var _valid1 = _errs26 === errors;
          errors = _errs25;
          if (vErrors !== null) {
            if (_errs25) {
              vErrors.length = _errs25;
            } else {
              vErrors = null;
            }
          }
          let ifClause1;
          if (_valid1) {
            const _errs27 = errors;
            if (!validate80(data11, { instancePath: instancePath + "/failureActions/" + i6, parentData: data10, parentDataProperty: i6, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate80.errors : vErrors.concat(validate80.errors);
              errors = vErrors.length;
            }
            var _valid1 = _errs27 === errors;
            valid13 = _valid1;
            ifClause1 = "then";
          } else {
            const _errs28 = errors;
            if (!validate110(data11, { instancePath: instancePath + "/failureActions/" + i6, parentData: data10, parentDataProperty: i6, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate110.errors : vErrors.concat(validate110.errors);
              errors = vErrors.length;
            }
            var _valid1 = _errs28 === errors;
            valid13 = _valid1;
            ifClause1 = "else";
          }
          if (!valid13) {
            const err16 = { instancePath: instancePath + "/failureActions/" + i6, schemaPath: "#/properties/failureActions/items/if", keyword: "if", params: { failingKeyword: ifClause1 }, message: 'must match "' + ifClause1 + '" schema' };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
        }
        let i7 = data10.length;
        let j3;
        if (i7 > 1) {
          outer2: for (; i7--; ) {
            for (j3 = i7; j3--; ) {
              if (func0(data10[i7], data10[j3])) {
                const err17 = { instancePath: instancePath + "/failureActions", schemaPath: "#/properties/failureActions/uniqueItems", keyword: "uniqueItems", params: { i: i7, j: j3 }, message: "must NOT have duplicate items (items ## " + j3 + " and " + i7 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
                break outer2;
              }
            }
          }
        }
      } else {
        const err18 = { instancePath: instancePath + "/failureActions", schemaPath: "#/properties/failureActions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
    if (data.outputs !== void 0) {
      let data12 = data.outputs;
      if (data12 && typeof data12 == "object" && !Array.isArray(data12)) {
        var props3 = {};
        for (const key0 in data12) {
          if (pattern7.test(key0)) {
            if (typeof data12[key0] !== "string") {
              const err19 = { instancePath: instancePath + "/outputs/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/outputs/patternProperties/%5E%5Ba-zA-Z0-9%5C.%5C-_%5D%2B%24/type", keyword: "type", params: { type: "string" }, message: "must be string" };
              if (vErrors === null) {
                vErrors = [err19];
              } else {
                vErrors.push(err19);
              }
              errors++;
            }
            props3[key0] = true;
          }
        }
      } else {
        const err20 = { instancePath: instancePath + "/outputs", schemaPath: "#/properties/outputs/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err20];
        } else {
          vErrors.push(err20);
        }
        errors++;
      }
    }
    if (data.parameters !== void 0) {
      let data14 = data.parameters;
      if (Array.isArray(data14)) {
        const len4 = data14.length;
        for (let i8 = 0; i8 < len4; i8++) {
          let data15 = data14[i8];
          const _errs36 = errors;
          let valid18 = true;
          const _errs37 = errors;
          if (data15 && typeof data15 == "object" && !Array.isArray(data15)) {
            if (data15.reference === void 0 && ("reference")) {
              const err21 = {};
              if (vErrors === null) {
                vErrors = [err21];
              } else {
                vErrors.push(err21);
              }
              errors++;
            }
          }
          var _valid2 = _errs37 === errors;
          errors = _errs36;
          if (vErrors !== null) {
            if (_errs36) {
              vErrors.length = _errs36;
            } else {
              vErrors = null;
            }
          }
          let ifClause2;
          if (_valid2) {
            const _errs38 = errors;
            if (!validate80(data15, { instancePath: instancePath + "/parameters/" + i8, parentData: data14, parentDataProperty: i8, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate80.errors : vErrors.concat(validate80.errors);
              errors = vErrors.length;
            }
            var _valid2 = _errs38 === errors;
            valid18 = _valid2;
            ifClause2 = "then";
          } else {
            const _errs39 = errors;
            if (!validate82(data15, { instancePath: instancePath + "/parameters/" + i8, parentData: data14, parentDataProperty: i8, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate82.errors : vErrors.concat(validate82.errors);
              errors = vErrors.length;
            }
            var _valid2 = _errs39 === errors;
            valid18 = _valid2;
            ifClause2 = "else";
          }
          if (!valid18) {
            const err22 = { instancePath: instancePath + "/parameters/" + i8, schemaPath: "#/properties/parameters/items/if", keyword: "if", params: { failingKeyword: ifClause2 }, message: 'must match "' + ifClause2 + '" schema' };
            if (vErrors === null) {
              vErrors = [err22];
            } else {
              vErrors.push(err22);
            }
            errors++;
          }
        }
        let i9 = data14.length;
        let j4;
        if (i9 > 1) {
          outer3: for (; i9--; ) {
            for (j4 = i9; j4--; ) {
              if (func0(data14[i9], data14[j4])) {
                const err23 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/uniqueItems", keyword: "uniqueItems", params: { i: i9, j: j4 }, message: "must NOT have duplicate items (items ## " + j4 + " and " + i9 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err23];
                } else {
                  vErrors.push(err23);
                }
                errors++;
                break outer3;
              }
            }
          }
        }
      } else {
        const err24 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key1 in data) {
        if (!props0 || !props0[key1]) {
          const err25 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key1 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err25];
          } else {
            vErrors.push(err25);
          }
          errors++;
        }
      }
    }
  } else {
    const err26 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err26];
    } else {
      vErrors.push(err26);
    }
    errors++;
  }
  validate61.errors = vErrors;
  return errors === 0;
}
validate61.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var pattern9 = new RegExp("^(inputs|parameters|successActions|failureActions)$", "u");
function validate124(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate124.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (props0 !== true) {
      props0 = props0 || {};
      props0.inputs = true;
      props0.parameters = true;
      props0.successActions = true;
      props0.failureActions = true;
    }
    if (data.inputs !== void 0) {
      let data0 = data.inputs;
      if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
        for (const key0 in data0) {
          if (!validate63(data0[key0], { instancePath: instancePath + "/inputs/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data0, parentDataProperty: key0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate63.errors : vErrors.concat(validate63.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err0 = { instancePath: instancePath + "/inputs", schemaPath: "#/properties/inputs/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
    if (data.parameters !== void 0) {
      let data2 = data.parameters;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        for (const key1 in data2) {
          if (!validate82(data2[key1], { instancePath: instancePath + "/parameters/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data2, parentDataProperty: key1, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate82.errors : vErrors.concat(validate82.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err1 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.successActions !== void 0) {
      let data4 = data.successActions;
      if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
        for (const key2 in data4) {
          if (!validate102(data4[key2], { instancePath: instancePath + "/successActions/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data4, parentDataProperty: key2, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate102.errors : vErrors.concat(validate102.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err2 = { instancePath: instancePath + "/successActions", schemaPath: "#/properties/successActions/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.failureActions !== void 0) {
      let data6 = data.failureActions;
      if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
        for (const key3 in data6) {
          if (!validate110(data6[key3], { instancePath: instancePath + "/failureActions/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data6, parentDataProperty: key3, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate110.errors : vErrors.concat(validate110.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err3 = { instancePath: instancePath + "/failureActions", schemaPath: "#/properties/failureActions/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    for (const key4 in data) {
      if (pattern9.test(key4)) {
        let data8 = data[key4];
        if (data8 && typeof data8 == "object" && !Array.isArray(data8)) {
          for (const key5 in data8) {
            const _errs18 = errors;
            if (typeof key5 === "string") {
              if (!pattern7.test(key5)) {
                const err4 = { instancePath: instancePath + "/" + key4.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/patternProperties/%5E(inputs%7Cparameters%7CsuccessActions%7CfailureActions)%24/propertyNames/pattern", keyword: "pattern", params: { pattern: "^[a-zA-Z0-9\\.\\-_]+$" }, message: 'must match pattern "^[a-zA-Z0-9\\.\\-_]+$"', propertyName: key5 };
                if (vErrors === null) {
                  vErrors = [err4];
                } else {
                  vErrors.push(err4);
                }
                errors++;
              }
            }
            var valid6 = _errs18 === errors;
            if (!valid6) {
              const err5 = { instancePath: instancePath + "/" + key4.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/patternProperties/%5E(inputs%7Cparameters%7CsuccessActions%7CfailureActions)%24/propertyNames", keyword: "propertyNames", params: { propertyName: key5 }, message: "property name must be valid" };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
          }
        }
        props0[key4] = true;
      }
    }
    if (props0 !== true) {
      for (const key6 in data) {
        if (!props0 || !props0[key6]) {
          const err6 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key6 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      }
    }
  } else {
    const err7 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  validate124.errors = vErrors;
  return errors === 0;
}
validate124.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var pattern4 = new RegExp("^1\\.0\\.\\d+(-.+)?$", "u");
function validate52(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate52.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate53(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate53.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.arazzo === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "arazzo" }, message: "must have required property 'arazzo'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.info === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "info" }, message: "must have required property 'info'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.sourceDescriptions === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "sourceDescriptions" }, message: "must have required property 'sourceDescriptions'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.workflows === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "workflows" }, message: "must have required property 'workflows'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.arazzo = true;
      props0.info = true;
      props0.sourceDescriptions = true;
      props0.workflows = true;
      props0.components = true;
    }
    if (data.arazzo !== void 0) {
      let data0 = data.arazzo;
      if (typeof data0 === "string") {
        if (!pattern4.test(data0)) {
          const err4 = { instancePath: instancePath + "/arazzo", schemaPath: "#/properties/arazzo/pattern", keyword: "pattern", params: { pattern: "^1\\.0\\.\\d+(-.+)?$" }, message: 'must match pattern "^1\\.0\\.\\d+(-.+)?$"' };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      } else {
        const err5 = { instancePath: instancePath + "/arazzo", schemaPath: "#/properties/arazzo/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.info !== void 0) {
      if (!validate55(data.info, { instancePath: instancePath + "/info", parentData: data, parentDataProperty: "info", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
        errors = vErrors.length;
      }
    }
    if (data.sourceDescriptions !== void 0) {
      let data2 = data.sourceDescriptions;
      if (Array.isArray(data2)) {
        if (data2.length < 1) {
          const err6 = { instancePath: instancePath + "/sourceDescriptions", schemaPath: "#/properties/sourceDescriptions/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
        const len0 = data2.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate58(data2[i0], { instancePath: instancePath + "/sourceDescriptions/" + i0, parentData: data2, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate58.errors : vErrors.concat(validate58.errors);
            errors = vErrors.length;
          }
        }
        let i1 = data2.length;
        let j0;
        if (i1 > 1) {
          outer0: for (; i1--; ) {
            for (j0 = i1; j0--; ) {
              if (func0(data2[i1], data2[j0])) {
                const err7 = { instancePath: instancePath + "/sourceDescriptions", schemaPath: "#/properties/sourceDescriptions/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err7];
                } else {
                  vErrors.push(err7);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err8 = { instancePath: instancePath + "/sourceDescriptions", schemaPath: "#/properties/sourceDescriptions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.workflows !== void 0) {
      let data4 = data.workflows;
      if (Array.isArray(data4)) {
        if (data4.length < 1) {
          const err9 = { instancePath: instancePath + "/workflows", schemaPath: "#/properties/workflows/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        const len1 = data4.length;
        for (let i2 = 0; i2 < len1; i2++) {
          if (!validate61(data4[i2], { instancePath: instancePath + "/workflows/" + i2, parentData: data4, parentDataProperty: i2, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate61.errors : vErrors.concat(validate61.errors);
            errors = vErrors.length;
          }
        }
        let i3 = data4.length;
        let j1;
        if (i3 > 1) {
          outer1: for (; i3--; ) {
            for (j1 = i3; j1--; ) {
              if (func0(data4[i3], data4[j1])) {
                const err10 = { instancePath: instancePath + "/workflows", schemaPath: "#/properties/workflows/uniqueItems", keyword: "uniqueItems", params: { i: i3, j: j1 }, message: "must NOT have duplicate items (items ## " + j1 + " and " + i3 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err10];
                } else {
                  vErrors.push(err10);
                }
                errors++;
                break outer1;
              }
            }
          }
        }
      } else {
        const err11 = { instancePath: instancePath + "/workflows", schemaPath: "#/properties/workflows/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.components !== void 0) {
      if (!validate124(data.components, { instancePath: instancePath + "/components", parentData: data, parentDataProperty: "components", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate124.errors : vErrors.concat(validate124.errors);
        errors = vErrors.length;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err12 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
      }
    }
  } else {
    const err13 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err13];
    } else {
      vErrors.push(err13);
    }
    errors++;
  }
  validate52.errors = vErrors;
  return errors === 0;
}
validate52.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var validate11 = validate131;
function validate132(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate132.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    var props0 = {};
    for (const key0 in data) {
      if (pattern3.test(key0)) {
        props0[key0] = true;
      }
    }
  }
  validate132.errors = vErrors;
  evaluated0.props = props0;
  return errors === 0;
}
validate132.evaluated = { "dynamicProps": true, "dynamicItems": false };
function validate134(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate134.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.title === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "title" }, message: "must have required property 'title'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.version === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "version" }, message: "must have required property 'version'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.title = true;
      props0.summary = true;
      props0.description = true;
      props0.version = true;
    }
    if (data.title !== void 0) {
      if (typeof data.title !== "string") {
        const err2 = { instancePath: instancePath + "/title", schemaPath: "#/properties/title/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.summary !== void 0) {
      if (typeof data.summary !== "string") {
        const err3 = { instancePath: instancePath + "/summary", schemaPath: "#/properties/summary/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err4 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.version !== void 0) {
      if (typeof data.version !== "string") {
        const err5 = { instancePath: instancePath + "/version", schemaPath: "#/properties/version/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err6 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      }
    }
  } else {
    const err7 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  validate134.errors = vErrors;
  return errors === 0;
}
validate134.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema43 = { "properties": { "type": { "enum": ["arazzo", "openapi", "asyncapi"] } }};
function validate137(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate137.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.name === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.url === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "url" }, message: "must have required property 'url'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.name = true;
      props0.url = true;
      props0.type = true;
    }
    if (data.name !== void 0) {
      let data0 = data.name;
      if (typeof data0 === "string") {
        if (!pattern5.test(data0)) {
          const err2 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/pattern", keyword: "pattern", params: { pattern: "^[A-Za-z0-9_\\-]+$" }, message: 'must match pattern "^[A-Za-z0-9_\\-]+$"' };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
      } else {
        const err3 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.url !== void 0) {
      if (!(typeof data.url === "string")) {
        const err4 = { instancePath: instancePath + "/url", schemaPath: "#/properties/url/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data2 = data.type;
      if (!(data2 === "arazzo" || data2 === "openapi" || data2 === "asyncapi")) {
        const err5 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/enum", keyword: "enum", params: { allowedValues: schema43.properties.type.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err6 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      }
    }
  } else {
    const err7 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  validate137.errors = vErrors;
  return errors === 0;
}
validate137.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate150(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate150.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (Array.isArray(data)) {
    const len0 = data.length;
    for (let i0 = 0; i0 < len0; i0++) {
      if (typeof data[i0] !== "string") {
        const err0 = { instancePath: instancePath + "/" + i0, schemaPath: "#/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
    let i1 = data.length;
    let j0;
    if (i1 > 1) {
      const indices0 = {};
      for (; i1--; ) {
        let item0 = data[i1];
        if (typeof item0 !== "string") {
          continue;
        }
        if (typeof indices0[item0] == "number") {
          j0 = indices0[item0];
          const err1 = { instancePath, schemaPath: "#/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
          break;
        }
        indices0[item0] = i1;
      }
    }
  } else {
    const err2 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "array" }, message: "must be array" };
    if (vErrors === null) {
      vErrors = [err2];
    } else {
      vErrors.push(err2);
    }
    errors++;
  }
  validate150.errors = vErrors;
  return errors === 0;
}
validate150.evaluated = { "items": true, "dynamicProps": false, "dynamicItems": false };
function validate152(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate152.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (typeof data === "string") {
    if (!pattern1.test(data)) {
      const err0 = { instancePath, schemaPath: "#/pattern", keyword: "pattern", params: { pattern: "^[A-Za-z_][-A-Za-z0-9._]*$" }, message: 'must match pattern "^[A-Za-z_][-A-Za-z0-9._]*$"' };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
  } else {
    const err1 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err1];
    } else {
      vErrors.push(err1);
    }
    errors++;
  }
  validate152.errors = vErrors;
  return errors === 0;
}
validate152.evaluated = { "dynamicProps": false, "dynamicItems": false };
function validate154(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate154.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(typeof data === "string")) {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate154.errors = vErrors;
  return errors === 0;
}
validate154.evaluated = { "dynamicProps": false, "dynamicItems": false };
function validate142(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate142.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: schema0.type }, message: "must be object,boolean" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (!dynamicAnchors.meta) {
    dynamicAnchors.meta = validate142;
  }
  if (!validate1(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate1.errors : vErrors.concat(validate1.errors);
    errors = vErrors.length;
  }
  if (!validate13(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
    errors = vErrors.length;
  }
  if (!validate20(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate20.errors : vErrors.concat(validate20.errors);
    errors = vErrors.length;
  }
  if (!validate22(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate22.errors : vErrors.concat(validate22.errors);
    errors = vErrors.length;
  }
  if (!validate40(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate40.errors : vErrors.concat(validate40.errors);
    errors = vErrors.length;
  }
  if (!validate42(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate42.errors : vErrors.concat(validate42.errors);
    errors = vErrors.length;
  }
  if (!validate44(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
    errors = vErrors.length;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.definitions !== void 0) {
      let data0 = data.definitions;
      if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
        for (const key0 in data0) {
          let data1 = data0[key0];
          let _v0 = dynamicAnchors.meta;
          if (_v0) {
            if (!_v0(data1, { instancePath: instancePath + "/definitions/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data0, parentDataProperty: key0, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? _v0.errors : vErrors.concat(_v0.errors);
              errors = vErrors.length;
            } else {
              var props0 = _v0.evaluated.props;
              _v0.evaluated.items;
            }
          } else {
            if (!validate142(data1, { instancePath: instancePath + "/definitions/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data0, parentDataProperty: key0, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate142.errors : vErrors.concat(validate142.errors);
              errors = vErrors.length;
            } else {
              var props1 = validate142.evaluated.props;
              if (props0 !== true && props1 !== void 0) {
                if (props1 === true) {
                  props0 = true;
                } else {
                  props0 = props0 || {};
                  Object.assign(props0, props1);
                }
              }
              validate142.evaluated.items;
            }
          }
        }
      } else {
        const err1 = { instancePath: instancePath + "/definitions", schemaPath: "#/properties/definitions/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.dependencies !== void 0) {
      let data2 = data.dependencies;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        for (const key1 in data2) {
          let data3 = data2[key1];
          const _errs19 = errors;
          let valid4 = false;
          const _errs20 = errors;
          let _v1 = dynamicAnchors.meta;
          if (_v1) {
            if (!_v1(data3, { instancePath: instancePath + "/dependencies/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data2, parentDataProperty: key1, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? _v1.errors : vErrors.concat(_v1.errors);
              errors = vErrors.length;
            } else {
              var props2 = _v1.evaluated.props;
              _v1.evaluated.items;
            }
          } else {
            if (!validate142(data3, { instancePath: instancePath + "/dependencies/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data2, parentDataProperty: key1, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate142.errors : vErrors.concat(validate142.errors);
              errors = vErrors.length;
            } else {
              var props3 = validate142.evaluated.props;
              if (props2 !== true && props3 !== void 0) {
                if (props3 === true) {
                  props2 = true;
                } else {
                  props2 = props2 || {};
                  Object.assign(props2, props3);
                }
              }
              validate142.evaluated.items;
            }
          }
          var _valid0 = _errs20 === errors;
          valid4 = valid4 || _valid0;
          const _errs21 = errors;
          if (!validate150(data3, { instancePath: instancePath + "/dependencies/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data2, parentDataProperty: key1, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate150.errors : vErrors.concat(validate150.errors);
            errors = vErrors.length;
          }
          var _valid0 = _errs21 === errors;
          valid4 = valid4 || _valid0;
          if (!valid4) {
            const err2 = { instancePath: instancePath + "/dependencies/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/dependencies/additionalProperties/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
            if (vErrors === null) {
              vErrors = [err2];
            } else {
              vErrors.push(err2);
            }
            errors++;
          } else {
            errors = _errs19;
            if (vErrors !== null) {
              if (_errs19) {
                vErrors.length = _errs19;
              } else {
                vErrors = null;
              }
            }
          }
        }
      } else {
        const err3 = { instancePath: instancePath + "/dependencies", schemaPath: "#/properties/dependencies/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.$recursiveAnchor !== void 0) {
      if (!validate152(data.$recursiveAnchor, { instancePath: instancePath + "/$recursiveAnchor", parentData: data, parentDataProperty: "$recursiveAnchor", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate152.errors : vErrors.concat(validate152.errors);
        errors = vErrors.length;
      }
    }
    if (data.$recursiveRef !== void 0) {
      if (!validate154(data.$recursiveRef, { instancePath: instancePath + "/$recursiveRef", parentData: data, parentDataProperty: "$recursiveRef", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate154.errors : vErrors.concat(validate154.errors);
        errors = vErrors.length;
      }
    }
  }
  validate142.errors = vErrors;
  return errors === 0;
}
validate142.evaluated = { "props": { "definitions": true, "dependencies": true, "$recursiveAnchor": true, "$recursiveRef": true, "contentEncoding": true, "contentMediaType": true, "contentSchema": true, "format": true, "title": true, "description": true, "default": true, "deprecated": true, "readOnly": true, "writeOnly": true, "examples": true, "type": true, "const": true, "enum": true, "multipleOf": true, "maximum": true, "exclusiveMaximum": true, "minimum": true, "exclusiveMinimum": true, "maxLength": true, "minLength": true, "pattern": true, "maxItems": true, "minItems": true, "uniqueItems": true, "maxContains": true, "minContains": true, "maxProperties": true, "minProperties": true, "required": true, "dependentRequired": true, "unevaluatedItems": true, "unevaluatedProperties": true, "prefixItems": true, "items": true, "contains": true, "additionalProperties": true, "properties": true, "patternProperties": true, "dependentSchemas": true, "propertyNames": true, "if": true, "then": true, "else": true, "allOf": true, "anyOf": true, "oneOf": true, "not": true, "$id": true, "$schema": true, "$ref": true, "$anchor": true, "$dynamicRef": true, "$dynamicAnchor": true, "$vocabulary": true, "$comment": true, "$defs": true }, "dynamicProps": false, "dynamicItems": false };
var schema50 = { "allOf": [{ "$ref": "#/$defs/step-object-base" }, { "type": "object", "properties": { "operationId": { "type": "string" }, "channelPath": { "type": "string" }, "correlationId": { "type": ["string", "number", "boolean", "object", "array"] }, "action": { "enum": ["send", "receive"] }, "parameters": { "$ref": "#/$defs/operation-step-parameters" } }, "required": ["action"] }, { "if": { "required": ["correlationId"] }, "then": { "properties": { "action": { "const": "receive" } }, "required": ["action"] } }, { "oneOf": [{ "required": ["operationId"] }, { "required": ["channelPath"] }] }]};
var pattern16 = new RegExp("(?:^(?!\\$).+$)|(?:^\\$workflows\\.[^.]+\\.steps\\.[^.]+$)|(?:^\\$sourceDescriptions\\.[^.]+\\.[^.]+\\.steps\\.[^.]+$)", "u");
var schema54 = { "else": { "enum": ["jsonpointer", "jsonpath", "xpath"] } };
var schema55 = { "properties": { "type": { "enum": ["jsonpath", "xpath", "jsonpointer"] }}, "allOf": [{ "if": { "required": ["type"], "properties": { "type": { "const": "jsonpath" } } }, "then": { "properties": { "version": { "enum": ["rfc9535", "draft-goessner-dispatch-jsonpath-00"] } } } }, { "if": { "required": ["type"], "properties": { "type": { "const": "xpath" } } }, "then": { "properties": { "version": { "enum": ["xpath-10", "xpath-20", "xpath-30", "xpath-31"] } } } }, { "if": { "properties": { "type": { "const": "jsonpointer" } } }, "then": { "properties": { "version": { "const": "rfc6901" } } } }]};
function validate166(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate166.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  const _errs2 = errors;
  let valid1 = true;
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0 && ("type")) {
      const err0 = {};
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    } else {
      if (data.type !== void 0) {
        if ("jsonpath" !== data.type) {
          const err1 = {};
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
      }
    }
  }
  var _valid0 = _errs3 === errors;
  errors = _errs2;
  if (vErrors !== null) {
    if (_errs2) {
      vErrors.length = _errs2;
    } else {
      vErrors = null;
    }
  }
  if (_valid0) {
    const _errs5 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.version !== void 0) {
        let data1 = data.version;
        if (!(data1 === "rfc9535" || data1 === "draft-goessner-dispatch-jsonpath-00")) {
          const err2 = { instancePath: instancePath + "/version", schemaPath: "#/allOf/0/then/properties/version/enum", keyword: "enum", params: { allowedValues: schema55.allOf[0].then.properties.version.enum }, message: "must be equal to one of the allowed values" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
      }
    }
    var _valid0 = _errs5 === errors;
    valid1 = _valid0;
    if (valid1) {
      var props1 = {};
      props1.version = true;
      props1.type = true;
    }
  }
  if (!valid1) {
    const err3 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err3];
    } else {
      vErrors.push(err3);
    }
    errors++;
  }
  if (props0 !== true && props1 !== void 0) {
    if (props1 === true) {
      props0 = true;
    } else {
      props0 = props0 || {};
      Object.assign(props0, props1);
    }
  }
  const _errs8 = errors;
  let valid4 = true;
  const _errs9 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0 && ("type")) {
      const err4 = {};
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    } else {
      if (data.type !== void 0) {
        if ("xpath" !== data.type) {
          const err5 = {};
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
      }
    }
  }
  var _valid1 = _errs9 === errors;
  errors = _errs8;
  if (vErrors !== null) {
    if (_errs8) {
      vErrors.length = _errs8;
    } else {
      vErrors = null;
    }
  }
  if (_valid1) {
    const _errs11 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.version !== void 0) {
        let data3 = data.version;
        if (!(data3 === "xpath-10" || data3 === "xpath-20" || data3 === "xpath-30" || data3 === "xpath-31")) {
          const err6 = { instancePath: instancePath + "/version", schemaPath: "#/allOf/1/then/properties/version/enum", keyword: "enum", params: { allowedValues: schema55.allOf[1].then.properties.version.enum }, message: "must be equal to one of the allowed values" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      }
    }
    var _valid1 = _errs11 === errors;
    valid4 = _valid1;
    if (valid4) {
      var props2 = {};
      props2.version = true;
      props2.type = true;
    }
  }
  if (!valid4) {
    const err7 = { instancePath, schemaPath: "#/allOf/1/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  if (props0 !== true && props2 !== void 0) {
    if (props2 === true) {
      props0 = true;
    } else {
      props0 = props0 || {};
      Object.assign(props0, props2);
    }
  }
  const _errs14 = errors;
  let valid7 = true;
  const _errs15 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type !== void 0) {
      if ("jsonpointer" !== data.type) {
        const err8 = {};
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
  }
  var _valid2 = _errs15 === errors;
  errors = _errs14;
  if (vErrors !== null) {
    if (_errs14) {
      vErrors.length = _errs14;
    } else {
      vErrors = null;
    }
  }
  if (_valid2) {
    const _errs17 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.version !== void 0) {
        if ("rfc6901" !== data.version) {
          const err9 = { instancePath: instancePath + "/version", schemaPath: "#/allOf/2/then/properties/version/const", keyword: "const", params: { allowedValue: "rfc6901" }, message: "must be equal to constant" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
      }
    }
    var _valid2 = _errs17 === errors;
    valid7 = _valid2;
    if (valid7) {
      var props3 = {};
      props3.version = true;
      props3.type = true;
    }
  }
  if (!valid7) {
    const err10 = { instancePath, schemaPath: "#/allOf/2/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err10];
    } else {
      vErrors.push(err10);
    }
    errors++;
  }
  if (props0 !== true && props3 !== void 0) {
    if (props3 === true) {
      props0 = true;
    } else {
      props0 = props0 || {};
      Object.assign(props0, props3);
    }
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err11 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err11];
      } else {
        vErrors.push(err11);
      }
      errors++;
    }
    if (data.version === void 0) {
      const err12 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "version" }, message: "must have required property 'version'" };
      if (vErrors === null) {
        vErrors = [err12];
      } else {
        vErrors.push(err12);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.type = true;
      props0.version = true;
    }
    if (data.type !== void 0) {
      let data6 = data.type;
      if (!(data6 === "jsonpath" || data6 === "xpath" || data6 === "jsonpointer")) {
        const err13 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/enum", keyword: "enum", params: { allowedValues: schema55.properties.type.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.version !== void 0) {
      if (typeof data.version !== "string") {
        const err14 = { instancePath: instancePath + "/version", schemaPath: "#/properties/version/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
  } else {
    const err15 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err15];
    } else {
      vErrors.push(err15);
    }
    errors++;
  }
  validate166.errors = vErrors;
  evaluated0.props = props0;
  return errors === 0;
}
validate166.evaluated = { "dynamicProps": true, "dynamicItems": false };
function validate165(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate165.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  const _errs0 = errors;
  let valid0 = true;
  const _errs1 = errors;
  if (!(data && typeof data == "object" && !Array.isArray(data))) {
    const err0 = {};
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  var _valid0 = _errs1 === errors;
  errors = _errs0;
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0;
    } else {
      vErrors = null;
    }
  }
  let ifClause0;
  if (_valid0) {
    const _errs3 = errors;
    if (!validate166(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
      vErrors = vErrors === null ? validate166.errors : vErrors.concat(validate166.errors);
      errors = vErrors.length;
    } else {
      var props0 = validate166.evaluated.props;
    }
    var _valid0 = _errs3 === errors;
    valid0 = _valid0;
    ifClause0 = "then";
  } else {
    const _errs4 = errors;
    if (typeof data !== "string") {
      const err1 = { instancePath, schemaPath: "#/else/type", keyword: "type", params: { type: "string" }, message: "must be string" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (!(data === "jsonpointer" || data === "jsonpath" || data === "xpath")) {
      const err2 = { instancePath, schemaPath: "#/else/enum", keyword: "enum", params: { allowedValues: schema54.else.enum }, message: "must be equal to one of the allowed values" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    var _valid0 = _errs4 === errors;
    valid0 = _valid0;
    ifClause0 = "else";
  }
  if (!valid0) {
    const err3 = { instancePath, schemaPath: "#/if", keyword: "if", params: { failingKeyword: ifClause0 }, message: 'must match "' + ifClause0 + '" schema' };
    if (vErrors === null) {
      vErrors = [err3];
    } else {
      vErrors.push(err3);
    }
    errors++;
  }
  validate165.errors = vErrors;
  evaluated0.props = props0;
  return errors === 0;
}
validate165.evaluated = { "dynamicProps": true, "dynamicItems": false };
function validate170(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate170.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.context === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "context" }, message: "must have required property 'context'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.selector === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "selector" }, message: "must have required property 'selector'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.type === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.context = true;
      props0.selector = true;
      props0.type = true;
    }
    if (data.context !== void 0) {
      if (typeof data.context !== "string") {
        const err3 = { instancePath: instancePath + "/context", schemaPath: "#/properties/context/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.selector !== void 0) {
      if (typeof data.selector !== "string") {
        const err4 = { instancePath: instancePath + "/selector", schemaPath: "#/properties/selector/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      if (!validate165(data.type, { instancePath: instancePath + "/type", parentData: data, parentDataProperty: "type", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate165.errors : vErrors.concat(validate165.errors);
        errors = vErrors.length;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err5 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
      }
    }
  } else {
    const err6 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err6];
    } else {
      vErrors.push(err6);
    }
    errors++;
  }
  validate170.errors = vErrors;
  return errors === 0;
}
validate170.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate163(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate163.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.target === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "target" }, message: "must have required property 'target'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.value === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "value" }, message: "must have required property 'value'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.target = true;
      props0.targetSelectorType = true;
      props0.value = true;
    }
    if (data.target !== void 0) {
      if (typeof data.target !== "string") {
        const err2 = { instancePath: instancePath + "/target", schemaPath: "#/properties/target/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.targetSelectorType !== void 0) {
      if (!validate165(data.targetSelectorType, { instancePath: instancePath + "/targetSelectorType", parentData: data, parentDataProperty: "targetSelectorType", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate165.errors : vErrors.concat(validate165.errors);
        errors = vErrors.length;
      }
    }
    if (data.value !== void 0) {
      let data2 = data.value;
      const _errs5 = errors;
      let valid1 = true;
      const _errs6 = errors;
      if (!(data2 && typeof data2 == "object" && !Array.isArray(data2))) {
        const err3 = {};
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
      var _valid0 = _errs6 === errors;
      errors = _errs5;
      if (vErrors !== null) {
        if (_errs5) {
          vErrors.length = _errs5;
        } else {
          vErrors = null;
        }
      }
      if (_valid0) {
        const _errs8 = errors;
        if (!validate170(data2, { instancePath: instancePath + "/value", parentData: data, parentDataProperty: "value", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate170.errors : vErrors.concat(validate170.errors);
          errors = vErrors.length;
        }
        var _valid0 = _errs8 === errors;
        valid1 = _valid0;
      }
      if (!valid1) {
        const err4 = { instancePath: instancePath + "/value", schemaPath: "#/properties/value/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err5 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
      }
    }
  } else {
    const err6 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err6];
    } else {
      vErrors.push(err6);
    }
    errors++;
  }
  validate163.errors = vErrors;
  return errors === 0;
}
validate163.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate161(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate161.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (props0 !== true) {
      props0 = props0 || {};
      props0.contentType = true;
      props0.payload = true;
      props0.replacements = true;
    }
    if (data.contentType !== void 0) {
      if (typeof data.contentType !== "string") {
        const err0 = { instancePath: instancePath + "/contentType", schemaPath: "#/properties/contentType/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
    if (data.replacements !== void 0) {
      let data1 = data.replacements;
      if (Array.isArray(data1)) {
        const len0 = data1.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate163(data1[i0], { instancePath: instancePath + "/replacements/" + i0, parentData: data1, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate163.errors : vErrors.concat(validate163.errors);
            errors = vErrors.length;
          }
        }
        let i1 = data1.length;
        let j0;
        if (i1 > 1) {
          outer0: for (; i1--; ) {
            for (j0 = i1; j0--; ) {
              if (func0(data1[i1], data1[j0])) {
                const err1 = { instancePath: instancePath + "/replacements", schemaPath: "#/properties/replacements/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err1];
                } else {
                  vErrors.push(err1);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err2 = { instancePath: instancePath + "/replacements", schemaPath: "#/properties/replacements/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err3 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
      }
    }
  } else {
    const err4 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err4];
    } else {
      vErrors.push(err4);
    }
    errors++;
  }
  validate161.errors = vErrors;
  return errors === 0;
}
validate161.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema57 = { "properties": { "type": { "else": { "enum": ["simple", "regex", "jsonpath", "xpath"]} } }};
function validate176(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate176.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.condition === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "condition" }, message: "must have required property 'condition'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.context = true;
      props0.condition = true;
      props0.type = true;
    }
    if (data.context !== void 0) {
      if (typeof data.context !== "string") {
        const err1 = { instancePath: instancePath + "/context", schemaPath: "#/properties/context/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.condition !== void 0) {
      if (typeof data.condition !== "string") {
        const err2 = { instancePath: instancePath + "/condition", schemaPath: "#/properties/condition/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data2 = data.type;
      const _errs6 = errors;
      let valid1 = true;
      const _errs7 = errors;
      if (!(data2 && typeof data2 == "object" && !Array.isArray(data2))) {
        const err3 = {};
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
      var _valid0 = _errs7 === errors;
      errors = _errs6;
      if (vErrors !== null) {
        if (_errs6) {
          vErrors.length = _errs6;
        } else {
          vErrors = null;
        }
      }
      let ifClause0;
      if (_valid0) {
        const _errs9 = errors;
        if (!validate166(data2, { instancePath: instancePath + "/type", parentData: data, parentDataProperty: "type", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate166.errors : vErrors.concat(validate166.errors);
          errors = vErrors.length;
        }
        var _valid0 = _errs9 === errors;
        valid1 = _valid0;
        ifClause0 = "then";
      } else {
        const _errs10 = errors;
        if (typeof data2 !== "string") {
          const err4 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/else/type", keyword: "type", params: { type: "string" }, message: "must be string" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        if (!(data2 === "simple" || data2 === "regex" || data2 === "jsonpath" || data2 === "xpath")) {
          const err5 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/else/enum", keyword: "enum", params: { allowedValues: schema57.properties.type.else.enum }, message: "must be equal to one of the allowed values" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        var _valid0 = _errs10 === errors;
        valid1 = _valid0;
        ifClause0 = "else";
      }
      if (!valid1) {
        const err6 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/if", keyword: "if", params: { failingKeyword: ifClause0 }, message: 'must match "' + ifClause0 + '" schema' };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      if (data.context === void 0) {
        const err7 = { instancePath, schemaPath: "#/dependentRequired", keyword: "dependentRequired", params: {
          property: "type",
          missingProperty: "context",
          depsCount: 1,
          deps: "context"
        }, message: "must have property context when property type is present" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err8 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
      }
    }
  } else {
    const err9 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err9];
    } else {
      vErrors.push(err9);
    }
    errors++;
  }
  validate176.errors = vErrors;
  return errors === 0;
}
validate176.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema58 = { "properties": { "value": { "type": ["string", "boolean", "object", "array", "number", "null"] } }};
function validate180(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate180.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.reference === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "reference" }, message: "must have required property 'reference'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.reference !== void 0) {
      if (typeof data.reference !== "string") {
        const err1 = { instancePath: instancePath + "/reference", schemaPath: "#/properties/reference/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.value !== void 0) {
      let data1 = data.value;
      if (typeof data1 != "object" && typeof data1 !== "string" && typeof data1 !== "boolean" && !(typeof data1 == "number")) {
        const err2 = { instancePath: instancePath + "/value", schemaPath: "#/properties/value/type", keyword: "type", params: { type: schema58.properties.value.type }, message: "must be string,boolean,object,array,number,null" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    for (const key0 in data) {
      if (key0 !== "reference" && key0 !== "value") {
        const err3 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
  } else {
    const err4 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err4];
    } else {
      vErrors.push(err4);
    }
    errors++;
  }
  validate180.errors = vErrors;
  return errors === 0;
}
validate180.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema59 = { "properties": { "type": { "enum": ["end", "goto"] }}};
function validate184(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate184.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (typeof data !== "string") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate184.errors = vErrors;
  return errors === 0;
}
validate184.evaluated = { "dynamicProps": false, "dynamicItems": false };
function validate186(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate186.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (typeof data !== "string") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate186.errors = vErrors;
  return errors === 0;
}
validate186.evaluated = { "dynamicProps": false, "dynamicItems": false };
function validate182(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate182.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  const _errs2 = errors;
  let valid1 = true;
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type !== void 0) {
      if ("goto" !== data.type) {
        const err0 = {};
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
  }
  var _valid0 = _errs3 === errors;
  errors = _errs2;
  if (vErrors !== null) {
    if (_errs2) {
      vErrors.length = _errs2;
    } else {
      vErrors = null;
    }
  }
  if (_valid0) {
    const _errs5 = errors;
    const _errs6 = errors;
    let valid3 = false;
    let passing0 = null;
    const _errs7 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.workflowId === void 0) {
        const err1 = { instancePath, schemaPath: "#/allOf/0/then/oneOf/0/required", keyword: "required", params: { missingProperty: "workflowId" }, message: "must have required property 'workflowId'" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    var _valid1 = _errs7 === errors;
    if (_valid1) {
      valid3 = true;
      passing0 = 0;
    }
    const _errs8 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.stepId === void 0) {
        const err2 = { instancePath, schemaPath: "#/allOf/0/then/oneOf/1/required", keyword: "required", params: { missingProperty: "stepId" }, message: "must have required property 'stepId'" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    var _valid1 = _errs8 === errors;
    if (_valid1 && valid3) {
      valid3 = false;
      passing0 = [passing0, 1];
    } else {
      if (_valid1) {
        valid3 = true;
        passing0 = 1;
      }
    }
    if (!valid3) {
      const err3 = { instancePath, schemaPath: "#/allOf/0/then/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    } else {
      errors = _errs6;
      if (vErrors !== null) {
        if (_errs6) {
          vErrors.length = _errs6;
        } else {
          vErrors = null;
        }
      }
    }
    var _valid0 = _errs5 === errors;
    valid1 = _valid0;
  }
  if (!valid1) {
    const err4 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err4];
    } else {
      vErrors.push(err4);
    }
    errors++;
  }
  if (props0 !== true) {
    props0 = props0 || {};
    props0.type = true;
  }
  const _errs10 = errors;
  let valid4 = true;
  const _errs11 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.parameters === void 0 && ("parameters")) {
      const err5 = {};
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
  }
  var _valid2 = _errs11 === errors;
  errors = _errs10;
  if (vErrors !== null) {
    if (_errs10) {
      vErrors.length = _errs10;
    } else {
      vErrors = null;
    }
  }
  if (_valid2) {
    const _errs12 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.workflowId === void 0) {
        const err6 = { instancePath, schemaPath: "#/allOf/1/then/required", keyword: "required", params: { missingProperty: "workflowId" }, message: "must have required property 'workflowId'" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    var _valid2 = _errs12 === errors;
    valid4 = _valid2;
  }
  if (!valid4) {
    const err7 = { instancePath, schemaPath: "#/allOf/1/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.name === void 0) {
      const err8 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err8];
      } else {
        vErrors.push(err8);
      }
      errors++;
    }
    if (data.type === void 0) {
      const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err9];
      } else {
        vErrors.push(err9);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.name = true;
      props0.type = true;
      props0.workflowId = true;
      props0.stepId = true;
      props0.parameters = true;
      props0.criteria = true;
    }
    if (data.name !== void 0) {
      if (typeof data.name !== "string") {
        const err10 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data2 = data.type;
      if (!(data2 === "end" || data2 === "goto")) {
        const err11 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/enum", keyword: "enum", params: { allowedValues: schema59.properties.type.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.workflowId !== void 0) {
      if (!validate184(data.workflowId, { instancePath: instancePath + "/workflowId", parentData: data, parentDataProperty: "workflowId", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate184.errors : vErrors.concat(validate184.errors);
        errors = vErrors.length;
      }
    }
    if (data.stepId !== void 0) {
      if (!validate186(data.stepId, { instancePath: instancePath + "/stepId", parentData: data, parentDataProperty: "stepId", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate186.errors : vErrors.concat(validate186.errors);
        errors = vErrors.length;
      }
    }
    if (data.parameters !== void 0) {
      let data5 = data.parameters;
      if (Array.isArray(data5)) {
        let i0 = data5.length;
        let j0;
        if (i0 > 1) {
          outer0: for (; i0--; ) {
            for (j0 = i0; j0--; ) {
              if (func0(data5[i0], data5[j0])) {
                const err12 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/uniqueItems", keyword: "uniqueItems", params: { i: i0, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i0 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err12];
                } else {
                  vErrors.push(err12);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err13 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.criteria !== void 0) {
      let data6 = data.criteria;
      if (Array.isArray(data6)) {
        if (data6.length < 1) {
          const err14 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err14];
          } else {
            vErrors.push(err14);
          }
          errors++;
        }
        const len0 = data6.length;
        for (let i1 = 0; i1 < len0; i1++) {
          if (!validate176(data6[i1], { instancePath: instancePath + "/criteria/" + i1, parentData: data6, parentDataProperty: i1, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate176.errors : vErrors.concat(validate176.errors);
            errors = vErrors.length;
          }
        }
        let i2 = data6.length;
        let j1;
        if (i2 > 1) {
          outer1: for (; i2--; ) {
            for (j1 = i2; j1--; ) {
              if (func0(data6[i2], data6[j1])) {
                const err15 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/uniqueItems", keyword: "uniqueItems", params: { i: i2, j: j1 }, message: "must NOT have duplicate items (items ## " + j1 + " and " + i2 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err15];
                } else {
                  vErrors.push(err15);
                }
                errors++;
                break outer1;
              }
            }
          }
        }
      } else {
        const err16 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err17 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err17];
          } else {
            vErrors.push(err17);
          }
          errors++;
        }
      }
    }
  } else {
    const err18 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err18];
    } else {
      vErrors.push(err18);
    }
    errors++;
  }
  validate182.errors = vErrors;
  return errors === 0;
}
validate182.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema62 = { "properties": { "type": { "enum": ["end", "goto", "retry"] }}};
function validate191(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate191.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  const _errs2 = errors;
  let valid1 = true;
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type !== void 0) {
      if (!(data.type === "goto")) {
        const err0 = {};
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
  }
  var _valid0 = _errs3 === errors;
  errors = _errs2;
  if (vErrors !== null) {
    if (_errs2) {
      vErrors.length = _errs2;
    } else {
      vErrors = null;
    }
  }
  if (_valid0) {
    const _errs5 = errors;
    const _errs6 = errors;
    let valid3 = false;
    let passing0 = null;
    const _errs7 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.workflowId === void 0) {
        const err1 = { instancePath, schemaPath: "#/allOf/0/then/oneOf/0/required", keyword: "required", params: { missingProperty: "workflowId" }, message: "must have required property 'workflowId'" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    var _valid1 = _errs7 === errors;
    if (_valid1) {
      valid3 = true;
      passing0 = 0;
    }
    const _errs8 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.stepId === void 0) {
        const err2 = { instancePath, schemaPath: "#/allOf/0/then/oneOf/1/required", keyword: "required", params: { missingProperty: "stepId" }, message: "must have required property 'stepId'" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    var _valid1 = _errs8 === errors;
    if (_valid1 && valid3) {
      valid3 = false;
      passing0 = [passing0, 1];
    } else {
      if (_valid1) {
        valid3 = true;
        passing0 = 1;
      }
    }
    if (!valid3) {
      const err3 = { instancePath, schemaPath: "#/allOf/0/then/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    } else {
      errors = _errs6;
      if (vErrors !== null) {
        if (_errs6) {
          vErrors.length = _errs6;
        } else {
          vErrors = null;
        }
      }
    }
    var _valid0 = _errs5 === errors;
    valid1 = _valid0;
  }
  if (!valid1) {
    const err4 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err4];
    } else {
      vErrors.push(err4);
    }
    errors++;
  }
  if (props0 !== true) {
    props0 = props0 || {};
    props0.type = true;
  }
  const _errs10 = errors;
  let valid4 = true;
  const _errs11 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.parameters === void 0 && ("parameters")) {
      const err5 = {};
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
  }
  var _valid2 = _errs11 === errors;
  errors = _errs10;
  if (vErrors !== null) {
    if (_errs10) {
      vErrors.length = _errs10;
    } else {
      vErrors = null;
    }
  }
  if (_valid2) {
    const _errs12 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.workflowId === void 0) {
        const err6 = { instancePath, schemaPath: "#/allOf/1/then/required", keyword: "required", params: { missingProperty: "workflowId" }, message: "must have required property 'workflowId'" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    var _valid2 = _errs12 === errors;
    valid4 = _valid2;
  }
  if (!valid4) {
    const err7 = { instancePath, schemaPath: "#/allOf/1/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.name === void 0) {
      const err8 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err8];
      } else {
        vErrors.push(err8);
      }
      errors++;
    }
    if (data.type === void 0) {
      const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err9];
      } else {
        vErrors.push(err9);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.name = true;
      props0.type = true;
      props0.workflowId = true;
      props0.stepId = true;
      props0.parameters = true;
      props0.retryAfter = true;
      props0.retryLimit = true;
      props0.criteria = true;
    }
    if (data.name !== void 0) {
      if (typeof data.name !== "string") {
        const err10 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data2 = data.type;
      if (!(data2 === "end" || data2 === "goto" || data2 === "retry")) {
        const err11 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/enum", keyword: "enum", params: { allowedValues: schema62.properties.type.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.workflowId !== void 0) {
      if (!validate184(data.workflowId, { instancePath: instancePath + "/workflowId", parentData: data, parentDataProperty: "workflowId", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate184.errors : vErrors.concat(validate184.errors);
        errors = vErrors.length;
      }
    }
    if (data.stepId !== void 0) {
      if (!validate186(data.stepId, { instancePath: instancePath + "/stepId", parentData: data, parentDataProperty: "stepId", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate186.errors : vErrors.concat(validate186.errors);
        errors = vErrors.length;
      }
    }
    if (data.parameters !== void 0) {
      let data5 = data.parameters;
      if (Array.isArray(data5)) {
        let i0 = data5.length;
        let j0;
        if (i0 > 1) {
          outer0: for (; i0--; ) {
            for (j0 = i0; j0--; ) {
              if (func0(data5[i0], data5[j0])) {
                const err12 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/uniqueItems", keyword: "uniqueItems", params: { i: i0, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i0 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err12];
                } else {
                  vErrors.push(err12);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err13 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.retryAfter !== void 0) {
      let data6 = data.retryAfter;
      if (typeof data6 == "number") {
        if (data6 < 0 || isNaN(data6)) {
          const err14 = { instancePath: instancePath + "/retryAfter", schemaPath: "#/properties/retryAfter/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
          if (vErrors === null) {
            vErrors = [err14];
          } else {
            vErrors.push(err14);
          }
          errors++;
        }
      } else {
        const err15 = { instancePath: instancePath + "/retryAfter", schemaPath: "#/properties/retryAfter/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.retryLimit !== void 0) {
      let data7 = data.retryLimit;
      if (!(typeof data7 == "number" && (!(data7 % 1) && !isNaN(data7)))) {
        const err16 = { instancePath: instancePath + "/retryLimit", schemaPath: "#/properties/retryLimit/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
      if (typeof data7 == "number") {
        if (data7 < 0 || isNaN(data7)) {
          const err17 = { instancePath: instancePath + "/retryLimit", schemaPath: "#/properties/retryLimit/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
          if (vErrors === null) {
            vErrors = [err17];
          } else {
            vErrors.push(err17);
          }
          errors++;
        }
      }
    }
    if (data.criteria !== void 0) {
      let data8 = data.criteria;
      if (Array.isArray(data8)) {
        const len0 = data8.length;
        for (let i1 = 0; i1 < len0; i1++) {
          if (!validate176(data8[i1], { instancePath: instancePath + "/criteria/" + i1, parentData: data8, parentDataProperty: i1, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate176.errors : vErrors.concat(validate176.errors);
            errors = vErrors.length;
          }
        }
        let i2 = data8.length;
        let j1;
        if (i2 > 1) {
          outer1: for (; i2--; ) {
            for (j1 = i2; j1--; ) {
              if (func0(data8[i2], data8[j1])) {
                const err18 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/uniqueItems", keyword: "uniqueItems", params: { i: i2, j: j1 }, message: "must NOT have duplicate items (items ## " + j1 + " and " + i2 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
                break outer1;
              }
            }
          }
        }
      } else {
        const err19 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err20 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err20];
          } else {
            vErrors.push(err20);
          }
          errors++;
        }
      }
    }
  } else {
    const err21 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err21];
    } else {
      vErrors.push(err21);
    }
    errors++;
  }
  validate191.errors = vErrors;
  return errors === 0;
}
validate191.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate160(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate160.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.stepId === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "stepId" }, message: "must have required property 'stepId'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.stepId !== void 0) {
      if (typeof data.stepId !== "string") {
        const err1 = { instancePath: instancePath + "/stepId", schemaPath: "#/properties/stepId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err2 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.timeout !== void 0) {
      let data2 = data.timeout;
      if (!(typeof data2 == "number" && (!(data2 % 1) && !isNaN(data2)))) {
        const err3 = { instancePath: instancePath + "/timeout", schemaPath: "#/properties/timeout/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.dependsOn !== void 0) {
      let data3 = data.dependsOn;
      if (Array.isArray(data3)) {
        if (data3.length < 1) {
          const err4 = { instancePath: instancePath + "/dependsOn", schemaPath: "#/properties/dependsOn/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        const len0 = data3.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data4 = data3[i0];
          if (typeof data4 === "string") {
            if (!pattern16.test(data4)) {
              const err5 = { instancePath: instancePath + "/dependsOn/" + i0, schemaPath: "#/properties/dependsOn/items/pattern", keyword: "pattern", params: { pattern: "(?:^(?!\\$).+$)|(?:^\\$workflows\\.[^.]+\\.steps\\.[^.]+$)|(?:^\\$sourceDescriptions\\.[^.]+\\.[^.]+\\.steps\\.[^.]+$)" }, message: 'must match pattern "(?:^(?!\\$).+$)|(?:^\\$workflows\\.[^.]+\\.steps\\.[^.]+$)|(?:^\\$sourceDescriptions\\.[^.]+\\.[^.]+\\.steps\\.[^.]+$)"' };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
          } else {
            const err6 = { instancePath: instancePath + "/dependsOn/" + i0, schemaPath: "#/properties/dependsOn/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        let i1 = data3.length;
        let j0;
        if (i1 > 1) {
          const indices0 = {};
          for (; i1--; ) {
            let item0 = data3[i1];
            if (typeof item0 !== "string") {
              continue;
            }
            if (typeof indices0[item0] == "number") {
              j0 = indices0[item0];
              const err7 = { instancePath: instancePath + "/dependsOn", schemaPath: "#/properties/dependsOn/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
              if (vErrors === null) {
                vErrors = [err7];
              } else {
                vErrors.push(err7);
              }
              errors++;
              break;
            }
            indices0[item0] = i1;
          }
        }
      } else {
        const err8 = { instancePath: instancePath + "/dependsOn", schemaPath: "#/properties/dependsOn/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.parameters !== void 0) {
      let data5 = data.parameters;
      if (Array.isArray(data5)) {
        let i2 = data5.length;
        let j1;
        if (i2 > 1) {
          outer0: for (; i2--; ) {
            for (j1 = i2; j1--; ) {
              if (func0(data5[i2], data5[j1])) {
                const err9 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/uniqueItems", keyword: "uniqueItems", params: { i: i2, j: j1 }, message: "must NOT have duplicate items (items ## " + j1 + " and " + i2 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err9];
                } else {
                  vErrors.push(err9);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err10 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.requestBody !== void 0) {
      if (!validate161(data.requestBody, { instancePath: instancePath + "/requestBody", parentData: data, parentDataProperty: "requestBody", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate161.errors : vErrors.concat(validate161.errors);
        errors = vErrors.length;
      }
    }
    if (data.successCriteria !== void 0) {
      let data7 = data.successCriteria;
      if (Array.isArray(data7)) {
        if (data7.length < 1) {
          const err11 = { instancePath: instancePath + "/successCriteria", schemaPath: "#/properties/successCriteria/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        const len1 = data7.length;
        for (let i3 = 0; i3 < len1; i3++) {
          if (!validate176(data7[i3], { instancePath: instancePath + "/successCriteria/" + i3, parentData: data7, parentDataProperty: i3, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate176.errors : vErrors.concat(validate176.errors);
            errors = vErrors.length;
          }
        }
        let i4 = data7.length;
        let j2;
        if (i4 > 1) {
          outer1: for (; i4--; ) {
            for (j2 = i4; j2--; ) {
              if (func0(data7[i4], data7[j2])) {
                const err12 = { instancePath: instancePath + "/successCriteria", schemaPath: "#/properties/successCriteria/uniqueItems", keyword: "uniqueItems", params: { i: i4, j: j2 }, message: "must NOT have duplicate items (items ## " + j2 + " and " + i4 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err12];
                } else {
                  vErrors.push(err12);
                }
                errors++;
                break outer1;
              }
            }
          }
        }
      } else {
        const err13 = { instancePath: instancePath + "/successCriteria", schemaPath: "#/properties/successCriteria/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.onSuccess !== void 0) {
      let data9 = data.onSuccess;
      if (Array.isArray(data9)) {
        const len2 = data9.length;
        for (let i5 = 0; i5 < len2; i5++) {
          let data10 = data9[i5];
          const _errs20 = errors;
          let valid10 = true;
          const _errs21 = errors;
          if (data10 && typeof data10 == "object" && !Array.isArray(data10)) {
            if (data10.reference === void 0 && ("reference")) {
              const err14 = {};
              if (vErrors === null) {
                vErrors = [err14];
              } else {
                vErrors.push(err14);
              }
              errors++;
            }
          }
          var _valid0 = _errs21 === errors;
          errors = _errs20;
          if (vErrors !== null) {
            if (_errs20) {
              vErrors.length = _errs20;
            } else {
              vErrors = null;
            }
          }
          let ifClause0;
          if (_valid0) {
            const _errs22 = errors;
            if (!validate180(data10, { instancePath: instancePath + "/onSuccess/" + i5, parentData: data9, parentDataProperty: i5, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate180.errors : vErrors.concat(validate180.errors);
              errors = vErrors.length;
            }
            var _valid0 = _errs22 === errors;
            valid10 = _valid0;
            ifClause0 = "then";
          } else {
            const _errs23 = errors;
            if (!validate182(data10, { instancePath: instancePath + "/onSuccess/" + i5, parentData: data9, parentDataProperty: i5, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate182.errors : vErrors.concat(validate182.errors);
              errors = vErrors.length;
            }
            var _valid0 = _errs23 === errors;
            valid10 = _valid0;
            ifClause0 = "else";
          }
          if (!valid10) {
            const err15 = { instancePath: instancePath + "/onSuccess/" + i5, schemaPath: "#/properties/onSuccess/items/if", keyword: "if", params: { failingKeyword: ifClause0 }, message: 'must match "' + ifClause0 + '" schema' };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
        }
        let i6 = data9.length;
        let j3;
        if (i6 > 1) {
          outer2: for (; i6--; ) {
            for (j3 = i6; j3--; ) {
              if (func0(data9[i6], data9[j3])) {
                const err16 = { instancePath: instancePath + "/onSuccess", schemaPath: "#/properties/onSuccess/uniqueItems", keyword: "uniqueItems", params: { i: i6, j: j3 }, message: "must NOT have duplicate items (items ## " + j3 + " and " + i6 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err16];
                } else {
                  vErrors.push(err16);
                }
                errors++;
                break outer2;
              }
            }
          }
        }
      } else {
        const err17 = { instancePath: instancePath + "/onSuccess", schemaPath: "#/properties/onSuccess/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
    if (data.onFailure !== void 0) {
      let data11 = data.onFailure;
      if (Array.isArray(data11)) {
        const len3 = data11.length;
        for (let i7 = 0; i7 < len3; i7++) {
          let data12 = data11[i7];
          const _errs27 = errors;
          let valid14 = true;
          const _errs28 = errors;
          if (data12 && typeof data12 == "object" && !Array.isArray(data12)) {
            if (data12.reference === void 0 && ("reference")) {
              const err18 = {};
              if (vErrors === null) {
                vErrors = [err18];
              } else {
                vErrors.push(err18);
              }
              errors++;
            }
          }
          var _valid1 = _errs28 === errors;
          errors = _errs27;
          if (vErrors !== null) {
            if (_errs27) {
              vErrors.length = _errs27;
            } else {
              vErrors = null;
            }
          }
          let ifClause1;
          if (_valid1) {
            const _errs29 = errors;
            if (!validate180(data12, { instancePath: instancePath + "/onFailure/" + i7, parentData: data11, parentDataProperty: i7, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate180.errors : vErrors.concat(validate180.errors);
              errors = vErrors.length;
            }
            var _valid1 = _errs29 === errors;
            valid14 = _valid1;
            ifClause1 = "then";
          } else {
            const _errs30 = errors;
            if (!validate191(data12, { instancePath: instancePath + "/onFailure/" + i7, parentData: data11, parentDataProperty: i7, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate191.errors : vErrors.concat(validate191.errors);
              errors = vErrors.length;
            }
            var _valid1 = _errs30 === errors;
            valid14 = _valid1;
            ifClause1 = "else";
          }
          if (!valid14) {
            const err19 = { instancePath: instancePath + "/onFailure/" + i7, schemaPath: "#/properties/onFailure/items/if", keyword: "if", params: { failingKeyword: ifClause1 }, message: 'must match "' + ifClause1 + '" schema' };
            if (vErrors === null) {
              vErrors = [err19];
            } else {
              vErrors.push(err19);
            }
            errors++;
          }
        }
        let i8 = data11.length;
        let j4;
        if (i8 > 1) {
          outer3: for (; i8--; ) {
            for (j4 = i8; j4--; ) {
              if (func0(data11[i8], data11[j4])) {
                const err20 = { instancePath: instancePath + "/onFailure", schemaPath: "#/properties/onFailure/uniqueItems", keyword: "uniqueItems", params: { i: i8, j: j4 }, message: "must NOT have duplicate items (items ## " + j4 + " and " + i8 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
                break outer3;
              }
            }
          }
        }
      } else {
        const err21 = { instancePath: instancePath + "/onFailure", schemaPath: "#/properties/onFailure/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
    }
    if (data.outputs !== void 0) {
      let data13 = data.outputs;
      if (data13 && typeof data13 == "object" && !Array.isArray(data13)) {
        var props2 = {};
        for (const key0 in data13) {
          if (pattern7.test(key0)) {
            let data14 = data13[key0];
            const _errs34 = errors;
            let valid17 = true;
            const _errs35 = errors;
            if (!(data14 && typeof data14 == "object" && !Array.isArray(data14))) {
              const err22 = {};
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
            var _valid2 = _errs35 === errors;
            errors = _errs34;
            if (vErrors !== null) {
              if (_errs34) {
                vErrors.length = _errs34;
              } else {
                vErrors = null;
              }
            }
            let ifClause2;
            if (_valid2) {
              const _errs37 = errors;
              if (!validate170(data14, { instancePath: instancePath + "/outputs/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data13, parentDataProperty: key0, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate170.errors : vErrors.concat(validate170.errors);
                errors = vErrors.length;
              }
              var _valid2 = _errs37 === errors;
              valid17 = _valid2;
              ifClause2 = "then";
            } else {
              const _errs38 = errors;
              if (typeof data14 !== "string") {
                const err23 = { instancePath: instancePath + "/outputs/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/outputs/patternProperties/%5E%5Ba-zA-Z0-9%5C.%5C-_%5D%2B%24/else/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err23];
                } else {
                  vErrors.push(err23);
                }
                errors++;
              }
              var _valid2 = _errs38 === errors;
              valid17 = _valid2;
              ifClause2 = "else";
            }
            if (!valid17) {
              const err24 = { instancePath: instancePath + "/outputs/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/outputs/patternProperties/%5E%5Ba-zA-Z0-9%5C.%5C-_%5D%2B%24/if", keyword: "if", params: { failingKeyword: ifClause2 }, message: 'must match "' + ifClause2 + '" schema' };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            props2[key0] = true;
          }
        }
      } else {
        const err25 = { instancePath: instancePath + "/outputs", schemaPath: "#/properties/outputs/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
    }
  } else {
    const err26 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err26];
    } else {
      vErrors.push(err26);
    }
    errors++;
  }
  validate160.errors = vErrors;
  return errors === 0;
}
validate160.evaluated = { "props": { "stepId": true, "description": true, "timeout": true, "dependsOn": true, "parameters": true, "requestBody": true, "successCriteria": true, "onSuccess": true, "onFailure": true, "outputs": true }, "dynamicProps": false, "dynamicItems": false };
var schema64 = { "properties": { "in": { "enum": ["path", "query", "querystring", "header", "cookie", "channel"] }, "value": { "else": { "type": ["string", "boolean", "array", "number", "null"] } } }};
function validate201(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate201.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.name === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.value === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "value" }, message: "must have required property 'value'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.name = true;
      props0.in = true;
      props0.value = true;
    }
    if (data.name !== void 0) {
      if (typeof data.name !== "string") {
        const err2 = { instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.in !== void 0) {
      let data1 = data.in;
      if (!(data1 === "path" || data1 === "query" || data1 === "querystring" || data1 === "header" || data1 === "cookie" || data1 === "channel")) {
        const err3 = { instancePath: instancePath + "/in", schemaPath: "#/properties/in/enum", keyword: "enum", params: { allowedValues: schema64.properties.in.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.value !== void 0) {
      let data2 = data.value;
      const _errs5 = errors;
      let valid1 = true;
      const _errs6 = errors;
      if (!(data2 && typeof data2 == "object" && !Array.isArray(data2))) {
        const err4 = {};
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
      var _valid0 = _errs6 === errors;
      errors = _errs5;
      if (vErrors !== null) {
        if (_errs5) {
          vErrors.length = _errs5;
        } else {
          vErrors = null;
        }
      }
      let ifClause0;
      if (_valid0) {
        const _errs8 = errors;
        if (!validate170(data2, { instancePath: instancePath + "/value", parentData: data, parentDataProperty: "value", rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate170.errors : vErrors.concat(validate170.errors);
          errors = vErrors.length;
        }
        var _valid0 = _errs8 === errors;
        valid1 = _valid0;
        ifClause0 = "then";
      } else {
        const _errs9 = errors;
        if (typeof data2 !== "string" && typeof data2 !== "boolean" && !Array.isArray(data2) && !(typeof data2 == "number") && data2 !== null) {
          const err5 = { instancePath: instancePath + "/value", schemaPath: "#/properties/value/else/type", keyword: "type", params: { type: schema64.properties.value.else.type }, message: "must be string,boolean,array,number,null" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        var _valid0 = _errs9 === errors;
        valid1 = _valid0;
        ifClause0 = "else";
      }
      if (!valid1) {
        const err6 = { instancePath: instancePath + "/value", schemaPath: "#/properties/value/if", keyword: "if", params: { failingKeyword: ifClause0 }, message: 'must match "' + ifClause0 + '" schema' };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err7 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
      }
    }
  } else {
    const err8 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err8];
    } else {
      vErrors.push(err8);
    }
    errors++;
  }
  validate201.errors = vErrors;
  return errors === 0;
}
validate201.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate199(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate199.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (Array.isArray(data)) {
    const len0 = data.length;
    for (let i0 = 0; i0 < len0; i0++) {
      let data0 = data[i0];
      const _errs2 = errors;
      let valid2 = true;
      const _errs3 = errors;
      if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
        if (data0.reference === void 0 && ("reference")) {
          const err0 = {};
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
      }
      var _valid0 = _errs3 === errors;
      errors = _errs2;
      if (vErrors !== null) {
        if (_errs2) {
          vErrors.length = _errs2;
        } else {
          vErrors = null;
        }
      }
      let ifClause0;
      if (_valid0) {
        const _errs4 = errors;
        if (!validate180(data0, { instancePath: instancePath + "/" + i0, parentData: data, parentDataProperty: i0, rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate180.errors : vErrors.concat(validate180.errors);
          errors = vErrors.length;
        }
        var _valid0 = _errs4 === errors;
        valid2 = _valid0;
        ifClause0 = "then";
      } else {
        const _errs5 = errors;
        if (!validate201(data0, { instancePath: instancePath + "/" + i0, parentData: data, parentDataProperty: i0, rootData, dynamicAnchors })) {
          vErrors = vErrors === null ? validate201.errors : vErrors.concat(validate201.errors);
          errors = vErrors.length;
        }
        if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
          if (data0.in === void 0) {
            const err1 = { instancePath: instancePath + "/" + i0, schemaPath: "#/items/else/required", keyword: "required", params: { missingProperty: "in" }, message: "must have required property 'in'" };
            if (vErrors === null) {
              vErrors = [err1];
            } else {
              vErrors.push(err1);
            }
            errors++;
          }
        }
        var _valid0 = _errs5 === errors;
        valid2 = _valid0;
        ifClause0 = "else";
      }
      if (!valid2) {
        const err2 = { instancePath: instancePath + "/" + i0, schemaPath: "#/items/if", keyword: "if", params: { failingKeyword: ifClause0 }, message: 'must match "' + ifClause0 + '" schema' };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    let i1 = data.length;
    let j0;
    if (i1 > 1) {
      outer0: for (; i1--; ) {
        for (j0 = i1; j0--; ) {
          if (func0(data[i1], data[j0])) {
            const err3 = { instancePath, schemaPath: "#/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
            if (vErrors === null) {
              vErrors = [err3];
            } else {
              vErrors.push(err3);
            }
            errors++;
            break outer0;
          }
        }
      }
    }
  } else {
    const err4 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "array" }, message: "must be array" };
    if (vErrors === null) {
      vErrors = [err4];
    } else {
      vErrors.push(err4);
    }
    errors++;
  }
  validate199.errors = vErrors;
  return errors === 0;
}
validate199.evaluated = { "items": true, "dynamicProps": false, "dynamicItems": false };
function validate158(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate158.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (!validate160(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate160.errors : vErrors.concat(validate160.errors);
    errors = vErrors.length;
  }
  if (props0 !== true) {
    props0 = props0 || {};
    props0.stepId = true;
    props0.description = true;
    props0.timeout = true;
    props0.dependsOn = true;
    props0.parameters = true;
    props0.requestBody = true;
    props0.successCriteria = true;
    props0.onSuccess = true;
    props0.onFailure = true;
    props0.outputs = true;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.action === void 0) {
      const err0 = { instancePath, schemaPath: "#/allOf/1/required", keyword: "required", params: { missingProperty: "action" }, message: "must have required property 'action'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.operationId !== void 0) {
      if (typeof data.operationId !== "string") {
        const err1 = { instancePath: instancePath + "/operationId", schemaPath: "#/allOf/1/properties/operationId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.channelPath !== void 0) {
      if (typeof data.channelPath !== "string") {
        const err2 = { instancePath: instancePath + "/channelPath", schemaPath: "#/allOf/1/properties/channelPath/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.correlationId !== void 0) {
      let data2 = data.correlationId;
      if ((!data2 || typeof data2 != "object") && typeof data2 !== "string" && !(typeof data2 == "number") && typeof data2 !== "boolean") {
        const err3 = { instancePath: instancePath + "/correlationId", schemaPath: "#/allOf/1/properties/correlationId/type", keyword: "type", params: { type: schema50.allOf[1].properties.correlationId.type }, message: "must be string,number,boolean,object,array" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.action !== void 0) {
      let data3 = data.action;
      if (!(data3 === "send" || data3 === "receive")) {
        const err4 = { instancePath: instancePath + "/action", schemaPath: "#/allOf/1/properties/action/enum", keyword: "enum", params: { allowedValues: schema50.allOf[1].properties.action.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.parameters !== void 0) {
      if (!validate199(data.parameters, { instancePath: instancePath + "/parameters", parentData: data, parentDataProperty: "parameters", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate199.errors : vErrors.concat(validate199.errors);
        errors = vErrors.length;
      }
    }
  } else {
    const err5 = { instancePath, schemaPath: "#/allOf/1/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err5];
    } else {
      vErrors.push(err5);
    }
    errors++;
  }
  if (props0 !== true) {
    props0 = props0 || {};
    props0.operationId = true;
    props0.channelPath = true;
    props0.correlationId = true;
    props0.action = true;
    props0.parameters = true;
  }
  const _errs12 = errors;
  let valid2 = true;
  const _errs13 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.correlationId === void 0 && ("correlationId")) {
      const err6 = {};
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
  }
  var _valid0 = _errs13 === errors;
  errors = _errs12;
  if (vErrors !== null) {
    if (_errs12) {
      vErrors.length = _errs12;
    } else {
      vErrors = null;
    }
  }
  if (_valid0) {
    const _errs14 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.action === void 0) {
        const err7 = { instancePath, schemaPath: "#/allOf/2/then/required", keyword: "required", params: { missingProperty: "action" }, message: "must have required property 'action'" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (data.action !== void 0) {
        if ("receive" !== data.action) {
          const err8 = { instancePath: instancePath + "/action", schemaPath: "#/allOf/2/then/properties/action/const", keyword: "const", params: { allowedValue: "receive" }, message: "must be equal to constant" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
      }
    }
    var _valid0 = _errs14 === errors;
    valid2 = _valid0;
    if (valid2) {
      var props1 = {};
      props1.action = true;
    }
  }
  if (!valid2) {
    const err9 = { instancePath, schemaPath: "#/allOf/2/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err9];
    } else {
      vErrors.push(err9);
    }
    errors++;
  }
  if (props0 !== true && props1 !== void 0) {
    if (props1 === true) {
      props0 = true;
    } else {
      props0 = props0 || {};
      Object.assign(props0, props1);
    }
  }
  const _errs17 = errors;
  let valid4 = false;
  let passing0 = null;
  const _errs18 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.operationId === void 0) {
      const err10 = { instancePath, schemaPath: "#/allOf/3/oneOf/0/required", keyword: "required", params: { missingProperty: "operationId" }, message: "must have required property 'operationId'" };
      if (vErrors === null) {
        vErrors = [err10];
      } else {
        vErrors.push(err10);
      }
      errors++;
    }
  }
  var _valid1 = _errs18 === errors;
  if (_valid1) {
    valid4 = true;
    passing0 = 0;
  }
  const _errs19 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.channelPath === void 0) {
      const err11 = { instancePath, schemaPath: "#/allOf/3/oneOf/1/required", keyword: "required", params: { missingProperty: "channelPath" }, message: "must have required property 'channelPath'" };
      if (vErrors === null) {
        vErrors = [err11];
      } else {
        vErrors.push(err11);
      }
      errors++;
    }
  }
  var _valid1 = _errs19 === errors;
  if (_valid1 && valid4) {
    valid4 = false;
    passing0 = [passing0, 1];
  } else {
    if (_valid1) {
      valid4 = true;
      passing0 = 1;
    }
  }
  if (!valid4) {
    const err12 = { instancePath, schemaPath: "#/allOf/3/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
    if (vErrors === null) {
      vErrors = [err12];
    } else {
      vErrors.push(err12);
    }
    errors++;
  } else {
    errors = _errs17;
    if (vErrors !== null) {
      if (_errs17) {
        vErrors.length = _errs17;
      } else {
        vErrors = null;
      }
    }
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err13 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err13];
          } else {
            vErrors.push(err13);
          }
          errors++;
        }
      }
    }
  }
  validate158.errors = vErrors;
  return errors === 0;
}
validate158.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate207(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate207.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (!validate160(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate160.errors : vErrors.concat(validate160.errors);
    errors = vErrors.length;
  }
  if (props0 !== true) {
    props0 = props0 || {};
    props0.stepId = true;
    props0.description = true;
    props0.timeout = true;
    props0.dependsOn = true;
    props0.parameters = true;
    props0.requestBody = true;
    props0.successCriteria = true;
    props0.onSuccess = true;
    props0.onFailure = true;
    props0.outputs = true;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.workflowId === void 0) {
      const err0 = { instancePath, schemaPath: "#/allOf/1/required", keyword: "required", params: { missingProperty: "workflowId" }, message: "must have required property 'workflowId'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.workflowId !== void 0) {
      if (!validate184(data.workflowId, { instancePath: instancePath + "/workflowId", parentData: data, parentDataProperty: "workflowId", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate184.errors : vErrors.concat(validate184.errors);
        errors = vErrors.length;
      }
    }
    if (data.parameters !== void 0) {
      let data1 = data.parameters;
      if (Array.isArray(data1)) {
        const len0 = data1.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data2 = data1[i0];
          const _errs6 = errors;
          let valid4 = true;
          const _errs7 = errors;
          if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
            if (data2.reference === void 0 && ("reference")) {
              const err1 = {};
              if (vErrors === null) {
                vErrors = [err1];
              } else {
                vErrors.push(err1);
              }
              errors++;
            }
          }
          var _valid0 = _errs7 === errors;
          errors = _errs6;
          if (vErrors !== null) {
            if (_errs6) {
              vErrors.length = _errs6;
            } else {
              vErrors = null;
            }
          }
          let ifClause0;
          if (_valid0) {
            const _errs8 = errors;
            if (!validate180(data2, { instancePath: instancePath + "/parameters/" + i0, parentData: data1, parentDataProperty: i0, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate180.errors : vErrors.concat(validate180.errors);
              errors = vErrors.length;
            }
            var _valid0 = _errs8 === errors;
            valid4 = _valid0;
            ifClause0 = "then";
          } else {
            const _errs9 = errors;
            if (!validate201(data2, { instancePath: instancePath + "/parameters/" + i0, parentData: data1, parentDataProperty: i0, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate201.errors : vErrors.concat(validate201.errors);
              errors = vErrors.length;
            }
            var _valid0 = _errs9 === errors;
            valid4 = _valid0;
            ifClause0 = "else";
          }
          if (!valid4) {
            const err2 = { instancePath: instancePath + "/parameters/" + i0, schemaPath: "#/allOf/1/properties/parameters/items/if", keyword: "if", params: { failingKeyword: ifClause0 }, message: 'must match "' + ifClause0 + '" schema' };
            if (vErrors === null) {
              vErrors = [err2];
            } else {
              vErrors.push(err2);
            }
            errors++;
          }
        }
      }
    }
  } else {
    const err3 = { instancePath, schemaPath: "#/allOf/1/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err3];
    } else {
      vErrors.push(err3);
    }
    errors++;
  }
  if (props0 !== true) {
    props0 = props0 || {};
    props0.workflowId = true;
    props0.parameters = true;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err4 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      }
    }
  }
  validate207.errors = vErrors;
  return errors === 0;
}
validate207.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate214(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate214.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (!validate160(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
    vErrors = vErrors === null ? validate160.errors : vErrors.concat(validate160.errors);
    errors = vErrors.length;
  }
  if (props0 !== true) {
    props0 = props0 || {};
    props0.stepId = true;
    props0.description = true;
    props0.timeout = true;
    props0.dependsOn = true;
    props0.parameters = true;
    props0.requestBody = true;
    props0.successCriteria = true;
    props0.onSuccess = true;
    props0.onFailure = true;
    props0.outputs = true;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.operationId !== void 0) {
      if (typeof data.operationId !== "string") {
        const err0 = { instancePath: instancePath + "/operationId", schemaPath: "#/allOf/1/properties/operationId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
    if (data.operationPath !== void 0) {
      if (typeof data.operationPath !== "string") {
        const err1 = { instancePath: instancePath + "/operationPath", schemaPath: "#/allOf/1/properties/operationPath/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.parameters !== void 0) {
      if (!validate199(data.parameters, { instancePath: instancePath + "/parameters", parentData: data, parentDataProperty: "parameters", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate199.errors : vErrors.concat(validate199.errors);
        errors = vErrors.length;
      }
    }
  } else {
    const err2 = { instancePath, schemaPath: "#/allOf/1/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err2];
    } else {
      vErrors.push(err2);
    }
    errors++;
  }
  if (props0 !== true) {
    props0 = props0 || {};
    props0.operationId = true;
    props0.operationPath = true;
    props0.parameters = true;
  }
  const _errs9 = errors;
  let valid2 = false;
  let passing0 = null;
  const _errs10 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.operationId === void 0) {
      const err3 = { instancePath, schemaPath: "#/allOf/2/oneOf/0/required", keyword: "required", params: { missingProperty: "operationId" }, message: "must have required property 'operationId'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
  }
  var _valid0 = _errs10 === errors;
  if (_valid0) {
    valid2 = true;
    passing0 = 0;
  }
  const _errs11 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.operationPath === void 0) {
      const err4 = { instancePath, schemaPath: "#/allOf/2/oneOf/1/required", keyword: "required", params: { missingProperty: "operationPath" }, message: "must have required property 'operationPath'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
  }
  var _valid0 = _errs11 === errors;
  if (_valid0 && valid2) {
    valid2 = false;
    passing0 = [passing0, 1];
  } else {
    if (_valid0) {
      valid2 = true;
      passing0 = 1;
    }
  }
  if (!valid2) {
    const err5 = { instancePath, schemaPath: "#/allOf/2/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
    if (vErrors === null) {
      vErrors = [err5];
    } else {
      vErrors.push(err5);
    }
    errors++;
  } else {
    errors = _errs9;
    if (vErrors !== null) {
      if (_errs9) {
        vErrors.length = _errs9;
      } else {
        vErrors = null;
      }
    }
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err6 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      }
    }
  }
  validate214.errors = vErrors;
  return errors === 0;
}
validate214.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate157(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate157.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  const _errs0 = errors;
  let valid0 = true;
  const _errs1 = errors;
  const _errs2 = errors;
  let valid1 = false;
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.channelPath === void 0 && ("channelPath")) {
      const err0 = {};
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
  }
  var _valid1 = _errs3 === errors;
  valid1 = valid1 || _valid1;
  const _errs4 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.action === void 0 && ("action")) {
      const err1 = {};
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
  }
  var _valid1 = _errs4 === errors;
  valid1 = valid1 || _valid1;
  if (!valid1) {
    const err2 = {};
    if (vErrors === null) {
      vErrors = [err2];
    } else {
      vErrors.push(err2);
    }
    errors++;
  } else {
    errors = _errs2;
    if (vErrors !== null) {
      if (_errs2) {
        vErrors.length = _errs2;
      } else {
        vErrors = null;
      }
    }
  }
  var _valid0 = _errs1 === errors;
  errors = _errs0;
  if (vErrors !== null) {
    if (_errs0) {
      vErrors.length = _errs0;
    } else {
      vErrors = null;
    }
  }
  let ifClause0;
  if (_valid0) {
    const _errs5 = errors;
    if (!validate158(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
      vErrors = vErrors === null ? validate158.errors : vErrors.concat(validate158.errors);
      errors = vErrors.length;
    }
    var _valid0 = _errs5 === errors;
    valid0 = _valid0;
    if (valid0) {
      var props0 = true;
    }
    ifClause0 = "then";
  } else {
    const _errs6 = errors;
    const _errs7 = errors;
    let valid2 = true;
    const _errs8 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.workflowId === void 0 && ("workflowId")) {
        const err3 = {};
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    var _valid2 = _errs8 === errors;
    errors = _errs7;
    if (vErrors !== null) {
      if (_errs7) {
        vErrors.length = _errs7;
      } else {
        vErrors = null;
      }
    }
    let ifClause1;
    if (_valid2) {
      const _errs9 = errors;
      if (!validate207(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate207.errors : vErrors.concat(validate207.errors);
        errors = vErrors.length;
      }
      var _valid2 = _errs9 === errors;
      valid2 = _valid2;
      if (valid2) {
        var props1 = true;
      }
      ifClause1 = "then";
    } else {
      const _errs10 = errors;
      if (!validate214(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate214.errors : vErrors.concat(validate214.errors);
        errors = vErrors.length;
      }
      var _valid2 = _errs10 === errors;
      valid2 = _valid2;
      if (valid2) {
        if (props1 !== true) {
          props1 = true;
        }
      }
      ifClause1 = "else";
    }
    if (!valid2) {
      const err4 = { instancePath, schemaPath: "#/else/if", keyword: "if", params: { failingKeyword: ifClause1 }, message: 'must match "' + ifClause1 + '" schema' };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    var _valid0 = _errs6 === errors;
    valid0 = _valid0;
    if (valid0) {
      if (props0 !== true && props1 !== void 0) {
        if (props1 === true) {
          props0 = true;
        } else {
          props0 = props0 || {};
          Object.assign(props0, props1);
        }
      }
    }
    ifClause0 = "else";
  }
  if (!valid0) {
    const err5 = { instancePath, schemaPath: "#/if", keyword: "if", params: { failingKeyword: ifClause0 }, message: 'must match "' + ifClause0 + '" schema' };
    if (vErrors === null) {
      vErrors = [err5];
    } else {
      vErrors.push(err5);
    }
    errors++;
  }
  validate157.errors = vErrors;
  evaluated0.props = props0;
  return errors === 0;
}
validate157.evaluated = { "dynamicProps": true, "dynamicItems": false };
function validate140(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate140.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.workflowId === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "workflowId" }, message: "must have required property 'workflowId'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.steps === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "steps" }, message: "must have required property 'steps'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.workflowId = true;
      props0.summary = true;
      props0.description = true;
      props0.inputs = true;
      props0.dependsOn = true;
      props0.steps = true;
      props0.successActions = true;
      props0.failureActions = true;
      props0.outputs = true;
      props0.parameters = true;
    }
    if (data.workflowId !== void 0) {
      if (typeof data.workflowId !== "string") {
        const err2 = { instancePath: instancePath + "/workflowId", schemaPath: "#/properties/workflowId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.summary !== void 0) {
      if (typeof data.summary !== "string") {
        const err3 = { instancePath: instancePath + "/summary", schemaPath: "#/properties/summary/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err4 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.inputs !== void 0) {
      if (!validate142(data.inputs, { instancePath: instancePath + "/inputs", parentData: data, parentDataProperty: "inputs", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate142.errors : vErrors.concat(validate142.errors);
        errors = vErrors.length;
      }
    }
    if (data.dependsOn !== void 0) {
      let data4 = data.dependsOn;
      if (Array.isArray(data4)) {
        const len0 = data4.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (typeof data4[i0] !== "string") {
            const err5 = { instancePath: instancePath + "/dependsOn/" + i0, schemaPath: "#/properties/dependsOn/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err5];
            } else {
              vErrors.push(err5);
            }
            errors++;
          }
        }
        let i1 = data4.length;
        let j0;
        if (i1 > 1) {
          const indices0 = {};
          for (; i1--; ) {
            let item0 = data4[i1];
            if (typeof item0 !== "string") {
              continue;
            }
            if (typeof indices0[item0] == "number") {
              j0 = indices0[item0];
              const err6 = { instancePath: instancePath + "/dependsOn", schemaPath: "#/properties/dependsOn/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
              if (vErrors === null) {
                vErrors = [err6];
              } else {
                vErrors.push(err6);
              }
              errors++;
              break;
            }
            indices0[item0] = i1;
          }
        }
      } else {
        const err7 = { instancePath: instancePath + "/dependsOn", schemaPath: "#/properties/dependsOn/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.steps !== void 0) {
      let data6 = data.steps;
      if (Array.isArray(data6)) {
        if (data6.length < 1) {
          const err8 = { instancePath: instancePath + "/steps", schemaPath: "#/properties/steps/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        const len1 = data6.length;
        for (let i2 = 0; i2 < len1; i2++) {
          if (!validate157(data6[i2], { instancePath: instancePath + "/steps/" + i2, parentData: data6, parentDataProperty: i2, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate157.errors : vErrors.concat(validate157.errors);
            errors = vErrors.length;
          }
        }
        let i3 = data6.length;
        let j1;
        if (i3 > 1) {
          outer0: for (; i3--; ) {
            for (j1 = i3; j1--; ) {
              if (func0(data6[i3], data6[j1])) {
                const err9 = { instancePath: instancePath + "/steps", schemaPath: "#/properties/steps/uniqueItems", keyword: "uniqueItems", params: { i: i3, j: j1 }, message: "must NOT have duplicate items (items ## " + j1 + " and " + i3 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err9];
                } else {
                  vErrors.push(err9);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err10 = { instancePath: instancePath + "/steps", schemaPath: "#/properties/steps/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.successActions !== void 0) {
      let data8 = data.successActions;
      if (Array.isArray(data8)) {
        const len2 = data8.length;
        for (let i4 = 0; i4 < len2; i4++) {
          let data9 = data8[i4];
          const _errs18 = errors;
          let valid9 = true;
          const _errs19 = errors;
          if (data9 && typeof data9 == "object" && !Array.isArray(data9)) {
            if (data9.reference === void 0 && ("reference")) {
              const err11 = {};
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
          }
          var _valid0 = _errs19 === errors;
          errors = _errs18;
          if (vErrors !== null) {
            if (_errs18) {
              vErrors.length = _errs18;
            } else {
              vErrors = null;
            }
          }
          let ifClause0;
          if (_valid0) {
            const _errs20 = errors;
            if (!validate180(data9, { instancePath: instancePath + "/successActions/" + i4, parentData: data8, parentDataProperty: i4, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate180.errors : vErrors.concat(validate180.errors);
              errors = vErrors.length;
            }
            var _valid0 = _errs20 === errors;
            valid9 = _valid0;
            ifClause0 = "then";
          } else {
            const _errs21 = errors;
            if (!validate182(data9, { instancePath: instancePath + "/successActions/" + i4, parentData: data8, parentDataProperty: i4, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate182.errors : vErrors.concat(validate182.errors);
              errors = vErrors.length;
            }
            var _valid0 = _errs21 === errors;
            valid9 = _valid0;
            ifClause0 = "else";
          }
          if (!valid9) {
            const err12 = { instancePath: instancePath + "/successActions/" + i4, schemaPath: "#/properties/successActions/items/if", keyword: "if", params: { failingKeyword: ifClause0 }, message: 'must match "' + ifClause0 + '" schema' };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        let i5 = data8.length;
        let j2;
        if (i5 > 1) {
          outer1: for (; i5--; ) {
            for (j2 = i5; j2--; ) {
              if (func0(data8[i5], data8[j2])) {
                const err13 = { instancePath: instancePath + "/successActions", schemaPath: "#/properties/successActions/uniqueItems", keyword: "uniqueItems", params: { i: i5, j: j2 }, message: "must NOT have duplicate items (items ## " + j2 + " and " + i5 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err13];
                } else {
                  vErrors.push(err13);
                }
                errors++;
                break outer1;
              }
            }
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/successActions", schemaPath: "#/properties/successActions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.failureActions !== void 0) {
      let data10 = data.failureActions;
      if (Array.isArray(data10)) {
        const len3 = data10.length;
        for (let i6 = 0; i6 < len3; i6++) {
          let data11 = data10[i6];
          const _errs25 = errors;
          let valid13 = true;
          const _errs26 = errors;
          if (data11 && typeof data11 == "object" && !Array.isArray(data11)) {
            if (data11.reference === void 0 && ("reference")) {
              const err15 = {};
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
          }
          var _valid1 = _errs26 === errors;
          errors = _errs25;
          if (vErrors !== null) {
            if (_errs25) {
              vErrors.length = _errs25;
            } else {
              vErrors = null;
            }
          }
          let ifClause1;
          if (_valid1) {
            const _errs27 = errors;
            if (!validate180(data11, { instancePath: instancePath + "/failureActions/" + i6, parentData: data10, parentDataProperty: i6, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate180.errors : vErrors.concat(validate180.errors);
              errors = vErrors.length;
            }
            var _valid1 = _errs27 === errors;
            valid13 = _valid1;
            ifClause1 = "then";
          } else {
            const _errs28 = errors;
            if (!validate191(data11, { instancePath: instancePath + "/failureActions/" + i6, parentData: data10, parentDataProperty: i6, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate191.errors : vErrors.concat(validate191.errors);
              errors = vErrors.length;
            }
            var _valid1 = _errs28 === errors;
            valid13 = _valid1;
            ifClause1 = "else";
          }
          if (!valid13) {
            const err16 = { instancePath: instancePath + "/failureActions/" + i6, schemaPath: "#/properties/failureActions/items/if", keyword: "if", params: { failingKeyword: ifClause1 }, message: 'must match "' + ifClause1 + '" schema' };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
        }
        let i7 = data10.length;
        let j3;
        if (i7 > 1) {
          outer2: for (; i7--; ) {
            for (j3 = i7; j3--; ) {
              if (func0(data10[i7], data10[j3])) {
                const err17 = { instancePath: instancePath + "/failureActions", schemaPath: "#/properties/failureActions/uniqueItems", keyword: "uniqueItems", params: { i: i7, j: j3 }, message: "must NOT have duplicate items (items ## " + j3 + " and " + i7 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
                break outer2;
              }
            }
          }
        }
      } else {
        const err18 = { instancePath: instancePath + "/failureActions", schemaPath: "#/properties/failureActions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
    if (data.outputs !== void 0) {
      let data12 = data.outputs;
      if (data12 && typeof data12 == "object" && !Array.isArray(data12)) {
        var props4 = {};
        for (const key0 in data12) {
          if (pattern7.test(key0)) {
            let data13 = data12[key0];
            const _errs32 = errors;
            let valid16 = true;
            const _errs33 = errors;
            if (!(data13 && typeof data13 == "object" && !Array.isArray(data13))) {
              const err19 = {};
              if (vErrors === null) {
                vErrors = [err19];
              } else {
                vErrors.push(err19);
              }
              errors++;
            }
            var _valid2 = _errs33 === errors;
            errors = _errs32;
            if (vErrors !== null) {
              if (_errs32) {
                vErrors.length = _errs32;
              } else {
                vErrors = null;
              }
            }
            let ifClause2;
            if (_valid2) {
              const _errs35 = errors;
              if (!validate170(data13, { instancePath: instancePath + "/outputs/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data12, parentDataProperty: key0, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate170.errors : vErrors.concat(validate170.errors);
                errors = vErrors.length;
              }
              var _valid2 = _errs35 === errors;
              valid16 = _valid2;
              ifClause2 = "then";
            } else {
              const _errs36 = errors;
              if (typeof data13 !== "string") {
                const err20 = { instancePath: instancePath + "/outputs/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/outputs/patternProperties/%5E%5Ba-zA-Z0-9%5C.%5C-_%5D%2B%24/else/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
              var _valid2 = _errs36 === errors;
              valid16 = _valid2;
              ifClause2 = "else";
            }
            if (!valid16) {
              const err21 = { instancePath: instancePath + "/outputs/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/outputs/patternProperties/%5E%5Ba-zA-Z0-9%5C.%5C-_%5D%2B%24/if", keyword: "if", params: { failingKeyword: ifClause2 }, message: 'must match "' + ifClause2 + '" schema' };
              if (vErrors === null) {
                vErrors = [err21];
              } else {
                vErrors.push(err21);
              }
              errors++;
            }
            props4[key0] = true;
          }
        }
      } else {
        const err22 = { instancePath: instancePath + "/outputs", schemaPath: "#/properties/outputs/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err22];
        } else {
          vErrors.push(err22);
        }
        errors++;
      }
    }
    if (data.parameters !== void 0) {
      let data14 = data.parameters;
      if (Array.isArray(data14)) {
        const len4 = data14.length;
        for (let i8 = 0; i8 < len4; i8++) {
          let data15 = data14[i8];
          const _errs41 = errors;
          let valid19 = true;
          const _errs42 = errors;
          if (data15 && typeof data15 == "object" && !Array.isArray(data15)) {
            if (data15.reference === void 0 && ("reference")) {
              const err23 = {};
              if (vErrors === null) {
                vErrors = [err23];
              } else {
                vErrors.push(err23);
              }
              errors++;
            }
          }
          var _valid3 = _errs42 === errors;
          errors = _errs41;
          if (vErrors !== null) {
            if (_errs41) {
              vErrors.length = _errs41;
            } else {
              vErrors = null;
            }
          }
          let ifClause3;
          if (_valid3) {
            const _errs43 = errors;
            if (!validate180(data15, { instancePath: instancePath + "/parameters/" + i8, parentData: data14, parentDataProperty: i8, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate180.errors : vErrors.concat(validate180.errors);
              errors = vErrors.length;
            }
            var _valid3 = _errs43 === errors;
            valid19 = _valid3;
            ifClause3 = "then";
          } else {
            const _errs44 = errors;
            if (!validate201(data15, { instancePath: instancePath + "/parameters/" + i8, parentData: data14, parentDataProperty: i8, rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate201.errors : vErrors.concat(validate201.errors);
              errors = vErrors.length;
            }
            var _valid3 = _errs44 === errors;
            valid19 = _valid3;
            ifClause3 = "else";
          }
          if (!valid19) {
            const err24 = { instancePath: instancePath + "/parameters/" + i8, schemaPath: "#/properties/parameters/items/if", keyword: "if", params: { failingKeyword: ifClause3 }, message: 'must match "' + ifClause3 + '" schema' };
            if (vErrors === null) {
              vErrors = [err24];
            } else {
              vErrors.push(err24);
            }
            errors++;
          }
        }
        let i9 = data14.length;
        let j4;
        if (i9 > 1) {
          outer3: for (; i9--; ) {
            for (j4 = i9; j4--; ) {
              if (func0(data14[i9], data14[j4])) {
                const err25 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/uniqueItems", keyword: "uniqueItems", params: { i: i9, j: j4 }, message: "must NOT have duplicate items (items ## " + j4 + " and " + i9 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err25];
                } else {
                  vErrors.push(err25);
                }
                errors++;
                break outer3;
              }
            }
          }
        }
      } else {
        const err26 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err26];
        } else {
          vErrors.push(err26);
        }
        errors++;
      }
    }
    if (props0 !== true) {
      for (const key1 in data) {
        if (!props0 || !props0[key1]) {
          const err27 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key1 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err27];
          } else {
            vErrors.push(err27);
          }
          errors++;
        }
      }
    }
  } else {
    const err28 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err28];
    } else {
      vErrors.push(err28);
    }
    errors++;
  }
  validate140.errors = vErrors;
  return errors === 0;
}
validate140.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate228(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate228.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (props0 !== true) {
      props0 = props0 || {};
      props0.inputs = true;
      props0.parameters = true;
      props0.successActions = true;
      props0.failureActions = true;
    }
    if (data.inputs !== void 0) {
      let data0 = data.inputs;
      if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
        for (const key0 in data0) {
          if (!validate142(data0[key0], { instancePath: instancePath + "/inputs/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data0, parentDataProperty: key0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate142.errors : vErrors.concat(validate142.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err0 = { instancePath: instancePath + "/inputs", schemaPath: "#/properties/inputs/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
    if (data.parameters !== void 0) {
      let data2 = data.parameters;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        for (const key1 in data2) {
          if (!validate201(data2[key1], { instancePath: instancePath + "/parameters/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data2, parentDataProperty: key1, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate201.errors : vErrors.concat(validate201.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err1 = { instancePath: instancePath + "/parameters", schemaPath: "#/properties/parameters/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.successActions !== void 0) {
      let data4 = data.successActions;
      if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
        for (const key2 in data4) {
          if (!validate182(data4[key2], { instancePath: instancePath + "/successActions/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data4, parentDataProperty: key2, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate182.errors : vErrors.concat(validate182.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err2 = { instancePath: instancePath + "/successActions", schemaPath: "#/properties/successActions/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.failureActions !== void 0) {
      let data6 = data.failureActions;
      if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
        for (const key3 in data6) {
          if (!validate191(data6[key3], { instancePath: instancePath + "/failureActions/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data6, parentDataProperty: key3, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate191.errors : vErrors.concat(validate191.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err3 = { instancePath: instancePath + "/failureActions", schemaPath: "#/properties/failureActions/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    for (const key4 in data) {
      if (pattern9.test(key4)) {
        let data8 = data[key4];
        if (data8 && typeof data8 == "object" && !Array.isArray(data8)) {
          for (const key5 in data8) {
            const _errs18 = errors;
            if (typeof key5 === "string") {
              if (!pattern7.test(key5)) {
                const err4 = { instancePath: instancePath + "/" + key4.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/patternProperties/%5E(inputs%7Cparameters%7CsuccessActions%7CfailureActions)%24/propertyNames/pattern", keyword: "pattern", params: { pattern: "^[a-zA-Z0-9\\.\\-_]+$" }, message: 'must match pattern "^[a-zA-Z0-9\\.\\-_]+$"', propertyName: key5 };
                if (vErrors === null) {
                  vErrors = [err4];
                } else {
                  vErrors.push(err4);
                }
                errors++;
              }
            }
            var valid6 = _errs18 === errors;
            if (!valid6) {
              const err5 = { instancePath: instancePath + "/" + key4.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/patternProperties/%5E(inputs%7Cparameters%7CsuccessActions%7CfailureActions)%24/propertyNames", keyword: "propertyNames", params: { propertyName: key5 }, message: "property name must be valid" };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
          }
        }
        props0[key4] = true;
      }
    }
    if (props0 !== true) {
      for (const key6 in data) {
        if (!props0 || !props0[key6]) {
          const err6 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key6 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      }
    }
  } else {
    const err7 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  validate228.errors = vErrors;
  return errors === 0;
}
validate228.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var pattern12 = new RegExp("^1\\.1\\.\\d+(-.+)?$", "u");
var pattern13 = new RegExp("^[^#]*$", "u");
function validate131(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate131.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!validate132(data, { instancePath, parentData, parentDataProperty, rootData, dynamicAnchors })) ; else {
    var props0 = validate132.evaluated.props;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.arazzo === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "arazzo" }, message: "must have required property 'arazzo'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.info === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "info" }, message: "must have required property 'info'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.sourceDescriptions === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "sourceDescriptions" }, message: "must have required property 'sourceDescriptions'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.workflows === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "workflows" }, message: "must have required property 'workflows'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (props0 !== true) {
      props0 = props0 || {};
      props0.arazzo = true;
      props0.$self = true;
      props0.info = true;
      props0.sourceDescriptions = true;
      props0.workflows = true;
      props0.components = true;
    }
    if (data.arazzo !== void 0) {
      let data0 = data.arazzo;
      if (typeof data0 === "string") {
        if (!pattern12.test(data0)) {
          const err4 = { instancePath: instancePath + "/arazzo", schemaPath: "#/properties/arazzo/pattern", keyword: "pattern", params: { pattern: "^1\\.1\\.\\d+(-.+)?$" }, message: 'must match pattern "^1\\.1\\.\\d+(-.+)?$"' };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      } else {
        const err5 = { instancePath: instancePath + "/arazzo", schemaPath: "#/properties/arazzo/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.$self !== void 0) {
      let data1 = data.$self;
      if (typeof data1 === "string") {
        if (!pattern13.test(data1)) {
          const err6 = { instancePath: instancePath + "/$self", schemaPath: "#/properties/%24self/pattern", keyword: "pattern", params: { pattern: "^[^#]*$" }, message: 'must match pattern "^[^#]*$"' };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      } else {
        const err7 = { instancePath: instancePath + "/$self", schemaPath: "#/properties/%24self/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.info !== void 0) {
      if (!validate134(data.info, { instancePath: instancePath + "/info", parentData: data, parentDataProperty: "info", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate134.errors : vErrors.concat(validate134.errors);
        errors = vErrors.length;
      }
    }
    if (data.sourceDescriptions !== void 0) {
      let data3 = data.sourceDescriptions;
      if (Array.isArray(data3)) {
        if (data3.length < 1) {
          const err8 = { instancePath: instancePath + "/sourceDescriptions", schemaPath: "#/properties/sourceDescriptions/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        const len0 = data3.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate137(data3[i0], { instancePath: instancePath + "/sourceDescriptions/" + i0, parentData: data3, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate137.errors : vErrors.concat(validate137.errors);
            errors = vErrors.length;
          }
        }
        let i1 = data3.length;
        let j0;
        if (i1 > 1) {
          outer0: for (; i1--; ) {
            for (j0 = i1; j0--; ) {
              if (func0(data3[i1], data3[j0])) {
                const err9 = { instancePath: instancePath + "/sourceDescriptions", schemaPath: "#/properties/sourceDescriptions/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err9];
                } else {
                  vErrors.push(err9);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err10 = { instancePath: instancePath + "/sourceDescriptions", schemaPath: "#/properties/sourceDescriptions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.workflows !== void 0) {
      let data5 = data.workflows;
      if (Array.isArray(data5)) {
        if (data5.length < 1) {
          const err11 = { instancePath: instancePath + "/workflows", schemaPath: "#/properties/workflows/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        const len1 = data5.length;
        for (let i2 = 0; i2 < len1; i2++) {
          if (!validate140(data5[i2], { instancePath: instancePath + "/workflows/" + i2, parentData: data5, parentDataProperty: i2, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate140.errors : vErrors.concat(validate140.errors);
            errors = vErrors.length;
          }
        }
        let i3 = data5.length;
        let j1;
        if (i3 > 1) {
          outer1: for (; i3--; ) {
            for (j1 = i3; j1--; ) {
              if (func0(data5[i3], data5[j1])) {
                const err12 = { instancePath: instancePath + "/workflows", schemaPath: "#/properties/workflows/uniqueItems", keyword: "uniqueItems", params: { i: i3, j: j1 }, message: "must NOT have duplicate items (items ## " + j1 + " and " + i3 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err12];
                } else {
                  vErrors.push(err12);
                }
                errors++;
                break outer1;
              }
            }
          }
        }
      } else {
        const err13 = { instancePath: instancePath + "/workflows", schemaPath: "#/properties/workflows/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.components !== void 0) {
      if (!validate228(data.components, { instancePath: instancePath + "/components", parentData: data, parentDataProperty: "components", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate228.errors : vErrors.concat(validate228.errors);
        errors = vErrors.length;
      }
    }
    if (props0 !== true) {
      for (const key0 in data) {
        if (!props0 || !props0[key0]) {
          const err14 = { instancePath, schemaPath: "#/unevaluatedProperties", keyword: "unevaluatedProperties", params: { unevaluatedProperty: key0 }, message: "must NOT have unevaluated properties" };
          if (vErrors === null) {
            vErrors = [err14];
          } else {
            vErrors.push(err14);
          }
          errors++;
        }
      }
    }
  } else {
    const err15 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err15];
    } else {
      vErrors.push(err15);
    }
    errors++;
  }
  validate131.errors = vErrors;
  return errors === 0;
}
validate131.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };

// src/validation/schema-layer.ts
var isReusable = (v) => isObj(v) && "reference" in v;
function child(kind, seg, value) {
  switch (kind) {
    case "root":
      return seg === "info" ? "info" : seg === "sourceDescriptions" ? "sources" : seg === "workflows" ? "workflows" : seg === "components" ? "components" : "other";
    case "sources":
      return "source";
    case "workflows":
      return "workflow";
    case "workflow":
      return seg === "steps" ? "steps" : seg === "parameters" ? "paramList" : seg === "successActions" ? "saList" : seg === "failureActions" ? "faList" : seg === "outputs" ? "outputs" : seg === "inputs" ? "json-schema" : seg === "dependsOn" ? "wfDependsOn" : "other";
    case "steps":
      return "step";
    case "step":
      return seg === "parameters" ? "paramList" : seg === "onSuccess" ? "saList" : seg === "onFailure" ? "faList" : seg === "outputs" ? "outputs" : seg === "successCriteria" ? "critList" : seg === "requestBody" ? "requestBody" : seg === "dependsOn" ? "stepDependsOn" : "other";
    case "paramList":
      return isReusable(value) ? "reusable" : "param";
    case "actionParamList":
      return isReusable(value) ? "reusable" : "actionParam";
    case "saList":
      return isReusable(value) ? "reusable" : "successAction";
    case "faList":
      return isReusable(value) ? "reusable" : "failureAction";
    case "param":
    case "actionParam":
      return seg === "value" && isObj(value) ? "selector" : "other";
    case "successAction":
    case "failureAction":
      return seg === "criteria" ? "critList" : seg === "parameters" ? "actionParamList" : "other";
    case "critList":
      return "criterion";
    case "criterion":
      return seg === "type" && isObj(value) ? "eto" : "other";
    case "outputs":
      return isObj(value) ? "selector" : "output";
    case "selector":
      return seg === "type" && isObj(value) ? "eto" : "other";
    case "requestBody":
      return seg === "replacements" ? "replList" : seg === "payload" ? "payload" : "other";
    case "replList":
      return "replacement";
    case "replacement":
      return seg === "value" && isObj(value) ? "selector" : seg === "targetSelectorType" && isObj(value) ? "eto" : "other";
    case "components":
      return seg === "inputs" ? "compInputs" : seg === "parameters" ? "compParams" : seg === "successActions" ? "compSA" : seg === "failureActions" ? "compFA" : "other";
    case "compInputs":
      return "json-schema";
    case "compParams":
      return "param";
    case "compSA":
      return "successAction";
    case "compFA":
      return "failureAction";
    case "json-schema":
      return "json-schema";
    case "payload":
      return "payload";
    default:
      return "other";
  }
}
function kindsAlong(doc, path) {
  const kinds = ["root"];
  let cur = doc;
  let kind = "root";
  for (const seg of path) {
    cur = Array.isArray(cur) ? cur[Number(seg)] : isObj(cur) ? cur[String(seg)] : void 0;
    kind = child(kind, seg, cur);
    kinds.push(kind);
  }
  return kinds;
}
function valueAt(doc, path) {
  let cur = doc;
  for (const seg of path) cur = Array.isArray(cur) ? cur[Number(seg)] : isObj(cur) ? cur[String(seg)] : void 0;
  return cur;
}
var STEP_SEMANTIC_FIELDS = /* @__PURE__ */ new Set(["operationId", "operationPath", "workflowId", "channelPath", "action", "correlationId"]);
var TARGETS = /* @__PURE__ */ new Set(["operationId", "operationPath", "workflowId", "channelPath"]);
var ACTION_LIST_SEGMENTS = /* @__PURE__ */ new Set(["onSuccess", "onFailure", "successActions", "failureActions", "parameters"]);
var label = (path) => path.length ? path.map((s) => typeof s === "number" ? `[${s}]` : `.${s}`).join("").replace(/^\./, "") : "document";
function translate(err, doc, minor) {
  const path = pointerToPath(err.instancePath, doc);
  const kinds = kindsAlong(doc, path);
  const kind = kinds[kinds.length - 1];
  const parentKind = kinds[kinds.length - 2];
  const last = path[path.length - 1];
  const parent = path.slice(0, -1);
  const kw = err.keyword;
  const p = err.params ?? {};
  const sp = err.schemaPath;
  const value = valueAt(doc, path);
  const fallback = (message) => ({ code: "arazzo-schema", path, message: message ?? `${label(path)}: ${err.message ?? kw}` });
  if (err.propertyName !== void 0 && kw !== "propertyNames") return null;
  if (kinds.includes("json-schema")) {
    if (kw === "if" || kw === "anyOf" || kw === "oneOf" || kw === "$dynamicRef") return null;
    return { code: "arazzo-schema", path, message: `Invalid JSON Schema at ${label(path)}: ${err.message ?? kw}` };
  }
  if (kw === "oneOf" && (kind === "successAction" || kind === "failureAction") && sp.includes("/then/oneOf")) {
    return { code: "arazzo-action-goto-target", path, message: 'A goto action must define exactly one of "stepId" or "workflowId"' };
  }
  if (kw === "if" || kw === "oneOf" || kw === "anyOf" || kw === "allOf" || kw === "not") return null;
  if (path.length === 0 && kw === "required" && p.missingProperty === "arazzo") {
    return { code: "arazzo-version-format", path: ["arazzo"], message: "Missing required field: arazzo" };
  }
  if (path.length === 1 && last === "arazzo") {
    return {
      code: "arazzo-version-format",
      path,
      message: `Invalid arazzo version ${JSON.stringify(value)}: expected a "major.minor.patch" string such as "${minor}.0"`
    };
  }
  if (path.length === 1 && last === "$self" && kw === "pattern") {
    return { code: "arazzo-self-fragment", path, message: '$self MUST NOT contain a fragment ("#\u2026")' };
  }
  const selectorPath = kind === "selector" ? path : parentKind === "selector" ? parent : void 0;
  if (selectorPath) {
    const sel = valueAt(doc, selectorPath);
    const selKinds = kindsAlong(doc, selectorPath);
    const hostKind = selKinds[selKinds.length - 2];
    const looksLiteral = isObj(sel) && !("context" in sel) && !("selector" in sel) && !("type" in sel);
    if (looksLiteral && (hostKind === "param" || hostKind === "actionParam")) {
      return {
        code: "arazzo-migration-param-object-value",
        path: selectorPath,
        message: "In Arazzo 1.1 an object Parameter value must be a Selector Object (context, selector, type). Serialize the literal object as a JSON string, or use a Selector."
      };
    }
    if (kind === "selector" && kw === "required") {
      return { code: "arazzo-selector-required-fields", path: [...path, String(p.missingProperty)], message: `Selector Object: missing required field "${p.missingProperty}"` };
    }
    if (parentKind === "selector" && last === "type" && kw === "enum") {
      return { code: "arazzo-schema", path, message: `Selector type must be one of jsonpath, xpath, jsonpointer (got ${JSON.stringify(value)})` };
    }
  }
  if (kw === "unevaluatedProperties") {
    const prop = String(p.unevaluatedProperty);
    if (kind === "step" && STEP_SEMANTIC_FIELDS.has(prop)) return null;
    if (kind === "reusable") {
      return {
        code: "arazzo-reusable-no-extension",
        path: [...path, prop],
        message: `Reusable Objects only accept "reference" and "value" (found "${prop}")`
      };
    }
    return {
      code: "arazzo-unknown-field",
      path: [...path, prop],
      message: `Unknown field "${prop}"${prop.startsWith("x") ? "" : ' (specification extensions must start with "x-")'}`
    };
  }
  if (kw === "propertyNames") {
    return {
      code: "arazzo-key-pattern",
      path: [...path, String(p.propertyName)],
      message: `Invalid key "${p.propertyName}": keys must match ^[a-zA-Z0-9.\\-_]+$`
    };
  }
  if (kind === "step" && kw === "required") {
    if (TARGETS.has(p.missingProperty)) return null;
    if (p.missingProperty === "action") {
      return { code: "arazzo-async-action-required", path: [...path, "action"], message: 'An AsyncAPI step must declare "action" (send or receive)' };
    }
  }
  if (parentKind === "step" && last === "action") {
    if (kw === "enum") return { code: "arazzo-async-action-enum", path, message: `Invalid action ${JSON.stringify(value)}: expected "send" or "receive"` };
    if (kw === "const") {
      return { code: "arazzo-async-correlation-receive-only", path: [...parent, "correlationId"], message: '"correlationId" is only allowed with action: receive' };
    }
  }
  if (parentKind === "step" && last === "timeout") {
    return { code: "arazzo-step-timeout-positive", path, message: '"timeout" must be an integer number of milliseconds', severity: "error" };
  }
  if (parentKind === "step" && last === "dependsOn" || kind === "stepDependsOn" || parentKind === "stepDependsOn") {
    const what = kw === "minItems" ? "dependsOn must contain at least one entry" : kw === "uniqueItems" ? "dependsOn must not contain duplicates" : `Invalid dependsOn entry ${JSON.stringify(value)}: expected a stepId, "$workflows.<workflowId>.steps.<stepId>" or "$sourceDescriptions.<name>.<workflowId>.steps.<stepId>"`;
    return { code: "arazzo-step-depends-on-shape", path, message: what };
  }
  if (parentKind === "source" && last === "type" && kw === "enum") {
    return {
      code: "arazzo-source-type-enum",
      path,
      message: `Source type must be one of ${asArray(p.allowedValues).map((v) => `"${v}"`).join(", ")}, got ${JSON.stringify(value)}`
    };
  }
  if (parentKind === "source" && last === "name" && kw === "pattern") {
    return { code: "arazzo-source-name-pattern", path, message: `Source name ${JSON.stringify(value)} must match [A-Za-z0-9_-]+` };
  }
  if ((kind === "param" || kind === "actionParam") && kw === "required" && p.missingProperty === "in") {
    const name = isObj(value) ? value.name : void 0;
    return { code: "arazzo-param-in-required", path: [...path, "in"], message: `Parameter ${name !== void 0 ? `"${name}" ` : ""}must declare "in" when the step targets an operation` };
  }
  if ((parentKind === "param" || parentKind === "actionParam") && last === "in" && kw === "enum") {
    return {
      code: "arazzo-param-in-enum",
      path,
      message: `Invalid parameter location ${JSON.stringify(value)}: expected ${asArray(p.allowedValues).join(", ")}`
    };
  }
  if (kind === "eto" || parentKind === "eto") {
    const eto = valueAt(doc, kind === "eto" ? path : parent);
    const t = isObj(eto) ? eto.type : void 0;
    const target = kw === "required" ? [...path, String(p.missingProperty)] : path;
    return {
      code: "arazzo-eto-version",
      path: target,
      message: kw === "required" ? `Expression Type Object: missing required field "${p.missingProperty}"` : `Invalid Expression Type Object ${JSON.stringify(eto)}: ${t === "jsonpath" ? "jsonpath versions are rfc9535, draft-goessner-dispatch-jsonpath-00" : t === "xpath" ? "xpath versions are xpath-31, xpath-30, xpath-20, xpath-10" : t === "jsonpointer" ? "jsonpointer version is rfc6901" : "type must be jsonpath, xpath or jsonpointer"}`
    };
  }
  if (kind === "criterion" && kw === "dependentRequired") {
    return { code: "arazzo-criterion-context-required", path: [...path, "context"], message: 'A criterion with a "type" must define "context"' };
  }
  if (parentKind === "criterion" && last === "type" && kw === "enum") {
    return { code: "arazzo-criterion-type-enum", path, message: `Invalid criterion type ${JSON.stringify(value)}: expected simple, regex, jsonpath, xpath or an Expression Type Object` };
  }
  if (last === "successCriteria" && kw === "minItems") {
    return { code: "arazzo-success-criteria-non-empty", path, message: "successCriteria, when present, must contain at least one criterion" };
  }
  if (kind === "successAction" || kind === "failureAction") {
    if (kw === "required" && sp.includes("/then/oneOf")) {
      return { code: "arazzo-action-goto-target", path, message: 'A goto action must define exactly one of "stepId" or "workflowId"' };
    }
    if (kw === "required" && p.missingProperty === "workflowId" && /\/then\/required$/.test(sp)) {
      return { code: "arazzo-action-parameters-require-workflow", path: [...path, "parameters"], message: 'Action "parameters" are only allowed with "workflowId"' };
    }
  }
  if ((parentKind === "successAction" || parentKind === "failureAction") && (last === "retryAfter" || last === "retryLimit")) {
    return {
      code: "arazzo-action-retry-values",
      path,
      message: last === "retryAfter" ? '"retryAfter" must be a number of seconds \u2265 0' : '"retryLimit" must be an integer \u2265 0'
    };
  }
  if ((parentKind === "successAction" || parentKind === "failureAction") && last === "type" && kw === "enum") {
    return { code: "arazzo-schema", path, message: `Invalid action type ${JSON.stringify(value)}: expected ${asArray(p.allowedValues).join(", ")}` };
  }
  if (kw === "uniqueItems" && typeof last === "string" && ACTION_LIST_SEGMENTS.has(last)) return null;
  if (kw === "required") return { code: "arazzo-schema", path: [...path, String(p.missingProperty)], message: `Missing required field: ${p.missingProperty}` };
  if (kw === "minItems") return fallback(`${last !== void 0 ? String(last) : "list"} must have at least one entry`);
  if (kw === "uniqueItems") return fallback(`${label(path)} must not contain duplicate items`);
  if (kw === "type") {
    if (kind === "output") return fallback(`Output "${String(last)}" must be a runtime expression (string)${minor === "1.1" ? " or a Selector Object" : ""}`);
    const t = Array.isArray(p.type) ? p.type.join(" or ") : String(p.type);
    if (t === "array") return fallback(`${last !== void 0 ? String(last) : "value"} must be an array`);
    return fallback(`${label(path)} must be ${t === "object" || t === "integer" || t === "array" ? `an ${t}` : `a ${t}`}`);
  }
  if (kw === "enum") return fallback(`${label(path)} must be one of ${asArray(p.allowedValues).map((v) => JSON.stringify(v)).join(", ")}`);
  if (kw === "pattern") return fallback(`${label(path)} ${JSON.stringify(value)} must match ${p.pattern}`);
  return fallback();
}
function schemaDiagnostics(doc, minor, opts = {}) {
  const validator = minor === "1.0" ? validate10 : validate11;
  const out = [];
  if (validator(doc)) return out;
  const report = createSink("schema", out);
  for (const err of validator.errors ?? []) {
    const t = translate(err, doc, minor);
    if (!t) continue;
    if (opts.suppressed?.(t.path)) continue;
    report(t.code, t.path, t.message, t.severity);
  }
  return out;
}

// src/expressions.ts
var EXPRESSION_ROOTS = [
  "url",
  "method",
  "statusCode",
  "request",
  "response",
  "message",
  "inputs",
  "outputs",
  "steps",
  "workflows",
  "sourceDescriptions",
  "components",
  "self"
];
var IDENT_STRICT = "[A-Za-z0-9_\\-]+";
var IDENT = "[A-Za-z0-9_.\\-]+";
var TOKEN = "[!#$%&'*+\\-.^_`|~0-9A-Za-z]+";
var PTR = "(?:/(?:[^/~{}]|~[01])*)*";
var RE = {
  simple: /^\$(url|method|statusCode|self)$/,
  reqres: new RegExp(`^\\$(request|response|message)\\.(header\\.(${TOKEN})|(query|path)\\.([^\\s#{}]+)|(body|payload)(?:#(${PTR}))?)$`),
  reqresLoose: /^\$(request|response|message)\.(body|payload)((?:\.|\[)[^\s{}]*)$/,
  inputs: new RegExp(`^\\$(inputs|outputs)\\.(${IDENT})(?:#(${PTR}))?$`),
  steps: new RegExp(`^\\$steps\\.(${IDENT_STRICT})\\.outputs\\.(${IDENT})(?:#(${PTR}))?$`),
  workflows: new RegExp(`^\\$workflows\\.(${IDENT_STRICT})\\.(inputs|outputs)\\.(${IDENT})(?:#(${PTR}))?$`),
  sources: new RegExp(`^\\$sourceDescriptions\\.(${IDENT_STRICT})\\.(${IDENT})$`),
  components: new RegExp(`^\\$components\\.(parameters|successActions|failureActions|inputs)\\.(${IDENT})$`)
};
function rootOf(expr) {
  return /^\$([A-Za-z]+)/.exec(expr)?.[1];
}
function parseRuntimeExpression(expr) {
  const bad = (message) => ({ ok: false, problem: { message, severity: "error" } });
  if (!expr.startsWith("$")) return bad(`"${expr}" is not a runtime expression (must start with "$")`);
  const root = rootOf(expr);
  if (!root || !EXPRESSION_ROOTS.includes(root)) {
    return bad(
      `Unknown runtime expression root "$${root ?? ""}" in "${expr}". Expected one of ${EXPRESSION_ROOTS.map((r) => "$" + r).join(", ")}`
    );
  }
  let m;
  if (m = RE.simple.exec(expr)) return { ok: true, expression: { raw: expr, root: m[1] } };
  if (root === "request" || root === "response" || root === "message") {
    if (m = RE.reqres.exec(expr)) {
      const e = { raw: expr, root };
      if (m[3] !== void 0) {
        e.source = "header";
        e.name = m[3];
      } else if (m[4] !== void 0) {
        e.source = m[4];
        e.name = m[5];
      } else {
        e.source = m[6];
        if (m[7] !== void 0) e.pointer = m[7];
      }
      return { ok: true, expression: e };
    }
    if (m = RE.reqresLoose.exec(expr)) {
      const pointer = dottedToPointer(m[3]);
      return {
        ok: true,
        expression: { raw: expr, root, source: m[2] },
        warning: {
          severity: "warning",
          message: `"${expr}" is not valid runtime expression syntax: use a JSON Pointer after "#"${pointer ? ` (e.g. "$${root}.${m[2]}#${pointer}")` : ""}`
        }
      };
    }
    return bad(
      `Invalid runtime expression "${expr}": expected $${root}.header.<name>, $${root}.query.<name>, $${root}.path.<name>, $${root}.body[#/pointer]${root === "message" ? " or $message.payload[#/pointer]" : ""}`
    );
  }
  if (root === "inputs" || root === "outputs") {
    if (m = RE.inputs.exec(expr)) {
      const e = { raw: expr, root, field: m[2] };
      if (m[3] !== void 0) e.pointer = m[3];
      return { ok: true, expression: e };
    }
    return bad(`Invalid runtime expression "${expr}": expected $${root}.<name>[#/pointer]`);
  }
  if (root === "steps") {
    if (m = RE.steps.exec(expr)) {
      const e = { raw: expr, root, id: m[1], field: m[2] };
      if (m[3] !== void 0) e.pointer = m[3];
      return { ok: true, expression: e };
    }
    return bad(`Invalid runtime expression "${expr}": expected $steps.<stepId>.outputs.<name>[#/pointer] (stepId: [A-Za-z0-9_-]+)`);
  }
  if (root === "workflows") {
    if (m = RE.workflows.exec(expr)) {
      const e = { raw: expr, root, id: m[1], section: m[2], field: m[3] };
      if (m[4] !== void 0) e.pointer = m[4];
      return { ok: true, expression: e };
    }
    return bad(`Invalid runtime expression "${expr}": expected $workflows.<workflowId>.(inputs|outputs).<name>[#/pointer]`);
  }
  if (root === "sourceDescriptions") {
    if (m = RE.sources.exec(expr)) return { ok: true, expression: { raw: expr, root, id: m[1], reference: m[2] } };
    return bad(`Invalid runtime expression "${expr}": expected $sourceDescriptions.<name>.<reference>`);
  }
  if (root === "components") {
    if (m = RE.components.exec(expr)) return { ok: true, expression: { raw: expr, root, section: m[1], field: m[2] } };
    return bad(`Invalid runtime expression "${expr}": expected $components.(parameters|successActions|failureActions).<name>`);
  }
  return bad(`Invalid runtime expression "${expr}"`);
}
function dottedToPointer(tail) {
  const parts = [];
  const re = /\.([^.[\]]+)|\[(\d+)\]|\['([^']*)'\]|\["([^"]*)"\]/g;
  let m;
  let consumed = 0;
  while (m = re.exec(tail)) {
    if (m.index !== consumed) return "";
    consumed = m.index + m[0].length;
    parts.push((m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").replace(/~/g, "~0").replace(/\//g, "~1"));
  }
  if (consumed !== tail.length) return "";
  return parts.map((p) => "/" + p).join("");
}
function findEmbeddedExpressions(text) {
  const out = [];
  const re = /\{(\$[^{}]*)\}/g;
  let m;
  while (m = re.exec(text)) out.push({ expression: m[1].trim(), start: m.index, end: m.index + m[0].length });
  return out;
}
function expressionsInString(text) {
  const t = text.trim();
  if (t.startsWith("$")) return [t];
  return findEmbeddedExpressions(text).map((e) => e.expression);
}
var RUNTIME_ROOT_RE = /\$(url|method|statusCode|request|response|message|inputs|outputs|steps|workflows|sourceDescriptions|components|self)\b/;
function unembeddedExpressions(condition) {
  const stripped = condition.replace(/\{\$[^{}]*\}/g, (s) => " ".repeat(s.length));
  const out = [];
  const re = new RegExp(RUNTIME_ROOT_RE.source + `[^\\s()\\]'"]*`, "g");
  let m;
  while (m = re.exec(stripped)) out.push(m[0]);
  return out;
}
function maskEmbedded(text, placeholder = "0") {
  return text.replace(/\{\$[^{}]*\}/g, placeholder);
}
function checkJsonPointer(ptr) {
  const p = ptr.startsWith("#") ? safeDecode(ptr.slice(1)) : ptr;
  if (p === null) return `Invalid percent-encoding in JSON Pointer "${ptr}"`;
  if (p === "") return null;
  if (!p.startsWith("/")) return `JSON Pointer "${ptr}" must be empty or start with "/"`;
  if (/~(?![01])/.test(p)) return `Invalid escape in JSON Pointer "${ptr}" (only ~0 and ~1 are allowed)`;
  return null;
}
function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}
function resolveJsonPointer(root, ptr) {
  const p = ptr.startsWith("#") ? safeDecode(ptr.slice(1)) ?? "" : ptr;
  if (p === "") return root;
  let cur = root;
  for (const raw of p.split("/").slice(1)) {
    const seg = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(cur) && /^\d+$/.test(seg)) cur = cur[Number(seg)];
    else if (cur && typeof cur === "object" && Object.prototype.hasOwnProperty.call(cur, seg)) cur = cur[seg];
    else return void 0;
  }
  return cur;
}
var JsonPathChecker = class {
  constructor(s) {
    this.s = s;
    this.i = 0;
  }
  check() {
    try {
      this.query("$");
      this.ws();
      if (this.i < this.s.length) this.fail(`unexpected "${this.s[this.i]}"`);
      return null;
    } catch (e) {
      return e.message;
    }
  }
  fail(msg) {
    throw new Error(`Invalid JSONPath (RFC 9535) at position ${this.i}: ${msg}`);
  }
  peek(n = 0) {
    return this.s[this.i + n];
  }
  eat(str2) {
    if (this.s.startsWith(str2, this.i)) {
      this.i += str2.length;
      return true;
    }
    return false;
  }
  expect(str2) {
    if (!this.eat(str2)) this.fail(`expected "${str2}"`);
  }
  ws() {
    while (this.i < this.s.length && " 	\n\r".includes(this.s[this.i])) this.i++;
  }
  /** root ("$" or "@") followed by segments. */
  query(root) {
    this.expect(root);
    this.segments();
  }
  segments() {
    for (; ; ) {
      const save = this.i;
      this.ws();
      if (this.peek() === "[" || this.peek() === "." && this.peek(1) !== "." || this.peek() === "." && this.peek(1) === ".") {
        this.segment();
      } else {
        this.i = save;
        return;
      }
    }
  }
  segment() {
    if (this.eat("..")) {
      if (this.peek() === "[") this.bracketed();
      else if (this.eat("*")) return;
      else this.memberName();
      return;
    }
    if (this.eat(".")) {
      if (this.eat("*")) return;
      this.memberName();
      return;
    }
    this.bracketed();
  }
  memberName() {
    const c = this.peek();
    if (!c || !(/[A-Za-z_]/.test(c) || c.charCodeAt(0) >= 128)) this.fail("expected a member name");
    this.i++;
    while (this.i < this.s.length && (/[A-Za-z0-9_]/.test(this.s[this.i]) || this.s.charCodeAt(this.i) >= 128)) this.i++;
  }
  bracketed() {
    this.expect("[");
    this.ws();
    this.selector();
    this.ws();
    while (this.eat(",")) {
      this.ws();
      this.selector();
      this.ws();
    }
    this.expect("]");
  }
  selector() {
    const c = this.peek();
    if (c === "'" || c === '"') return void this.stringLiteral();
    if (c === "*") return void this.i++;
    if (c === "?") {
      this.i++;
      this.ws();
      this.logicalOr();
      return;
    }
    const intRe = /^-?(0|[1-9][0-9]*)/;
    const readInt = () => {
      const m = intRe.exec(this.s.slice(this.i));
      if (!m) return false;
      if (m[0] === "-0") this.fail('"-0" is not a valid integer');
      this.i += m[0].length;
      return true;
    };
    const hadStart = readInt();
    this.ws();
    if (this.peek() === ":") {
      this.i++;
      this.ws();
      readInt();
      this.ws();
      if (this.eat(":")) {
        this.ws();
        readInt();
      }
      return;
    }
    if (!hadStart) this.fail("expected a selector (name, *, index, slice or ?filter)");
  }
  stringLiteral() {
    const q = this.s[this.i];
    this.i++;
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (c === "\\") {
        const n = this.s[this.i + 1];
        if (n === void 0) break;
        if (n === "u") {
          if (!/^[0-9A-Fa-f]{4}$/.test(this.s.slice(this.i + 2, this.i + 6))) this.fail("invalid \\u escape");
          this.i += 6;
          continue;
        }
        if (!`bfnrt/\\'"`.includes(n) || n === "'" && q !== "'" || n === '"' && q !== '"') this.fail(`invalid escape "\\${n}"`);
        this.i += 2;
        continue;
      }
      if (c === q) {
        this.i++;
        return;
      }
      if (c.charCodeAt(0) < 32) this.fail("control character in string literal");
      this.i++;
    }
    this.fail("unterminated string literal");
  }
  logicalOr() {
    this.logicalAnd();
    for (; ; ) {
      this.ws();
      if (!this.eat("||")) return;
      this.ws();
      this.logicalAnd();
    }
  }
  logicalAnd() {
    this.basic();
    for (; ; ) {
      this.ws();
      if (!this.eat("&&")) return;
      this.ws();
      this.basic();
    }
  }
  basic() {
    this.ws();
    if (this.eat("!")) {
      this.ws();
      if (this.eat("(")) {
        this.ws();
        this.logicalOr();
        this.ws();
        this.expect(")");
        return;
      }
      this.testOperand();
      return;
    }
    if (this.eat("(")) {
      this.ws();
      this.logicalOr();
      this.ws();
      this.expect(")");
      this.maybeComparison();
      return;
    }
    this.comparable();
    this.maybeComparison();
  }
  maybeComparison() {
    const save = this.i;
    this.ws();
    const op = /^(==|!=|<=|>=|<|>)/.exec(this.s.slice(this.i));
    if (!op) {
      this.i = save;
      return;
    }
    this.i += op[0].length;
    this.ws();
    this.comparable();
  }
  testOperand() {
    const c = this.peek();
    if (c === "@" || c === "$") return void this.query(c);
    if (c && /[a-z]/.test(c)) return void this.functionExpr();
    this.fail('expected a filter query or a function after "!"');
  }
  comparable() {
    const c = this.peek();
    if (c === void 0) this.fail("unexpected end of expression");
    if (c === "@" || c === "$") return void this.query(c);
    if (c === "'" || c === '"') return void this.stringLiteral();
    const num = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][-+]?[0-9]+)?/.exec(this.s.slice(this.i));
    if (num && num[0] !== "-") {
      this.i += num[0].length;
      return;
    }
    for (const lit of ["true", "false", "null"]) {
      if (this.s.startsWith(lit, this.i) && !/[A-Za-z0-9_]/.test(this.s[this.i + lit.length] ?? "")) {
        this.i += lit.length;
        return;
      }
    }
    if (/[a-z]/.test(c)) return void this.functionExpr();
    this.fail(`unexpected "${c}"`);
  }
  functionExpr() {
    const m = /^[a-z][a-z0-9_]*/.exec(this.s.slice(this.i));
    if (!m) this.fail("expected a function name");
    this.i += m[0].length;
    if (this.peek() !== "(") this.fail(`unknown literal or missing "(" after "${m[0]}"`);
    this.i++;
    this.ws();
    if (this.eat(")")) return;
    this.logicalOr();
    this.ws();
    while (this.eat(",")) {
      this.ws();
      this.logicalOr();
      this.ws();
    }
    this.expect(")");
  }
};
function checkJsonPath(query) {
  if (!query.startsWith("$")) return `Invalid JSONPath (RFC 9535): "${query}" must start with "$"`;
  return new JsonPathChecker(query).check();
}
function checkJsonPathGoessner(query) {
  const t = query.trim();
  if (!t.startsWith("$") && !t.startsWith("@")) return `Invalid JSONPath: "${query}" must start with "$" or "@"`;
  return checkBalanced(t, "JSONPath");
}
function checkXPath(expr) {
  if (!expr.trim()) return "XPath expression is empty";
  return checkBalanced(expr, "XPath");
}
function checkBalanced(s, what) {
  const stack = [];
  const pairs = { ")": "(", "]": "[", "}": "{" };
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') quote = c;
    else if (c === "(" || c === "[" || c === "{") stack.push(c);
    else if (c === ")" || c === "]" || c === "}") {
      if (stack.pop() !== pairs[c]) return `Invalid ${what}: unbalanced "${c}" at position ${i}`;
    }
  }
  if (quote) return `Invalid ${what}: unterminated string literal`;
  if (stack.length) return `Invalid ${what}: unclosed "${stack[stack.length - 1]}"`;
  return null;
}
function checkRegex(pattern) {
  try {
    new RegExp(maskEmbedded(pattern, "x"));
    return null;
  } catch (e) {
    return `Invalid regular expression: ${e.message}`;
  }
}
function checkSimpleCondition(condition) {
  const toks = [];
  const expressions = [];
  const s = condition;
  let i = 0;
  const err = (msg) => ({ error: `Invalid simple condition "${condition}": ${msg}`, expressions });
  while (i < s.length) {
    const c = s[i];
    if (" 	\r\n".includes(c)) {
      i++;
      continue;
    }
    const rest = s.slice(i);
    let m;
    if (c === "{" && (m = /^\{(\$[^{}]*)\}/.exec(rest))) {
      toks.push({ t: "expr", v: m[1], pos: i });
      expressions.push(m[1].trim());
      i += m[0].length;
    } else if (c === "$" && (m = /^\$[A-Za-z][A-Za-z0-9_.\-#/~@]*(?:\[[^\]\s]*\][A-Za-z0-9_.\-#/~@]*)*/.exec(rest))) {
      toks.push({ t: "expr", v: m[0], pos: i });
      expressions.push(m[0]);
      i += m[0].length;
    } else if (c === "'") {
      let j = i + 1;
      let closed = false;
      while (j < s.length) {
        if (s[j] === "'" && s[j + 1] === "'") j += 2;
        else if (s[j] === "\\" && j + 1 < s.length) j += 2;
        else if (s[j] === "'") {
          closed = true;
          break;
        } else j++;
      }
      if (!closed) return err("unterminated string literal");
      toks.push({ t: "lit", v: s.slice(i, j + 1), pos: i });
      i = j + 1;
    } else if (c === '"') {
      return err("string literals must use single quotes");
    } else if (m = /^-?\d+(\.\d+)?([eE][-+]?\d+)?/.exec(rest)) {
      toks.push({ t: "lit", v: m[0], pos: i });
      i += m[0].length;
    } else if (m = /^(true|false|null)(?![A-Za-z0-9_])/.exec(rest)) {
      toks.push({ t: "lit", v: m[0], pos: i });
      i += m[0].length;
    } else if (m = /^(==|!=|<=|>=|<|>)/.exec(rest)) {
      toks.push({ t: "op", v: m[0], pos: i });
      i += m[0].length;
    } else if (rest.startsWith("&&")) {
      toks.push({ t: "and", v: "&&", pos: i });
      i += 2;
    } else if (rest.startsWith("||")) {
      toks.push({ t: "or", v: "||", pos: i });
      i += 2;
    } else if (c === "!") {
      toks.push({ t: "not", v: "!", pos: i });
      i++;
    } else if (c === "(") {
      toks.push({ t: "lp", v: c, pos: i });
      i++;
    } else if (c === ")") {
      toks.push({ t: "rp", v: c, pos: i });
      i++;
    } else {
      const word = /^[^\s()]+/.exec(rest)?.[0] ?? c;
      return err(`unexpected "${word}" at position ${i} (string literals must be quoted with ')`);
    }
  }
  if (toks.length === 0) return err("empty condition");
  let p = 0;
  const fail = (msg) => {
    throw new Error(msg);
  };
  const peek = () => toks[p];
  const operand = () => {
    const t = peek();
    if (!t) fail("unexpected end of condition");
    if (t.t === "lp") {
      p++;
      orExpr();
      if (peek()?.t !== "rp") fail(`missing ")"`);
      p++;
      return;
    }
    if (t.t === "expr" || t.t === "lit") {
      p++;
      return;
    }
    fail(`unexpected "${t.v}" at position ${t.pos}`);
  };
  const comparison = () => {
    operand();
    if (peek()?.t === "op") {
      p++;
      operand();
    }
  };
  const unary = () => {
    if (peek()?.t === "not") {
      p++;
      unary();
      return;
    }
    comparison();
  };
  const andExpr = () => {
    unary();
    while (peek()?.t === "and") {
      p++;
      unary();
    }
  };
  const orExpr = () => {
    andExpr();
    while (peek()?.t === "or") {
      p++;
      andExpr();
    }
  };
  try {
    orExpr();
    if (p < toks.length) fail(`unexpected "${toks[p].v}" at position ${toks[p].pos}`);
  } catch (e) {
    return err(e.message);
  }
  return { error: null, expressions };
}
var URI_REF_RE = /^(?:[A-Za-z][A-Za-z0-9+.-]*:)?(?:\/\/(?:[A-Za-z0-9\-._~!$&'()*+,;=:]|%[0-9A-Fa-f]{2})*@?(?:\[[0-9A-Fa-f:.vV\-._~!$&'()*+,;=]+\]|(?:[A-Za-z0-9\-._~!$&'()*+,;=]|%[0-9A-Fa-f]{2})*)(?::\d*)?)?(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/]|%[0-9A-Fa-f]{2})*(?:\?(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?(?:#(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?$/;
function isUriReference(s) {
  return URI_REF_RE.test(s);
}
function hasUriScheme(s) {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(s);
}

// src/validation/semantic.ts
var ID_RE = /^[A-Za-z0-9_\-]+$/;
var KEY_RE = /^[a-zA-Z0-9.\-_]+$/;
var SRC_WF_RE = /^\$sourceDescriptions\.([^.]+)\.(.+)$/;
var DEP_WF_STEP_RE = /^\$workflows\.([^.]+)\.steps\.([^.]+)$/;
var DEP_SRC_STEP_RE = /^\$sourceDescriptions\.([^.]+)\.([^.]+)\.steps\.([^.]+)$/;
var OP_PATH_RE = /^\{\$sourceDescriptions\.([A-Za-z0-9_\-]+)\.url\}(#.*)$/;
var CHANNEL_PATH_RE = /^\{\$sourceDescriptions\.([A-Za-z0-9_\-]+)\.url\}#\/channels\/.+$/;
var Ctx = class {
  constructor(doc, minor, report) {
    this.minor = minor;
    this.report = report;
    this.workflows = [];
    this.sites = [];
    this.sourceNames = /* @__PURE__ */ new Set();
    this.arazzoSources = /* @__PURE__ */ new Set();
    this.doc = asObj(doc);
    this.is11 = minor !== "1.0";
    asArray(this.doc.workflows).forEach((wf, index) => {
      if (!isObj(wf)) return;
      const path = ["workflows", index];
      const steps = [];
      asArray(wf.steps).forEach((s, si) => {
        if (isObj(s)) steps.push({ step: s, index: si, path: [...path, "steps", si] });
      });
      this.workflows.push({ wf, index, path, steps });
    });
    for (const s of sourcesOf(this.doc)) {
      if (typeof s.name !== "string") continue;
      this.sourceNames.add(s.name);
      if (s.type === "arazzo") this.arazzoSources.add(s.name);
    }
  }
  workflowById(id) {
    return this.workflows.find((w) => w.wf.workflowId === id);
  }
  sourceType(name) {
    return sourcesOf(this.doc).find((s) => s.name === name)?.type;
  }
};
function semanticDiagnostics(doc, minor, report, opts = {}) {
  if (!isObj(doc)) return;
  const ctx = new Ctx(doc, minor, report);
  const groups = [
    ["sites", collectSites],
    ["version", ruleVersionFeatures],
    ["self", ruleSelf],
    ["extensions", ruleReservedExtensions],
    ["ids", ruleIdentifiers],
    ["targets", ruleStepTargets],
    ["async", ruleAsync],
    ["dependsOn", ruleStepDependsOn],
    ["workflowDependsOn", ruleWorkflowDependsOn],
    ["actions", ruleActions],
    ["parameters", ruleParameters],
    ["reusable", ruleReusables],
    ["components", ruleComponents],
    ["criteria", ruleCriteria],
    ["selectors", ruleSelectors],
    ["replacements", ruleReplacements],
    ["expressions", ruleExpressions],
    ["sources", ruleSources]
  ];
  for (const [, fn] of groups) {
    try {
      fn(ctx);
    } catch (e) {
      if (opts.debug) throw e;
    }
  }
}
function addStringSites(ctx, value, path, base) {
  if (typeof value !== "string") return;
  for (const expr of expressionsInString(value)) ctx.sites.push({ ...base, path, expr });
}
function addPayloadSites(ctx, value, path, base, depth = 0) {
  if (depth > 32) return;
  if (typeof value === "string") addStringSites(ctx, value, path, base);
  else if (Array.isArray(value)) value.forEach((v, i) => addPayloadSites(ctx, v, [...path, i], base, depth + 1));
  else if (isObj(value)) {
    if (ctx.is11 && isSelector(value)) {
      addStringSites(ctx, value.context, [...path, "context"], base);
      return;
    }
    for (const [k, v] of Object.entries(value)) addPayloadSites(ctx, v, [...path, k], base, depth + 1);
  }
}
function addValueSites(ctx, value, path, base) {
  if (isObj(value) && isSelector(value)) addStringSites(ctx, value.context, [...path, "context"], base);
  else addStringSites(ctx, value, path, base);
}
function addCriteriaSites(ctx, list, path, base) {
  asArray(list).forEach((c, i) => {
    if (!isObj(c)) return;
    const cp = [...path, i];
    addStringSites(ctx, c.context, [...cp, "context"], base);
    if (typeof c.condition !== "string") return;
    const t = criterionTypeName(c.type);
    if (t === "simple") {
      const res = checkSimpleCondition(c.condition);
      for (const e of res.expressions) ctx.sites.push({ ...base, path: [...cp, "condition"], expr: e });
    } else {
      for (const e of findEmbeddedExpressions(c.condition)) ctx.sites.push({ ...base, path: [...cp, "condition"], expr: e.expression });
    }
  });
}
function addParameterSites(ctx, list, path, base) {
  asArray(list).forEach((p, i) => {
    if (!isObj(p)) return;
    if ("value" in p) addValueSites(ctx, p.value, [...path, i, "value"], base);
  });
}
function addActionSites(ctx, list, path, base) {
  asArray(list).forEach((a, i) => {
    if (!isObj(a) || "reference" in a) return;
    addCriteriaSites(ctx, a.criteria, [...path, i, "criteria"], base);
    addParameterSites(ctx, a.parameters, [...path, i, "parameters"], base);
  });
}
function addOutputSites(ctx, outputs, path, base) {
  for (const [k, v] of Object.entries(asObj(outputs))) addValueSites(ctx, v, [...path, k], base);
}
function collectSites(ctx) {
  for (const w of ctx.workflows) {
    const wbase = { wf: w };
    addParameterSites(ctx, w.wf.parameters, [...w.path, "parameters"], wbase);
    addActionSites(ctx, w.wf.successActions, [...w.path, "successActions"], wbase);
    addActionSites(ctx, w.wf.failureActions, [...w.path, "failureActions"], wbase);
    addOutputSites(ctx, w.wf.outputs, [...w.path, "outputs"], wbase);
    for (const s of w.steps) {
      const base = { wf: w, stepIndex: s.index, async: isAsyncStep(ctx.doc, s.step) };
      const st = s.step;
      if (typeof st.operationId === "string" && st.operationId.startsWith("$")) addStringSites(ctx, st.operationId, [...s.path, "operationId"], base);
      if (typeof st.workflowId === "string" && st.workflowId.startsWith("$")) addStringSites(ctx, st.workflowId, [...s.path, "workflowId"], base);
      addStringSites(ctx, st.correlationId, [...s.path, "correlationId"], base);
      addParameterSites(ctx, st.parameters, [...s.path, "parameters"], base);
      const rb = asObj(st.requestBody);
      if ("payload" in rb) addPayloadSites(ctx, rb.payload, [...s.path, "requestBody", "payload"], base);
      asArray(rb.replacements).forEach((r, i) => {
        if (isObj(r) && "value" in r) addValueSites(ctx, r.value, [...s.path, "requestBody", "replacements", i, "value"], base);
      });
      addCriteriaSites(ctx, st.successCriteria, [...s.path, "successCriteria"], base);
      addActionSites(ctx, st.onSuccess, [...s.path, "onSuccess"], base);
      addActionSites(ctx, st.onFailure, [...s.path, "onFailure"], base);
      addOutputSites(ctx, st.outputs, [...s.path, "outputs"], base);
    }
  }
  const comps = asObj(ctx.doc.components);
  const cbase = { component: true };
  for (const [k, p] of Object.entries(asObj(comps.parameters))) {
    if (isObj(p) && "value" in p) addValueSites(ctx, p.value, ["components", "parameters", k, "value"], cbase);
  }
  for (const kind of ["successActions", "failureActions"]) {
    for (const [k, a] of Object.entries(asObj(comps[kind]))) {
      if (!isObj(a)) continue;
      addCriteriaSites(ctx, a.criteria, ["components", kind, k, "criteria"], cbase);
      addParameterSites(ctx, a.parameters, ["components", kind, k, "parameters"], cbase);
    }
  }
}
function detect11Features(doc) {
  const out = [];
  const d = asObj(doc);
  const err = (path, feature) => out.push({ path, feature, severity: "error" });
  const warn = (path, feature) => out.push({ path, feature, severity: "warning" });
  if ("$self" in d) err(["$self"], '"$self"');
  asArray(d.sourceDescriptions).forEach((s, i) => {
    if (isObj(s) && s.type === "asyncapi") err(["sourceDescriptions", i, "type"], "type: asyncapi");
  });
  const params = (list, path) => asArray(list).forEach((p, i) => {
    if (!isObj(p)) return;
    if (p.in === "querystring" || p.in === "channel") err([...path, i, "in"], `in: ${p.in}`);
    if (isSelector(p.value)) warn([...path, i, "value"], "Selector Object (taken as a literal object by Arazzo 1.0)");
  });
  const criteria = (list, path) => asArray(list).forEach((c, i) => {
    if (!isObj(c) || !isObj(c.type)) return;
    const t = c.type;
    if (t.type === "jsonpointer" || t.version === "rfc9535" || t.version === "xpath-31") err([...path, i, "type"], `expression type ${t.type}/${t.version}`);
  });
  const actions = (list, path) => asArray(list).forEach((a, i) => {
    if (!isObj(a)) return;
    if ("parameters" in a && !("reference" in a)) err([...path, i, "parameters"], 'action "parameters"');
    criteria(a.criteria, [...path, i, "criteria"]);
  });
  const outputs = (o, path) => {
    for (const [k, v] of Object.entries(asObj(o))) if (isObj(v)) err([...path, k], "Selector Object in outputs");
  };
  const payloadSelectors = (v, path, depth = 0) => {
    if (depth > 32) return;
    if (isSelector(v)) warn(path, "Selector Object in payload (taken as a literal object by Arazzo 1.0)");
    else if (Array.isArray(v)) v.forEach((x, i) => payloadSelectors(x, [...path, i], depth + 1));
    else if (isObj(v)) for (const [k, x] of Object.entries(v)) payloadSelectors(x, [...path, k], depth + 1);
  };
  asArray(d.workflows).forEach((w, wi) => {
    if (!isObj(w)) return;
    const wp = ["workflows", wi];
    params(w.parameters, [...wp, "parameters"]);
    actions(w.successActions, [...wp, "successActions"]);
    actions(w.failureActions, [...wp, "failureActions"]);
    outputs(w.outputs, [...wp, "outputs"]);
    asArray(w.steps).forEach((s, si) => {
      if (!isObj(s)) return;
      const sp = [...wp, "steps", si];
      for (const f of ["channelPath", "action", "correlationId", "timeout", "dependsOn"]) if (f in s) err([...sp, f], `"${f}"`);
      params(s.parameters, [...sp, "parameters"]);
      criteria(s.successCriteria, [...sp, "successCriteria"]);
      actions(s.onSuccess, [...sp, "onSuccess"]);
      actions(s.onFailure, [...sp, "onFailure"]);
      outputs(s.outputs, [...sp, "outputs"]);
      const rb = asObj(s.requestBody);
      if ("payload" in rb) payloadSelectors(rb.payload, [...sp, "requestBody", "payload"]);
      asArray(rb.replacements).forEach((r, ri) => {
        if (!isObj(r)) return;
        if ("targetSelectorType" in r) err([...sp, "requestBody", "replacements", ri, "targetSelectorType"], '"targetSelectorType"');
        if (isObj(r.value)) err([...sp, "requestBody", "replacements", ri, "value"], "Selector Object in a payload replacement");
      });
    });
  });
  const comps = asObj(d.components);
  for (const [k, p] of Object.entries(asObj(comps.parameters))) {
    if (!isObj(p)) continue;
    if (p.in === "querystring" || p.in === "channel") err(["components", "parameters", k, "in"], `in: ${p.in}`);
    if (isSelector(p.value)) warn(["components", "parameters", k, "value"], "Selector Object (taken as a literal object by Arazzo 1.0)");
  }
  for (const kind of ["successActions", "failureActions"]) {
    for (const [k, a] of Object.entries(asObj(comps[kind]))) {
      if (!isObj(a)) continue;
      if ("parameters" in a) err(["components", kind, k, "parameters"], 'action "parameters"');
      criteria(a.criteria, ["components", kind, k, "criteria"]);
    }
  }
  return out;
}
function featureMessage(feature, version) {
  return `${feature} requires Arazzo 1.1 but the document declares arazzo: ${version}. Migrate the document to arazzo: 1.1.0.`;
}
function ruleVersionFeatures(ctx) {
  if (ctx.minor !== "1.0") return;
  const version = String(ctx.doc.arazzo);
  for (const f of detect11Features(ctx.doc)) ctx.report("arazzo-version-feature-mismatch", f.path, featureMessage(f.feature, version), f.severity);
}
function ruleSelf(ctx) {
  if (!ctx.is11) return;
  const self = ctx.doc.$self;
  if (self === void 0) {
    if (ctx.minor === "1.1") ctx.report("arazzo-self-recommended", ["$self"], 'Arazzo 1.1: declare "$self" (canonical URI of this document) so that other documents can reference it by identity');
    return;
  }
  if (typeof self !== "string") return;
  const noFragment = self.split("#")[0];
  if (!isUriReference(noFragment)) {
    ctx.report("arazzo-self-uri-reference", ["$self"], `"$self" must be a valid URI-reference (RFC 3986), got ${JSON.stringify(self)}`);
    return;
  }
  if (!hasUriScheme(self)) {
    ctx.report("arazzo-self-relative", ["$self"], `Relative "$self" (${JSON.stringify(self)}) is resolved against the retrieval URI; an absolute URI is more portable`);
  }
}
var RESERVED_EXT_RE = /^x-(oai-|oas-|arazzo)/;
var OPAQUE_FIELDS = /* @__PURE__ */ new Set(["inputs", "payload"]);
var NAME_MAPS = /* @__PURE__ */ new Set(["outputs", "parameters", "successActions", "failureActions"]);
function ruleReservedExtensions(ctx) {
  const walk2 = (node, path, parentKey, depth) => {
    if (depth > 40) return;
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk2(v, [...path, i], parentKey, depth + 1));
      return;
    }
    if (!isObj(node)) return;
    const isNameMap = parentKey !== void 0 && NAME_MAPS.has(parentKey) && path[path.length - 2] === "components";
    const isOutputs = parentKey === "outputs";
    for (const [k, v] of Object.entries(node)) {
      if (!isNameMap && !isOutputs && k.startsWith("x-")) {
        if (RESERVED_EXT_RE.test(k)) ctx.report("arazzo-extension-reserved-prefix", [...path, k], `Extension "${k}" uses a prefix reserved by the OpenAPI Initiative (x-oai-, x-oas-, x-arazzo)`);
        continue;
      }
      if (OPAQUE_FIELDS.has(k) && !isNameMap) continue;
      if (k === "value" && !isSelector(v)) continue;
      walk2(v, [...path, k], k, depth + 1);
    }
  };
  walk2(ctx.doc, [], void 0, 0);
}
function ruleIdentifiers(ctx) {
  const seenWf = /* @__PURE__ */ new Map();
  for (const w of ctx.workflows) {
    const id = w.wf.workflowId;
    if (typeof id === "string") {
      if (seenWf.has(id)) ctx.report("arazzo-workflow-id-unique", [...w.path, "workflowId"], `Duplicate workflowId "${id}" (already defined by workflows[${seenWf.get(id)}])`);
      else seenWf.set(id, w.index);
      if (!ID_RE.test(id)) ctx.report("arazzo-id-pattern", [...w.path, "workflowId"], `workflowId "${id}" should match [A-Za-z0-9_-]+ to be referenceable in runtime expressions`);
    }
    const seenStep = /* @__PURE__ */ new Map();
    for (const s of w.steps) {
      const sid = s.step.stepId;
      if (typeof sid !== "string") continue;
      if (seenStep.has(sid)) {
        ctx.report("arazzo-step-id-unique", [...s.path, "stepId"], `Duplicate stepId "${sid}" in workflow "${String(w.wf.workflowId)}" (already defined by steps[${seenStep.get(sid)}])`);
      } else seenStep.set(sid, s.index);
      if (!ID_RE.test(sid)) ctx.report("arazzo-id-pattern", [...s.path, "stepId"], `stepId "${sid}" should match [A-Za-z0-9_-]+ to be referenceable in runtime expressions`);
    }
    checkOutputKeys(ctx, w.wf.outputs, [...w.path, "outputs"]);
    for (const s of w.steps) checkOutputKeys(ctx, s.step.outputs, [...s.path, "outputs"]);
  }
  const seenSrc = /* @__PURE__ */ new Map();
  asArray(ctx.doc.sourceDescriptions).forEach((s, i) => {
    if (!isObj(s) || typeof s.name !== "string") return;
    if (seenSrc.has(s.name)) ctx.report("arazzo-source-name-unique", ["sourceDescriptions", i, "name"], `Duplicate source description name "${s.name}" (already defined by sourceDescriptions[${seenSrc.get(s.name)}])`);
    else seenSrc.set(s.name, i);
  });
}
function checkOutputKeys(ctx, outputs, path) {
  for (const k of Object.keys(asObj(outputs))) {
    if (!KEY_RE.test(k)) ctx.report("arazzo-key-pattern", [...path, k], `Invalid output name "${k}": keys must match ^[a-zA-Z0-9.\\-_]+$`);
  }
}
function ruleStepTargets(ctx) {
  const targetList = ctx.is11 ? '"operationId", "operationPath", "workflowId" or "channelPath"' : '"operationId", "operationPath" or "workflowId"';
  const opSources = operationSources(ctx.doc);
  for (const w of ctx.workflows) {
    for (const s of w.steps) {
      const st = s.step;
      const targets = stepTargets(st).filter((t) => ctx.is11 || t !== "channelPath");
      if (targets.length === 0 && !(!ctx.is11 && st.channelPath !== void 0)) ctx.report("arazzo-step-target-missing", s.path, `Step must define one of ${targetList}`);
      else if (targets.length > 1) ctx.report("arazzo-step-target-exclusive", s.path, `Step must define only one of ${targetList} (found ${targets.join(", ")})`);
      const opId = str(st.operationId);
      if (opId !== void 0 && opSources.length > 1 && !opId.startsWith("$sourceDescriptions.")) {
        const dot = opId.indexOf(".");
        const hint = dot > 0 && ctx.sourceNames.has(opId.slice(0, dot)) ? `$sourceDescriptions.${opId}` : `$sourceDescriptions.<name>.${opId}`;
        ctx.report("arazzo-step-operation-id-qualified", [...s.path, "operationId"], `With several source descriptions, operationId must be qualified: use "${hint}"`);
      }
      const opPath = str(st.operationPath);
      if (opPath !== void 0) {
        const m = OP_PATH_RE.exec(opPath);
        const ptrErr = m ? checkJsonPointer(m[2]) : null;
        if (!m || ptrErr || m[2] === "#") {
          ctx.report(
            "arazzo-step-operation-path-format",
            [...s.path, "operationPath"],
            `operationPath must be "{$sourceDescriptions.<name>.url}#<json-pointer>", e.g. "{$sourceDescriptions.api.url}#/paths/~1pets/get"${ptrErr ? ` (${ptrErr})` : ""}`
          );
        }
        if (m && !ctx.sourceNames.has(m[1])) {
          ctx.report("arazzo-expression-source-resolved", [...s.path, "operationPath"], `operationPath: source description "${m[1]}" not found`);
        } else if (m) {
          const t = ctx.sourceType(m[1]);
          if (t === "asyncapi" || t === "arazzo") {
            ctx.report("arazzo-step-operation-path-source-type", [...s.path, "operationPath"], `operationPath must reference an OpenAPI source ("${m[1]}" is of type ${t})${t === "asyncapi" ? "; use channelPath or operationId with an action" : ""}`);
          }
        }
      }
      const channelPath = str(st.channelPath);
      if (ctx.is11 && channelPath !== void 0) {
        if (!CHANNEL_PATH_RE.test(channelPath)) {
          ctx.report("arazzo-channel-path-format", [...s.path, "channelPath"], `channelPath should be "{$sourceDescriptions.<name>.url}#/channels/<channelKey>" (got ${JSON.stringify(channelPath)})`);
        }
        const m = /^\{\$sourceDescriptions\.([A-Za-z0-9_\-]+)\.url\}/.exec(channelPath);
        const t = m ? ctx.sourceType(m[1]) : void 0;
        if (m && !ctx.sourceNames.has(m[1])) {
          ctx.report("arazzo-expression-source-resolved", [...s.path, "channelPath"], `channelPath: source description "${m[1]}" not found`);
        } else if (m && t !== void 0 && t !== "asyncapi") {
          ctx.report("arazzo-channel-path-source-type", [...s.path, "channelPath"], `channelPath must reference an AsyncAPI source ("${m[1]}" is of type ${t})`);
        }
      }
      const wfId = str(st.workflowId);
      if (wfId !== void 0) {
        checkWorkflowReference(ctx, wfId, [...s.path, "workflowId"], "arazzo-step-workflow-resolved", "arazzo-step-workflow-qualified");
        if (st.requestBody !== void 0) ctx.report("arazzo-step-workflow-requestbody", [...s.path, "requestBody"], "requestBody has no effect on a step that calls a workflow: pass data with parameters (mapped to the workflow inputs)");
      }
      if (opPath !== void 0 || ctx.is11 && (st.channelPath !== void 0 || st.action !== void 0)) {
        const src = resolveStepSource(ctx.doc, st);
        if (src.name && src.type === void 0) {
          const i = asArray(ctx.doc.sourceDescriptions).findIndex((x) => isObj(x) && x.name === src.name);
          ctx.report("arazzo-source-type-recommended", ["sourceDescriptions", i, "type"], `Source "${src.name}" should declare its "type" (openapi, asyncapi or arazzo): it is used by step "${String(st.stepId)}"`);
        }
      }
    }
  }
}
function checkWorkflowReference(ctx, ref, path, resolvedCode, qualifiedCode) {
  const m = SRC_WF_RE.exec(ref);
  if (m) {
    const name = m[1];
    if (!ctx.sourceNames.has(name)) return;
    const t = ctx.sourceType(name);
    if (t !== void 0 && t !== "arazzo") ctx.report(resolvedCode, path, `"${ref}": source "${name}" is of type ${t}, workflows can only be referenced from sources of type arazzo`);
    return;
  }
  if (ref.startsWith("$")) {
    ctx.report(resolvedCode, path, `Invalid workflow reference "${ref}": expected a local workflowId or "$sourceDescriptions.<name>.<workflowId>"`);
    return;
  }
  if (ctx.workflowById(ref)) return;
  if (ctx.arazzoSources.size > 0) {
    ctx.report(qualifiedCode, path, `Workflow "${ref}" is not defined in this document; a workflow of another Arazzo document must be referenced as "$sourceDescriptions.<name>.${ref}"`);
  } else {
    ctx.report(resolvedCode, path, `Referenced workflow "${ref}" not found in this document`);
  }
}
function ruleAsync(ctx) {
  if (!ctx.is11) return;
  for (const w of ctx.workflows) {
    for (const s of w.steps) {
      const st = s.step;
      const src = resolveStepSource(ctx.doc, st);
      const action = st.action;
      const isOpenApiTarget = st.operationPath !== void 0 || st.workflowId !== void 0 || st.operationId !== void 0 && st.channelPath === void 0 && (src.type === "openapi" || src.type === "arazzo");
      const async = isAsyncStep(ctx.doc, st);
      if (action !== void 0 && action !== "send" && action !== "receive") {
        ctx.report("arazzo-async-action-enum", [...s.path, "action"], `Invalid action ${JSON.stringify(action)}: expected "send" or "receive"`);
      }
      if (action !== void 0 && isOpenApiTarget) {
        const why = st.operationPath !== void 0 ? "operationPath (OpenAPI)" : st.workflowId !== void 0 ? "a workflow" : `source "${src.name}" of type ${src.type}`;
        ctx.report("arazzo-async-action-only-asyncapi", [...s.path, "action"], `"action" only applies to AsyncAPI steps; this step targets ${why}`);
      }
      if (action === void 0 && (st.channelPath !== void 0 || st.operationId !== void 0 && src.type === "asyncapi")) {
        ctx.report("arazzo-async-action-required", [...s.path, "action"], 'An AsyncAPI step must declare "action" (send or receive)');
      }
      if (st.correlationId !== void 0) {
        if (isOpenApiTarget || !async) {
          ctx.report("arazzo-async-correlation-only-asyncapi", [...s.path, "correlationId"], '"correlationId" only applies to AsyncAPI steps with action: receive');
        } else if (action !== "receive") {
          ctx.report("arazzo-async-correlation-receive-only", [...s.path, "correlationId"], '"correlationId" is only allowed with action: receive');
        }
        if (typeof st.correlationId !== "string") {
          ctx.report("arazzo-async-correlation-type", [...s.path, "correlationId"], '"correlationId" should be a string, typically a runtime expression such as $inputs.orderId');
        }
      }
      if (typeof st.timeout === "number" && Number.isInteger(st.timeout) && st.timeout <= 0) {
        ctx.report("arazzo-step-timeout-positive", [...s.path, "timeout"], `"timeout" should be a positive number of milliseconds (got ${st.timeout})`);
      }
      if (action === "receive") {
        if (st.timeout === void 0) ctx.report("arazzo-async-receive-timeout-recommended", [...s.path, "timeout"], `Step "${String(st.stepId)}" receives a message without "timeout": it may wait indefinitely`);
        if (st.successCriteria === void 0) ctx.report("arazzo-async-receive-success-criteria", [...s.path, "successCriteria"], `Step "${String(st.stepId)}" receives a message without "successCriteria": consider checking $message.payload`);
      }
      for (const r of resolveList(ctx.doc, st.parameters, "parameters")) {
        const loc = r.value.in;
        const ppath = r.reference ? [...s.path, "parameters", r.index] : [...s.path, "parameters", r.index, "in"];
        if (loc === "channel") {
          if (async && !isOpenApiTarget) ctx.report("arazzo-param-in-channel", ppath, '"in: channel" is accepted by the 1.1 schema and clarified after 1.1.0 (AsyncAPI channel parameter)', "info");
          else ctx.report("arazzo-param-in-channel", ppath, '"in: channel" only applies to AsyncAPI steps');
        } else if (async && !isOpenApiTarget && typeof loc === "string" && loc !== "header") {
          ctx.report("arazzo-async-param-in", ppath, `"in: ${loc}" has no meaning for a message: AsyncAPI step parameters should use "header" or "channel"`);
        }
      }
    }
  }
}
function stepIndexById(w, id) {
  const s = w.steps.find((x) => x.step.stepId === id);
  return s ? s.index : -1;
}
function ruleStepDependsOn(ctx) {
  if (!ctx.is11) return;
  const edges = /* @__PURE__ */ new Map();
  const nodePath = /* @__PURE__ */ new Map();
  const addEdge = (from, to) => {
    if (!edges.has(from)) edges.set(from, /* @__PURE__ */ new Set());
    edges.get(from).add(to);
  };
  for (const w of ctx.workflows) {
    const wfHasDependsOn = w.steps.some((s) => Array.isArray(s.step.dependsOn) && s.step.dependsOn.length > 0);
    const wfHasAsync = w.steps.some((s) => isAsyncStep(ctx.doc, s.step));
    for (const s of w.steps) {
      const sid = s.step.stepId;
      if (typeof sid !== "string") continue;
      const node = `${w.index}/${sid}`;
      const deps = s.step.dependsOn;
      nodePath.set(node, Array.isArray(deps) ? [...s.path, "dependsOn"] : s.path);
      if (Array.isArray(deps)) {
        let reportedSync = false;
        if (deps.length > 0 && !wfHasAsync) {
          ctx.report("arazzo-step-depends-on-sync", [...s.path, "dependsOn"], `Workflow "${String(w.wf.workflowId)}" has no asynchronous step: "dependsOn" is intended for asynchronous steps, the order of the steps array is recommended instead`);
          reportedSync = true;
        }
        deps.forEach((d, i) => {
          if (typeof d !== "string") return;
          const dpath = [...s.path, "dependsOn", i];
          let m;
          if (m = DEP_WF_STEP_RE.exec(d)) {
            const target = ctx.workflowById(m[1]);
            if (!target) return void ctx.report("arazzo-step-depends-on-resolved", dpath, `dependsOn "${d}": workflow "${m[1]}" not found`);
            if (stepIndexById(target, m[2]) < 0) return void ctx.report("arazzo-step-depends-on-resolved", dpath, `dependsOn "${d}": step "${m[2]}" not found in workflow "${m[1]}"`);
            if (target === w && m[2] === sid) return void ctx.report("arazzo-step-depends-on-self", dpath, `Step "${sid}" cannot depend on itself`);
            addEdge(node, `${target.index}/${m[2]}`);
          } else if (m = DEP_SRC_STEP_RE.exec(d)) {
            const t = ctx.sourceType(m[1]);
            if (!ctx.sourceNames.has(m[1])) ctx.report("arazzo-step-depends-on-resolved", dpath, `dependsOn "${d}": source description "${m[1]}" not found`);
            else if (t !== void 0 && t !== "arazzo") ctx.report("arazzo-step-depends-on-resolved", dpath, `dependsOn "${d}": source "${m[1]}" must be of type arazzo (got ${t})`);
          } else if (!d.startsWith("$")) {
            if (d === sid) return void ctx.report("arazzo-step-depends-on-self", dpath, `Step "${sid}" cannot depend on itself`);
            const idx = stepIndexById(w, d);
            if (idx < 0) return void ctx.report("arazzo-step-depends-on-resolved", dpath, `dependsOn "${d}": step not found in workflow "${String(w.wf.workflowId)}"`);
            addEdge(node, `${w.index}/${d}`);
            const target = w.steps.find((x) => x.index === idx);
            if (!reportedSync && !isAsyncStep(ctx.doc, target.step)) {
              ctx.report("arazzo-step-depends-on-sync", dpath, `dependsOn "${d}" targets a synchronous step: the order of the steps array already guarantees it completes first`);
            }
          }
        });
      }
    }
    for (const site of ctx.sites) {
      if (site.wf !== w || site.stepIndex === void 0) continue;
      const parsed = parseRuntimeExpression(site.expr);
      if (!parsed.ok || parsed.expression.root !== "steps" || !parsed.expression.id) continue;
      const from = w.steps.find((x) => x.index === site.stepIndex);
      const fromId = from?.step.stepId;
      const targetIdx = stepIndexById(w, parsed.expression.id);
      if (typeof fromId !== "string" || targetIdx < 0 || parsed.expression.id === fromId) continue;
      addEdge(`${w.index}/${fromId}`, `${w.index}/${parsed.expression.id}`);
      if (!wfHasDependsOn && targetIdx > site.stepIndex) {
        ctx.report("arazzo-step-forward-output-reference", site.path, `Step "${fromId}" references the outputs of step "${parsed.expression.id}", which comes later in the steps array (and no dependsOn is declared)`);
      }
    }
  }
  for (const cycle of stronglyConnected(edges)) {
    if (cycle.length < 2) continue;
    const names = cycle.map((n) => n.split("/").slice(1).join("/"));
    for (const n of cycle) {
      const p = nodePath.get(n);
      if (p) ctx.report("arazzo-step-depends-on-cycle", p, `Dependency cycle between steps: ${names.join(" \u2192 ")} \u2192 ${names[0]} (explicit dependsOn and $steps.<id>.outputs references)`);
    }
  }
}
function stronglyConnected(edges) {
  let index = 0;
  const idx = /* @__PURE__ */ new Map();
  const low = /* @__PURE__ */ new Map();
  const onStack = /* @__PURE__ */ new Set();
  const stack = [];
  const out = [];
  const nodes = /* @__PURE__ */ new Set([...edges.keys(), ...[...edges.values()].flatMap((s) => [...s])]);
  const visit = (v) => {
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);
    for (const w of edges.get(v) ?? []) {
      if (!idx.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
    }
    if (low.get(v) === idx.get(v)) {
      const comp = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      out.push(comp.reverse());
    }
  };
  for (const n of nodes) if (!idx.has(n)) visit(n);
  return out;
}
function ruleWorkflowDependsOn(ctx) {
  const edges = /* @__PURE__ */ new Map();
  for (const w of ctx.workflows) {
    const id = w.wf.workflowId;
    asArray(w.wf.dependsOn).forEach((d, i) => {
      if (typeof d !== "string") return;
      const path = [...w.path, "dependsOn", i];
      if (d.startsWith("$")) {
        checkWorkflowReference(ctx, d, path, "arazzo-workflow-depends-on-resolved", "arazzo-workflow-depends-on-qualified");
        return;
      }
      if (d === id) {
        ctx.report("arazzo-workflow-depends-on-cycle", path, `Workflow "${d}" cannot depend on itself`);
        return;
      }
      if (!ctx.workflowById(d)) {
        if (ctx.arazzoSources.size > 0) ctx.report("arazzo-workflow-depends-on-qualified", path, `Workflow "${d}" is not defined in this document; a workflow of another Arazzo document must be referenced as "$sourceDescriptions.<name>.${d}"`);
        else ctx.report("arazzo-workflow-depends-on-resolved", path, `Referenced workflow "${d}" not found in dependsOn`);
        return;
      }
      if (typeof id === "string") {
        if (!edges.has(id)) edges.set(id, /* @__PURE__ */ new Set());
        edges.get(id).add(d);
      }
    });
  }
  for (const comp of stronglyConnected(edges)) {
    if (comp.length < 2) continue;
    for (const id of comp) {
      const w = ctx.workflowById(id);
      if (w) ctx.report("arazzo-workflow-depends-on-cycle", [...w.path, "dependsOn"], `Dependency cycle between workflows: ${comp.join(" \u2192 ")} \u2192 ${comp[0]}`);
    }
  }
}
function actionLists(ctx) {
  const out = [];
  for (const w of ctx.workflows) {
    out.push({ list: w.wf.successActions, path: [...w.path, "successActions"], kind: "success", wf: w });
    out.push({ list: w.wf.failureActions, path: [...w.path, "failureActions"], kind: "failure", wf: w });
    for (const s of w.steps) {
      out.push({ list: s.step.onSuccess, path: [...s.path, "onSuccess"], kind: "success", wf: w });
      out.push({ list: s.step.onFailure, path: [...s.path, "onFailure"], kind: "failure", wf: w });
    }
  }
  return out;
}
function checkAction(ctx, a, path, wf, refPath) {
  const type = a.type;
  const at = (field) => refPath ?? [...path, field];
  const via = refPath ? ` (component action "${String(a.name)}")` : "";
  if (!refPath) {
    if (a.stepId !== void 0 && a.workflowId !== void 0 && type !== "goto") {
      ctx.report("arazzo-action-target-exclusive", path, `Action "${String(a.name)}": "stepId" and "workflowId" are mutually exclusive`);
    }
    if (type === "end") {
      for (const f of ["stepId", "workflowId"]) if (a[f] !== void 0) ctx.report("arazzo-action-field-irrelevant", [...path, f], `"${f}" has no effect on an "end" action`);
    }
    if (type !== "retry") {
      for (const f of ["retryAfter", "retryLimit"]) if (a[f] !== void 0) ctx.report("arazzo-action-field-irrelevant", [...path, f], `"${f}" only applies to "retry" actions`);
    }
  }
  if (type === "goto" || type === "retry") {
    if (typeof a.stepId === "string" && wf && stepIndexById(wf, a.stepId) < 0) {
      ctx.report("arazzo-action-goto-step-exists", at("stepId"), `Target step "${a.stepId}" not found in workflow "${String(wf.wf.workflowId)}"${via}`);
    }
    if (typeof a.workflowId === "string" && !refPath) {
      checkWorkflowReference(ctx, a.workflowId, [...path, "workflowId"], "arazzo-action-goto-workflow-exists", "arazzo-action-goto-workflow-exists");
    }
  }
  if (!refPath && ctx.is11 && a.parameters !== void 0) checkActionParameters(ctx, a, path);
}
function checkActionParameters(ctx, a, path) {
  const plist = asArray(a.parameters);
  plist.forEach((p, i) => {
    const ip = [...path, "parameters", i];
    if (!isObj(p)) return void ctx.report("arazzo-action-parameters-shape", ip, "Action parameters must be Parameter Objects (name, value) or Reusable Objects ($components.parameters.*)");
    if ("reference" in p) {
      const ref = typeof p.reference === "string" ? parseComponentReference(p.reference) : void 0;
      if (!ref || ref.kind !== "parameters") ctx.report("arazzo-action-parameters-shape", [...ip, "reference"], "A Reusable Object in action parameters must reference $components.parameters.<name>");
      return;
    }
    if (typeof p.name !== "string" || !("value" in p)) ctx.report("arazzo-action-parameters-shape", ip, 'Action parameters must define "name" and "value"');
    if ("in" in p) ctx.report("arazzo-action-parameters-no-in", [...ip, "in"], '"in" MUST NOT be used in action parameters (they are mapped to the inputs of the target workflow)');
  });
  if (typeof a.workflowId === "string") checkParametersMatchInputs(ctx, a.workflowId, a.parameters, path, []);
}
function checkParametersMatchInputs(ctx, workflowId, list, hostPath, extraProvided) {
  const target = ctx.workflowById(workflowId);
  if (!target) return;
  const inputs = workflowInputNames(ctx.doc, target.wf);
  if (!inputs) return;
  const provided = new Set(extraProvided);
  for (const r of resolveList(ctx.doc, list, "parameters")) {
    const name = r.value.name;
    if (typeof name !== "string") continue;
    provided.add(name);
    if (!inputs.names.has(name)) {
      const p = r.reference ? [...hostPath, "parameters", r.index] : [...hostPath, "parameters", r.index, "name"];
      ctx.report("arazzo-workflow-parameters-match-inputs", p, `Workflow "${workflowId}" has no input named "${name}"${inputs.names.size ? ` (inputs: ${[...inputs.names].join(", ")})` : ""}`);
    }
  }
  const missing = inputs.required.filter((r) => !provided.has(r));
  if (missing.length) {
    ctx.report("arazzo-workflow-parameters-match-inputs", [...hostPath, "parameters"], `Required input${missing.length > 1 ? "s" : ""} of workflow "${workflowId}" not provided: ${missing.join(", ")}`);
  }
}
function ruleActions(ctx) {
  for (const l of actionLists(ctx)) {
    const kind = l.kind === "success" ? "successActions" : "failureActions";
    asArray(l.list).forEach((a, i) => {
      if (!isObj(a)) return;
      const ip = [...l.path, i];
      if ("reference" in a) {
        const ref = typeof a.reference === "string" ? parseComponentReference(a.reference) : void 0;
        if (!ref || ref.kind !== kind) return;
        const comp = componentOf(ctx.doc, kind, ref.name);
        if (isObj(comp)) checkAction(ctx, comp, ip, l.wf, [...ip, "reference"]);
        return;
      }
      checkAction(ctx, a, ip, l.wf);
    });
    const seen = /* @__PURE__ */ new Map();
    for (const r of resolveList(ctx.doc, l.list, kind)) {
      const name = r.value.name;
      if (typeof name !== "string") continue;
      if (seen.has(name)) ctx.report("arazzo-action-name-unique", [...l.path, r.index], `Duplicate action name "${name}" in this list (already used by item ${seen.get(name)})`);
      else seen.set(name, r.index);
    }
  }
  const comps = asObj(ctx.doc.components);
  for (const kind of ["successActions", "failureActions"]) {
    for (const [k, a] of Object.entries(asObj(comps[kind]))) if (isObj(a)) checkAction(ctx, a, ["components", kind, k], void 0);
  }
}
function resolvedParams(ctx, list, path) {
  return resolveList(ctx.doc, list, "parameters").map((r) => ({ param: r.value, path: [...path, r.index] }));
}
function ruleParameters(ctx) {
  const unique = (list, path, byNameOnly) => {
    const seen = /* @__PURE__ */ new Map();
    for (const r of resolveList(ctx.doc, list, "parameters")) {
      if (typeof r.value.name !== "string") continue;
      const key = byNameOnly ? r.value.name : `${r.value.name}\0${String(r.value.in ?? "")}`;
      if (seen.has(key)) {
        ctx.report("arazzo-parameter-unique", [...path, r.index], `Duplicate parameter "${r.value.name}"${!byNameOnly && r.value.in ? ` (in: ${String(r.value.in)})` : ""} (already defined by item ${seen.get(key)})`);
      } else seen.set(key, r.index);
    }
  };
  for (const w of ctx.workflows) {
    unique(w.wf.parameters, [...w.path, "parameters"], false);
    const wfParams = resolvedParams(ctx, w.wf.parameters, [...w.path, "parameters"]);
    for (const s of w.steps) {
      const st = s.step;
      const isWorkflowStep = typeof st.workflowId === "string";
      unique(st.parameters, [...s.path, "parameters"], isWorkflowStep);
      if (isWorkflowStep) {
        asArray(st.parameters).forEach((p, i) => {
          if (isObj(p) && !("reference" in p) && p.in !== void 0) {
            ctx.report("arazzo-workflow-step-param-in", [...s.path, "parameters", i, "in"], '"in" is ignored for a step that calls a workflow: parameters are mapped to the workflow inputs');
          }
        });
        const fromWf = wfParams.map((p) => p.param.name).filter((n) => typeof n === "string");
        checkParametersMatchInputs(ctx, st.workflowId, st.parameters, s.path, fromWf);
        continue;
      }
      if (!ctx.is11) continue;
      const eff = /* @__PURE__ */ new Map();
      for (const p of [...wfParams, ...resolvedParams(ctx, st.parameters, [...s.path, "parameters"])]) {
        if (typeof p.param.name !== "string") continue;
        eff.set(`${p.param.name}\0${String(p.param.in ?? "")}`, p);
      }
      const all = [...eff.values()];
      const qs = all.filter((p) => p.param.in === "querystring");
      const q = all.filter((p) => p.param.in === "query");
      if (qs.length && q.length) {
        for (const p of qs) {
          ctx.report("arazzo-param-querystring-exclusive", [...p.path, "in"], `"in: querystring" cannot coexist with "in: query" parameters for the same operation (${q.map((x) => String(x.param.name)).join(", ")})`);
        }
      }
      qs.slice(1).forEach((p) => ctx.report("arazzo-param-querystring-single", [...p.path, "in"], `Only one "in: querystring" parameter is allowed per operation (OAS 3.2); "${String(qs[0].param.name)}" already sets the query string`));
    }
  }
  if (!ctx.is11) return;
  const checkQsValue = (p, path) => {
    if (!isObj(p) || p.in !== "querystring" || !("value" in p)) return;
    const v = p.value;
    if (typeof v !== "string" && !isSelector(v)) {
      ctx.report("arazzo-param-querystring-string", [...path, "value"], `The value of a querystring parameter must resolve to a string such as "a=1&b=2" (got ${Array.isArray(v) ? "an array" : v === null ? "null" : typeof v})`);
    }
  };
  for (const w of ctx.workflows) {
    asArray(w.wf.parameters).forEach((p, i) => checkQsValue(p, [...w.path, "parameters", i]));
    for (const s of w.steps) asArray(s.step.parameters).forEach((p, i) => checkQsValue(p, [...s.path, "parameters", i]));
  }
  for (const [k, p] of Object.entries(asObj(asObj(ctx.doc.components).parameters))) checkQsValue(p, ["components", "parameters", k]);
}
function ruleReusables(ctx) {
  const check = (list, path, expected) => {
    asArray(list).forEach((item, i) => {
      if (!isObj(item) || !("reference" in item)) return;
      const ip = [...path, i];
      const refStr = item.reference;
      if (typeof refStr !== "string") return;
      if (/^\$components\.inputs\./.test(refStr.trim())) {
        ctx.report("arazzo-components-inputs-ref", [...ip, "reference"], `"${refStr}" is not a runtime expression: reference reusable inputs with "$ref: '#/components/inputs/<name>'" inside "inputs"`);
        return;
      }
      const ref = parseComponentReference(refStr);
      if (!ref) {
        ctx.report("arazzo-reusable-reference-resolved", [...ip, "reference"], `Invalid reference "${refStr}": expected $components.${expected}.<name>`);
        return;
      }
      if (ref.kind !== expected) {
        ctx.report("arazzo-reusable-reference-kind", [...ip, "reference"], `"${refStr}" references ${ref.kind}, but this list expects $components.${expected}.*`);
      } else if (componentOf(ctx.doc, ref.kind, ref.name) === void 0) {
        ctx.report("arazzo-reusable-reference-resolved", [...ip, "reference"], `Component "${ref.name}" not found in components.${ref.kind}`);
      }
      if ("value" in item) {
        if (ref.kind !== "parameters") ctx.report("arazzo-reusable-value-parameter-only", [...ip, "value"], '"value" only applies to Reusable Objects that reference a parameter');
        if (isSelector(item.value)) ctx.report("arazzo-selector-misplaced", [...ip, "value"], 'A Selector Object in a Reusable Object "value" is taken as a literal value; put the Selector in the component parameter instead');
      }
    });
  };
  const checkActionParams = (list, path) => {
    asArray(list).forEach((a, i) => {
      if (isObj(a) && !("reference" in a) && ctx.is11) check(a.parameters, [...path, i, "parameters"], "parameters");
    });
  };
  for (const w of ctx.workflows) {
    check(w.wf.parameters, [...w.path, "parameters"], "parameters");
    check(w.wf.successActions, [...w.path, "successActions"], "successActions");
    check(w.wf.failureActions, [...w.path, "failureActions"], "failureActions");
    checkActionParams(w.wf.successActions, [...w.path, "successActions"]);
    checkActionParams(w.wf.failureActions, [...w.path, "failureActions"]);
    for (const s of w.steps) {
      check(s.step.parameters, [...s.path, "parameters"], "parameters");
      check(s.step.onSuccess, [...s.path, "onSuccess"], "successActions");
      check(s.step.onFailure, [...s.path, "onFailure"], "failureActions");
      checkActionParams(s.step.onSuccess, [...s.path, "onSuccess"]);
      checkActionParams(s.step.onFailure, [...s.path, "onFailure"]);
    }
  }
  const comps = asObj(ctx.doc.components);
  for (const kind of ["successActions", "failureActions"]) {
    for (const [k, a] of Object.entries(asObj(comps[kind]))) {
      if (isObj(a) && ctx.is11) check(a.parameters, ["components", kind, k, "parameters"], "parameters");
    }
  }
}
function ruleComponents(ctx) {
  const anchors = /* @__PURE__ */ new Set();
  const schemas = [];
  for (const w of ctx.workflows) if (w.wf.inputs !== void 0) schemas.push({ schema: w.wf.inputs, path: [...w.path, "inputs"] });
  for (const [k, s] of Object.entries(asObj(asObj(ctx.doc.components).inputs))) schemas.push({ schema: s, path: ["components", "inputs", k] });
  const walk2 = (node, path, fn, depth = 0) => {
    if (depth > 40) return;
    if (Array.isArray(node)) node.forEach((v, i) => walk2(v, [...path, i], fn, depth + 1));
    else if (isObj(node)) {
      fn(node, path);
      for (const [k, v] of Object.entries(node)) if (k !== "enum" && k !== "const" && k !== "default" && k !== "examples") walk2(v, [...path, k], fn, depth + 1);
    }
  };
  const usedInputs = /* @__PURE__ */ new Set();
  for (const s of schemas) walk2(s.schema, s.path, (o) => typeof o.$anchor === "string" && anchors.add(o.$anchor));
  for (const s of schemas) {
    walk2(s.schema, s.path, (o, p) => {
      if (typeof o.$ref !== "string" || !o.$ref.startsWith("#")) return;
      const ref = o.$ref;
      const m = /^#\/components\/inputs\/([^/]+)/.exec(ref);
      if (m) usedInputs.add(m[1].replace(/~1/g, "/").replace(/~0/g, "~"));
      if (ref.startsWith("#/") || ref === "#") {
        if (resolveJsonPointer(ctx.doc, ref) === void 0 && resolveJsonPointer(s.schema, ref) === void 0) {
          ctx.report("arazzo-components-ref-resolved", [...p, "$ref"], `$ref "${ref}" does not resolve in this document`);
        }
      } else if (!anchors.has(ref.slice(1))) {
        ctx.report("arazzo-components-ref-resolved", [...p, "$ref"], `$ref "${ref}": no "$anchor": "${ref.slice(1)}" found in the inputs schemas`);
      }
    });
  }
  const used = /* @__PURE__ */ new Set();
  const collectRefs = (node, depth = 0) => {
    if (depth > 60) return;
    if (typeof node === "string") {
      for (const e of expressionsInString(node)) {
        const r2 = parseComponentReference(e);
        if (r2) used.add(`${r2.kind}/${r2.name}`);
      }
      const r = parseComponentReference(node);
      if (r) used.add(`${r.kind}/${r.name}`);
    } else if (Array.isArray(node)) node.forEach((v) => collectRefs(v, depth + 1));
    else if (isObj(node)) Object.entries(node).forEach(([k, v]) => k !== "components" || depth > 0 ? collectRefs(v, depth + 1) : void 0);
  };
  collectRefs(ctx.doc);
  const comps = asObj(ctx.doc.components);
  for (const kind of ["parameters", "successActions", "failureActions"]) {
    for (const v of Object.values(asObj(comps[kind]))) collectRefs(v, 1);
  }
  for (const kind of ["parameters", "successActions", "failureActions"]) {
    for (const k of Object.keys(asObj(comps[kind]))) {
      if (!used.has(`${kind}/${k}`)) ctx.report("arazzo-components-unused", ["components", kind, k], `Component "${k}" (components.${kind}) is never referenced`);
    }
  }
  for (const k of Object.keys(asObj(comps.inputs))) {
    if (!usedInputs.has(k)) ctx.report("arazzo-components-unused", ["components", "inputs", k], `Component "${k}" (components.inputs) is never referenced with $ref`);
  }
}
function criterionTypeName(type) {
  if (typeof type === "string") return type;
  if (isObj(type) && typeof type.type === "string") return type.type;
  return "simple";
}
function allCriteria(ctx) {
  const out = [];
  const add = (list, path) => asArray(list).forEach((c, i) => isObj(c) && out.push({ c, path: [...path, i] }));
  const fromActions = (list, path) => asArray(list).forEach((a, i) => isObj(a) && !("reference" in a) && add(a.criteria, [...path, i, "criteria"]));
  for (const w of ctx.workflows) {
    fromActions(w.wf.successActions, [...w.path, "successActions"]);
    fromActions(w.wf.failureActions, [...w.path, "failureActions"]);
    for (const s of w.steps) {
      add(s.step.successCriteria, [...s.path, "successCriteria"]);
      fromActions(s.step.onSuccess, [...s.path, "onSuccess"]);
      fromActions(s.step.onFailure, [...s.path, "onFailure"]);
    }
  }
  const comps = asObj(ctx.doc.components);
  for (const kind of ["successActions", "failureActions"]) {
    for (const [k, a] of Object.entries(asObj(comps[kind]))) if (isObj(a)) add(a.criteria, ["components", kind, k, "criteria"]);
  }
  return out;
}
function checkSelectorSyntax(type, version, selector, is11) {
  if (type === "jsonpointer") return checkJsonPointer(selector);
  if (type === "jsonpath") {
    const v = version ?? (is11 ? "rfc9535" : "draft-goessner-dispatch-jsonpath-00");
    return v === "rfc9535" ? checkJsonPath(maskEmbedded(selector, "0")) : checkJsonPathGoessner(maskEmbedded(selector, "0"));
  }
  if (type === "xpath") return checkXPath(maskEmbedded(selector, "0"));
  return null;
}
function ruleCriteria(ctx) {
  for (const { c, path } of allCriteria(ctx)) {
    const t = criterionTypeName(c.type);
    const version = isObj(c.type) && typeof c.type.version === "string" ? c.type.version : void 0;
    if (t === "jsonpointer" && isObj(c.type)) {
      ctx.report("arazzo-criterion-eto-jsonpointer", [...path, "type"], "jsonpointer has no condition semantics (\xA7 5.8.11.4 only defines simple, regex, jsonpath and xpath)");
      continue;
    }
    if (typeof c.condition !== "string") continue;
    const cond = c.condition;
    let error = null;
    if (t === "simple") error = checkSimpleCondition(cond).error;
    else if (t === "regex") error = checkRegex(cond);
    else if (t === "jsonpath" || t === "xpath") error = checkSelectorSyntax(t, version, cond, ctx.is11);
    const loose = t === "regex" || t === "jsonpath" || t === "xpath" ? unembeddedExpressions(cond) : [];
    if (loose.length) {
      ctx.report("arazzo-criterion-embedded-expression", [...path, "condition"], `Runtime expressions in a ${t} condition must be embedded in braces: use {${loose[0]}}`);
    } else if (error) ctx.report("arazzo-criterion-syntax", [...path, "condition"], error);
  }
}
function forEachSelector(ctx, fn) {
  const fromOutputs = (o, path) => {
    for (const [k, v] of Object.entries(asObj(o))) if (isObj(v)) fn(v, [...path, k]);
  };
  const fromParams = (list, path) => asArray(list).forEach((p, i) => isObj(p) && !("reference" in p) && isSelector(p.value) && fn(p.value, [...path, i, "value"]));
  const fromPayload = (v, path, depth = 0) => {
    if (depth > 32) return;
    if (isSelector(v)) fn(v, path);
    else if (Array.isArray(v)) v.forEach((x, i) => fromPayload(x, [...path, i], depth + 1));
    else if (isObj(v)) for (const [k, x] of Object.entries(v)) fromPayload(x, [...path, k], depth + 1);
  };
  for (const w of ctx.workflows) {
    fromOutputs(w.wf.outputs, [...w.path, "outputs"]);
    fromParams(w.wf.parameters, [...w.path, "parameters"]);
    for (const s of w.steps) {
      fromOutputs(s.step.outputs, [...s.path, "outputs"]);
      fromParams(s.step.parameters, [...s.path, "parameters"]);
      const rb = asObj(s.step.requestBody);
      if ("payload" in rb) fromPayload(rb.payload, [...s.path, "requestBody", "payload"]);
      asArray(rb.replacements).forEach((r, i) => isObj(r) && isObj(r.value) && fn(r.value, [...s.path, "requestBody", "replacements", i, "value"]));
    }
  }
  for (const [k, p] of Object.entries(asObj(asObj(ctx.doc.components).parameters))) {
    if (isObj(p) && isSelector(p.value)) fn(p.value, ["components", "parameters", k, "value"]);
  }
}
function ruleSelectors(ctx) {
  if (!ctx.is11) return;
  forEachSelector(ctx, (sel, path) => {
    if (typeof sel.context === "string") {
      const c = sel.context.trim();
      let unstructured;
      if (!c.startsWith("$")) unstructured = "it is not a runtime expression";
      else {
        const parsed = parseRuntimeExpression(c);
        if (parsed.ok) {
          const e = parsed.expression;
          if (e.root === "statusCode" || e.root === "url" || e.root === "method" || e.root === "self") unstructured = `$${e.root} is a scalar`;
          else if (e.source === "header" || e.source === "query" || e.source === "path") unstructured = `a ${e.source} value is a string`;
        }
      }
      if (unstructured) ctx.report("arazzo-selector-context-structured", [...path, "context"], `Selector "context" must evaluate to structured data such as $response.body or $message.payload (${unstructured})`);
    }
    if (typeof sel.selector !== "string") return;
    const t = typeof sel.type === "string" ? sel.type : isObj(sel.type) && typeof sel.type.type === "string" ? sel.type.type : void 0;
    if (!t) return;
    const version = isObj(sel.type) && typeof sel.type.version === "string" ? sel.type.version : void 0;
    const err = checkSelectorSyntax(t, version, sel.selector, true);
    if (err) ctx.report("arazzo-selector-syntax", [...path, "selector"], err);
  });
}
function ruleReplacements(ctx) {
  for (const w of ctx.workflows) {
    for (const s of w.steps) {
      const rb = asObj(s.step.requestBody);
      const ct = typeof rb.contentType === "string" ? rb.contentType.toLowerCase() : "";
      asArray(rb.replacements).forEach((r, i) => {
        if (!isObj(r)) return;
        const rp = [...s.path, "requestBody", "replacements", i];
        const tst = r.targetSelectorType;
        let type;
        let version;
        let declared = true;
        if (typeof tst === "string") type = tst;
        else if (isObj(tst) && typeof tst.type === "string") {
          type = tst.type;
          version = typeof tst.version === "string" ? tst.version : void 0;
        } else {
          declared = false;
          type = ct.includes("xml") || typeof rb.payload === "string" && rb.payload.trim().startsWith("<") ? "xpath" : "jsonpointer";
        }
        if (typeof r.target === "string") {
          const err = checkSelectorSyntax(type, version, r.target, ctx.is11);
          if (err) {
            ctx.report(
              "arazzo-replacement-target-syntax",
              [...rp, "target"],
              `${err}${declared ? "" : ` \u2014 without "targetSelectorType", the target of a ${type === "xpath" ? "XML" : "JSON"} payload is a ${type === "xpath" ? "XPath expression" : "JSON Pointer (e.g. /metadata/source)"}`}`
            );
          }
        }
        if (ctx.is11 && "value" in r && typeof r.value !== "string" && !isObj(r.value)) {
          ctx.report("arazzo-replacement-literal-value", [...rp, "value"], "Non-string literal replacement value: allowed by the specification text (and the 1.1 development schema) but rejected by the published 1.1 schema (2026-04-15); some tools may refuse it");
        }
      });
    }
  }
}
function declaredWithPrefix(names, field) {
  const set = new Set(names);
  if (set.has(field)) return true;
  const parts = field.split(".");
  for (let i = parts.length - 1; i > 0; i--) if (set.has(parts.slice(0, i).join("."))) return true;
  return false;
}
function ruleExpressions(ctx) {
  const version = String(ctx.doc.arazzo);
  for (const site of ctx.sites) {
    const parsed = parseRuntimeExpression(site.expr);
    if (!parsed.ok) {
      ctx.report("arazzo-expression-syntax", site.path, parsed.problem.message, parsed.problem.severity);
      continue;
    }
    if (parsed.warning) ctx.report("arazzo-expression-syntax", site.path, parsed.warning.message, parsed.warning.severity);
    const e = parsed.expression;
    if (!ctx.is11 && (e.root === "message" || e.root === "self")) {
      ctx.report("arazzo-version-feature-mismatch", site.path, featureMessage(`The runtime expression $${e.root}`, version), "warning");
      continue;
    }
    switch (e.root) {
      case "steps": {
        if (site.component || !site.wf) break;
        const target = site.wf.steps.find((s) => s.step.stepId === e.id);
        if (!target) {
          ctx.report("arazzo-expression-steps-resolved", site.path, `"${e.raw}": step "${e.id}" not found in workflow "${String(site.wf.wf.workflowId)}"`);
          break;
        }
        const outs = Object.keys(asObj(target.step.outputs));
        if (e.field && !declaredWithPrefix(outs, e.field)) {
          ctx.report("arazzo-expression-steps-resolved", site.path, `"${e.raw}": step "${e.id}" does not declare output "${e.field}"${outs.length ? ` (outputs: ${outs.join(", ")})` : ""}`);
        }
        break;
      }
      case "workflows": {
        const target = ctx.workflowById(e.id);
        if (!target) {
          ctx.report("arazzo-expression-workflows-resolved", site.path, `"${e.raw}": workflow "${e.id}" not found`);
          break;
        }
        if (e.section === "outputs") {
          const outs = Object.keys(asObj(target.wf.outputs));
          if (!declaredWithPrefix(outs, e.field)) ctx.report("arazzo-expression-workflows-resolved", site.path, `"${e.raw}": workflow "${e.id}" does not declare output "${e.field}"`);
        } else {
          const inputs = workflowInputNames(ctx.doc, target.wf);
          if (inputs && !declaredWithPrefix(inputs.names, e.field)) ctx.report("arazzo-expression-workflows-resolved", site.path, `"${e.raw}": workflow "${e.id}" does not declare input "${e.field}"`);
        }
        break;
      }
      case "inputs": {
        if (site.component || !site.wf) break;
        const inputs = workflowInputNames(ctx.doc, site.wf.wf);
        if (inputs && !declaredWithPrefix(inputs.names, e.field)) {
          ctx.report("arazzo-expression-inputs-declared", site.path, `"${e.raw}": input "${e.field}" is not declared in the inputs of workflow "${String(site.wf.wf.workflowId)}"`);
        }
        break;
      }
      case "sourceDescriptions": {
        if (!ctx.sourceNames.has(e.id)) {
          ctx.report("arazzo-expression-source-resolved", site.path, `"${e.raw}": source description "${e.id}" not found${ctx.sourceNames.size ? ` (sources: ${[...ctx.sourceNames].join(", ")})` : ""}`);
        }
        break;
      }
      case "components": {
        if (e.section === "inputs") {
          ctx.report("arazzo-components-inputs-ref", site.path, `"${e.raw}" is not a runtime expression: reference reusable inputs with "$ref: '#/components/inputs/<name>'"`);
          break;
        }
        if (componentOf(ctx.doc, e.section, e.field) === void 0) {
          ctx.report("arazzo-expression-components-resolved", site.path, `"${e.raw}": component "${e.field}" not found in components.${e.section}`);
        }
        break;
      }
      case "self":
        if (ctx.doc.$self === void 0) ctx.report("arazzo-expression-self-defined", site.path, '"$self" is used but the document does not declare "$self": its value depends on the retrieval URI');
        break;
      case "message":
        if (!site.async) ctx.report("arazzo-expression-message-context", site.path, `"${e.raw}" is only meaningful in an AsyncAPI step (send or receive)`);
        break;
      case "statusCode":
      case "request":
      case "response":
        if (site.async && ctx.is11) ctx.report("arazzo-async-http-expression", site.path, `"${e.raw}" refers to an HTTP exchange but this step is an AsyncAPI step: use $message.header / $message.payload`);
        break;
    }
  }
}
function ruleSources(ctx) {
  const used = /* @__PURE__ */ new Set();
  for (const w of ctx.workflows) {
    for (const s of w.steps) {
      const src = resolveStepSource(ctx.doc, s.step);
      if (src.name) used.add(src.name);
      asArray(s.step.dependsOn).forEach((d) => {
        const m = typeof d === "string" ? DEP_SRC_STEP_RE.exec(d) : null;
        if (m) used.add(m[1]);
      });
    }
    asArray(w.wf.dependsOn).forEach((d) => {
      const m = typeof d === "string" ? SRC_WF_RE.exec(d) : null;
      if (m) used.add(m[1]);
    });
  }
  const scan = (node, depth = 0) => {
    if (depth > 60) return;
    if (typeof node === "string") {
      const re = /\$sourceDescriptions\.([A-Za-z0-9_\-]+)/g;
      let m;
      while (m = re.exec(node)) used.add(m[1]);
    } else if (Array.isArray(node)) node.forEach((v) => scan(v, depth + 1));
    else if (isObj(node)) Object.values(node).forEach((v) => scan(v, depth + 1));
  };
  scan(ctx.doc.workflows);
  scan(ctx.doc.components);
  asArray(ctx.doc.sourceDescriptions).forEach((s, i) => {
    if (!isObj(s)) return;
    if (typeof s.url === "string" && !isUriReference(s.url)) {
      ctx.report("arazzo-source-url-uri-reference", ["sourceDescriptions", i, "url"], `Source url ${JSON.stringify(s.url)} is not a valid URI-reference (RFC 3986): spaces and some characters must be percent-encoded`);
    }
    if (typeof s.name === "string" && !used.has(s.name)) {
      ctx.report("arazzo-source-unused", ["sourceDescriptions", i], `Source description "${s.name}" is never referenced by a step or expression`);
    }
  });
}

// src/validate.ts
var SEVERITY_RANK = { error: 0, warning: 1, info: 2, hint: 3 };
var KEY_RANGE_CODES = /* @__PURE__ */ new Set(["arazzo-unknown-field", "arazzo-extension-reserved-prefix", "arazzo-reusable-no-extension", "arazzo-key-pattern"]);
function selectMinor(doc, report) {
  const raw = doc.arazzo;
  if (raw === void 0 || raw === null) return "1.1";
  const version = String(raw);
  const supported = getSupportedMinor(version);
  if (supported) return supported;
  if (getArazzoMinor(version)) {
    report("arazzo-version", ["arazzo"], `Unrecognized Arazzo version: ${version}. Known versions: 1.0.x, 1.1.x (only semantic rules are applied)`);
    return null;
  }
  const prefix = /^(\d+)\.(\d+)/.exec(version);
  const minor = prefix ? `${prefix[1]}.${prefix[2]}` : null;
  if (minor === "1.0" || minor === "1.1") return minor;
  report("arazzo-version-format", ["arazzo"], `Invalid arazzo version ${JSON.stringify(raw)}: expected a "major.minor.patch" string such as "1.1.0"`);
  return null;
}
function validate(doc, opts = {}) {
  const raw = [];
  if (!isObj(doc)) {
    raw.push({ code: "arazzo-schema", message: "An Arazzo document must be a mapping (object)", severity: "error", path: [], source: "schema" });
    return finalize(raw, opts);
  }
  const semanticReport = createSink("semantic", raw);
  const minor = selectMinor(doc, semanticReport);
  const semanticMinor = minor;
  if (!opts.skipSchema && minor) {
    let suppressed;
    if (minor === "1.0") {
      const features = detect11Features(doc).map((f) => f.path);
      suppressed = (p) => features.some((f) => isUnder(p, f));
    }
    raw.push(...schemaDiagnostics(doc, minor, { suppressed }));
  }
  if (!opts.skipSemantic) semanticDiagnostics(doc, semanticMinor, semanticReport, { debug: opts.debug });
  return finalize(raw, opts);
}
function finalize(raw, opts) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const max = opts.minSeverity ? SEVERITY_RANK[opts.minSeverity] : Infinity;
  for (const d of raw) {
    const key = pathKey(d.code, d.path);
    if (seen.has(key)) continue;
    seen.add(key);
    if (SEVERITY_RANK[d.severity] > max) continue;
    if (opts.yamlDoc) {
      const range = diagnosticRange(opts.yamlDoc, d.path, KEY_RANGE_CODES.has(d.code));
      if (range) d.range = range;
    }
    out.push(d);
  }
  if (opts.yamlDoc) {
    return out.map((d, i) => ({ d, i })).sort((a, b) => (a.d.range?.start ?? 0) - (b.d.range?.start ?? 0) || a.i - b.i).map((x) => x.d);
  }
  return out;
}
function validateText(text, opts = {}) {
  const parsed = parseArazzo(text);
  const diagnostics = parsed.doc === void 0 ? [] : validate(parsed.doc, { ...opts, yamlDoc: parsed.yamlDoc });
  return { ...parsed, diagnostics };
}

// src/graph.ts
var WORKFLOW_LANE = "lane:workflow";
var UNKNOWN_LANE = "lane:unknown";
var HTTP_METHODS = /* @__PURE__ */ new Set(["get", "put", "post", "delete", "options", "head", "patch", "trace", "query"]);
function operationFromPath(operationPath) {
  const hash = operationPath.indexOf("#");
  if (hash < 0) return void 0;
  let ptr = operationPath.slice(hash + 1);
  try {
    ptr = decodeURIComponent(ptr);
  } catch {
  }
  const segs = ptr.split("/").slice(1).map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
  if (segs.length < 3 || segs[0] !== "paths" && segs[0] !== "webhooks") return void 0;
  const method = segs[segs.length - 1].toLowerCase();
  if (!HTTP_METHODS.has(method)) return void 0;
  return { method: method.toUpperCase(), path: segs[0] === "paths" ? segs.slice(1, -1).join("/") : void 0 };
}
var noCriteria = (c) => !Array.isArray(c) || c.length === 0;
var STEP_DEP_WORKFLOW = /^\$workflows\.([^.]+)\.steps\.([^.]+)$/;
var STEP_DEP_EXTERNAL = /^\$sourceDescriptions\.([^.]+)\.([^.]+)\.steps\.([^.]+)$/;
function workflowToGraph(doc, workflowId, opts = {}) {
  const wf = findWorkflow(doc, workflowId);
  if (!wf) throw new Error(`Workflow not found: ${workflowId}`);
  const includeWfActions = opts.includeWorkflowActions !== false;
  const sources = sourcesOf(doc);
  const nodes = [];
  const edges = [];
  const nodeById = /* @__PURE__ */ new Map();
  let edgeSeq = 0;
  const addNode = (n) => {
    const existing = nodeById.get(n.id);
    if (existing) return existing;
    nodes.push(n);
    nodeById.set(n.id, n);
    return n;
  };
  const addEdge = (e) => {
    const edge = { id: `e${edgeSeq++}:${e.kind}:${e.source}->${e.target}`, ...e };
    edges.push(edge);
    return edge;
  };
  const inputSchema = resolveInputsSchema(doc, wf.inputs);
  const required = new Set(asArray(inputSchema?.required).filter((x) => typeof x === "string"));
  const properties = Object.entries(asObj(inputSchema?.properties)).map(([name, raw]) => {
    const p = resolveInputsSchema(doc, raw) ?? {};
    const prop = { name, required: required.has(name) };
    if (typeof p.type === "string") prop.type = p.type;
    else if (Array.isArray(p.type)) prop.type = p.type.join(" | ");
    if (typeof p.description === "string") prop.description = p.description;
    if ("default" in p) prop.default = p.default;
    return prop;
  });
  addNode({ id: "input", kind: "input", label: "Inputs", group: WORKFLOW_LANE, properties });
  const steps = asArray(wf.steps).filter(isObj);
  const stepNodeId = /* @__PURE__ */ new Map();
  const ids = [];
  steps.forEach((step, index) => {
    const sid = typeof step.stepId === "string" ? step.stepId : `#${index}`;
    const id = stepNodeId.has(sid) ? `step:${sid}~${index}` : `step:${sid}`;
    if (!stepNodeId.has(sid)) stepNodeId.set(sid, id);
    ids.push(id);
    const src = resolveStepSource(doc, step);
    const info = {
      stepId: sid,
      index,
      successCriteria: asArray(step.successCriteria).filter(isObj),
      outputs: Object.keys(asObj(step.outputs)),
      parameters: resolveParameters(doc, step.parameters).map((r) => r.value).filter((p) => typeof p.name === "string").map((p) => p.in ? { name: p.name, in: p.in } : { name: p.name }),
      hasRequestBody: step.requestBody !== void 0,
      usesWorkflowActions: false
    };
    for (const f of ["description", "operationId", "operationPath", "channelPath", "workflowId"]) {
      if (typeof step[f] === "string") info[f] = step[f];
    }
    if (src.name && src.how) info.source = { name: src.name, type: src.type, how: src.how };
    if (step.action === "send" || step.action === "receive") info.action = step.action;
    if (step.correlationId !== void 0) info.correlationId = step.correlationId;
    if (typeof step.timeout === "number") info.timeout = step.timeout;
    if (Array.isArray(step.dependsOn)) info.dependsOn = step.dependsOn.filter((d) => typeof d === "string");
    const op = (typeof step.operationPath === "string" ? operationFromPath(step.operationPath) : void 0) ?? void 0;
    if (op) {
      info.method = op.method;
      if (op.path) info.path = op.path;
      info.methodSource = "operationPath";
    } else if (opts.resolveOperation && step.workflowId === void 0 && step.channelPath === void 0) {
      const r = opts.resolveOperation(step, src.name ? sources.find((s) => s.name === src.name) : void 0);
      if (r?.method) info.method = r.method.toUpperCase();
      if (r?.path) info.path = r.path;
      if (r && (r.method || r.path)) info.methodSource = "resolver";
    }
    let kind;
    if (typeof step.workflowId === "string") {
      kind = "step-workflow";
      info.external = step.workflowId.startsWith("$sourceDescriptions.");
    } else if (step.action === "send") kind = "step-async-send";
    else if (step.action === "receive" || step.channelPath !== void 0 || src.type === "asyncapi") kind = "step-async-receive";
    else kind = "step-http";
    const lane = src.name ? `lane:${src.name}` : kind === "step-workflow" ? WORKFLOW_LANE : UNKNOWN_LANE;
    addNode({ id, kind, label: sid, group: lane, step: info });
  });
  const hasOutputs = isObj(wf.outputs) && Object.keys(wf.outputs).length > 0;
  const successTerminal = () => {
    if (hasOutputs) return addNode({ id: "output", kind: "output", label: "Outputs", group: WORKFLOW_LANE, outputs: wf.outputs }).id;
    return addNode({ id: "end-success", kind: "end-success", label: "End", group: WORKFLOW_LANE }).id;
  };
  const failureTerminal = () => addNode({ id: "end-failure", kind: "end-failure", label: "Failure", group: WORKFLOW_LANE }).id;
  const workflowRef = (ref, stepId) => {
    const m = /^\$sourceDescriptions\.([^.]+)\.(.+)$/.exec(ref);
    const external = !!m;
    const targetWf = external ? void 0 : findWorkflow(doc, ref);
    const id = `ref:${ref}${stepId ? `/steps/${stepId}` : ""}`;
    const node = {
      id,
      kind: "workflow-ref",
      label: stepId ? `${m ? m[2] : ref} \u203A ${stepId}` : m ? m[2] : ref,
      group: m && sources.some((s) => s.name === m[1]) ? `lane:${m[1]}` : WORKFLOW_LANE,
      ref: { workflowId: m ? m[2] : ref, external, resolved: external ? false : !!targetWf }
    };
    if (stepId) node.ref.stepId = stepId;
    if (m) node.ref.sourceName = m[1];
    if (targetWf?.summary) node.ref.summary = targetWf.summary;
    if (targetWf) node.ref.stepCount = asArray(targetWf.steps).length;
    return addNode(node).id;
  };
  if (steps.length === 0) addEdge({ kind: "sequence", source: "input", target: successTerminal(), conditional: false });
  else addEdge({ kind: "sequence", source: "input", target: ids[0], conditional: false });
  const hasDependencyEdges = (step) => asArray(step.dependsOn).some((d) => typeof d === "string" && (STEP_DEP_WORKFLOW.test(d) || STEP_DEP_EXTERNAL.test(d) || stepNodeId.has(d)));
  const wfActionsDeclared = asArray(wf.successActions).length + asArray(wf.failureActions).length > 0;
  steps.forEach((step, i) => {
    const id = ids[i];
    const node = nodeById.get(id);
    const successActions = effectiveActions(doc, wf, step, "success").filter((a) => includeWfActions || a.origin === "step");
    const failureActions = effectiveActions(doc, wf, step, "failure").filter((a) => includeWfActions || a.origin === "step");
    node.step.usesWorkflowActions = wfActionsDeclared && [...effectiveActions(doc, wf, step, "success"), ...effectiveActions(doc, wf, step, "failure")].some((a) => a.origin === "workflow");
    const meta = (a) => {
      const m = { name: String(a.value.name ?? ""), type: String(a.value.type ?? ""), origin: a.origin };
      if (a.componentName) m.component = a.componentName;
      return m;
    };
    const criteriaOf = (c) => asArray(c).filter(isObj);
    let unconditional = false;
    for (const a of successActions) {
      const act = a.value;
      const conditional = !noCriteria(act.criteria);
      if (!conditional && (act.type === "goto" || act.type === "end")) unconditional = true;
      const base = { action: meta(a), criteria: criteriaOf(act.criteria), conditional, outcome: "success" };
      if (act.type === "goto") {
        if (typeof act.stepId === "string" && stepNodeId.has(act.stepId)) {
          addEdge({ ...base, kind: "success-goto", source: id, target: stepNodeId.get(act.stepId), label: `\u2713 ${act.name}` });
        } else if (typeof act.workflowId === "string") {
          addEdge({ ...base, kind: "success-goto", source: id, target: workflowRef(act.workflowId), label: `\u2197 ${act.workflowId}`, transfer: true });
        }
      } else if (act.type === "end") {
        addEdge({ ...base, kind: "end", source: id, target: successTerminal(), label: conditional ? "\u2713 end" : void 0 });
      }
    }
    for (const a of failureActions) {
      const act = a.value;
      const conditional = !noCriteria(act.criteria);
      const base = { action: meta(a), criteria: criteriaOf(act.criteria), conditional, outcome: "failure" };
      if (act.type === "goto") {
        if (typeof act.stepId === "string" && stepNodeId.has(act.stepId)) {
          addEdge({ ...base, kind: "failure-goto", source: id, target: stepNodeId.get(act.stepId), label: `\u2717 ${act.name}` });
        } else if (typeof act.workflowId === "string") {
          addEdge({ ...base, kind: "failure-goto", source: id, target: workflowRef(act.workflowId), label: `\u2197 ${act.workflowId}`, transfer: true });
        }
      } else if (act.type === "retry") {
        const limitIsDefault = typeof act.retryLimit !== "number";
        const retryLimit = limitIsDefault ? 1 : act.retryLimit;
        const retryAfter = typeof act.retryAfter === "number" ? act.retryAfter : void 0;
        const label2 = `\u21BB \xD7${retryLimit}${retryAfter !== void 0 ? ` \xB7 ${retryAfter} s` : ""}`;
        const retry = { ...base, kind: "retry", source: id, target: id, label: label2, retryLimit, retryLimitIsDefault: limitIsDefault };
        if (retryAfter !== void 0) retry.retryAfter = retryAfter;
        addEdge(retry);
        const viaTarget = typeof act.stepId === "string" && stepNodeId.has(act.stepId) ? stepNodeId.get(act.stepId) : typeof act.workflowId === "string" ? workflowRef(act.workflowId) : void 0;
        if (viaTarget) {
          const via = {
            ...base,
            kind: "retry",
            source: id,
            target: viaTarget,
            label: `\u21BB via ${act.stepId ?? act.workflowId}`,
            retryLimit,
            retryLimitIsDefault: limitIsDefault,
            via: true
          };
          if (retryAfter !== void 0) via.retryAfter = retryAfter;
          addEdge(via);
        }
      } else if (act.type === "end") {
        addEdge({ ...base, kind: "end", source: id, target: failureTerminal(), label: "\u2717 end" });
      }
    }
    if (failureActions.length === 0 && opts.includeImplicitFailures) {
      addEdge({ kind: "end", source: id, target: failureTerminal(), outcome: "failure", conditional: true, implicit: true, label: "unhandled failure" });
    }
    if (typeof step.workflowId === "string") {
      addEdge({ kind: "workflow-call", source: id, target: workflowRef(step.workflowId), conditional: false, label: `\u21E2 ${step.workflowId}` });
    }
    if (!unconditional) {
      const next = steps[i + 1];
      if (!next) addEdge({ kind: "sequence", source: id, target: successTerminal(), conditional: false });
      else if (!hasDependencyEdges(next)) addEdge({ kind: "sequence", source: id, target: ids[i + 1], conditional: false });
    }
  });
  steps.forEach((step, i) => {
    const deps = asArray(step.dependsOn).filter((d) => typeof d === "string");
    if (!deps.length) return;
    const id = ids[i];
    const depIds = [];
    for (const d of deps) {
      let m;
      if (m = STEP_DEP_WORKFLOW.exec(d)) depIds.push(workflowRef(m[1], m[2]));
      else if (m = STEP_DEP_EXTERNAL.exec(d)) depIds.push(workflowRef(`$sourceDescriptions.${m[1]}.${m[2]}`, m[3]));
      else if (stepNodeId.has(d)) depIds.push(stepNodeId.get(d));
    }
    if (depIds.length >= 2) {
      const joinId = `join:${step.stepId}`;
      addNode({ id: joinId, kind: "join", label: "+", group: WORKFLOW_LANE, waitsFor: depIds });
      for (const d of depIds) addEdge({ kind: "depends-on", source: d, target: joinId, conditional: false });
      addEdge({ kind: "depends-on", source: joinId, target: id, conditional: false });
    } else if (depIds.length === 1) {
      addEdge({ kind: "depends-on", source: depIds[0], target: id, conditional: false });
    }
  });
  const groups = [];
  for (const s of sources) {
    if (typeof s.name !== "string") continue;
    const nodeIds = nodes.filter((n) => n.group === `lane:${s.name}`).map((n) => n.id);
    if (!nodeIds.length) continue;
    const g = { id: `lane:${s.name}`, kind: "source", label: s.name, sourceName: s.name, nodeIds };
    if (s.type) g.sourceType = s.type;
    groups.push(g);
  }
  groups.push({ id: WORKFLOW_LANE, kind: "workflow", label: "Workflow", nodeIds: nodes.filter((n) => n.group === WORKFLOW_LANE).map((n) => n.id) });
  const unknown = nodes.filter((n) => n.group === UNKNOWN_LANE).map((n) => n.id);
  if (unknown.length) groups.push({ id: UNKNOWN_LANE, kind: "unknown", label: "Unknown source", nodeIds: unknown });
  const graph = { workflowId, workflowIndex: asArray(asObj(doc).workflows).indexOf(wf), nodes, edges, groups };
  if (typeof wf.summary === "string") graph.summary = wf.summary;
  return graph;
}
var MERMAID_CLASSES = {
  input: "fill:#eff6ff,stroke:#2563eb,color:#1e3a8a",
  "step-http": "fill:#ffffff,stroke:#475569,color:#0f172a",
  "step-async-send": "fill:#f5f3ff,stroke:#7c3aed,color:#4c1d95",
  "step-async-receive": "fill:#f5f3ff,stroke:#7c3aed,color:#4c1d95",
  "step-workflow": "fill:#fff7ed,stroke:#f97316,color:#7c2d12,stroke-width:3px",
  join: "fill:#ffffff,stroke:#64748b,color:#0f172a",
  output: "fill:#fefce8,stroke:#ca8a04,color:#713f12",
  "end-success": "fill:#f0fdf4,stroke:#16a34a,color:#14532d,stroke-width:3px",
  "end-failure": "fill:#fef2f2,stroke:#dc2626,color:#7f1d1d,stroke-width:3px",
  "workflow-ref": "fill:#fff7ed,stroke:#f97316,color:#7c2d12,stroke-dasharray:4 3"
};
var EDGE_STYLE = {
  sequence: "stroke:#64748b",
  "success-goto": "stroke:#16a34a,stroke-width:2px",
  "failure-goto": "stroke:#dc2626,stroke-width:2px",
  retry: "stroke:#d97706,stroke-width:2px",
  end: "stroke:#64748b",
  "depends-on": "stroke:#0891b2,stroke-dasharray:2 4",
  "workflow-call": "stroke:#f97316,stroke-width:2px"
};
function mermaidText(s) {
  return s.replace(/"/g, "#quot;").replace(/</g, "#lt;").replace(/>/g, "#gt;").replace(/\r?\n/g, " ");
}
function nodeText(n) {
  const s = n.step;
  switch (n.kind) {
    case "input": {
      const props = (n.properties ?? []).map((p) => p.name + (p.required ? "*" : ""));
      return `Inputs${props.length ? ": " + props.slice(0, 4).join(", ") + (props.length > 4 ? ` +${props.length - 4}` : "") : ""}`;
    }
    case "output": {
      const keys = Object.keys(n.outputs ?? {});
      return `Outputs: ${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ` +${keys.length - 4}` : ""}`;
    }
    case "end-success":
      return "\u2713";
    case "end-failure":
      return "\u2717";
    case "join":
      return "+";
    case "workflow-ref":
      return `\u2197 ${n.label}`;
    case "step-workflow":
      return `${s.index + 1}. WORKFLOW ${s.stepId}`;
    case "step-async-send":
      return `${s.index + 1}. SEND ${s.stepId}`;
    case "step-async-receive":
      return `${s.index + 1}. RECEIVE ${s.stepId}${s.timeout !== void 0 ? ` \u23F1 ${s.timeout} ms` : ""}`;
    default:
      return `${s.index + 1}. ${s.method ?? ""}${s.method ? " " : ""}${s.stepId}`;
  }
}
function shape(n, id) {
  const t = `"${mermaidText(nodeText(n))}"`;
  switch (n.kind) {
    case "input":
      return `${id}[/${t}/]`;
    case "output":
      return `${id}[/${t}\\]`;
    case "end-success":
    case "end-failure":
      return `${id}((${t}))`;
    case "join":
      return `${id}{${t}}`;
    case "step-workflow":
    case "workflow-ref":
      return `${id}[[${t}]]`;
    case "step-async-send":
      return `${id}>${t}]`;
    case "step-async-receive":
      return `${id}([${t}])`;
    default:
      return `${id}[${t}]`;
  }
}
function graphToMermaid(graph, opts = {}) {
  const lines = [`flowchart ${opts.direction ?? "TB"}`];
  const idMap = /* @__PURE__ */ new Map();
  const used = /* @__PURE__ */ new Set();
  for (const n of graph.nodes) {
    let base = "n_" + n.id.replace(/[^A-Za-z0-9_]/g, "_");
    let id = base;
    for (let i = 2; used.has(id); i++) id = `${base}_${i}`;
    used.add(id);
    idMap.set(n.id, id);
  }
  for (const [kind, style] of Object.entries(MERMAID_CLASSES)) lines.push(`  classDef ${kind.replace(/-/g, "_")} ${style}`);
  const nodeLine = (n) => `${shape(n, idMap.get(n.id))}:::${n.kind.replace(/-/g, "_")}`;
  if (opts.lanes) {
    graph.groups.forEach((g, gi) => {
      const members = graph.nodes.filter((n) => n.group === g.id);
      if (!members.length) return;
      const title = g.sourceType ? `${g.label} (${g.sourceType})` : g.label;
      lines.push(`  subgraph lane_${gi}["${mermaidText(title)}"]`);
      for (const n of members) lines.push(`    ${nodeLine(n)}`);
      lines.push("  end");
    });
  } else {
    for (const n of graph.nodes) lines.push(`  ${nodeLine(n)}`);
  }
  const styles = [];
  let linkIndex = 0;
  for (const e of graph.edges) {
    const failure = e.outcome === "failure" || e.kind === "failure-goto" || e.kind === "retry";
    if (opts.hideFailures && failure) continue;
    const a = idMap.get(e.source);
    const b = idMap.get(e.target);
    if (!a || !b) continue;
    const arrow = e.kind === "workflow-call" ? "==>" : failure || e.kind === "depends-on" ? "-.->" : "-->";
    lines.push(`  ${a} ${arrow}${e.label ? `|"${mermaidText(e.label)}"|` : ""} ${b}`);
    styles.push(`  linkStyle ${linkIndex++} ${EDGE_STYLE[e.kind]}`);
  }
  return [...lines, ...styles].join("\n");
}

// src/generated/schemas.ts
var ARAZZO_SCHEMA_1_0 = { "$id": "https://spec.openapis.org/arazzo/1.0/schema/2025-10-15", "$schema": "https://json-schema.org/draft/2020-12/schema", "description": "The description of Arazzo v1.0.x documents", "type": "object", "properties": { "arazzo": { "description": "The version number of the Arazzo Specification", "type": "string", "pattern": "^1\\.0\\.\\d+(-.+)?$" }, "info": { "$ref": "#/$defs/info" }, "sourceDescriptions": { "description": "A list of source descriptions such as Arazzo or OpenAPI", "type": "array", "uniqueItems": true, "minItems": 1, "items": { "$ref": "#/$defs/source-description-object" } }, "workflows": { "description": "A list of workflows", "type": "array", "uniqueItems": true, "minItems": 1, "items": { "$ref": "#/$defs/workflow-object" } }, "components": { "$ref": "#/$defs/components-object" } }, "required": ["arazzo", "info", "sourceDescriptions", "workflows"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false, "$defs": { "info": { "$comment": "https://spec.openapis.org/arazzo/v1.0#info-object", "description": "Provides metadata about the Arazzo description", "type": "object", "properties": { "title": { "description": "A human readable title of the Arazzo Description", "type": "string" }, "summary": { "description": "A short summary of the Arazzo Description", "type": "string" }, "description": { "description": "A description of the purpose of the workflows defined. CommonMark syntax MAY be used for rich text representation", "type": "string" }, "version": { "description": "The version identifier of the Arazzo document (which is distinct from the Arazzo Specification version)", "type": "string" } }, "required": ["title", "version"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "source-description-object": { "$comment": "https://spec.openapis.org/arazzo/v1.0#source-description-object", "description": "Describes a source description (such as an OpenAPI description)\nthat will be referenced by one or more workflows described within\nan Arazzo description", "type": "object", "properties": { "name": { "description": "A unique name for the source description", "type": "string", "pattern": "^[A-Za-z0-9_\\-]+$" }, "url": { "description": "A URL to a source description to be used by a workflow", "type": "string", "format": "uri-reference" }, "type": { "description": "The type of source description", "enum": ["arazzo", "openapi"] } }, "required": ["name", "url"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "workflow-object": { "$comment": "https://spec.openapis.org/arazzo/v1.0#workflow-object", "description": "Describes the steps to be taken across one or more APIs to achieve an objective", "type": "object", "properties": { "workflowId": { "description": "Unique string to represent the workflow", "$anchor": "workflowId", "type": "string" }, "summary": { "description": "A summary of the purpose or objective of the workflow", "type": "string" }, "description": { "description": "A description of the workflow. CommonMark syntax MAY be used for rich text representation", "type": "string" }, "inputs": { "description": "A JSON Schema 2020-12 object representing the input parameters used by this workflow", "$ref": "#/$defs/schema" }, "dependsOn": { "description": "A list of workflows that MUST be completed before this workflow can be processed", "type": "array", "uniqueItems": true, "items": { "type": "string" } }, "steps": { "description": "An ordered list of steps where each step represents a call to an API operation or to another workflow", "type": "array", "uniqueItems": true, "minItems": 1, "items": { "$ref": "#/$defs/step-object" } }, "successActions": { "description": "A list of success actions that are applicable for all steps described under this workflow", "type": "array", "uniqueItems": true, "items": { "oneOf": [{ "$ref": "#/$defs/success-action-object" }, { "$ref": "#/$defs/reusable-object" }] } }, "failureActions": { "description": "A list of failure actions that are applicable for all steps described under this workflow", "type": "array", "uniqueItems": true, "items": { "oneOf": [{ "$ref": "#/$defs/failure-action-object" }, { "$ref": "#/$defs/reusable-object" }] } }, "outputs": { "description": "A map between a friendly name and a dynamic output value", "type": "object", "patternProperties": { "^[a-zA-Z0-9\\.\\-_]+$": { "type": "string" } } }, "parameters": { "description": "A list of parameters that are applicable for all steps described under this workflow", "type": "array", "uniqueItems": true, "items": { "oneOf": [{ "$ref": "#/$defs/parameter-object" }, { "$ref": "#/$defs/reusable-object" }] } } }, "required": ["workflowId", "steps"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "step-object": { "$comment": "https://spec.openapis.org/arazzo/v1.0#step-object'", "description": "Describes a single workflow step which MAY be a call to an\nAPI operation (OpenAPI Operation Object or another Workflow Object)", "type": "object", "properties": { "stepId": { "description": "Unique string to represent the step", "$anchor": "stepId", "type": "string" }, "description": { "description": "A description of the step. CommonMark syntax MAY be used for rich text representation", "type": "string" }, "operationId": { "description": "The name of an existing, resolvable operation, as defined with a unique operationId and existing within one of the sourceDescriptions", "type": "string" }, "operationPath": { "description": "A reference to a Source combined with a JSON Pointer to reference an operation", "type": "string" }, "workflowId": { "description": "The workflowId referencing an existing workflow within the Arazzo description", "$ref": "#workflowId" }, "parameters": { "description": "A list of parameters that MUST be passed to an operation or workflow as referenced by operationId, operationPath, or workflowId", "type": "array", "uniqueItems": true, "items": true }, "requestBody": { "$ref": "#/$defs/request-body-object" }, "successCriteria": { "description": "A list of assertions to determine the success of the step", "type": "array", "uniqueItems": true, "minItems": 1, "items": { "$ref": "#/$defs/criterion-object" } }, "onSuccess": { "description": "An array of success action objects that specify what to do upon step success", "type": "array", "uniqueItems": true, "items": { "oneOf": [{ "$ref": "#/$defs/success-action-object" }, { "$ref": "#/$defs/reusable-object" }] } }, "onFailure": { "description": "An array of failure action objects that specify what to do upon step failure", "type": "array", "uniqueItems": true, "items": { "oneOf": [{ "$ref": "#/$defs/failure-action-object" }, { "$ref": "#/$defs/reusable-object" }] } }, "outputs": { "description": "A map between a friendly name and a dynamic output value defined using a runtime expression", "type": "object", "patternProperties": { "^[a-zA-Z0-9\\.\\-_]+$": { "type": "string" } } } }, "required": ["stepId"], "oneOf": [{ "required": ["operationId"] }, { "required": ["operationPath"] }, { "required": ["workflowId"] }], "allOf": [{ "if": { "oneOf": [{ "required": ["operationPath"] }, { "required": ["operationId"] }] }, "then": { "properties": { "parameters": { "items": { "oneOf": [{ "$ref": "#/$defs/reusable-object" }, { "$ref": "#/$defs/parameter-object", "required": ["in"] }] } } } } }, { "if": { "required": ["workflowId"] }, "then": { "properties": { "parameters": { "items": { "oneOf": [{ "$ref": "#/$defs/parameter-object" }, { "$ref": "#/$defs/reusable-object" }] } } } } }], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "request-body-object": { "$comment": "https://spec.openapis.org/arazzo/v1.0#request-body-object", "description": "The request body to pass to an operation as referenced by operationId or operationPath", "type": "object", "properties": { "contentType": { "description": "The Content-Type for the request content", "type": "string" }, "payload": true, "replacements": { "description": "A list of locations and values to set within a payload", "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/payload-replacement-object" } } }, "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "criterion-object": { "$comment": "https://spec.openapis.org/arazzo/v1.0#criterion-object", "description": "An object used to specify the context, conditions, and condition types\nthat can be used to prove or satisfy assertions specified in Step Object successCriteria,\nSuccess Action Object criteria, and Failure Action Object criteria", "type": "object", "properties": { "context": { "description": "A runtime expression used to set the context for the condition to be applied on", "type": "string" }, "condition": { "description": "The condition to apply", "type": "string" } }, "anyOf": [{ "type": "object", "properties": { "type": { "description": "The type of condition to be applied", "enum": ["simple", "regex", "jsonpath", "xpath"], "default": "simple" } } }, { "$ref": "#/$defs/criterion-expression-type-object" }], "required": ["condition"], "dependentRequired": { "type": ["context"] }, "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "criterion-expression-type-object": { "$comment": "https://spec.openapis.org/arazzo/v1.0#criterion-expression-type-object", "description": "An object used to describe the type and version of an expression used within a Criterion Object", "type": "object", "properties": { "type": { "description": "The type of condition to be applied", "enum": ["jsonpath", "xpath"] }, "version": { "description": "A short hand string representing the version of the expression type", "type": "string" } }, "required": ["type", "version"], "allOf": [{ "if": { "required": ["type"], "properties": { "type": { "const": "jsonpath" } } }, "then": { "properties": { "version": { "const": "draft-goessner-dispatch-jsonpath-00" } } } }, { "if": { "required": ["type"], "properties": { "type": { "const": "xpath" } } }, "then": { "properties": { "version": { "enum": ["xpath-10", "xpath-20", "xpath-30"] } } } }], "$ref": "#/$defs/specification-extensions" }, "success-action-object": { "$comment": "https://spec.openapis.org/arazzo/v1.0#success-action-object", "description": "A single success action which describes an action to take upon success of a workflow step", "type": "object", "properties": { "name": { "description": "The name of the success action", "type": "string" }, "type": { "description": "The type of action to take", "enum": ["end", "goto"] }, "workflowId": { "description": "The workflowId referencing an existing workflow within the Arazzo description to transfer to upon success of the step", "$ref": "#workflowId" }, "stepId": { "description": "The stepId to transfer to upon success of the step", "$ref": "#stepId" }, "criteria": { "description": "A list of assertions to determine if this action SHALL be executed", "type": "array", "uniqueItems": true, "minItems": 1, "items": { "$ref": "#/$defs/criterion-object" } } }, "allOf": [{ "if": { "properties": { "type": { "const": "goto" } } }, "then": { "oneOf": [{ "required": ["workflowId"] }, { "required": ["stepId"] }] } }], "required": ["name", "type"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "failure-action-object": { "$comment": "https://spec.openapis.org/arazzo/v1.0#failure-action-object", "description": "A single failure action which describes an action to take upon failure of a workflow step", "type": "object", "properties": { "name": { "description": "The name of the failure action", "type": "string" }, "type": { "description": "The type of action to take", "enum": ["end", "goto", "retry"] }, "workflowId": { "description": "The workflowId referencing an existing workflow within the Arazzo description to transfer to upon failure of the step", "$ref": "#workflowId" }, "stepId": { "description": "The stepId to transfer to upon failure of the step", "$ref": "#stepId" }, "retryAfter": { "description": "A non-negative decimal indicating the seconds to delay after the step failure before another attempt SHALL be made", "type": "number", "minimum": 0 }, "retryLimit": { "description": "A non-negative integer indicating how many attempts to retry the step MAY be attempted before failing the overall step", "type": "integer", "minimum": 0 }, "criteria": { "description": "A list of assertions to determine if this action SHALL be executed", "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/criterion-object" } } }, "allOf": [{ "if": { "properties": { "type": { "enum": ["goto"] } } }, "then": { "oneOf": [{ "required": ["workflowId"] }, { "required": ["stepId"] }] } }], "required": ["name", "type"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "reusable-object": { "$comment": "https://spec.openapis.org/arazzo/v1.0#reusable-object", "description": "A simple object to allow referencing of objects contained within the Components Object", "type": "object", "properties": { "reference": { "description": "A runtime expression used to reference the desired object", "type": "string" }, "value": { "description": "Sets a value of the referenced parameter", "type": ["string", "boolean", "object", "array", "number", "null"] } }, "required": ["reference"], "unevaluatedProperties": false }, "parameter-object": { "$comment": "https://spec.openapis.org/arazzo/v1.0#parameter-object", "description": "Describes a single step parameter", "type": "object", "properties": { "name": { "description": "The name of the parameter", "type": "string" }, "in": { "description": "The named location of the parameter", "enum": ["path", "query", "header", "cookie"] }, "value": { "description": "The value to pass in the parameter", "type": ["string", "boolean", "object", "array", "number", "null"] } }, "required": ["name", "value"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "payload-replacement-object": { "$comment": "https://spec.openapis.org/arazzo/v1.0#payload-replacement-object", "description": "Describes a location within a payload (e.g., a request body) and a value to set within the location", "type": "object", "properties": { "target": { "description": "A JSON Pointer or XPath Expression which MUST be resolved against the request body", "type": "string" }, "value": { "description": "The value set within the target location", "type": "string" } }, "required": ["target", "value"], "unevaluatedProperties": false, "$ref": "#/$defs/specification-extensions" }, "components-object": { "$comment": "https://spec.openapis.org/arazzo/v1.0#components-object", "description": "Holds a set of reusable objects for different aspects of the Arazzo Specification", "type": "object", "properties": { "inputs": { "description": "An object to hold reusable JSON Schema 2020-12 schemas to be referenced from workflow inputs", "type": "object", "additionalProperties": { "$ref": "#/$defs/schema" } }, "parameters": { "description": "An object to hold reusable Parameter Objects", "type": "object", "additionalProperties": { "$ref": "#/$defs/parameter-object" } }, "successActions": { "description": "An object to hold reusable Success Actions Objects", "type": "object", "additionalProperties": { "$ref": "#/$defs/success-action-object" } }, "failureActions": { "description": "An object to hold reusable Failure Actions Objects", "type": "object", "additionalProperties": { "$ref": "#/$defs/failure-action-object" } } }, "patternProperties": { "^(inputs|parameters|successActions|failureActions)$": { "$comment": "Enumerating all of the property names in the regex is necessary for unevaluatedProperties to work as expected", "propertyNames": { "pattern": "^[a-zA-Z0-9\\.\\-_]+$" } } }, "unevaluatedProperties": false, "$ref": "#/$defs/specification-extensions" }, "specification-extensions": { "$comment": "https://spec.openapis.org/arazzo/v1.0#specification-extensions", "description": "While the Arazzo Specification tries to accommodate most use cases, additional data can be added to extend the specification at certain points", "patternProperties": { "^x-": true } }, "schema": { "$comment": "https://spec.openapis.org/arazzo/v1.0#schema-object", "$ref": "https://json-schema.org/draft/2020-12/schema" } } };
var ARAZZO_SCHEMA_1_1 = { "$id": "https://spec.openapis.org/arazzo/1.1/schema/2026-04-15", "$schema": "https://json-schema.org/draft/2020-12/schema", "description": "The description of Arazzo v1.1.x documents", "type": "object", "properties": { "arazzo": { "description": "The version number of the Arazzo Specification", "type": "string", "pattern": "^1\\.1\\.\\d+(-.+)?$" }, "$self": { "type": "string", "format": "uri-reference", "$comment": "MUST NOT contain a fragment", "pattern": "^[^#]*$" }, "info": { "$ref": "#/$defs/info" }, "sourceDescriptions": { "description": "A list of source descriptions such as Arazzo or OpenAPI", "type": "array", "uniqueItems": true, "minItems": 1, "items": { "$ref": "#/$defs/source-description-object" } }, "workflows": { "description": "A list of workflows", "type": "array", "uniqueItems": true, "minItems": 1, "items": { "$ref": "#/$defs/workflow-object" } }, "components": { "$ref": "#/$defs/components-object" } }, "required": ["arazzo", "info", "sourceDescriptions", "workflows"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false, "$defs": { "info": { "$comment": "https://spec.openapis.org/arazzo/v1.1#info-object", "description": "Provides metadata about the Arazzo description", "type": "object", "properties": { "title": { "description": "A human readable title of the Arazzo Description", "type": "string" }, "summary": { "description": "A short summary of the Arazzo Description", "type": "string" }, "description": { "description": "A description of the purpose of the workflows defined. CommonMark syntax MAY be used for rich text representation", "type": "string" }, "version": { "description": "The version identifier of the Arazzo document (which is distinct from the Arazzo Specification version)", "type": "string" } }, "required": ["title", "version"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "source-description-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#source-description-object", "description": "Describes a source description (such as an OpenAPI description)\nthat will be referenced by one or more workflows described within\nan Arazzo description", "type": "object", "properties": { "name": { "description": "A unique name for the source description", "type": "string", "pattern": "^[A-Za-z0-9_\\-]+$" }, "url": { "description": "A URL to a source description to be used by a workflow", "type": "string", "format": "uri-reference" }, "type": { "description": "The type of source description", "enum": ["arazzo", "openapi", "asyncapi"] } }, "required": ["name", "url"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "workflow-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#workflow-object", "description": "Describes the steps to be taken across one or more APIs to achieve an objective", "type": "object", "properties": { "workflowId": { "description": "Unique string to represent the workflow", "$anchor": "workflowId", "type": "string" }, "summary": { "description": "A summary of the purpose or objective of the workflow", "type": "string" }, "description": { "description": "A description of the workflow. CommonMark syntax MAY be used for rich text representation", "type": "string" }, "inputs": { "description": "A JSON Schema 2020-12 object representing the input parameters used by this workflow", "$ref": "#/$defs/schema" }, "dependsOn": { "description": "A list of workflows that MUST be completed before this workflow can be processed", "type": "array", "uniqueItems": true, "items": { "type": "string" } }, "steps": { "description": "An ordered list of steps where each step represents a call to an API operation or to another workflow", "type": "array", "uniqueItems": true, "minItems": 1, "items": { "$ref": "#/$defs/step-object" } }, "successActions": { "description": "A list of success actions that are applicable for all steps described under this workflow", "type": "array", "uniqueItems": true, "items": { "oneOf": [{ "$ref": "#/$defs/success-action-object" }, { "$ref": "#/$defs/reusable-object" }] } }, "failureActions": { "description": "A list of failure actions that are applicable for all steps described under this workflow", "type": "array", "uniqueItems": true, "items": { "oneOf": [{ "$ref": "#/$defs/failure-action-object" }, { "$ref": "#/$defs/reusable-object" }] } }, "outputs": { "description": "A map between a friendly name and a dynamic output value defined using a Runtime Expression or Selector Object. Keys must match the regex: ^[a-zA-Z0-9\\.\\-_]+$\n", "type": "object", "patternProperties": { "^[a-zA-Z0-9\\.\\-_]+$": { "oneOf": [{ "type": "string" }, { "$ref": "#/$defs/selector-object" }] } } }, "parameters": { "description": "A list of parameters that are applicable for all steps described under this workflow", "type": "array", "uniqueItems": true, "items": { "oneOf": [{ "$ref": "#/$defs/parameter-object" }, { "$ref": "#/$defs/reusable-object" }] } } }, "required": ["workflowId", "steps"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "step-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#step-object'", "description": "Describes a single workflow step which MAY be a call to an\nAPI operation (OpenAPI Operation Object or AsyncAPI Operation Object or another Workflow Object)", "oneOf": [{ "$ref": "#/$defs/openapi-step-object" }, { "$ref": "#/$defs/asyncapi-step-object" }, { "$ref": "#/$defs/workflow-step-object" }] }, "step-object-base": { "type": "object", "properties": { "stepId": { "description": "Unique string to represent the step", "$anchor": "stepId", "type": "string" }, "description": { "description": "A description of the step. CommonMark syntax MAY be used for rich text representation", "type": "string" }, "timeout": { "description": "The duration in milliseconds to wait before timing out the step", "type": "integer" }, "dependsOn": { "description": "Specifies a list of step identifiers that must complete (or be waited for) before the current step can begin execution. `dependsOn` only establishes a prerequisite relationship for the current step and does not trigger execution of the referenced steps. Steps referred by dependsOn SHOULD be non-blocking/async steps. Steps in the current workflow MUST be referenced directly by stepId. Steps in another workflow in the same Arazzo document MUST use $workflows.<workflowId>.steps.<stepId>. Steps in another Arazzo document MUST use $sourceDescriptions.<name>.<workflowId>.steps.<stepId>.", "type": "array", "uniqueItems": true, "minItems": 1, "items": { "oneOf": [{ "type": "string", "pattern": "^(?!\\$).+$" }, { "type": "string", "pattern": "^\\$workflows\\.[^.]+\\.steps\\.[^.]+$" }, { "type": "string", "pattern": "^\\$sourceDescriptions\\.[^.]+\\.[^.]+\\.steps\\.[^.]+$" }] } }, "parameters": { "description": "A list of parameters that MUST be passed to an operation or workflow as referenced by operationId, operationPath, or workflowId", "type": "array", "uniqueItems": true, "items": true }, "requestBody": { "$ref": "#/$defs/request-body-object" }, "successCriteria": { "description": "A list of assertions to determine the success of the step", "type": "array", "uniqueItems": true, "minItems": 1, "items": { "$ref": "#/$defs/criterion-object" } }, "onSuccess": { "description": "An array of success action objects that specify what to do upon step success", "type": "array", "uniqueItems": true, "items": { "oneOf": [{ "$ref": "#/$defs/success-action-object" }, { "$ref": "#/$defs/reusable-object" }] } }, "onFailure": { "description": "An array of failure action objects that specify what to do upon step failure", "type": "array", "uniqueItems": true, "items": { "oneOf": [{ "$ref": "#/$defs/failure-action-object" }, { "$ref": "#/$defs/reusable-object" }] } }, "outputs": { "description": "A map between a friendly name and a dynamic output value defined using a Runtime Expression or Selector Object. Keys must match the regex: ^[a-zA-Z0-9\\.\\-_]+$\n", "type": "object", "patternProperties": { "^[a-zA-Z0-9\\.\\-_]+$": { "oneOf": [{ "type": "string" }, { "$ref": "#/$defs/selector-object" }] } } } }, "required": ["stepId"] }, "operation-step-parameters": { "type": "array", "uniqueItems": true, "items": { "oneOf": [{ "$ref": "#/$defs/reusable-object" }, { "$ref": "#/$defs/parameter-object", "required": ["in"] }] } }, "openapi-step-object": { "allOf": [{ "$ref": "#/$defs/step-object-base" }, { "type": "object", "properties": { "operationId": { "description": "The name of an existing, resolvable operation, as defined with a unique operationId and existing within one of the sourceDescriptions", "type": "string" }, "operationPath": { "description": "A reference to a Source combined with a JSON Pointer to reference an operation", "type": "string" }, "parameters": { "$ref": "#/$defs/operation-step-parameters" } } }, { "oneOf": [{ "required": ["operationId"] }, { "required": ["operationPath"] }] }], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "asyncapi-step-object": { "allOf": [{ "$ref": "#/$defs/step-object-base" }, { "type": "object", "properties": { "operationId": { "description": "The name of an existing, resolvable operation, as defined with a unique operationId and existing within one of the sourceDescriptions", "type": "string" }, "channelPath": { "description": "A reference to a Source combined with a JSON Pointer to reference an async channel", "type": "string" }, "correlationId": { "description": "ID to correlate async responses with their requests, only specified for async receive steps", "type": ["string", "number", "boolean", "object", "array"] }, "action": { "description": "Specifies the intended operation on the async channel, indicating whether the action is sending data to the channel or receiving data from the channel", "enum": ["send", "receive"] }, "parameters": { "$ref": "#/$defs/operation-step-parameters" } }, "required": ["action"] }, { "if": { "required": ["correlationId"] }, "then": { "properties": { "action": { "const": "receive" } }, "required": ["action"] } }, { "oneOf": [{ "required": ["operationId"] }, { "required": ["channelPath"] }] }], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "workflow-step-object": { "allOf": [{ "$ref": "#/$defs/step-object-base" }, { "type": "object", "properties": { "workflowId": { "description": "The workflowId referencing an existing workflow within the Arazzo description", "$ref": "#workflowId" }, "parameters": { "items": { "oneOf": [{ "$ref": "#/$defs/parameter-object" }, { "$ref": "#/$defs/reusable-object" }] } } }, "required": ["workflowId"] }], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "request-body-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#request-body-object", "description": "The request body to pass to an operation as referenced by operationId or operationPath or channelPath", "type": "object", "properties": { "contentType": { "description": "The Content-Type for the request content", "type": "string" }, "payload": true, "replacements": { "description": "A list of locations and values to set within a payload", "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/payload-replacement-object" } } }, "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "criterion-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#criterion-object", "description": "An object used to specify the context, conditions, and condition types\nthat can be used to prove or satisfy assertions specified in Step Object successCriteria,\nSuccess Action Object criteria, and Failure Action Object criteria", "type": "object", "properties": { "context": { "description": "A runtime expression used to set the context for the condition to be applied on", "type": "string" }, "condition": { "description": "The condition to apply", "type": "string" }, "type": { "description": "The type of condition to be applied or a reference to an expression type object", "oneOf": [{ "type": "string", "enum": ["simple", "regex", "jsonpath", "xpath"], "default": "simple" }, { "$ref": "#/$defs/expression-type-object" }] } }, "required": ["condition"], "dependentRequired": { "type": ["context"] }, "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "expression-type-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#expression-type-object", "description": "An object used to describe the type and version of an expression used within a Criterion Object or Selector Object. If the `version` is omitted, a default value is assumed based on the expression `type`", "type": "object", "properties": { "type": { "description": "The type of selector to use", "enum": ["jsonpath", "xpath", "jsonpointer"] }, "version": { "description": "A short hand string representing the version of the expression type. If omitted, the default for the selected type will be used.\n", "type": "string" } }, "required": ["type", "version"], "allOf": [{ "if": { "required": ["type"], "properties": { "type": { "const": "jsonpath" } } }, "then": { "properties": { "version": { "enum": ["rfc9535", "draft-goessner-dispatch-jsonpath-00"] } } } }, { "if": { "required": ["type"], "properties": { "type": { "const": "xpath" } } }, "then": { "properties": { "version": { "enum": ["xpath-10", "xpath-20", "xpath-30", "xpath-31"] } } } }, { "if": { "properties": { "type": { "const": "jsonpointer" } } }, "then": { "properties": { "version": { "const": "rfc6901" } } } }], "$ref": "#/$defs/specification-extensions" }, "success-action-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#success-action-object", "description": "A single success action which describes an action to take upon success of a workflow step", "type": "object", "properties": { "name": { "description": "The name of the success action", "type": "string" }, "type": { "description": "The type of action to take", "enum": ["end", "goto"] }, "workflowId": { "description": "The workflowId referencing an existing workflow within the Arazzo description to transfer to upon success of the step", "$ref": "#workflowId" }, "stepId": { "description": "The stepId to transfer to upon success of the step", "$ref": "#stepId" }, "parameters": { "description": "A list of parameters that MUST be passed to a workflow as referenced by workflowId", "type": "array", "uniqueItems": true, "items": true }, "criteria": { "description": "A list of assertions to determine if this action SHALL be executed", "type": "array", "uniqueItems": true, "minItems": 1, "items": { "$ref": "#/$defs/criterion-object" } } }, "allOf": [{ "if": { "properties": { "type": { "const": "goto" } } }, "then": { "oneOf": [{ "required": ["workflowId"] }, { "required": ["stepId"] }] } }, { "if": { "required": ["parameters"] }, "then": { "required": ["workflowId"] } }], "required": ["name", "type"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "failure-action-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#failure-action-object", "description": "A single failure action which describes an action to take upon failure of a workflow step", "type": "object", "properties": { "name": { "description": "The name of the failure action", "type": "string" }, "type": { "description": "The type of action to take", "enum": ["end", "goto", "retry"] }, "workflowId": { "description": "The workflowId referencing an existing workflow within the Arazzo description to transfer to upon failure of the step", "$ref": "#workflowId" }, "stepId": { "description": "The stepId to transfer to upon failure of the step", "$ref": "#stepId" }, "parameters": { "description": "A list of parameters that MUST be passed to a workflow as referenced by workflowId", "type": "array", "uniqueItems": true, "items": true }, "retryAfter": { "description": "A non-negative decimal indicating the seconds to delay after the step failure before another attempt SHALL be made", "type": "number", "minimum": 0 }, "retryLimit": { "description": "A non-negative integer indicating how many attempts to retry the step MAY be attempted before failing the overall step", "type": "integer", "minimum": 0 }, "criteria": { "description": "A list of assertions to determine if this action SHALL be executed", "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/criterion-object" } } }, "allOf": [{ "if": { "properties": { "type": { "enum": ["goto"] } } }, "then": { "oneOf": [{ "required": ["workflowId"] }, { "required": ["stepId"] }] } }, { "if": { "required": ["parameters"] }, "then": { "required": ["workflowId"] } }], "required": ["name", "type"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "reusable-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#reusable-object", "description": "A simple object to allow referencing of objects contained within the Components Object", "type": "object", "properties": { "reference": { "description": "A runtime expression used to reference the desired object", "type": "string" }, "value": { "description": "Sets a value of the referenced parameter", "type": ["string", "boolean", "object", "array", "number", "null"] } }, "required": ["reference"], "unevaluatedProperties": false }, "parameter-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#parameter-object", "description": "Describes a single step parameter", "type": "object", "properties": { "name": { "description": "The name of the parameter", "type": "string" }, "in": { "description": "The named location of the parameter", "enum": ["path", "query", "querystring", "header", "cookie", "channel"] }, "value": { "description": "The value to pass in the parameter", "oneOf": [{ "type": ["string", "boolean", "array", "number", "null"] }, { "$ref": "#/$defs/selector-object" }] } }, "required": ["name", "value"], "$ref": "#/$defs/specification-extensions", "unevaluatedProperties": false }, "payload-replacement-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#payload-replacement-object", "description": "Describes a location within a payload (e.g., a request body) and a value to set within the location", "type": "object", "properties": { "target": { "description": "A JSONPath, JSON Pointer, or XPath Expression which MUST be resolved against the request body", "type": "string" }, "targetSelectorType": { "description": "The selector expression type to use (e.g., `jsonpath`, `xpath`, or `jsonpointer`). Should an alternate version be required, the Expression Type Object may be used instead. If omitted, defaults to JSON Pointer for `application/json` or XPath for XML-based media types.\n", "$ref": "#/$defs/selector-type" }, "value": { "description": "The value to set at the location defined by the target. May be a literal, a runtime expression string, or a selector object.\n", "oneOf": [{ "type": "string" }, { "$ref": "#/$defs/selector-object" }] } }, "required": ["target", "value"], "unevaluatedProperties": false, "$ref": "#/$defs/specification-extensions" }, "selector-type": { "description": "A selector expression type that may be a simple string enum or an Expression Type Object for version-specific support", "oneOf": [{ "type": "string", "enum": ["jsonpointer", "jsonpath", "xpath"] }, { "$ref": "#/$defs/expression-type-object" }] }, "selector-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#selector-object", "description": "An object which enables fine-grained traversal and precise data selection from structured data", "type": "object", "properties": { "context": { "description": "A valid Runtime Expression which MUST evaluate to structured data (e.g., `$response.body`), and sets the context for the selector to be applied on", "type": "string" }, "selector": { "description": "A selector expression (e.g., `$.items[0].id`, `/Envelope/Item`) in the form of JSONPath expression, XPath expression, or JSON Pointer expression", "type": "string" }, "type": { "description": "The selector expression type to use (e.g., `jsonpath`, `xpath`, or `jsonpointer`) or an Expression Type Object for older version support", "$ref": "#/$defs/selector-type" } }, "required": ["context", "selector", "type"], "unevaluatedProperties": false, "$ref": "#/$defs/specification-extensions" }, "components-object": { "$comment": "https://spec.openapis.org/arazzo/v1.1#components-object", "description": "Holds a set of reusable objects for different aspects of the Arazzo Specification", "type": "object", "properties": { "inputs": { "description": "An object to hold reusable JSON Schema 2020-12 schemas to be referenced from workflow inputs", "type": "object", "additionalProperties": { "$ref": "#/$defs/schema" } }, "parameters": { "description": "An object to hold reusable Parameter Objects", "type": "object", "additionalProperties": { "$ref": "#/$defs/parameter-object" } }, "successActions": { "description": "An object to hold reusable Success Actions Objects", "type": "object", "additionalProperties": { "$ref": "#/$defs/success-action-object" } }, "failureActions": { "description": "An object to hold reusable Failure Actions Objects", "type": "object", "additionalProperties": { "$ref": "#/$defs/failure-action-object" } } }, "patternProperties": { "^(inputs|parameters|successActions|failureActions)$": { "$comment": "Enumerating all of the property names in the regex is necessary for unevaluatedProperties to work as expected", "propertyNames": { "pattern": "^[a-zA-Z0-9\\.\\-_]+$" } } }, "unevaluatedProperties": false, "$ref": "#/$defs/specification-extensions" }, "specification-extensions": { "$comment": "https://spec.openapis.org/arazzo/v1.1#specification-extensions", "description": "While the Arazzo Specification tries to accommodate most use cases, additional data can be added to extend the specification at certain points", "patternProperties": { "^x-": true } }, "schema": { "$comment": "https://spec.openapis.org/arazzo/v1.1#schema-object", "$ref": "https://json-schema.org/draft/2020-12/schema" } } };

export { ARAZZO_SCHEMA_1_0, ARAZZO_SCHEMA_1_1, DEFAULT_EXPRESSION_VERSIONS, EXPRESSION_ROOTS, KNOWN_ARAZZO_VERSIONS, LATEST_ARAZZO_VERSION, LEGACY_CODE_MAP, RULES, UNKNOWN_LANE, WORKFLOW_LANE, checkJsonPath, checkJsonPointer, checkRegex, checkSimpleCondition, checkXPath, createLineIndex, detect11Features, diagnosticRange, effectiveActions, expressionsInString, findEmbeddedExpressions, getArazzoMinor, getArazzoVersion, getSupportedMinor, graphToMermaid, isArazzoDocument, isExpressionType, isKnownArazzoVersion, isReusableObject, isSelector, isUriReference, isWellFormedArazzoVersion, locate, operationFromPath, parseArazzo, parseRuntimeExpression, pathToPointer, pointerToPath, resolveFailureActions, resolveParameters, resolveStepSource, resolveSuccessActions, stepTargets, validate, validateText, workflowToGraph };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map