import { NCMP_URL, SUBSYSTEM_MANAGER_URL, OUTSIDE_API_GW_TLS_URL, RAN_TOPOLOGY_ADAPTER, login_headers, IAM_HOST } from '../../utility/constants.js';
import { discoverStatusCheck, getMetricValue, statusCTSdiscovery } from '../../utility/utility.js';
import { describe } from '../../utility/describe.js';
import { check, sleep } from 'k6';
import { authorize, customMetrics, errorCounterChar } from '../../characteristicsTests.js';
import http from 'k6/http';
import exec from 'k6/execution';

const datastore = 'passthrough-running';
export var connectionPropertiesId;
export var subsystemId;

const postENM_Params = {
  headers: {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
  },
  timeout: '600s',
};

export function createOperation(access_token, managedElement, cmHandleHash, nRCellDU) {
  const NrCellDUBody = JSON.stringify({
    NRCellDU: [
      {
        id: managedElement,
        attributes: {
          nRCellDUId: nRCellDU,
          nRTAC: '999',
          cellLocalId: '7125',
          nRPCI: '0',
          pLMNIdList: '[{mcc=228, mnc=49}, {mcc=229, mnc=50}, {mcc=230, mnc=51}]',
        },
      },
    ],
  });
  describe('CRUD : Create operations', function () {
    sendCommandsThroughNCMP(access_token, 'POST', `ncmp/v1/ch/${cmHandleHash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedElement}/ericsson-enm-gnbdu:GNBDUFunction=1`)}`, NrCellDUBody);
  });
}

export function updateOperation(access_token, cmHandleHash, nRCellDU) {
  const NrCellDUBody = JSON.stringify({
    NRCellDU: [
      {
        id: nRCellDU,
        attributes: {
          pLMNIdList: '[{mcc=328, mnc=49}, {mcc=329, mnc=50}]',
          sNSSAIList: '[{sd=124, sst=124},{sd=125, sst=125}]',
          sibType2: '{siPeriodicity=16, siBroadcastStatus=BROADCASTING}',
        },
      },
    ],
  });
  describe('CRUD : Update operations', function () {
    sendCommandsThroughNCMP(access_token, 'PATCH', `ncmp/v1/ch/${cmHandleHash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-gnbdu:GNBDUFunction=1`)}`, NrCellDUBody);
  });
}

export function readOperation(access_token, cmHandleHash, requestType, managedElement, nrCellDu) {
  describe('CRUD : Read operations', function () {
    if (requestType === 'nrcell') {
      sendCommandsThroughNCMP(access_token, 'GET', `ncmp/v1/ch/${cmHandleHash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedElement}/ericsson-enm-gnbdu:GNBDUFunction=1/ericsson-enm-gnbdu:NRCellDU=${nrCellDu}`)}`, null);
    } else if (requestType === 'dufunction') {
      sendCommandsThroughNCMP(access_token, 'GET', `ncmp/v1/ch/${cmHandleHash}/data/ds/ncmp-datastore:passthrough-operational?resourceIdentifier=${encodeURIComponent(`/`)}&options=${encodeURIComponent(`(fields=ericsson-enm-ComTop:ManagedElement/attributes(dnPrefix);ericsson-enm-GNBDU:GNBDUFunction/attributes(gNBId;gNBIdLength;dUpLMNId;gNBDUId);ericsson-enm-gnbdu:GNBDUFunction/ericsson-enm-GNBDU:NRSectorCarrier/attributes(txDirection;arfcnDL;arfcnUL;bSChannelBwDL;bSChannelBwUL;configuredMaxTxPower);ericsson-enm-gnbdu:GNBDUFunction/ericsson-enm-GNBDU:NRCellDU/attributes(cellLocalId;nRTAC;nRPCI;nRSectorCarrierRef;pLMNIdList;administrativeState);ericsson-enm-GNBDU:GNBDUFunction/ericsson-enm-GNBDU:DU5qiTable/attributes(default5qiTable);ericsson-enm-GNBDU:GNBDUFunction/ericsson-enm-GNBDU:DU5qiTable/ericsson-enm-GNBDU:DU5qi/attributes(profile5qi;priorityLevel;packetDelayBudget))`)}`, null);
    } else {
      console.log('Unknown read requestType');
    }
  });
}

export function deleteOperation(access_token, cmHandleHash, managedElement, nrCellDu) {
  describe('CRUD : Delete operations', function () {
    sendCommandsThroughNCMP(access_token, 'DELETE', `ncmp/v1/ch/${cmHandleHash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedElement}/ericsson-enm-gnbdu:GNBDUFunction=1/ericsson-enm-gnbdu:NRCellDU=${nrCellDu}`)}`, null);
  });
}

