import { htmlReport } from 'https://arm1s11-eiffel004.eiffel.gic.ericsson.se:8443/nexus/content/sites/oss-sites/common/k6/eric-k6-static-report-plugin/latest/bundle/eric-k6-static-report-plugin.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { Trend, Counter } from 'k6/metrics';
import http from 'k6/http';
import { check, fail } from 'k6';
import * as auth from './utility/auth.js';

import {
  ENM_URL,
  IAM_HOST,
  OUTSIDE_API_GW_TLS_URL,
  cps_headers,
  login_headers, NCMP_URL
} from './utility/constants.js';
import { login } from './utility/utility.js';
import { ENMNotificationAdapterPerformance } from './use-cases/Non-Functional/ENMNotificationAdapterMetrics.js';
import { describe } from './utility/describe.js';
import {
  authorizeSEF,
  getSubsystemId,
  getNodeCountsFromENMNew,
  authorizeAPIGW
} from "./use-cases/Characteristics/charutils.js";
import * as crudFlow from './use-cases/Characteristics/crudFlow.js';
import * as crudFlowENM from './use-cases/Characteristics/crudFlowENM.js';
import * as discoveryFlow from './use-cases/Characteristics/discoveryFlow.js';
import * as deregisterFlow from './use-cases/Characteristics/deregisterFlow.js';
import * as batchFlow from './use-cases/Characteristics/batchFlow.js';
import * as searchesFlow from './use-cases/Characteristics/searchesFlow.js';

export let customMetrics = {};
export const errorCounterChar = new Counter('Errors');

customMetrics['cmHandleDiscoveryChar'] = new Counter('cmHandleDiscoveryChar', true);
customMetrics['gnbduTopologyDiscovery'] = new Counter('gnbduTopologyDiscovery', true);
customMetrics['gnbcucpTopologyDiscovery'] = new Counter('gnbcucpTopologyDiscovery', true);
customMetrics['gnbcuupTopologyDiscovery'] = new Counter('gnbcuupTopologyDiscovery', true);
customMetrics['nrcellTopologyDiscovery'] = new Counter('nrcellTopologyDiscovery', true);
customMetrics['nrsectorcarrierTopologyDiscovery'] = new Counter('nrsectorcarrierTopologyDiscovery', true);
customMetrics['enodebTopologyDiscovery'] = new Counter('enodebTopologyDiscovery', true);
customMetrics['ltecellTopologyDiscovery'] = new Counter('ltecellTopologyDiscovery', true);
customMetrics['CMEventsPerformance'] = new Counter('CMEventsPerformance', true);

customMetrics['cmHandleCleanup'] = new Counter('cmHandleCleanup', true);
customMetrics['gnbduTopologyDeregistration'] = new Counter('gnbduTopologyDeregistration', true);
customMetrics['nrcellTopologyDeregistration'] = new Counter('nrcellTopologyDeregistration', true);
customMetrics['nrsectorcarrierTopologyDeregistration'] = new Counter('nrsectorcarrierTopologyDeregistration', true);
customMetrics['gnbcuupTopologyDeregistration'] = new Counter('gnbcuupTopologyDeregistration', true);
customMetrics['gnbcucpTopologyDeregistration'] = new Counter('gnbcucpTopologyDeregistration', true);
customMetrics['enodebTopologyDeregistration'] = new Counter('enodebTopologyDeregistration', true);
customMetrics['ltecellTopologyDeregistration'] = new Counter('ltecellTopologyDeregistration', true);

customMetrics['readOperationSuccessful'] = new Trend('readOperationSuccessful', true);
customMetrics['readOperationFailed'] = new Trend('readOperationFailed', true);
customMetrics['createOperationSuccessful'] = new Trend('createOperationSuccessful', true);
customMetrics['createOperationFailed'] = new Trend('createOperationFailed', true);
customMetrics['deleteOperationSuccessful'] = new Trend('deleteOperationSuccessful', true);
customMetrics['deleteOperationFailed'] = new Trend('deleteOperationFailed', true);
customMetrics['updateOperationSuccessful'] = new Trend('updateOperationSuccessful', true);
customMetrics['updateOperationFailed'] = new Trend('updateOperationFailed', true);

