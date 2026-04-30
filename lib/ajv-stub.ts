// Stub: ajv is aliased away for Workers builds.
// Actual validation uses CfWorkerJsonSchemaValidator from the MCP SDK.
export default class Ajv {
  compile() {
    return () => true;
  }
}