export function readModelTopology5G(cmhandle_id) {
  describe('Read Topology data : 5G Nodes', function () {
    sendCommandsThroughNCMP('GET', `ncmp/v1/ch/${cmhandle_id}/data/ds/ncmp-datastore:passthrough-operational?resourceIdentifier=${encodeURIComponent(`/`)}&options=${encodeURIComponent(`(fields=ericsson-enm-ComTop:ManagedElement/attributes(dnPrefix);ericsson-enm-GNBCUUP:GNBCUUPFunction/attributes(gNBId;gNBIdLength;pLMNIdList);ericsson-enm-GNBCUUP:GNBCUUPFunction/ericsson-enm-GNBCUUP:CUUP5qiTable/attributes(default5qiTable);ericsson-enm-GNBCUUP:GNBCUUPFunction/ericsson-enm-GNBCUUP:CUUP5qiTable/ericsson-enm-GNBCUUP:CUUP5qi/attributes(profile5qi;packetDelayBudget))`)}`, null);
    sendCommandsThroughNCMP('GET', `ncmp/v1/ch/${cmhandle_id}/data/ds/ncmp-datastore:passthrough-operational?resourceIdentifier=${encodeURIComponent(`/`)}&options=${encodeURIComponent(`(fields=ericsson-enm-ComTop:ManagedElement/attributes(dnPrefix);ericsson-enm-GNBCUCP:GNBCUCPFunction/attributes(gNBId;gNBIdLength;pLMNId);ericsson-enm-GNBCUCP:GNBCUCPFunction/ericsson-enm-GNBCUCP:CUCP5qiTable/attributes(default5qiTable);ericsson-enm-GNBCUCP:GNBCUCPFunction/ericsson-enm-GNBCUCP:CUCP5qiTable/ericsson-enm-GNBCUCP:CUCP5qi/attributes(profile5qi))`)}`, null);
    sendCommandsThroughNCMP('GET', `ncmp/v1/ch/${cmhandle_id}/data/ds/ncmp-datastore:passthrough-operational?resourceIdentifier=${encodeURIComponent(`/`)}&options=${encodeURIComponent(`(fields=ericsson-enm-ComTop:ManagedElement/attributes(dnPrefix);ericsson-enm-GNBDU:GNBDUFunction/attributes(gNBId;gNBIdLength;dUpLMNId;gNBDUId);ericsson-enm-gnbdu:GNBDUFunction/ericsson-enm-GNBDU:NRSectorCarrier/attributes(txDirection;arfcnDL;arfcnUL;bSChannelBwDL;bSChannelBwUL;configuredMaxTxPower);ericsson-enm-gnbdu:GNBDUFunction/ericsson-enm-GNBDU:NRCellDU/attributes(cellLocalId;nRTAC;nRPCI;nRSectorCarrierRef;pLMNIdList;administrativeState);ericsson-enm-GNBDU:GNBDUFunction/ericsson-enm-GNBDU:DU5qiTable/attributes(default5qiTable);ericsson-enm-GNBDU:GNBDUFunction/ericsson-enm-GNBDU:DU5qiTable/ericsson-enm-GNBDU:DU5qi/attributes(profile5qi;priorityLevel;packetDelayBudget))`)}`, null);
  });
}

export function readModelTopology4G(cmhandle_id) {
  describe('Read Topology data : 4G Nodes', function () {
    sendCommandsThroughNCMP('GET', `ncmp/v1/ch/${cmhandle_id}/data/ds/ncmp-datastore:passthrough-operational?resourceIdentifier=${encodeURIComponent(`/`)}&options=${encodeURIComponent(`(fields=ericsson-enm-ComTop:ManagedElement/attributes(dnPrefix);ericsson-enm-Lrat:ENodeBFunction/attributes(eNodeBPlmnId);ericsson-enm-Lrat:EUtranCellFDD/attributes(cellId;earfcndl;earfcnul);ericsson-enm-Lrat:EUtranCellTDD/attributes(cellId;earfcn))`)}`, null);
    sendCommandsThroughNCMP('GET', `ncmp/v1/ch/${cmhandle_id}/data/ds/ncmp-datastore:passthrough-operational?resourceIdentifier=${encodeURIComponent(`/`)}&options=${encodeURIComponent(`(fields=ericsson-enm-ComTop:ManagedElement/attributes(dnPrefix);ericsson-enm-GNBDU:GNBDUFunction/attributes(gNBId;gNBIdLength;dUpLMNId;gNBDUId);ericsson-enm-gnbdu:GNBDUFunction/ericsson-enm-GNBDU:NRSectorCarrier/attributes(txDirection;arfcnDL;arfcnUL;bSChannelBwDL;bSChannelBwUL;configuredMaxTxPower);ericsson-enm-gnbdu:GNBDUFunction/ericsson-enm-GNBDU:NRCellDU/attributes(cellLocalId;nRTAC;nRPCI;nRSectorCarrierRef;pLMNIdList;administrativeState);ericsson-enm-GNBDU:GNBDUFunction/ericsson-enm-GNBDU:DU5qiTable/attributes(default5qiTable);ericsson-enm-GNBDU:GNBDUFunction/ericsson-enm-GNBDU:DU5qiTable/ericsson-enm-GNBDU:DU5qi/attributes(profile5qi;priorityLevel;packetDelayBudget))`)}`, null);
  });
}

