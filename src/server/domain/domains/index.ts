/**
 * Registers every audit domain.
 *
 * Importing a domain module is what puts it in the registry, so anything that
 * resolves a domain by id must import this barrel rather than the individual
 * modules — otherwise a domain is "unknown" purely because nothing happened to
 * import it yet, which is a maddening bug to chase.
 */
import "./aml";
import "./conduct";
import "./clientAssets";
import "./technology";

export { AML_DOMAIN } from "./aml";
export { CONDUCT_DOMAIN } from "./conduct";
export { CLIENT_ASSETS_DOMAIN } from "./clientAssets";
export { TECHNOLOGY_DOMAIN } from "./technology";
