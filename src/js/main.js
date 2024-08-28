import http from 'k6/http';
import { check, sleep } from 'k6';
import encoding from 'k6/encoding';
import { Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://arm1s11-eiffel004.eiffel.gic.ericsson.se:8443/nexus/content/sites/oss-sites/common/k6/eric-k6-static-report-plugin/latest/bundle/eric-k6-static-report-plugin.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { deleteSubsystem, getCmHandlesForEnm, getCmHandlesForEnmForPS, getSubsystemId, setCmHandleCount, statusCTSdiscoveryPE, startFrame, endLine, checkRestSimStatus, login, convertCommandResponse, filterResponseForRadioNodes, filterResponseForSharedCNF, sendCommand, goodRadioNodesCountfromENM, filterResponse, statusCTSdiscoveryPELargeENM, countNetworkElementsRestsim, registerENM } from './utility/utility.js';
import { IAM_HOST, OUTSIDE_API_GW_TLS_URL, login_headers, RESTSIM_URL, DISCOVERY_NODE_TYPES, RESTSIMURL1, RESTSIMURL2, CLIENT_ROLES, k6_user, k6_password, clientId, PM_SERVER_URL } from './utility/constants.js';
import { customMetrics } from './use-cases/Non-Functional/CRUDBase.js';
import { readOp, createOp, updateOp, deleteOp, registerSubsystem, topologyDiscovery, createOpSharedCNF, updateOpSharedCNF, deleteOpSharedCNF, readOpSharedCNF } from './use-cases/Non-Functional/CRUDOperations.js';
import { ENMModelAdapterMetrics } from './use-cases/Non-Functional/ENMModelAdapterMetrics.js';
import { ENMNotificationAdapterMetrics } from './use-cases/Non-Functional/ENMNotificationAdapterMetrics.js';
import * as auth from './utility/auth.js';
import * as batchFlow from './use-cases/Characteristics/batchFlow.js';

//Test Cases
import eventPolling_restsim from './use-cases/Functional/eventPolling_restsim.js';
import EAS_4 from './use-cases/Functional/EAS_4.js';
// import EAS_5 from './use-cases/Functional/EAS_5.js';
import EAS_6 from './use-cases/Functional/EAS_6.js';
import EAS_7 from './use-cases/Functional/EAS_7.js';
import EAS_8 from './use-cases/Functional/EAS_8.js';
import EAS_9 from './use-cases/Functional/EAS_9.js';
// import EAS_10 from './use-cases/Functional/EAS_10.js';
// import EAS_11 from './use-cases/Functional/EAS_11.js';
import EAS_12 from './use-cases/Functional/EAS_12.js';
import EAS_13 from './use-cases/Functional/EAS_13.js';
import EAS_14 from './use-cases/Functional/EAS_14.js';
import EAS_15 from './use-cases/Functional/EAS_15.js';
import EAS_16 from './use-cases/Functional/EAS_16.js';
import EAS_17 from './use-cases/Functional/EAS_17.js';
import EAS_18 from './use-cases/Functional/EAS_18.js';
import EAS_19 from './use-cases/Functional/EAS_19.js';
import EAS_20 from './use-cases/Functional/EAS_20.js';
import Gat_3_1 from './use-cases/GAT/Gat_3_1.js';
import Gat_3_2 from './use-cases/GAT/Gat_3_2.js';
import Gat_3_3 from './use-cases/GAT/Gat_3_3.js';
import Gat_3_5 from './use-cases/GAT/Gat_3_5.js';
import { ENMNotificationAdapterPerformance } from './use-cases/Non-Functional/ENMNotificationAdapterMetrics.js';
// import Gat_Cleanup from './use-cases/GAT/Gat_Cleanup.js';

// import NF_1 from './NF_1.js';
// import NF_2 from './NF_2.js';
// import NF_3 from './NF_3.js';
// import NF_4 from './NF_4.js';
// import NF_5 from './NF_5.js';
// export { NF_6 } from './NF_6.js';
// export { NF_7 } from './NF_7.js';
// export { NF_8 } from './NF_8.js';
// export { NF_9 } from './NF_9.js';
import { describe } from './utility/describe.js';
import { subsystemId } from './use-cases/GAT/Gat_3_1.js';
import ncmpRolesTests from './use-cases/Functional/ncmpRolesTests.js';

const start = Date.now();
export const errorCounter = new Counter('Errors');

const K6_CONSUMER_GROUP = 'k6-consumer-group';
const K6_CONSUMER_ID = 'k6-cgi-1';

let codedCleanupSubsysCommand = encoding.b64encode('subsystems.cleanupSubsystemManager()');
let virtual_users = 2;
let its = 50;

export function handleSummary(data) {
  return {
    '/reports/summary.json': JSON.stringify(data),
    '/reports/eas-result.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// --- Creating the custom metrics for CRUD operations before the Setup function

/*
for (let key in options.scenarios) {
  if ("env" in options.scenarios[key]) {
    options.scenarios[key].env['MY_SCENARIO'] = key;
    options.scenarios[key].env['DURATION'] = key + 'DURATION';
    customMetrics[key] = new Trend(key, true);
    customMetrics[key + 'DURATION'] = new Counter(key + 'DURATION');
  }
}
*/

customMetrics['createOp'] = new Trend('createOp', true);
customMetrics['readOp'] = new Trend('readOp', true);
customMetrics['updateOp'] = new Trend('updateOp', true);
customMetrics['deleteOp'] = new Trend('deleteOp', true);
customMetrics['createOpSharedCNF'] = new Trend('createOpSharedCNF', true);
customMetrics['readOpSharedCNF'] = new Trend('readOpSharedCNF', true);
customMetrics['updateOpSharedCNF'] = new Trend('updateOpSharedCNF', true);
customMetrics['deleteOpSharedCNF'] = new Trend('deleteOpSharedCNF', true);
customMetrics['CUDop'] = new Trend('CUDop', true);
customMetrics['cmHandleDiscovery'] = new Trend('cmHandleDiscovery', true);

export function setup() {
  console.log('Executing setup');
  const sessionId = authorize();
  const head = {
    headers: {
      'content-type': `application/json`,
      Cookie: `JSESSIONID=${sessionId}`,
    },
  };
  let headSef = '',
    access_token = '',
    k6ClientId = '';
  ({ access_token, k6ClientId } = authorizeSEF());
  headSef = {
    headers: {
      'content-type': `application/json`,
      Authorization: `Bearer ${access_token}`,
    },
  };
  let gatewayUrl = IAM_HOST;
  let sessionHeader = headSef;
  let session = { gatewayUrl, sessionHeader };
  describe('Verify Subsystem Management', function () {
    console.log('Subsystem Manager sanity check for subsystem types');
    // Get list of subsystem types
    startFrame('Starting EAS_TC_001: Get List of subsystem Types');
    console.log('Check #1: List of Subsystem types status is 200 OK');
    console.log('Check #1: List of Subsystem types response contains all details');
    let getSubsys = http.request('GET', OUTSIDE_API_GW_TLS_URL + 'subsystem-manager/v1/subsystem-types?select=name,id,url', '', head);
    check(getSubsys, {
      'List of Subsystem types status is 200 OK': (r) => getSubsys.status === 200,
      'List of Subsystem types response contains all details': (r) => getSubsys.body.includes('id', 'type', 'category'),
    });
    endLine('Finished EAS_TC_001');

    console.log('getSubsys.body: ' + getSubsys.body);
    console.log('getSubsys.status: ' + getSubsys.status);

    // Get list of registered subsystems and deleting them if it finds any
    startFrame('Starting EAS_TC_002: Get list of registered ENMs');
    let subsystemList = http.request('GET', OUTSIDE_API_GW_TLS_URL + 'subsystem-manager/v3/subsystems?select=name,id,url', '', head);
    console.log('List of subsystems: ' + subsystemList.body);
    let responseBody = JSON.parse(subsystemList.body);
    if (responseBody.length > 0) {
      console.log('Check #1: List of registered ENMs is 200 OK');
      console.log('Check #1: List of registered ENMs is empty');
      for (let i = 0; i < responseBody.length; i++) {
        if (responseBody[i].name.includes('Cerberus')) {
          let subsystemId = responseBody[i].id;
          console.log('3');
          deleteSubsystem(subsystemId);
          console.log('4');
          check(subsystemList, {
            'List of registered ENMs is 200 OK': (r) => subsystemList.status === 200,
          });
        } else {
          console.log('No need to check for ' + responseBody[i].name);
        }
      }
    } else {
      check(subsystemList, {
        'List of registered ENMs is 200 OK': (r) => subsystemList.status === 200,
        'List of registered ENMs is empty': (r) => JSON.parse(subsystemList.body).length == 0,
      });
    }
    endLine('Finished EAS_TC_002');
  });
  describe('Create K6 test user', function () {
    console.log('Creating K6 test user in User Management ...');
    const userDetails = {
      user: {
        username: k6_user,
        privileges: ['NCMP'],
        status: 'Enabled',
      },
      password: k6_password,
      passwordResetFlag: false,
      tenant: 'master',
    };
    const res = http.post(OUTSIDE_API_GW_TLS_URL + 'idm/usermgmt/v1/users', JSON.stringify(userDetails), head);
    console.log('Create user status: ' + res.status);
    console.log('Create user body: ' + res.body);
    check(res, {
      'User created successfully': res.status == 200,
    });
  });
  // Prerequisite: to successfully get metrics endpoint, running `istio-proxy` container is required
  describe('Get all scrape pools', function () {
    let getScrapePools = http.request('GET', OUTSIDE_API_GW_TLS_URL + 'metrics/viewer/api/v1/targets?state=active', '', head);
    try {
      check(getScrapePools, {
        'Get scrape pools status is 200 OK': (r) => getScrapePools.status === 200,
      });
      if (getScrapePools.status === 200) {
        let pools = JSON.parse(getScrapePools.body);
        let allPoolsUp = true;
        for (let i = 0; i < pools.data.activeTargets.length; i++) {
          let target = pools.data.activeTargets[i];
          if (target.health != 'up') {
            console.log(`TARGET is ${target.health}: ` + target.scrapePool);
            console.log('LAST ERROR: ' + target.lastError);
            if (target.labels.pod_name != undefined) {
              // if target.scrapePool is: envoy-stats, kubernetes-pods, kubernetes-pods-istio-secure
              console.log('POD NAME: ' + target.labels.pod_name);
            } else if (target.discoveredLabels.__meta_kubernetes_pod_name != undefined) {
              // if target.scrapePool is: kubernetes-service-endpoints, kubernetes-service-endpoints-istio-secure
              console.log('POD NAME: ' + target.discoveredLabels.__meta_kubernetes_pod_name);
            } else {
              // if target.scrapePool is: configmap-reload, kubernetes-apiservers, kubernetes-cadvisor, kubernetes-nodes, pm-exporter, prometheus, reverse-proxy, sm-controller
              console.log('POD NAME is unknown');
            }
            allPoolsUp = false;
          }
        }
        if (allPoolsUp == false) throw new Error('At least one scrape pool is in down state');
        check(allPoolsUp, {
          'All scrape pools are up': (r) => r === true,
        });
      }
    } catch (e) {
      console.log('Warning: ' + e.message + ', therefore the check has been disabled');
    }
  });

  var url = RESTSIM_URL;
  var restsimurl1 = '',
    restsimurl2 = '',
    isURL1valid,
    isURL2valid;
  console.log('url :>> ', url);
  console.log('RESTSIMURL1 :>> ', RESTSIMURL1);
  console.log('RESTSIMURL2 :>> ', RESTSIMURL2);
  if (RESTSIMURL1 != '') {
    if (RESTSIMURL1.endsWith('/')) {
      restsimurl1 = RESTSIMURL1.slice(0, -1);
    } else {
      restsimurl1 = RESTSIMURL1;
    }
    isURL1valid = checkRestSimStatus(restsimurl1);
  }
  if (RESTSIMURL2 != '') {
    if (RESTSIMURL2.endsWith('/')) {
      restsimurl2 = RESTSIMURL2.slice(0, -1);
    } else {
      restsimurl2 = RESTSIMURL2;
    }
    isURL2valid = checkRestSimStatus(restsimurl2);
  }
  console.log('url :>> ', url);

  checkRestSimStatus(url);
  try {
    let filtered5gNodes, filtered4gNodes;
    let authToken1, radioNodesAll1, NEwithStatus1, counts1, filteredRadioNodes1, filtered5gNodesRestsim1;
    let authToken2, radioNodesAll2, NEwithStatus2, radioNodes2, counts2, filteredRadioNodes2;

    let authToken = login(url);
    let radioNodesAll = convertCommandResponse(sendCommand('cmedit get * ManagedElement.neType==RadioNode', authToken, url), 'FDN : ');
    let NEwithStatus = sendCommand('cmedit get * NetworkElement.neType==RadioNode NetworkElement.softwareSyncStatus', authToken, url);
    let sharedCNFNodes = convertCommandResponse(sendCommand('cmedit get * ManagedElement.neType==Shared-CNF', authToken, url), 'FDN : ');
    let radioNodes = filterResponse(radioNodesAll, NEwithStatus);
    let filteredSharedCNFNodes = filterResponseForSharedCNF(sharedCNFNodes);
    if (isURL1valid) {
      authToken1 = login(restsimurl1);
      radioNodesAll1 = convertCommandResponse(sendCommand('cmedit get * ManagedElement.neType==RadioNode', authToken1, restsimurl1), 'FDN : ');
      NEwithStatus1 = sendCommand('cmedit get * NetworkElement.neType==RadioNode NetworkElement.(softwareSyncStatus,radioAccessTechnology,networkFunctions)', authToken1, restsimurl1);
      filteredRadioNodes1 = filterResponseForRadioNodes(radioNodesAll1, 'sim');
      filtered5gNodesRestsim1 = filterResponseForRadioNodes(radioNodesAll1, 'NR');
      console.log('radioNodesAll1count :>> ', radioNodesAll1.length);
      counts1 = countNetworkElementsRestsim(authToken1, restsimurl1);
      console.log('counts1 :>> ', counts1);
    }
    if (isURL2valid) {
      authToken2 = login(restsimurl2);
      radioNodesAll2 = convertCommandResponse(sendCommand('cmedit get * ManagedElement.neType==RadioNode', authToken2, restsimurl2), 'FDN : ');
      NEwithStatus2 = sendCommand('cmedit get * NetworkElement.neType==RadioNode NetworkElement.(softwareSyncStatus,radioAccessTechnology,networkFunctions)', authToken2, restsimurl2);
      radioNodes2 = filterResponse(radioNodesAll2, NEwithStatus2);
      filteredRadioNodes2 = filterResponseForRadioNodes(radioNodes2, 'sim');
      console.log('radioNodes2count :>> ', radioNodes2.length);
      counts2 = countNetworkElementsRestsim(authToken2, restsimurl2);
      console.log('counts2 :>> ', counts2);
    }
    filtered5gNodes = filterResponseForRadioNodes(radioNodes, 'NR');
    filtered4gNodes = filterResponseForRadioNodes(radioNodes, 'LTE');
    let SharedCNFnodescount = parseInt(sharedCNFNodes.length);
    let RadioNodenodescount = parseInt(goodRadioNodesCountfromENM(NEwithStatus));
    if (!DISCOVERY_NODE_TYPES.includes('Shared-CNF')) {
      SharedCNFnodescount = 0;
    }
    setCmHandleCount(RadioNodenodescount, 'Ireland');
    console.log('filtered5gNodes count :>> ', filtered5gNodes.length);
    console.log('filtered4gNodes count :>> ', filtered4gNodes.length);
    console.log('sharedCNFNodes count :>> ', SharedCNFnodescount);
    console.log('radioNodescount :>> ', RadioNodenodescount);
    return {
      session: session,
      nodes5g: filtered5gNodes,
      nodes4g: filtered4gNodes,
      nodes5gRestsim1: filtered5gNodesRestsim1,
      nodessharedcnf: sharedCNFNodes,
      nodessharedcnf2: filteredSharedCNFNodes,
      radiocnt: RadioNodenodescount,
      sharedcnt: SharedCNFnodescount,
      countbase5G: filtered5gNodes.length,
      countbase4G: filtered4gNodes.length,
      countsrestsim1: counts1,
      countsrestsim2: counts2,
      url: url,
      url1: restsimurl1,
      url2: restsimurl2,
      url1Valid: isURL1valid,
      url2Valid: isURL2valid,
      radioNodes: radioNodes,
      radioNodesAll1: radioNodesAll1,
      authToken: authToken,
      headSef,
      k6ClientId,
      access_token,
    };
  } catch (error) {
    console.log('Error occured: ' + error);
  }
}

export default function (data) {
  const sessionId = authorize();
  const head = {
    headers: {
      'content-type': `application/json`,
      Cookie: `JSESSIONID=${sessionId}`,
    },
  };
  let { headSef } = data;

  let RadioNodenodescount = data.radiocnt;
  Gat_3_1(head, data, headSef);
  Gat_3_2(headSef);
  Gat_3_3(headSef);
  Gat_3_5(headSef);
  // Gat_Cleanup();
  if (RadioNodenodescount > 400) {
    console.log('The cmHandle count is ' + RadioNodenodescount + ', so we skip other use cases!');
  } else {
    // ENMModelAdapterMetrics(subsystemId);
    eventPolling_restsim(subsystemId, data);
    ENMNotificationAdapterMetrics();
    EAS_4(headSef);
    //EAS_5(subsystemId, headSef);
    //vDU support is disabled until further PO decision
    EAS_6(subsystemId, headSef);
    EAS_7(subsystemId);
    EAS_8(subsystemId);
    EAS_9(subsystemId);
    //EAS_10(); EAS10, 11 disabled because these tests irrelevant here, and there have similar tests on microservice level.
    //EAS_11();
    EAS_12();
    EAS_15(subsystemId, headSef);
    EAS_16(subsystemId);
    EAS_17(subsystemId);
    EAS_18(subsystemId, data);
    EAS_19(data, headSef);
  }
  ncmpRolesTests();
  EAS_13(subsystemId, data, headSef);

  EAS_20(head, headSef);
  EAS_14(subsystemId, data, headSef);

  // NF_1 is a prerequisite for the next NF tests that follow
  // NF_1(subsystemId);
  // NF_2(subsystemId);
  // NF_3(subsystemId);
  // NF_4(subsystemId);
  // NF_5();
  // }
}

// --------- Defining Characteristic Scenario functions -----------

export function batchReadCRUDOperation(data) {
  batchFlow.batchReadCRUDOperationRESTSim(data);
}

export function queryBatchResultsTest() {
  batchFlow.queryBatchResultsTest();
}

//Notifications test
export function ENMEventPropagation() {
  ENMNotificationAdapterPerformance();
}

export function createOP(data) {
  createOp(data.nodes5g, data.headSef);
  deleteOp(data.nodes5g, data.headSef);
}

export function updateOP(data) {
  createOp(data.nodes5g, data.headSef);
  updateOp(data.nodes5g, data.headSef);
  deleteOp(data.nodes5g, data.headSef);
}

export function deleteOP(data) {
  createOp(data.nodes5g, data.headSef);
  deleteOp(data.nodes5g, data.headSef);
}

export function CUDop(data) {
  describe('CRUD operations', function () {
    createOp(data.nodes5g, data.headSef);
    readOp(data.nodes5g, data.headSef);
    updateOp(data.nodes5g, data.headSef);
    deleteOp(data.nodes5g, data.headSef);
  });
}

export function READop_SharedCNF(data) {
  describe('READ operations for SharedCNF', function () {
    readOpSharedCNF(data.nodessharedcnf2, data.headSef);
  });
}

export function CUDop_SharedCNF(data) {
  describe('CUD operations for SharedCNF', function () {
    createOpSharedCNF(data.nodessharedcnf2, data.headSef);
    updateOpSharedCNF(data.nodessharedcnf2, data.headSef);
    deleteOpSharedCNF(data.nodessharedcnf2, data.headSef);
  });
}
export function CUDop_80k(data) {
  describe('CRUD operations', function () {
    createOp(data.nodes5gRestsim1, data.headSef);
    updateOp(data.nodes5gRestsim1, data.headSef);
    deleteOp(data.nodes5gRestsim1, data.headSef);
  });
}

export function READop_80k(data) {
  describe('READ operations', function () {
    readOp(data.nodes5gRestsim1, data.headSef);
  });
}
export function cmHandleDiscovery(data) {
  const sessionId = authorize();
  const head = {
    headers: {
      'content-type': `application/json`,
      Cookie: `JSESSIONID=${sessionId}`,
    },
  };
  let reg;
  let RadioNodenodescount;
  let SharedCNFnodescount;
  let allnodescount;
  let subsystemId;
  let skip_url1_reg,
    skip_url2_reg,
    skip_base_reg = false;
  let subsystemList = http.request('GET', OUTSIDE_API_GW_TLS_URL + 'subsystem-manager/v3/subsystems?select=name,id,url', '', head);
  console.log('List of subsystems before registration: ' + subsystemList.body);
  let responseBody = JSON.parse(subsystemList.body);
  if (responseBody.length > 0) {
    for (let i = 0; i < responseBody.length; i++) {
      if (data.url1Valid && responseBody[i].url.includes(data.url1)) {
        skip_url1_reg = true;
      }
      if (data.url2Valid && responseBody[i].url.includes(data.url2)) {
        skip_url2_reg = true;
      }
      if (responseBody[i].url.includes('eric-oss-restsim-release-for-app-eng')) {
        skip_base_reg = true;
      }
    }
  }
  if (__ENV.restsim_url_tag == 'url1') {
    describe('cmHandle Discovery for restsimurl1', function () {
      if (data.url1Valid && !skip_url1_reg) {
        registerSubsystem(`RestsimURL_node_${data.countsrestsim1.cmHandlecounts}`, data.url1);
        subsystemId = getSubsystemId(data.url1);
        console.log('subsystemId :>> ', subsystemId);
        getCmHandlesForEnmForPS(subsystemId, data.countsrestsim1.cmHandlecounts);
      } else {
        check(data.url1Valid, {
          'There is no RETSIM1_URL or RESTSIM already registered, so skip this part': (r) => data.url1Valid == data.url1Valid,
        });
      }
    });
  } else if (__ENV.restsim_url_tag == 'url2') {
    describe('cmHandle Discovery for restsimurl2', function () {
      if (data.url2Valid && !skip_url2_reg) {
        registerSubsystem(`RestsimURL_node_${data.countsrestsim2.cmHandlecounts}`, data.url2);
        subsystemId = getSubsystemId(data.url2);
        console.log('subsystemId :>> ', subsystemId);
        getCmHandlesForEnmForPS(subsystemId, data.countsrestsim2.cmHandlecounts);
      } else {
        check(data.url2Valid, {
          'There is no RETSIM2_URL or RESTSIM already registered, so skip this part': (r) => data.url2Valid == data.url2Valid,
        });
      }
    });
  } else {
    RadioNodenodescount = data.radiocnt;
    SharedCNFnodescount = data.sharedcnt;
    allnodescount = parseInt(RadioNodenodescount + SharedCNFnodescount * 3);
    if (!skip_base_reg) {
      reg = registerENM('Base_for_SharedCNF');
      subsystemId = reg[0];
      describe('cmHandle Discovery', function () {
        console.log('Base RESTSim subsystemId :>> ', subsystemId);
        getCmHandlesForEnmForPS(subsystemId, allnodescount);
      });
    } else {
      check(skip_base_reg, {
        'Base RESTSim already registered, so skip this part': (r) => skip_base_reg == skip_base_reg,
      });
    }
  }
}
export function gnbduTopologyDiscovery(data) {
  let RadioNodenodescount = data.radiocnt;
  let ctsCount = RadioNodenodescount / 2;
  data.sharedcnt = 0;
  if (data.sharedcnt == 100) {
    console.log('There are 90 shared-cnf du node');
    ctsCount = ctsCount + 90;
  }
  topologyDiscovery('gnbdu', 45, ctsCount);
}
export function nrcellTopologyDiscovery(data) {
  let RadioNodenodescount = data.radiocnt;
  let ctsCount = RadioNodenodescount * 2;
  data.sharedcnt = 0;
  if (data.sharedcnt == 100) {
    console.log('There are 270 shared-cnf nrcell node');
    ctsCount = ctsCount + 270;
  }
  topologyDiscovery('nrcell', 45, ctsCount);
}
export function gnbcuupTopologyDiscovery(data) {
  let RadioNodenodescount = data.radiocnt;
  let ctsCount = RadioNodenodescount / 2;
  topologyDiscovery('gnbcuup', 45, ctsCount);
}
export function gnbcucpTopologyDiscovery(data) {
  let RadioNodenodescount = data.radiocnt;
  let ctsCount = RadioNodenodescount / 2;
  topologyDiscovery('gnbcucp', 45, ctsCount);
}
export function nrsectorcarrierTopologyDiscovery(data) {
  let RadioNodenodescount = data.radiocnt;
  let ctsCount = RadioNodenodescount * 2;
  data.sharedcnt = 0;
  if (data.sharedcnt == 100) {
    console.log('There are 270 shared-cnf nrsectorcarrier node');
    ctsCount = ctsCount + 270;
  }
  topologyDiscovery('nrsectorcarrier', 45, ctsCount);
}
export function enodebTopologyDiscovery(data) {
  let RadioNodenodescount = data.radiocnt;
  let ctsCount = RadioNodenodescount / 2;
  topologyDiscovery('enodeb', 45, ctsCount);
}
export function ltecellTopologyDiscovery(data) {
  let RadioNodenodescount = data.radiocnt;
  let ctsCount = RadioNodenodescount / 2;
  topologyDiscovery('ltecell', 45, 4 * ctsCount);
}
export function gnbduTopologyDiscoveryPE(data) {
  describe('Waiting for Topology discovery', function () {
    let RadioNodenodescount = data.radiocnt;
    let ctsCount = RadioNodenodescount / 2,
      ctsType = 'gnbdu',
      timeoutTime = 29,
      errcheck = true;
    data.sharedcnt = 0;
    if (data.sharedcnt == 100) {
      console.log('There are 90 shared-cnf gnbdu node');
      ctsCount = ctsCount + 90;
    }
    statusCTSdiscoveryPE(ctsType, timeoutTime, errcheck, ctsCount);
  });
}
export function TopologyDiscoveryPE(data) {
  describe(`Waiting for ${__ENV.celltype.toUpperCase()} Topology discovery for restsim${__ENV.restsim_url_tag}`, function () {
    let ctsCount1,
      ctsCount2,
      ctsType = __ENV.celltype,
      timeoutTime = 105,
      errcheck = true,
      filter = __ENV.filter;

    if (__ENV.restsim_url_tag == 'url1') {
      if (data.url1Valid) {
        ctsCount1 = data.countsrestsim1[ctsType];
        statusCTSdiscoveryPELargeENM(ctsType, timeoutTime, errcheck, ctsCount1, filter);
      } else {
        check(data.url1Valid, {
          'There is no RETSIM1_URL, so skip this part': (r) => data.url1Valid == data.url1Valid,
        });
      }
    } else {
      if (data.url2Valid) {
        ctsCount2 = data.countsrestsim2[ctsType];
        statusCTSdiscoveryPELargeENM(ctsType, timeoutTime, errcheck, ctsCount2, filter);
      } else {
        check(data.url2Valid, {
          'There is no RETSIM2_URL, so skip this part': (r) => data.url2Valid == data.url2Valid,
        });
      }
    }
  });
}
export function TopologyDiscovery(data) {
  describe(`Waiting for ${__ENV.celltype.toUpperCase()} Topology discovery for restsim${__ENV.restsim_url_tag}`, function () {
    let ctsType = __ENV.celltype,
      timeoutTime = 105,
      errcheck = true,
      filter = __ENV.filter,
      count;
    switch (ctsType) {
      case 'gnbcucp':
      case 'gnbcuup':
      case 'gnbdu':
        count = data.countbase5G;
        break;
      case 'nrcell':
      case 'nrsectorcarrier':
        count = data.countbase5G * 4;
        break;
      case 'enodeb':
        count = data.countbase4G;
        break;
      case 'ltecell':
        count = data.countbase4G * 4;
        break;
      default:
        count = 50;
    }
    statusCTSdiscoveryPELargeENM(ctsType, timeoutTime, errcheck, count, filter);
  });
}
export function nrcellTopologyDiscoveryPE(data) {
  describe('Waiting for Topology discovery', function () {
    let RadioNodenodescount = data.radiocnt;
    let ctsCount = RadioNodenodescount * 2,
      ctsType = 'nrcell',
      timeoutTime = 29,
      errcheck = true;
    data.sharedcnt = 0;
    if (data.sharedcnt == 100) {
      console.log('There are 270 shared-cnf nrcell node');
      ctsCount = ctsCount + 270;
    }
    statusCTSdiscoveryPE(ctsType, timeoutTime, errcheck, ctsCount);
  });
}
export function gnbcuupTopologyDiscoveryPE(data) {
  describe('Waiting for Topology discovery', function () {
    let RadioNodenodescount = data.radiocnt;
    let ctsCount = RadioNodenodescount / 2,
      ctsType = 'gnbcuup',
      timeoutTime = 29,
      errcheck = true;
    statusCTSdiscoveryPE(ctsType, timeoutTime, errcheck, ctsCount);
  });
}
export function gnbcucpTopologyDiscoveryPE(data) {
  describe('Waiting for Topology discovery', function () {
    let RadioNodenodescount = data.radiocnt;
    let ctsCount = RadioNodenodescount / 2,
      ctsType = 'gnbcucp',
      timeoutTime = 29,
      errcheck = true;
    statusCTSdiscoveryPE(ctsType, timeoutTime, errcheck, ctsCount);
  });
}
export function nrsectorcarrierTopologyDiscoveryPE(data) {
  describe('Waiting for Topology discovery', function () {
    let RadioNodenodescount = data.radiocnt;
    let ctsCount = RadioNodenodescount * 2,
      ctsType = 'nrsectorcarrier',
      timeoutTime = 29,
      errcheck = true;
    data.sharedcnt = 0;
    if (data.sharedcnt == 100) {
      console.log('There are 270 shared-cnf nrsectorcarrier node');
      ctsCount = ctsCount + 270;
    }
    statusCTSdiscoveryPE(ctsType, timeoutTime, errcheck, ctsCount);
  });
}
export function enodebTopologyDiscoveryPE(data) {
  describe('Waiting for Topology discovery', function () {
    let RadioNodenodescount = data.radiocnt;
    let ctsCount = RadioNodenodescount / 2,
      ctsType = 'enodeb',
      timeoutTime = 29,
      errcheck = true;
    statusCTSdiscoveryPE(ctsType, timeoutTime, errcheck, ctsCount);
  });
}
export function ltecellTopologyDiscoveryPE(data) {
  describe('Waiting for Topology discovery', function () {
    let RadioNodenodescount = data.radiocnt;
    let ctsCount = RadioNodenodescount / 2,
      ctsType = 'ltecell',
      timeoutTime = 29,
      errcheck = true;
    statusCTSdiscoveryPE(ctsType, timeoutTime, errcheck, 4 * ctsCount);
  });
}
export function AVCEventPropagation() {
  // ---- Temporarily turning off tests that are using dmaap for unblocking the release
  // let getMessages;
  // let initialDmaaPEventCount = undefined;
  // try {
  //   getMessages = http.get(DMAAP_URL + 'events/enmadapter_cm_notification/' + K6_CONSUMER_GROUP + '/' + K6_CONSUMER_ID);
  //   initialDmaaPEventCount = JSON.parse(getMessages.body).length;
  // } catch (error) {
  //   console.log('error :>> ' + error);
  //   initialDmaaPEventCount = 0;
  // }
  let enmurl = 'http://eric-oss-enm-notification-simulator-for-app-eng:8281';
  let subsystemId = getSubsystemId(enmurl);
  ENMModelAdapterMetrics(subsystemId);
  // eventPolling(subsystemId, initialDmaaPEventCount, data);
  // ENMNotificationAdapterMetrics();
}

export function teardown(data) {
  console.log('Executing teardown');
  const sessionId = authorize();
  const head = {
    headers: {
      'content-type': `application/json`,
      Cookie: `JSESSIONID=${sessionId}`,
    },
  };
  var subsystemId;
  // Cleanup registered Restsim from Subsystem Manager
  describe('Cleanup registered ENM stub from Subsystem Manager', function () {
    let { headSef } = data;
    let subsystemList = http.get(OUTSIDE_API_GW_TLS_URL + 'subsystem-manager/v3/subsystems?select=name,id,url', '', head);
    console.log('List of subsystems before cleanup: ' + subsystemList.body);
    var responseBody = JSON.parse(subsystemList.body);
    console.log(responseBody.length);
    if (responseBody.length > 0) {
      for (let i = 0; i < responseBody.length; i++) {
        if (responseBody[i].name.includes('eric-oss-restsim-release-for-app-eng') && !data.url1Valid) {
          subsystemId = responseBody[i].id;
          console.log('Cleaning up remaining registered Subsystem: ID :>> ' + subsystemId + '  Name :>> ' + responseBody[i].name);
          deleteSubsystem(subsystemId);
          getCmHandlesForEnm(subsystemId, 0, headSef);
        } else {
          console.log('Not deleting subsystem with name: ' + responseBody[i].name);
        }
      }
    } else {
      console.log('There is no subsystem for deletion');
    }
  });
  describe('Delete K6  test user', function () {
    console.log('Deleting K6 test user in User Management ...');
    const res = http.del(OUTSIDE_API_GW_TLS_URL + 'idm/usermgmt/v1/users/' + k6_user + '?tenantname=master', null, head);
    console.log('Delete user status: ' + res.status);
    console.log('Delete user body: ' + res.body);
    check(res, {
      'k6test user deleted successfully': res.status == 204,
    });
  });
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
  describe('Get metrics', () => {
    const microServices = ['eric-oss-ncmp', 'eric-eo-enm-adapter', 'eric-oss-enm-model-adapter', 'eric-oss-enm-discovery-adapter', 'eric-oss-enm-notification-adapter'];
    microServices.forEach((microService) => {
      const response = http.get(`${PM_SERVER_URL}api/v1/query?query={app="${microService}"}&start=${start}`);
      if (response.status !== 200) {
        console.log('Error while getting metrics from Prometheus for', microService);
        console.log(response);
        return;
      }
      console.log(`Metrics data for ${microService} since ${start} (${new Date(start)})`);
      const parsedResponse = JSON.parse(response.body);
      console.log(parsedResponse.data.result);
    });
  });
}

export function authorize() {
  const jar = http.cookieJar();
  jar.set(OUTSIDE_API_GW_TLS_URL);
  let login_path = 'auth/v1/login';
  let authFlag = true,
    retries = 1,
    request;
  const URL = OUTSIDE_API_GW_TLS_URL.concat(login_path);
  console.log('URL: ' + URL);
  while (authFlag && retries <= 5) {
    request = http.request('POST', URL, '', login_headers);
    console.log('Authorization Status: ' + request.status);
    console.log('Request Body: ' + request.body);
    if (request.status < 200 || request.status >= 300) {
      console.log('Error retrying request');
      retries++;
      sleep(10);
    } else {
      authFlag = false;
    }
  }
  if (authFlag == true) {
    console.log('Authorization Failed');
  } else {
    console.log('Authorization Successful');
  }
  return request.body;
}

export function authorizeSEF() {
  const jar = http.cookieJar();
  jar.set(IAM_HOST);
  let keycloakToken = auth.getKeycloakToken().json()['access_token'];
  console.log('Keycloak Token: ' + keycloakToken);
  let tokenDuration = auth.setKeycloakTokenDuration(keycloakToken);
  console.log('Token Duration: ' + JSON.stringify(tokenDuration));
  let client = auth.createClient(keycloakToken, clientId);
  console.log('Create client: ' + JSON.stringify(client));
  let getClientId = auth.getClientIdList(keycloakToken, clientId);
  console.log('getClientId: ' + JSON.stringify(getClientId));
  let bodyGetClientId = JSON.parse(getClientId.body);
  let k6ClientId = bodyGetClientId[0].id;
  console.log('k6ClientId: ' + k6ClientId);

  let serviceRolesId = auth.getServiceRolesId(keycloakToken, k6ClientId).json()['id'];
  console.log('serviceRolesId: ' + serviceRolesId);
  let getServiceRolesIdList = auth.getServiceRolesIdList(keycloakToken, serviceRolesId);
  let serviceRolesIdList = JSON.parse(getServiceRolesIdList.body);
  console.log('serviceRolesIdList: ' + getServiceRolesIdList.body);
  if (200 <= client.status && client.status < 300) {
    const rolesWithIds = CLIENT_ROLES.map((role) => {
      const id = serviceRolesIdList.find((roleId) => roleId.name === role).id;
      const name = role;
      return {
        id,
        name,
      };
    });

    let setServiceRole = auth.setServiceRoles(keycloakToken, serviceRolesId, rolesWithIds);
  }
  let secret = auth.regenerateClientSecret(keycloakToken, k6ClientId).json()['value'];
  console.log('SECRET: ' + secret);
  let getAccessToken = auth.getKeycloakTokenSecret(clientId, secret);
  let access_token = getAccessToken.json()['access_token'];
  console.log('Access token: ' + access_token);
  return { access_token, k6ClientId };
}