export function sendCommandsThroughNCMP(access_token, method, url, body) {
  const head = {
    headers: {
      'content-type': `application/json`,
      Authorization: `Bearer ${access_token}`,
    },
  };

  // let urlWithHost = `${NCMP_URL}${url}`;
  // let res = http.request(method, urlWithHost, body, params);
  let urlWithHost = `${IAM_HOST}${url}`;
  let res = http.request(method, urlWithHost, body, head);
  let operation = '';
  if (method === 'POST') {
    operation = 'createOperation';
  } else if (method === 'GET') {
    operation = 'readOperation';
  } else if (method === 'PATCH') {
    operation = 'updateOperation';
  } else if (method === 'DELETE') {
    operation = 'deleteOperation';
  } else {
    operation = 'unknownOperation';
  }

  if (res.status > 204) {
    console.log(`${operation}; ${__VU} - ${__ITER}; Duration: ${res.timings.duration}; ResponseCode: ${res.status}; ResponseBody: ${JSON.stringify(res.body)}`);
    customMetrics[operation + 'Failed'].add(res.timings.duration);
    errorCounterChar.add(1);
  } else {
    console.log(`${operation}; ${__VU} - ${__ITER}; Duration: ${res.timings.duration}; ResponseCode: ${res.status}`);
    customMetrics[operation + 'Successful'].add(res.timings.duration);
    const r = check(res, {
      'Operation success rate: ': (r) => res.status <= 204,
    });
  }
}

export function registerSubsystem(name, url, access_token) {
  console.log('Step 1: Registering an ENM in Connected Systems as DomainManager');
  describe('Registering an ENM in Connected Systems as DomainManager', function () {
    const postENM_body = JSON.stringify({
      subsystemType: {
        type: 'DomainManager',
      },
      name: `${name}`,
      healthCheckTime: '1h',
      url: `${url}`,
      operationalState: 'REACHABLE',
      adapterLink: 'eric-eo-enm-adapter',
      connectionProperties: [
        {
          name: 'connection1',
          username: `administrator`,
          password: `TestPassw0rd`,
        },
      ],
      vendor: 'Ericsson',
    });

    let head = {
      headers: {
        'content-type': `application/json`,
        Authorization: `Bearer ${access_token}`,
      },
    };

    let registerEnm = http.post(`${IAM_HOST}subsystem-manager/v1/subsystems`, postENM_body, head);
    if (registerEnm.status > 204) {
      console.log('');
      console.log('Request:');
      console.log(url);
      console.log('Response:');
      console.log(registerEnm.status);
      console.log(JSON.stringify(registerEnm));
    }

    subsystemId = JSON.parse(registerEnm.body).id;
    try {
      connectionPropertiesId = JSON.parse(registerEnm.body).connectionProperties[0].id;
    } catch (error) {
      console.log('Error while getting connectionPropertiesId, error message :>> ' + error);
    }
    const res = check(registerEnm, {
      'ENM registration was successful (status: 201)': (r) => registerEnm.status === 201,
    });
    console.log('Body of registered ENM: ' + registerEnm.body);
    console.log('ID of registered ENM: ' + subsystemId);
    if (!res) {
      console.log('ENM subsystem creation: ' + registerEnm.body);
      console.log('ENM subsystem creation: ' + registerEnm.status);
      console.log('ENM subsystem creation: ' + subsystemId);
    }
  });

  describe('Waiting for discovery', function () {
    discoverStatusCheck(subsystemId, 'CREATED');
  });
  return subsystemId;
}

export function topologyDiscovery(ctsType, timeOut, ctsCount) {
  let getRTAEventCount = getMetricValue(RAN_TOPOLOGY_ADAPTER, 'ncmp_consume_cm_handle_event_ctsties_total?operation=ready', 'COUNT'),
    initialRTAEventCount = getRTAEventCount,
    temp = 'getRTAEventCount :>> ' + getRTAEventCount,
    counter = 0,
    msg = temp;
  console.log('|--------- Topology discovery of ' + ctsType + ' ---------|');
  console.log('Waiting for topology discovery to start, getRTAEventCount currently :>> ' + getRTAEventCount);
  do {
    if (temp != msg) {
      console.log(temp);
      getRTAEventCount = getMetricValue(RAN_TOPOLOGY_ADAPTER, 'ncmp_consume_cm_handle_event_ctsties_total?operation=ready', 'COUNT');
      temp = 'getRTAEventCount :>> ' + getRTAEventCount;
      counter++;
    } else {
      getRTAEventCount = getMetricValue(RAN_TOPOLOGY_ADAPTER, 'ncmp_consume_cm_handle_event_ctsties_total?operation=ready', 'COUNT');
      temp = 'getRTAEventCount :>> ' + getRTAEventCount;
      counter++;
    }
    sleep(10);
  } while (getRTAEventCount <= initialRTAEventCount && counter <= 30);
  console.log('Topology discovery started for ' + ctsType + ' ...... || target node count is :>> ' + ctsCount);
  describe('Waiting for Topology discovery', function () {
    let ctsCounter = statusCTSdiscovery(ctsType, timeOut, false, ctsCount);
    console.log(ctsCounter);
  });
}
