// ***************************
// API CloudFormation exports
// ***************************
export const CONSENT_MANAGEMENT_API_ENDPOINT_EXPORT_NAME = 'ConsentManagementApiEndpoint';

// WARNING: Do not change this export name without also updating the integ tests in .github/actions/.
// The integ tests rely on the export name to dynamically retrieve the API Gateway ID and resource IDs,
// which they use to make API Gateway TestInvokeMethod CLI calls to query the API endpoints.
export const CONSENT_MANAGEMENT_API_GATEWAY_ID_EXPORT_NAME = 'ConsentManagementApiGatewayId';

// ***************************
// API Gateway properties
// ***************************
export const CONSENT_MANAGEMENT_API_DOCS_URL = 'https://consent-management-platform.github.io/consent-management-api-models/v1/docs.html';

// Restrict the maximum number of active and queued requests per second
// Can increase when enabling load tests or onboarding clients,
// in the meantime, limit to avoid uncontrolled spending
export const CONSENT_MANAGEMENT_API_THROTTLING_LIMIT = 3;
export const CONSENT_MANAGEMENT_API_THROTTLING_BURST_LIMIT = 5;
