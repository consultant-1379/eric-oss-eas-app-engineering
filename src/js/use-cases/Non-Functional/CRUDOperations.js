import { IAM_HOST, OUTSIDE_API_GW_TLS_URL, RAN_TOPOLOGY_ADAPTER } from '../../utility/constants.js';
import { callCRUDOp, callCRUDOpSharedCNF, customMetrics } from './CRUDBase.js';
import { discoverStatusCheck, getMetricValue, statusCTSdiscovery } from '../../utility/utility.js';
import { describe } from '../../utility/describe.js';
import { check, sleep } from 'k6';
import http from 'k6/http';

import { authorize } from '../../main.js';

const datastore = 'passthrough-running';
export var connectionPropertiesId;
export var subsystemId;

const headers = {
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
  },
};

const postENM_Params = {
  headers: {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
  },
  timeout: '600s',
};

export function createOp(data, headSef) {
  let cmHandle_hash = data[__ITER].cmhandle;
  let managedElementId = data[__ITER].node;
  let cellnumber = 30 + __VU;
  let cellid = `${managedElementId}-${cellnumber}`;
  // console.log('managedElementId :>> ', managedElementId);
  const NrCellDUBody = JSON.stringify({
    NRCellDU: [
      {
        id: `${cellid}`,
        attributes: {
          typeISinglePanelRiRestriction: '15',
          ailgDlPrbLoadLevel: '0',
          drxOnDurationTimer: 'ONDURATIONTIMER_8MS',
          trsResourceShifting: 'DEACTIVATED',
          ulStartCrb: '0',
          endcDlNrQualHyst: '8',
          cellBarred: 'NOT_BARRED',
          drxInactivityTimer: 'INACTIVITYTIMER_8MS',
          cellReservedForOperator: 'NOT_RESERVED',
          ulRobustLaEnabled: 'false',
          nRCellDUId: `${cellid}`,
          drxEnable: 'true',
          dlRobustLaEnabled: 'false',
          nrLteCoexistence: 'false',
          pZeroNomPuschGrant: '-100',
          endcUlNrLowQualThresh: '17',
          tddUlDlPattern: 'TDD_ULDL_PATTERN_00',
          rachPreambleTransMax: '10',
          pdschStartPrbStrategy: 'RANDOM_START_WITHIN_BAND',
          endcDlNrLowQualThresh: '-8',
          bfrEnabled: 'true',
          dlStartCrb: '0',
          csiReportFormat: 'CQI_WB_PMI_WB',
          rachPreambleRecTargetPower: '-110',
          trsPeriodicity: '20',
          csiRsShiftingSecondary: 'DEACTIVATED',
          ulMaxMuMimoLayers: '0',
          nRTAC: '999',
          ul256QamEnabled: 'false',
          dftSOfdmPuschEnabled: 'false',
          drxLongCycle: 'LONGCYCLE_80MS',
          dl256QamEnabled: 'true',
          endcUlNrQualHyst: '6',
          cellLocalId: '7125',
          ssbSubCarrierSpacing: '120',
          essMbsfnSubframeConfig: '9440512',
          ssbOffset: '0',
          administrativeState: 'LOCKED',
          ssbFrequency: '0',
          csiRsShiftingPrimary: 'DEACTIVATED',
          endcUlLegSwitchEnabled: 'false',
          siWindowLength: '20',
          pZeroNomPucch: '-114',
          nRPCI: '0',
          ailgModType: 'AILG_MOD_QPSK',
          dlMaxMuMimoLayers: '0',
          secondaryCellOnly: 'true',
          puschStartPrbStrategy: 'RANDOM_START_WITHIN_BAND',
          ssbDuration: '1',
          subCarrierSpacing: '120',
          userLabel: 'cmsync_abc',
          tddSpecialSlotPattern: 'TDD_SPECIAL_SLOT_PATTERN_00',
          trsPowerBoosting: '0',
          csiRsPeriodicity: '40',
          endcDlLegSwitchEnabled: 'true',
          qRxLevMin: '-140',
          pMax: '23',
          dftSOfdmMsg3Enabled: 'false',
          ssbPeriodicity: '20',
          ailgPdcchLoadLevel: '0',
          pZeroUePuschOffset256Qam: '0',
          ssbPowerBoost: '0',
          rachRootSequence: '1',
          pLMNIdList: '[{mcc=228, mnc=49}, {mcc=229, mnc=50}, {mcc=230, mnc=51}]',
          sNSSAIList: '[{sd=123, sst=123}]',
          sibType2: '{siPeriodicity=32, siBroadcastStatus=BROADCASTING}',
        },
      },
    ],
  });
  describe('CRUD : Create operations', function () {
    callCRUDOp('POST', `${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedElementId}/ericsson-enm-gnbdu:GNBDUFunction=1`)}`, NrCellDUBody, headSef);
  });
}

export function createOpSharedCNF(data, headSef) {
  let cmHandle_hash = data[__VU].cmhandle;
  let managedElementId = data[__VU].node;
  let cellnumber = 10 + __ITER;
  // console.log('managedElementId :>> ', managedElementId);
  const NrCellDUBody = JSON.stringify({
    NRCellDU: [
      {
        id: `${cellnumber}`,
        attributes: {
          ssbOffset: 0,
          ssbPeriodicity: 20,
          bWPRef: `[MeContext=${managedElementId},ManagedElement=1,GNBDUFunction=603165,BWP=1,MeContext=${managedElementId},ManagedElement=1,GNBDUFunction=603165,BWP=2]`,
          pLMNIdList: [
            {
              mcc: '428',
              mnc: '59',
            },
            {
              mcc: '429',
              mnc: '60',
            },
          ],
          sNSSAIList: [
            {
              sd: '126',
              sst: '126',
            },
            {
              sd: '127',
              sst: '127',
            },
          ],
          sibType2: {
            siPeriodicity: '8',
            siBroadcastStatus: 'BROADCASTING',
          },
        },
      },
    ],
  });
  describe('CRUD SharedCNF: Create operations', function () {
    callCRUDOpSharedCNF('POST', `${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`_3gpp-nr-nrm-gnbdufunction:GNBDUFunction=603165`)}`, NrCellDUBody, headSef);
  });
}

export function updateOpSharedCNF(data, headSef) {
  let cmHandle_hash = data[__VU].cmhandle;
  let cellnumber = 10 + __ITER;

  const NrCellDUBody = JSON.stringify({
    NRCellDU: [
      {
        id: `${cellnumber}`,
        attributes: {
          pLMNIdList: [
            {
              mcc: '328',
              mnc: '59',
            },
            {
              mcc: '329',
              mnc: '60',
            },
          ],
          sNSSAIList: [
            {
              sd: '126',
              sst: '126',
            },
            {
              sd: '127',
              sst: '127',
            },
          ],
          sibType2: {
            siPeriodicity: '8',
            siBroadcastStatus: 'BROADCASTING',
          },
        },
      },
    ],
  });
  describe('CRUD : Update operations', function () {
    callCRUDOpSharedCNF('PATCH', `${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`_3gpp-nr-nrm-gnbdufunction:GNBDUFunction=603165`)}`, NrCellDUBody, headSef);
  });
}

export function updateOp(data, headSef) {
  let cmHandle_hash = data[__ITER].cmhandle;
  let managedElementId = data[__ITER].node;
  let cellnumber = 30 + __VU;
  let cellid = `${managedElementId}-${cellnumber}`;

  const NrCellDUBody = JSON.stringify({
    NRCellDU: [
      {
        id: `${cellid}`,
        attributes: {
          pLMNIdList: '[{mcc=328, mnc=49}, {mcc=329, mnc=50}]',
          sNSSAIList: '[{sd=124, sst=124},{sd=125, sst=125}]',
          sibType2: '{siPeriodicity=16, siBroadcastStatus=BROADCASTING}',
        },
      },
    ],
  });
  describe('CRUD : Update operations', function () {
    callCRUDOp('PATCH', `${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-gnbdu:GNBDUFunction=1`)}`, NrCellDUBody, headSef);
  });
}