customMetrics['idSearchPublicPropertySuccessful'] = new Trend('idSearchPublicPropertySuccessful', true);
customMetrics['idSearchPublicPropertyFailed'] = new Trend('idSearchPublicPropertyFailed', true);
customMetrics['idSearchModulePropertySuccessful'] = new Trend('idSearchModulePropertySuccessful', true);
customMetrics['idSearchModulePropertyFailed'] = new Trend('idSearchModulePropertyFailed', true);
customMetrics['idSearchWithoutFilterSuccessful'] = new Trend('idSearchWithoutFilterSuccessful', true);
customMetrics['idSearchWithoutFilterFailed'] = new Trend('idSearchWithoutFilterFailed', true);
customMetrics['searchPublicPropertySuccessful'] = new Trend('searchPublicPropertySuccessful', true);
customMetrics['searchPublicPropertyFailed'] = new Trend('searchPublicPropertyFailed', true);
customMetrics['searchModulePropertySuccessful'] = new Trend('searchModulePropertySuccessful', true);
customMetrics['searchModulePropertyFailed'] = new Trend('searchModulePropertyFailed', true);
customMetrics['searchWithoutFilterSuccessful'] = new Trend('searchWithoutFilterSuccessful', true);
customMetrics['searchWithoutFilterFailed'] = new Trend('searchWithoutFilterFailed', true);

customMetrics['batchReadCRUDOperationSuccessful'] = new Trend('batchReadCRUDOperationSuccessful', true);
customMetrics['batchReadCRUDOperationFailed'] = new Trend('batchReadCRUDOperationFailed', true);

// customMetrics[key + 'JOB'] = new Trend(key + 'JOB', true);
// customMetrics[key + 'JOBDURATION'] = new Trend(key + 'JOBDURATION', true);
// customMetrics[key + 'COMMAND'] = new Trend(key + 'COMMAND', true);
// customMetrics[key + 'COMMANDDURATION'] = new Trend(key + 'COMMANDDURATION', true);

export function setup() {

  let access_token, k6ClientId;
  let sessionIDAPIGW, sessionAPIGW, sessionHeader, session, gatewayUrl, subsystemId;

  const USE_SEF = __ENV.USE_SEF;
  if (USE_SEF === undefined) fail('USE_SEF is undefined');
  if (USE_SEF === 'true') {
    //=====================Get SEF data===========================
    ({ access_token, k6ClientId } = authorizeSEF());
    sessionHeader = {
      headers: {
        'content-type': `application/json`,
        Authorization: `Bearer ${access_token}`,
      },
      timeout: '600s'
    };
    gatewayUrl = IAM_HOST;
    session = { gatewayUrl, sessionHeader };
    subsystemId = getSubsystemId(ENM_URL, session);
  } else {
    //=====================Get API-GW data===========================
    //login with gas-user through API-GW to get subsystemID for searches tests
    sessionIDAPIGW = authorizeAPIGW(OUTSIDE_API_GW_TLS_URL, login_headers);
    sessionHeader = {
      headers: {
        'content-type': `application/json`,
        Cookie: `JSESSIONID=${sessionIDAPIGW}`,
      },
    };
    gatewayUrl = OUTSIDE_API_GW_TLS_URL;
    session = { gatewayUrl, sessionHeader };
    subsystemId = getSubsystemId(ENM_URL, session);
    // subsystemId = 2;

    //login with cps-user through API-GW to perform searches or crud operations
    sessionIDAPIGW = authorizeAPIGW(OUTSIDE_API_GW_TLS_URL, cps_headers);
    sessionAPIGW = {
      headers: {
        'content-type': `application/json`,
        Cookie: `JSESSIONID=${sessionIDAPIGW}`,
      },
      timeout: '600s'
    };
    sessionHeader = sessionAPIGW;
    session = { gatewayUrl, sessionHeader };
  }

  //=====================Get ENM data===========================
  let sessionENM = login(ENM_URL);
  let enmData = getNodeCountsFromENMNew(sessionENM);
  // let enmData = {};

  //getAndAddCert();

  //===================Change session.gatewayurl for NCMP in case of batch test================
  // session.gatewayUrl=NCMP_URL;

  return {
    session: session,
    k6ClientId,
    subsystemId : subsystemId,
    sessionENM : sessionENM,
    nodes5g: enmData.nodes5g,
    nodes4g: enmData.nodes4g,
    counts: enmData.counts,
  };
}