export function readOp(data, headSef) {
  let cmHandle_hash = data[__ITER].cmhandle;
  let managedElementId = data[__ITER].node;
  let cellnumber = 1;
  let cellid = `${managedElementId}-${cellnumber}`;
  describe('CRUD : Read operations', function () {
    callCRUDOp('GET', `${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedElementId}/ericsson-enm-gnbdu:GNBDUFunction=1/ericsson-enm-gnbdu:NRCellDU=${cellid}`)}`, null, headSef);
  });
}

export function deleteOp(data, headSef) {
  let cmHandle_hash = data[__ITER].cmhandle;
  let managedElementId = data[__ITER].node;
  let cellnumber = 30 + __VU;
  let cellid = `${managedElementId}-${cellnumber}`;

  const NCMP_DELETE_URL = `${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedElementId}/ericsson-enm-gnbdu:GNBDUFunction=1/ericsson-enm-gnbdu:NRCellDU=${cellid}`)}`;
  describe('CRUD : Delete operations', function () {
    callCRUDOp('DELETE', NCMP_DELETE_URL, null, headSef);
  });
}

export function readOpSharedCNF(data, headSef) {
  let num = Math.floor(Math.random() * data.length);
  let cmHandle_hash = data[num].cmhandle;
  let cellnumber = 1;
  describe('CRUD : Read operations', function () {
    callCRUDOpSharedCNF('GET', `${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`_3gpp-nr-nrm-gnbdufunction:GNBDUFunction=603165/_3gpp-nr-nrm-gnbdufunction:NRCellDU=${cellnumber}`)}`, null, headSef);
  });
}

export function deleteOpSharedCNF(data, headSef) {
  let cmHandle_hash = data[__VU].cmhandle;
  let cellnumber = 10 + __ITER;

  const NCMP_DELETE_URL = `${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`_3gpp-nr-nrm-gnbdufunction:GNBDUFunction=603165/_3gpp-nr-nrm-gnbdufunction:NRCellDU=${cellnumber}`)}`;
  describe('CRUD : Delete operations', function () {
    callCRUDOpSharedCNF('DELETE', NCMP_DELETE_URL, null, headSef);
  });
}

export function registerSubsystem(name, url) {
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

    const sessionId = authorize();
    const head = {
      headers: {
        'content-type': `application/json`,
        Cookie: `JSESSIONID=${sessionId}`,
      },
    };

    let registerEnm = http.post(`${OUTSIDE_API_GW_TLS_URL}subsystem-manager/v1/subsystems`, postENM_body, head);
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

  // let getCMHandles = http.get(NCMP_URL + 'cps/api/v1/dataspaces/NFP-Operational/anchors', cm_Params);
  // let responseBody = JSON.parse(getCMHandles.body);
  // let initialCMHandleCount = responseBody.length;

  let startTime = Date.now();
  describe('Waiting for discovery', function () {
    discoverStatusCheck(subsystemId, 'CREATED');
  });
  let timeTaken = (Date.now() - startTime) / 1000;
  console.log('MYSCENARIO ' + __ENV.MY_SCENARIO);
  if (__ENV.MY_SCENARIO !== undefined) {
    customMetrics[__ENV.MY_SCENARIO + 'DURATION'].add(timeTaken);
  }
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