//Discovery tests
export function cmHandleDiscoveryChar(data) {
  discoveryFlow.cmHandleDiscoveryChar(data);
}

export function gnbduTopologyDiscoveryChar(data) {
  discoveryFlow.gnbduTopologyDiscoveryChar(data);
}

export function nrcellTopologyDiscoveryChar(data) {
  discoveryFlow.nrcellTopologyDiscoveryChar(data);
}

export function nrsectorcarrierTopologyDiscoveryChar(data) {
  discoveryFlow.nrsectorcarrierTopologyDiscoveryChar(data);
}

export function gnbcuupTopologyDiscoveryChar(data) {
  discoveryFlow.gnbcuupTopologyDiscoveryChar(data);
}

export function gnbcucpTopologyDiscoveryChar(data) {
  discoveryFlow.gnbcucpTopologyDiscoveryChar(data);
}

export function enodebTopologyDiscoveryChar(data) {
  discoveryFlow.enodebTopologyDiscoveryChar(data);
}

export function ltecellTopologyDiscoveryChar(data) {
  discoveryFlow.ltecellTopologyDiscoveryChar(data);
}

//CRUD test
export function CRUDMeasurements(data) {
  if (__ENV.operationType === undefined) fail();
  crudFlow.CRUDMeasurements(data, __ENV.operationType);
}

//CRUD cleanup
export function CRUDCleanup(data) {
  crudFlowENM.cleanupRemainingCellsENM(data);
}

//Searches tests
export function idSearchPublicPropertyFlow(data) {
  searchesFlow.idSearchPublicPropertyFlow(data);
}

export function idSearchModulePropertyFlow(data) {
  searchesFlow.idSearchModulePropertyFlow(data);
}

export function idSearchWithoutFilterFlow(data) {
  searchesFlow.idSearchWithoutFilterFlow(data);
}

export function searchPublicPropertyFlow(data) {
  searchesFlow.searchPublicPropertyFlow(data);
}

export function searchModulePropertyFlow(data) {
  searchesFlow.searchModulePropertyFlow(data);
}

export function searchWithoutFilterFlow(data) {
  searchesFlow.searchWithoutFilterFlow(data);
}

//Notifications test
export function ENMEventPropagation(){
  ENMNotificationAdapterPerformance()
}

//Deregistration tests
export function cmHandleCleanup(data) {
  deregisterFlow.cmHandleCleanup(data);
}

export function gnbduCTSCleanup() {
  deregisterFlow.gnbduCTSCleanup();
}

export function nrcellCTSCleanup() {
  deregisterFlow.nrcellCTSCleanup();
}

export function nrsectorcarrierCTSCleanup() {
  deregisterFlow.nrsectorcarrierCTSCleanup();
}

export function gnbcuupCTSCleanup() {
  deregisterFlow.gnbcuupCTSCleanup();
}

export function gnbcucpCTSCleanup() {
  deregisterFlow.gnbcucpCTSCleanup();
}

export function enodebCTSCleanup() {
  deregisterFlow.enodebCTSCleanup();
}

export function ltecellCTSCleanup() {
  deregisterFlow.ltecellCTSCleanup();
}

//Batch tests
export function batchReadCRUDOperation(data) {
  batchFlow.batchReadCRUDOperation(data);
}

export function queryBatchResultsTest() {
  batchFlow.queryBatchResultsTest();
}

export function teardown(data) {
  describe('Delete K6 client', function () {
    console.log('Deleting K6 client in Keycloak ...');
    let { k6ClientId } = data;
    let keycloakToken = auth.getKeycloakToken().json()['access_token'];
    const url = `${IAM_HOST}auth/admin/realms/master/clients/${k6ClientId}`;
    const headers = {
      Authorization: 'Bearer ' + keycloakToken,
      'Content-Type': 'application/json',
      Accept: '*/*',
      Cookie: {},
    };
    let res = http.del(url, null, { headers });
    check(res, {
      'k6test client deleted successfully': res.status == 204,
    });
    if (!res) {
      console.log('Delete client status: ' + res.status);
      console.log('Delete client body: ' + res.body);
      console.log('keycloakToken: ' + keycloakToken);
      console.log('clientid: ' + k6ClientId);
    }
  });
}

export function handleSummary(data) {
  return {
    '/reports/summary.json': JSON.stringify(data),
    '/reports/eas-result.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
  };
}
